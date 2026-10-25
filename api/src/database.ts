import { Db, MongoClient } from 'mongodb'
import { config } from './config.js'

let client: MongoClient | undefined
let database: Db | undefined

export async function db() {
  if (!database) {
    client = new MongoClient(config.MONGODB_URI, { ignoreUndefined: true })
    await client.connect()
    database = client.db()
    await database.collection('assets').createIndex({ workspaceId: 1, createdAt: -1 })
    await database.collection('assetComments').createIndex({ assetId: 1, createdAt: 1 })
    await database.collection('publicationComments').createIndex({ publicationId: 1, createdAt: 1 })
    await database.collection('publications').createIndex({ workspaceId: 1, scheduledAt: 1 })
    await database.collection('publications').createIndex({ status: 1, scheduledAt: 1 })
    await database.collection('assets').createIndex({ workspaceId: 1, createdAt: -1 })
    await database.collection('connections').createIndex({ workspaceId: 1, platform: 1 }, { unique: true })
    await database.collection('oauthStates').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    await database.collection('socialConnections').createIndex({ workspaceId: 1, platform: 1 }, { unique: true })
    await database.collection('deliveryEvents').createIndex({ publicationId: 1, createdAt: -1 })
    await database.collection('users').createIndex({ email: 1 }, { unique: true })
    await database.collection('sessions').createIndex({ tokenHash: 1 }, { unique: true })
    await database.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
  }
  return database
}

export async function closeDatabase() {
  await client?.close()
}
