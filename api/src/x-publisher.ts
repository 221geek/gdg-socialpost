import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { setTimeout as sleep } from 'node:timers/promises'
import { Db } from 'mongodb'
import { config } from './config.js'
import { decryptConnectionToken, encryptConnectionToken } from './connection-crypto.js'
import { Asset, Connection } from './types.js'

export const X_SCOPES = ['tweet.read', 'tweet.write', 'users.read', 'media.write', 'offline.access']
const SEGMENT_BYTES = 4 * 1024 * 1024
const PROCESSING_TIMEOUT_MS = 15 * 60 * 1000

export class PublishError extends Error {
  constructor(message: string, readonly retryable: boolean) { super(message) }
}

type Log = (step: string, message: string) => Promise<void>

interface StoredXToken { accessToken: string, refreshToken?: string }

const describe = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') return String(payload ?? '')
  const body = payload as { detail?: string, title?: string, error_description?: string, errors?: { message?: string, detail?: string }[] }
  return body.detail || body.errors?.map((error) => error.message || error.detail).join(' · ') || body.error_description || body.title || JSON.stringify(payload)
}

async function xFetch(path: string, init: RequestInit & { token: string }, step: string) {
  const { token, ...options } = init
  let response: Response
  try {
    response = await fetch(`${config.X_API_URL}${path}`, { ...options, headers: { ...options.headers, authorization: `Bearer ${token}` } })
  } catch (error) {
    throw new PublishError(`${step} : X injoignable (${(error as Error).message})`, true)
  }
  const text = await response.text()
  let payload: any = {}
  try { payload = text ? JSON.parse(text) : {} } catch { payload = { detail: text.slice(0, 300) } }
  if (!response.ok) {
    const retryable = response.status === 429 || response.status >= 500
    throw new PublishError(`${step} : X a répondu ${response.status} — ${describe(payload)}`, retryable)
  }
  return payload
}

async function accessToken(database: Db, workspaceId: string, log: Log) {
  const connections = database.collection<Connection>('connections')
  const connection = await connections.findOne({ workspaceId, platform: 'x' })
  if (!connection?.tokenCiphertext) throw new PublishError('Aucun compte X connecté. Connectez X dans Paramètres.', false)
  if (!connection.scopes?.includes('media.write')) throw new PublishError('Le compte X a été connecté sans l’autorisation d’envoi de médias (media.write). Reconnectez X dans Paramètres.', false)
  const stored = JSON.parse(decryptConnectionToken(connection.tokenCiphertext)) as StoredXToken
  if (connection.tokenExpiresAt && connection.tokenExpiresAt.getTime() > Date.now() + 2 * 60 * 1000) return stored.accessToken
  if (!stored.refreshToken) throw new PublishError('Le jeton X a expiré et aucun jeton de rafraîchissement n’est disponible. Reconnectez X.', false)
  if (!config.X_CLIENT_ID || !config.X_CLIENT_SECRET) throw new PublishError('X_CLIENT_ID et X_CLIENT_SECRET doivent être configurés sur le worker pour rafraîchir le jeton X.', false)

  await log('token', 'Jeton X expiré, rafraîchissement en cours.')
  let response: Response
  try {
    response = await fetch(`${config.X_API_URL}/2/oauth2/token`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from(`${config.X_CLIENT_ID}:${config.X_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: stored.refreshToken, client_id: config.X_CLIENT_ID }),
    })
  } catch (error) {
    throw new PublishError(`Rafraîchissement du jeton X impossible (${(error as Error).message})`, true)
  }
  const token = await response.json().catch(() => ({})) as { access_token?: string, refresh_token?: string, expires_in?: number, scope?: string }
  if (!response.ok || !token.access_token) throw new PublishError(`Rafraîchissement du jeton X refusé (${response.status} — ${describe(token)}). Reconnectez X.`, response.status >= 500)
  const now = new Date()
  // X rotates refresh tokens: the previous one is now invalid, so persist the new pair immediately.
  await connections.updateOne({ _id: connection._id }, { $set: {
    tokenCiphertext: encryptConnectionToken(JSON.stringify({ accessToken: token.access_token, refreshToken: token.refresh_token || stored.refreshToken })),
    tokenExpiresAt: token.expires_in ? new Date(now.getTime() + token.expires_in * 1000) : undefined,
    ...(token.scope ? { scopes: token.scope.split(' ') } : {}),
    updatedAt: now,
  } })
  await log('token', 'Jeton X rafraîchi.')
  return token.access_token
}

async function openMedia(asset: Asset): Promise<{ size: number, stream: Readable, source: string }> {
  const localPath = join(config.UPLOAD_DIR, asset.storageKey)
  const local = await stat(localPath).catch(() => null)
  if (local?.isFile()) return { size: local.size, stream: createReadStream(localPath), source: 'volume local' }
  let response: Response
  try { response = await fetch(asset.publicUrl) } catch (error) { throw new PublishError(`Téléchargement du média impossible (${(error as Error).message})`, true) }
  const size = Number(response.headers.get('content-length'))
  if (!response.ok || !response.body) throw new PublishError(`Téléchargement du média refusé (${response.status}) : ${asset.publicUrl}`, response.status >= 500)
  if (!size) throw new PublishError('Le serveur de médias ne renvoie pas la taille du fichier.', false)
  return { size, stream: Readable.fromWeb(response.body as import('node:stream/web').ReadableStream), source: asset.publicUrl }
}

async function* segments(stream: Readable) {
  let buffered: Buffer[] = []
  let length = 0
  for await (const chunk of stream) {
    buffered.push(chunk as Buffer); length += (chunk as Buffer).length
    while (length >= SEGMENT_BYTES) {
      const all = Buffer.concat(buffered)
      yield all.subarray(0, SEGMENT_BYTES)
      buffered = [all.subarray(SEGMENT_BYTES)]; length = buffered[0].length
    }
  }
  if (length) yield Buffer.concat(buffered)
}

const mediaCategory = (asset: Asset) => asset.kind === 'video' ? 'tweet_video' : asset.mimeType === 'image/gif' ? 'tweet_gif' : 'tweet_image'
const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} Mo`

async function uploadMedia(token: string, asset: Asset, log: Log) {
  const media = await openMedia(asset)
  await log('upload', `Envoi du média vers X (${megabytes(media.size)}, ${asset.mimeType}, depuis ${media.source}).`)
  const initialized = await xFetch('/2/media/upload/initialize', {
    token, method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ media_type: asset.mimeType, total_bytes: media.size, media_category: mediaCategory(asset) }),
  }, 'Initialisation de l’envoi')
  const mediaId = initialized.data?.id as string | undefined
  if (!mediaId) throw new PublishError(`Initialisation de l’envoi : réponse X sans identifiant (${JSON.stringify(initialized)})`, true)

  let index = 0
  for await (const segment of segments(media.stream)) {
    const form = new FormData()
    form.append('segment_index', String(index))
    form.append('media', new Blob([segment]), 'segment')
    await xFetch(`/2/media/upload/${mediaId}/append`, { token, method: 'POST', body: form }, `Envoi du segment ${index + 1}`)
    index += 1
  }
  await log('upload', `${index} segment${index > 1 ? 's' : ''} envoyé${index > 1 ? 's' : ''}, finalisation (media ${mediaId}).`)

  let info = (await xFetch(`/2/media/upload/${mediaId}/finalize`, { token, method: 'POST' }, 'Finalisation de l’envoi')).data?.processing_info
  const deadline = Date.now() + PROCESSING_TIMEOUT_MS
  while (info && info.state !== 'succeeded') {
    if (info.state === 'failed') throw new PublishError(`Traitement du média refusé par X : ${describe(info.error)}`, false)
    if (Date.now() > deadline) throw new PublishError('Traitement du média par X trop long (plus de 15 minutes).', true)
    await log('processing', `X traite la vidéo (${info.state}${info.progress_percent !== undefined ? `, ${info.progress_percent} %` : ''}).`)
    await sleep(Math.max(info.check_after_secs ?? 5, 1) * 1000)
    info = (await xFetch(`/2/media/upload?command=STATUS&media_id=${mediaId}`, { token, method: 'GET' }, 'Suivi du traitement')).data?.processing_info
  }
  await log('processing', 'Média prêt sur X.')
  return mediaId
}

export async function publishToX(database: Db, input: { workspaceId: string, caption: string, asset: Asset }, log: Log) {
  const token = await accessToken(database, input.workspaceId, log)
  const mediaId = await uploadMedia(token, input.asset, log)
  const text = input.caption.trim()
  const created = await xFetch('/2/tweets', {
    token, method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...(text ? { text } : {}), media: { media_ids: [mediaId] } }),
  }, 'Création du post')
  const id = created.data?.id as string | undefined
  if (!id) throw new PublishError(`Création du post : réponse X sans identifiant (${JSON.stringify(created)})`, false)
  return { externalPostId: id, externalUrl: `https://x.com/i/web/status/${id}` }
}
