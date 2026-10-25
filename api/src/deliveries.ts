import { Db, ObjectId } from 'mongodb'
import { Delivery, DeliveryEvent, Platform, Publication } from './types.js'

type EventInput = Omit<DeliveryEvent, '_id' | 'publicationId' | 'createdAt'>

// Every step is written both to MongoDB (visible in the back office) and to stdout (Coolify logs).
export async function logEvent(database: Db, publicationId: string, event: EventInput) {
  const entry: DeliveryEvent = { publicationId, ...event, createdAt: new Date() }
  console[event.level === 'error' ? 'error' : 'log'](JSON.stringify({ scope: 'delivery', ...entry }))
  await database.collection<DeliveryEvent>('deliveryEvents').insertOne(entry)
}

export async function setDelivery(database: Db, publicationId: ObjectId, platform: Platform, delivery: Omit<Delivery, 'updatedAt'>) {
  await database.collection<Publication>('publications').updateOne(
    { _id: publicationId },
    { $set: { [`deliveries.${platform}`]: { ...delivery, updatedAt: new Date() }, updatedAt: new Date() } },
  )
}

// Derives the publication status from its per-platform deliveries once none is pending anymore.
export async function settlePublication(database: Db, publicationId: ObjectId) {
  const publications = database.collection<Publication>('publications')
  const publication = await publications.findOne({ _id: publicationId })
  if (!publication || publication.status !== 'dispatching') return publication
  const states = publication.destinations.map((platform) => publication.deliveries?.[platform]?.status)
  if (states.some((state) => !state || state === 'pending')) return publication
  const failed = publication.destinations.filter((platform) => publication.deliveries?.[platform]?.status === 'failed')
  const now = new Date()
  const update = failed.length
    ? { $set: { status: 'failed' as const, lastError: failed.map((platform) => `${platform}: ${publication.deliveries?.[platform]?.error}`).join(' · '), updatedAt: now } }
    : { $set: { status: 'published' as const, publishedAt: now, updatedAt: now }, $unset: { lastError: '' as const } }
  return publications.findOneAndUpdate({ _id: publicationId, status: 'dispatching' }, update, { returnDocument: 'after' })
}
