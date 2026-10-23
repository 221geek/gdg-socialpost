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
  caption: string
  destinations: Platform[]
  status: PublicationStatus
  scheduledAt?: Date
  publishedAt?: Date
  createdAt: Date
  updatedAt: Date
}
