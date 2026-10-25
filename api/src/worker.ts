import { Job, UnrecoverableError, Worker } from 'bullmq'
import { Db, ObjectId } from 'mongodb'
import { config } from './config.js'
import { closeDatabase, db } from './database.js'
import { logEvent, setDelivery, settlePublication } from './deliveries.js'
import { Asset, Platform, Publication } from './types.js'
import { PublishError, publishToX } from './x-publisher.js'

const nativePlatforms: Platform[] = ['x']

async function dispatchToN8n(database: Db, publication: Publication, asset: Asset, destinations: Platform[], attempt: number) {
  const publicationId = publication._id!.toHexString()
  await logEvent(database, publicationId, { level: 'info', step: 'n8n', message: `Transmission à n8n pour ${destinations.join(', ')}.`, attempt })
  let response: Response
  try {
    response = await fetch(config.N8N_PUBLISH_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-relay-secret': config.N8N_SHARED_SECRET },
      body: JSON.stringify({
        publicationId, workspaceId: publication.workspaceId,
        caption: publication.caption, destinations,
        asset: { url: asset.publicUrl, mimeType: asset.mimeType, kind: asset.kind },
      }),
    })
  } catch (error) {
    throw new PublishError(`n8n injoignable (${(error as Error).message})`, true)
  }
  if (!response.ok) throw new PublishError(`n8n a répondu ${response.status}`, response.status >= 500 || response.status === 429)
  for (const platform of destinations) await setDelivery(database, publication._id!, platform, { status: 'pending' })
  await logEvent(database, publicationId, { level: 'info', step: 'n8n', message: 'n8n a accepté la demande ; en attente de son rappel de livraison.', attempt })
}

async function processPublication(job: Job<{ publicationId: string }>) {
  const database = await db()
  const publications = database.collection<Publication>('publications')
  const publicationId = job.data.publicationId
  const attempt = job.attemptsMade + 1
  const maxAttempts = job.opts.attempts ?? 1

  // First attempt claims a scheduled publication; retries resume the one they already claimed.
  const claimable = job.attemptsMade === 0 ? ['scheduled'] : ['scheduled', 'dispatching']
  const publication = await publications.findOneAndUpdate(
    { _id: new ObjectId(publicationId), status: { $in: claimable as Publication['status'][] } },
    { $set: { status: 'dispatching', dispatchStartedAt: new Date(), updatedAt: new Date() } },
    { returnDocument: 'after' },
  )
  if (!publication) {
    const current = await publications.findOne({ _id: new ObjectId(publicationId) }, { projection: { status: 1 } })
    console.log(JSON.stringify({ scope: 'delivery', publicationId, message: `Job ignoré : statut actuel ${current?.status ?? 'introuvable'}` }))
    return
  }
  await logEvent(database, publicationId, { level: 'info', step: 'start', message: `Diffusion démarrée (essai ${attempt}/${maxAttempts}) vers ${publication.destinations.join(', ')}.`, attempt })

  const asset = await database.collection<Asset>('assets').findOne({ _id: publication.assetId })
  const remaining = publication.destinations.filter((platform) => !publication.deliveries?.[platform])
  let retryError: PublishError | undefined

  for (const platform of remaining.filter((item) => nativePlatforms.includes(item))) {
    const log = (step: string, message: string) => logEvent(database, publicationId, { platform, level: 'info', step, message, attempt })
    try {
      if (!asset) throw new PublishError('Le média de la publication est introuvable.', false)
      const result = await publishToX(database, { workspaceId: publication.workspaceId, caption: publication.caption, asset }, log)
      await setDelivery(database, publication._id!, platform, { status: 'published', ...result })
      await logEvent(database, publicationId, { platform, level: 'info', step: 'published', status: 'published', externalPostId: result.externalPostId, message: `Publié sur X : ${result.externalUrl}`, attempt })
    } catch (cause) {
      const error = cause instanceof PublishError ? cause : new PublishError((cause as Error).message, true)
      const willRetry = error.retryable && attempt < maxAttempts
      if (willRetry) retryError = error
      else await setDelivery(database, publication._id!, platform, { status: 'failed', error: error.message })
      await logEvent(database, publicationId, { platform, level: 'error', step: 'error', status: willRetry ? undefined : 'failed', message: willRetry ? `${error.message} — nouvel essai automatique.` : error.message, attempt })
    }
  }

  const viaN8n = remaining.filter((item) => !nativePlatforms.includes(item))
  if (viaN8n.length) {
    try {
      if (!asset) throw new PublishError('Le média de la publication est introuvable.', false)
      await dispatchToN8n(database, publication, asset, viaN8n, attempt)
    } catch (cause) {
      const error = cause instanceof PublishError ? cause : new PublishError((cause as Error).message, true)
      const willRetry = error.retryable && attempt < maxAttempts
      if (willRetry) retryError = error
      else for (const platform of viaN8n) await setDelivery(database, publication._id!, platform, { status: 'failed', error: error.message })
      await logEvent(database, publicationId, { level: 'error', step: 'n8n', message: willRetry ? `${error.message} — nouvel essai automatique.` : error.message, attempt })
    }
  }

  const settled = await settlePublication(database, publication._id!)
  if (settled?.status === 'published') await logEvent(database, publicationId, { level: 'info', step: 'done', message: 'Publication diffusée sur toutes les destinations.', attempt })
  if (settled?.status === 'failed') await logEvent(database, publicationId, { level: 'error', step: 'done', message: `Diffusion terminée en échec : ${settled.lastError}`, attempt })
  if (retryError) throw retryError
}

const worker = new Worker('publication-dispatch', processPublication, { connection: { url: config.REDIS_URL }, concurrency: 12 })

// Safety net for unexpected crashes: a publication must never stay "dispatching" once its job gave up.
worker.on('failed', async (job, error) => {
  if (!job || (job.attemptsMade < (job.opts.attempts ?? 1) && !(error instanceof UnrecoverableError))) return
  const database = await db()
  const publication = await database.collection<Publication>('publications').findOneAndUpdate(
    { _id: new ObjectId(job.data.publicationId), status: 'dispatching' },
    { $set: { status: 'failed', lastError: error.message, updatedAt: new Date() } },
  )
  if (publication) await logEvent(database, job.data.publicationId, { level: 'error', step: 'done', message: `Abandon après ${job.attemptsMade} essai(s) : ${error.message}`, attempt: job.attemptsMade })
})
worker.on('ready', () => console.log(JSON.stringify({ scope: 'worker', message: 'Worker prêt', concurrency: 12 })))
worker.on('error', (error) => console.error(JSON.stringify({ scope: 'worker', message: error.message })))

async function shutdown() { await worker.close(); await closeDatabase(); process.exit(0) }
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
