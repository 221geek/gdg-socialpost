import { Worker } from 'bullmq'
import { ObjectId } from 'mongodb'
import { config } from './config.js'
import { closeDatabase, db } from './database.js'
import { Publication } from './types.js'

const worker = new Worker('publication-dispatch', async (job) => {
  const database = await db()
  const publications = database.collection<Publication>('publications')
  const publication = await publications.findOne({ _id: new ObjectId(job.data.publicationId) })

  if (!publication || publication.status !== 'scheduled') return

  const claimed = await publications.findOneAndUpdate(
    { _id: publication._id, status: 'scheduled' },
    { $set: { status: 'dispatching', updatedAt: new Date() } },
    { returnDocument: 'after' },
  )
  if (!claimed) return

  const asset = await database.collection('assets').findOne({ _id: publication.assetId })
  if (!asset) throw new Error(`Asset not found for publication ${publication._id}`)

  const response = await fetch(config.N8N_PUBLISH_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-relay-secret': config.N8N_SHARED_SECRET },
    body: JSON.stringify({
      publicationId: publication._id?.toString(), workspaceId: publication.workspaceId,
      caption: publication.caption, destinations: publication.destinations,
      asset: { url: asset.publicUrl, mimeType: asset.mimeType, kind: asset.kind },
    }),
  })
  if (!response.ok) throw new Error(`n8n returned ${response.status}`)
}, { connection: { url: config.REDIS_URL }, concurrency: 12 })

worker.on('failed', async (job, error) => {
  if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return
  const database = await db()
  await database.collection<Publication>('publications').updateOne(
    { _id: new ObjectId(job.data.publicationId) },
    { $set: { status: 'failed', updatedAt: new Date() } },
  )
  await database.collection('deliveryEvents').insertOne({ publicationId: job.data.publicationId, type: 'dispatch_failed', message: error.message, createdAt: new Date() })
})

async function shutdown() { await worker.close(); await closeDatabase(); process.exit(0) }
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
