import { ObjectId } from 'mongodb'

export const platforms = ['instagram', 'tiktok', 'linkedin', 'youtube'] as const
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
