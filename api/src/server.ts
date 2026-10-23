import Fastify from 'fastify'
import cors from '@fastify/cors'
import { ObjectId } from 'mongodb'
import { z } from 'zod'
import { config } from './config.js'
import { closeDatabase, db } from './database.js'
import { queuePublication } from './queue.js'
import { Asset, platforms, Publication } from './types.js'

const app = Fastify({ logger: true })
await app.register(cors, { origin: config.WEB_ORIGIN })

const workspaceId = z.string().min(1)
const objectId = z.string().regex(/^[0-9a-f]{24}$/i, 'Identifiant invalide')
const publicationInput = z.object({
  workspaceId,
  assetId: objectId,
  caption: z.string().max(2200).default(''),
  destinations: z.array(z.enum(platforms)).min(1),
})

app.get('/health', async () => {
  await (await db()).command({ ping: 1 })
  return { ok: true, service: 'relay-api' }
})

app.get('/v1/assets', async (request) => {
  const { workspaceId: id } = z.object({ workspaceId }).parse(request.query)
  const assets = await (await db()).collection<Asset>('assets').find({ workspaceId: id }).sort({ createdAt: -1 }).toArray()
  return { data: assets }
})

app.post('/v1/assets', async (request, reply) => {
  const input = z.object({ workspaceId, name: z.string().min(1), mimeType: z.string().min(3), kind: z.enum(['image', 'video']), storageKey: z.string().min(1), publicUrl: z.string().url() }).parse(request.body)
  const asset: Asset = { ...input, createdAt: new Date() }
  const result = await (await db()).collection<Asset>('assets').insertOne(asset)
  return reply.code(201).send({ data: { ...asset, _id: result.insertedId } })
})

app.get('/v1/publications', async (request) => {
  const { workspaceId: id } = z.object({ workspaceId }).parse(request.query)
  const data = await (await db()).collection<Publication>('publications').find({ workspaceId: id }).sort({ scheduledAt: 1, createdAt: -1 }).toArray()
  return { data }
})

app.post('/v1/publications', async (request, reply) => {
  const input = publicationInput.parse(request.body)
  const asset = await (await db()).collection<Asset>('assets').findOne({ _id: new ObjectId(input.assetId), workspaceId: input.workspaceId })
  if (!asset) return reply.code(422).send({ error: 'Le média est introuvable dans cet espace.' })
  const now = new Date()
  const publication: Publication = { ...input, assetId: new ObjectId(input.assetId), status: 'draft', createdAt: now, updatedAt: now }
  const result = await (await db()).collection<Publication>('publications').insertOne(publication)
  return reply.code(201).send({ data: { ...publication, _id: result.insertedId } })
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
  return { data: publication }
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
    if (publication && delivered.length === publication.destinations.length) {
      await database.collection<Publication>('publications').updateOne(
        { _id: publication._id },
        { $set: { status: 'published', publishedAt: new Date(), updatedAt: new Date() } },
      )
    }
  }
  return reply.code(202).send({ accepted: true })
})

async function close() { await app.close(); await closeDatabase() }
process.on('SIGTERM', close)
process.on('SIGINT', close)
await app.listen({ port: config.API_PORT, host: '0.0.0.0' })
