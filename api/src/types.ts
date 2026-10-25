import { ObjectId } from 'mongodb'

export const platforms = ['instagram', 'tiktok', 'linkedin', 'youtube', 'x'] as const
export type Platform = typeof platforms[number]
export type PublicationStatus = 'draft' | 'scheduled' | 'dispatching' | 'published' | 'failed'

export interface Asset {
  _id?: ObjectId
  workspaceId: string
  name: string
  mimeType: string
  kind: 'image' | 'video'
  storageKey: string
  publicUrl: string
  createdAt: Date
}

export interface AssetComment {
  _id?: ObjectId
  workspaceId: string
  assetId: ObjectId
  authorId?: ObjectId
  authorEmail: string
  body: string
  createdAt: Date
  updatedAt: Date
}

export interface PublicationComment {
  _id?: ObjectId
  workspaceId: string
  publicationId: ObjectId
  authorId?: ObjectId
  authorEmail: string
  body: string
  createdAt: Date
  updatedAt: Date
}

export type DeliveryStatus = 'pending' | 'published' | 'failed'

export interface Delivery {
  status: DeliveryStatus
  externalPostId?: string
  externalUrl?: string
  error?: string
  updatedAt: Date
}

export interface DeliveryEvent {
  _id?: ObjectId
  publicationId: string
  platform?: Platform
  level: 'info' | 'warn' | 'error'
  step: string
  message: string
  status?: 'published' | 'failed'
  externalPostId?: string
  attempt?: number
  createdAt: Date
}

export interface Publication {
  _id?: ObjectId
  workspaceId: string
  assetId: ObjectId
  title: string
  caption: string
  destinations: Platform[]
  status: PublicationStatus
  scheduledAt?: Date
  publishedAt?: Date
  dispatchStartedAt?: Date
  deliveries?: Partial<Record<Platform, Delivery>>
  lastError?: string
  createdAt: Date
  updatedAt: Date
}

export interface Connection {
  _id?: ObjectId
  workspaceId: string
  platform: Platform
  accountName?: string
  externalAccountId?: string
  tokenCiphertext?: string
  tokenExpiresAt?: Date
  scopes?: string[]
  connectedAt?: Date
  updatedAt: Date
}

export type UserRole = 'owner' | 'member'

export interface User {
  _id?: ObjectId
  email: string
  passwordHash?: string
  role: UserRole
  status: 'active'
  createdAt: Date
  updatedAt: Date
  passwordSetAt?: Date
  activationTokenHash?: string
  activationExpiresAt?: Date
}
