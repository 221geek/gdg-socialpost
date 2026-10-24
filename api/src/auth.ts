import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { ObjectId } from 'mongodb'
import { config } from './config.js'
import { db } from './database.js'
import type { User, UserRole } from './types.js'

const scrypt = promisify(scryptCallback)
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14
export const INVITATION_TTL_MS = 1000 * 60 * 60 * 24 * 7
const cookieName = 'relay_session'

export type SessionUser = Pick<User, '_id' | 'email' | 'role' | 'createdAt'>

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export function userDto(user: SessionUser) {
  return { id: user._id?.toHexString(), email: user.email, role: user.role, createdAt: user.createdAt.toISOString() }
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('base64url')
  const derived = await scrypt(password, salt, 64) as Buffer
  return `scrypt$${salt}$${derived.toString('base64url')}`
}

export async function passwordMatches(password: string, stored: string) {
  const [algorithm, salt, expected] = stored.split('$')
  if (algorithm !== 'scrypt' || !salt || !expected) return false
  const derived = await scrypt(password, salt, 64) as Buffer
  const expectedBuffer = Buffer.from(expected, 'base64url')
  return expectedBuffer.length === derived.length && timingSafeEqual(expectedBuffer, derived)
}

export function invitationHash(token: string) {
  return createHash('sha256').update(`relay:invitation:${config.AUTH_SECRET}:${token}`).digest('hex')
}

function sessionHash(token: string) {
  return createHash('sha256').update(`${config.AUTH_SECRET}:${token}`).digest('hex')
}

function readCookie(request: FastifyRequest, name: string) {
  const raw = request.headers.cookie || ''
  return raw.split(';').map((piece) => piece.trim()).find((piece) => piece.startsWith(`${name}=`))?.slice(name.length + 1)
}

export function setSessionCookie(reply: FastifyReply, token: string) {
  reply.header('set-cookie', `${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`)
}

export function clearSessionCookie(reply: FastifyReply) {
  reply.header('set-cookie', `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`)
}

export async function createSession(user: User) {
  const token = randomBytes(32).toString('base64url')
  const now = new Date()
  await (await db()).collection('sessions').insertOne({
    userId: user._id,
    tokenHash: sessionHash(token),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    createdAt: now,
    lastSeenAt: now,
  })
  return token
}

export async function authenticatedUser(request: FastifyRequest): Promise<SessionUser | null> {
  const token = readCookie(request, cookieName)
  if (!token) return null
  const database = await db()
  const session = await database.collection('sessions').findOneAndUpdate(
    { tokenHash: sessionHash(token), expiresAt: { $gt: new Date() } },
    { $set: { lastSeenAt: new Date() } },
    { returnDocument: 'after' },
  )
  if (!session?.userId) return null
  const user = await database.collection<User>('users').findOne({ _id: session.userId as ObjectId, status: 'active' })
  return user || null
}

export async function revokeSession(request: FastifyRequest) {
  const token = readCookie(request, cookieName)
  if (token) await (await db()).collection('sessions').deleteOne({ tokenHash: sessionHash(token) })
}

export async function ensureBootstrapOwner() {
  if (!config.RELAY_OWNER_EMAIL || !config.RELAY_OWNER_ACTIVATION_TOKEN) return
  const email = normalizeEmail(config.RELAY_OWNER_EMAIL)
  const now = new Date()
  await (await db()).collection<User>('users').updateOne(
    { email },
    { $setOnInsert: { email, role: 'owner', status: 'active', activationTokenHash: invitationHash(config.RELAY_OWNER_ACTIVATION_TOKEN), activationExpiresAt: new Date(now.getTime() + INVITATION_TTL_MS), createdAt: now, updatedAt: now } },
    { upsert: true },
  )
}

export function isOwner(user: SessionUser | undefined) {
  return user?.role === 'owner'
}

export function roleFrom(value: string | undefined): UserRole {
  return value === 'owner' ? 'owner' : 'member'
}
