import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import Fastify from 'fastify'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { config } from './config.js'
import { decryptConnectionToken, encryptConnectionToken } from './connection-crypto.js'
import { closeDatabase, db } from './database.js'
import { queuePublication } from './queue.js'
import { Asset, Connection, platforms, Publication } from './types.js'

const app = Fastify({ logger: true })
await mkdir(config.UPLOAD_DIR, { recursive: true })
await app.register(cors, { origin: config.WEB_ORIGIN })
await app.register(multipart, { limits: { fileSize: 2 * 1024 * 1024 * 1024, files: 1 } })
await app.register(fastifyStatic, { root: config.UPLOAD_DIR, prefix: '/media/' })

const workspaceId = z.string().min(1)
const objectId = z.string().regex(/^[0-9a-f]{24}$/i, 'Identifiant invalide')
const publicationInput = z.object({
  workspaceId,
  assetId: objectId,
  title: z.string().trim().min(1).max(120),
  caption: z.string().max(2200).default(''),
  destinations: z.array(z.enum(platforms)).min(1),
})

const oauthState = z.object({
  workspaceId,
  stateHash: z.string(),
  provider: z.literal('instagram'),
  expiresAt: z.date(),
})

const asId = (id: ObjectId | undefined) => id?.toHexString()
const assetDto = (asset: Asset) => ({ ...asset, _id: asId(asset._id), createdAt: asset.createdAt.toISOString() })
const publicationDto = (publication: Publication) => ({
  ...publication,
  _id: asId(publication._id),
  assetId: publication.assetId.toHexString(),
  scheduledAt: publication.scheduledAt?.toISOString(),
  publishedAt: publication.publishedAt?.toISOString(),
  createdAt: publication.createdAt.toISOString(),
  updatedAt: publication.updatedAt.toISOString(),
})

app.get('/health', async () => {
  await (await db()).command({ ping: 1 })
  return { ok: true, service: 'relay-api' }
})

app.get('/v1/assets', async (request) => {
  const { workspaceId: id } = z.object({ workspaceId }).parse(request.query)
  const assets = await (await db()).collection<Asset>('assets').find({ workspaceId: id }).sort({ createdAt: -1 }).toArray()
  return { data: assets.map(assetDto) }
})

app.post('/v1/assets/upload', async (request, reply) => {
  const part = await request.file()
  if (!part) return reply.code(400).send({ error: 'Un fichier est requis.' })
  const rawField = Array.isArray(part.fields.workspaceId) ? part.fields.workspaceId[0] : part.fields.workspaceId
  const id = workspaceId.parse(rawField && 'value' in rawField ? rawField.value : undefined)
  const kind = part.mimetype.startsWith('video/') ? 'video' : part.mimetype.startsWith('image/') ? 'image' : null
  if (!kind) return reply.code(422).send({ error: 'Le fichier doit être une image ou une vidéo.' })
  const extension = extname(basename(part.filename)).toLowerCase().replace(/[^.a-z0-9]/g, '')
  const filename = `${randomUUID()}${extension}`
  const relativePath = join(id, filename)
  await mkdir(join(config.UPLOAD_DIR, id), { recursive: true })
  await pipeline(part.file, createWriteStream(join(config.UPLOAD_DIR, relativePath)))
  const asset: Asset = {
    workspaceId: id,
    name: part.filename,
    mimeType: part.mimetype,
    kind,
    storageKey: relativePath,
    publicUrl: `${config.PUBLIC_API_URL}/media/${relativePath.split('\\').join('/')}`,
    createdAt: new Date(),
  }
  const result = await (await db()).collection<Asset>('assets').insertOne(asset)
  return reply.code(201).send({ data: assetDto({ ...asset, _id: result.insertedId }) })
})

app.post('/v1/assets', async (request, reply) => {
  const input = z.object({ workspaceId, name: z.string().min(1), mimeType: z.string().min(3), kind: z.enum(['image', 'video']), storageKey: z.string().min(1), publicUrl: z.string().url() }).parse(request.body)
  const asset: Asset = { ...input, createdAt: new Date() }
  const result = await (await db()).collection<Asset>('assets').insertOne(asset)
  return reply.code(201).send({ data: assetDto({ ...asset, _id: result.insertedId }) })
})

app.get('/v1/publications', async (request) => {
  const { workspaceId: id } = z.object({ workspaceId }).parse(request.query)
  const data = await (await db()).collection<Publication>('publications').find({ workspaceId: id }).sort({ scheduledAt: 1, createdAt: -1 }).toArray()
  return { data: data.map(publicationDto) }
})

app.post('/v1/publications', async (request, reply) => {
  const input = publicationInput.parse(request.body)
  const asset = await (await db()).collection<Asset>('assets').findOne({ _id: new ObjectId(input.assetId), workspaceId: input.workspaceId })
  if (!asset) return reply.code(422).send({ error: 'Le média est introuvable dans cet espace.' })
  const now = new Date()
  const publication: Publication = { ...input, assetId: new ObjectId(input.assetId), status: 'draft', createdAt: now, updatedAt: now }
  const result = await (await db()).collection<Publication>('publications').insertOne(publication)
  return reply.code(201).send({ data: publicationDto({ ...publication, _id: result.insertedId }) })
})

app.post('/v1/publications/:id/schedule', async (request, reply) => {
  const { id } = z.object({ id: objectId }).parse(request.params)
  const { scheduledAt } = z.object({ scheduledAt: z.coerce.date() }).parse(request.body)
  if (scheduledAt.getTime() < Date.now() - 60_000) return reply.code(422).send({ error: 'La date de planification doit être dans le futur.' })
  const database = await db()
  const publication = await database.collection<Publication>('publications').findOneAndUpdate(
    { _id: new ObjectId(id), status: { $in: ['draft', 'failed'] } },
    { $set: { status: 'scheduled', scheduledAt, updatedAt: new Date() } },
    { returnDocument: 'after' },
  )
  if (!publication) return reply.code(404).send({ error: 'Publication introuvable ou non planifiable.' })
  await queuePublication(id, scheduledAt)
  return { data: publicationDto(publication) }
})

app.get('/v1/connections', async (request) => {
  const { workspaceId: id } = z.object({ workspaceId }).parse(request.query)
  const saved = await (await db()).collection<Connection>('connections').find({ workspaceId: id }).toArray()
  return { data: platforms.map((platform) => {
    const connection = saved.find((item) => item.platform === platform)
    return { platform, connected: Boolean(connection?.connectedAt), accountName: connection?.accountName, connectedAt: connection?.connectedAt?.toISOString() }
  }) }
})

app.get('/v1/auth/instagram', async (request, reply) => {
  if (!config.INSTAGRAM_APP_ID || !config.INSTAGRAM_APP_SECRET) {
    return reply.code(503).send({ error: 'La connexion Instagram n’est pas encore configurée sur le serveur.' })
  }
  const { workspaceId: id } = z.object({ workspaceId }).parse(request.query)
  const state = randomBytes(32).toString('base64url')
  await (await db()).collection('oauthStates').insertOne(oauthState.parse({
    workspaceId: id,
    stateHash: createHash('sha256').update(state).digest('hex'),
    provider: 'instagram',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  }))
  const authorizationUrl = new URL('https://www.instagram.com/oauth/authorize')
  authorizationUrl.search = new URLSearchParams({
    client_id: config.INSTAGRAM_APP_ID,
    redirect_uri: config.INSTAGRAM_REDIRECT_URI,
    response_type: 'code',
    scope: 'instagram_business_basic,instagram_business_content_publish',
    state,
  }).toString()
  return reply.redirect(authorizationUrl.toString())
})

app.get('/v1/auth/instagram/callback', async (request, reply) => {
  const query = z.object({ code: z.string().optional(), state: z.string().optional(), error: z.string().optional() }).parse(request.query)
  const resultUrl = new URL(config.WEB_ORIGIN)
  resultUrl.searchParams.set('settings', 'connections')
  if (query.error || !query.code || !query.state || !config.INSTAGRAM_APP_ID || !config.INSTAGRAM_APP_SECRET) {
    resultUrl.searchParams.set('notice', 'instagram-error')
    return reply.redirect(resultUrl.toString())
  }
  const stateHash = createHash('sha256').update(query.state).digest('hex')
  const pending = await (await db()).collection('oauthStates').findOneAndDelete({ stateHash, provider: 'instagram', expiresAt: { $gt: new Date() } })
  if (!pending) {
    resultUrl.searchParams.set('notice', 'instagram-error')
    return reply.redirect(resultUrl.toString())
  }
  try {
    const form = new URLSearchParams({
      client_id: config.INSTAGRAM_APP_ID,
      client_secret: config.INSTAGRAM_APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: config.INSTAGRAM_REDIRECT_URI,
      code: query.code,
    })
    const exchange = await fetch('https://api.instagram.com/oauth/access_token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: form })
    const exchanged = await exchange.json() as { access_token?: string, user_id?: string, error_type?: string, error_message?: string }
    if (!exchange.ok || !exchanged.access_token) throw new Error(exchanged.error_message || exchanged.error_type || 'Échange du code refusé.')

    let accessToken = exchanged.access_token
    let expiresIn: number | undefined
    const longLivedUrl = new URL('https://graph.instagram.com/access_token')
    longLivedUrl.search = new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: config.INSTAGRAM_APP_SECRET, access_token: accessToken }).toString()
    const longLived = await fetch(longLivedUrl)
    if (longLived.ok) {
      const value = await longLived.json() as { access_token?: string, expires_in?: number }
      if (value.access_token) { accessToken = value.access_token; expiresIn = value.expires_in }
    }

    const profileUrl = new URL('https://graph.instagram.com/me')
    profileUrl.search = new URLSearchParams({ fields: 'user_id,username', access_token: accessToken }).toString()
    const profileResponse = await fetch(profileUrl)
    const profile = profileResponse.ok ? await profileResponse.json() as { user_id?: string, id?: string, username?: string } : {}
    const now = new Date()
    await (await db()).collection<Connection>('connections').updateOne(
      { workspaceId: pending.workspaceId as string, platform: 'instagram' },
      { $set: {
        accountName: profile.username || 'Compte Instagram',
        externalAccountId: profile.user_id || profile.id || exchanged.user_id,
        tokenCiphertext: encryptConnectionToken(accessToken),
        tokenExpiresAt: expiresIn ? new Date(now.getTime() + expiresIn * 1000) : undefined,
        connectedAt: now,
        updatedAt: now,
      } },
      { upsert: true },
    )
    resultUrl.searchParams.set('notice', 'instagram-connected')
  } catch (error) {
    app.log.error(error, 'Instagram OAuth callback failed')
    resultUrl.searchParams.set('notice', 'instagram-error')
  }
  return reply.redirect(resultUrl.toString())
})

app.get('/v1/internal/connections/:platform/token', async (request, reply) => {
  if (request.headers['x-relay-secret'] !== config.N8N_SHARED_SECRET) return reply.code(401).send({ error: 'Non autorisé' })
  const { platform } = z.object({ platform: z.literal('instagram') }).parse(request.params)
  const { workspaceId: id } = z.object({ workspaceId }).parse(request.query)
  const connection = await (await db()).collection<Connection>('connections').findOne({ workspaceId: id, platform })
  if (!connection?.tokenCiphertext) return reply.code(404).send({ error: 'Aucun compte Instagram connecté.' })
  return { data: { accessToken: decryptConnectionToken(connection.tokenCiphertext), accountId: connection.externalAccountId, expiresAt: connection.tokenExpiresAt?.toISOString() } }
})

app.get('/v1/dashboard', async (request) => {
  const { workspaceId: id } = z.object({ workspaceId }).parse(request.query)
  const database = await db()
  const [assets, publications, connections] = await Promise.all([
    database.collection<Asset>('assets').countDocuments({ workspaceId: id }),
    database.collection<Publication>('publications').find({ workspaceId: id }).sort({ scheduledAt: 1, createdAt: -1 }).toArray(),
    database.collection<Connection>('connections').countDocuments({ workspaceId: id, connectedAt: { $exists: true } }),
  ])
  const upcoming = publications.find((publication) => publication.status === 'scheduled' && publication.scheduledAt && publication.scheduledAt.getTime() >= Date.now())
  const byStatus = Object.fromEntries(['draft', 'scheduled', 'dispatching', 'published', 'failed'].map((status) => [status, publications.filter((publication) => publication.status === status).length]))
  return { data: { assets, connections, byStatus, upcoming: upcoming ? publicationDto(upcoming) : null } }
})

app.get('/v1/analytics', async (request) => {
  const { workspaceId: id } = z.object({ workspaceId }).parse(request.query)
  const database = await db()
  const publicationIds = (await database.collection<Publication>('publications').find({ workspaceId: id }, { projection: { _id: 1 } }).toArray()).flatMap((item) => item._id ? [item._id.toHexString()] : [])
  const deliveries = publicationIds.length ? await database.collection('deliveryEvents').aggregate([
    { $match: { publicationId: { $in: publicationIds }, status: 'published' } },
    { $group: { _id: '$platform', published: { $sum: 1 } } },
  ]).toArray() : []
  return { data: { published: deliveries.reduce((total, item) => total + item.published, 0), byPlatform: deliveries.map((item) => ({ platform: item._id, published: item.published })), metricsAvailable: false } }
})

app.post('/v1/internal/deliveries/:publicationId', async (request, reply) => {
  if (request.headers['x-relay-secret'] !== config.N8N_SHARED_SECRET) return reply.code(401).send({ error: 'Non autorisé' })
  const { publicationId } = z.object({ publicationId: objectId }).parse(request.params)
  const input = z.object({ platform: z.enum(platforms), status: z.enum(['published', 'failed']), externalPostId: z.string().optional(), error: z.string().optional() }).parse(request.body)
  const database = await db()
  await database.collection('deliveryEvents').insertOne({ publicationId, ...input, createdAt: new Date() })
  if (input.status === 'failed') await database.collection<Publication>('publications').updateOne({ _id: new ObjectId(publicationId) }, { $set: { status: 'failed', updatedAt: new Date() } })
  if (input.status === 'published') {
    const publication = await database.collection<Publication>('publications').findOne({ _id: new ObjectId(publicationId) })
    const delivered = await database.collection('deliveryEvents').distinct('platform', { publicationId, status: 'published' })
    if (publication && delivered.length === publication.destinations.length) await database.collection<Publication>('publications').updateOne({ _id: publication._id }, { $set: { status: 'published', publishedAt: new Date(), updatedAt: new Date() } })
  }
  return reply.code(202).send({ accepted: true })
})

async function close() { await app.close(); await closeDatabase() }
process.on('SIGTERM', close)
process.on('SIGINT', close)
await app.listen({ port: config.API_PORT, host: '0.0.0.0' })
