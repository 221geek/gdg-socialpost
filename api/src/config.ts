import 'dotenv/config'
import { z } from 'zod'

const environment = z.object({
  API_PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),
  UPLOAD_DIR: z.string().default('/data/uploads'),
  MONGODB_URI: z.string().min(1),
  REDIS_URL: z.string().min(1),
  N8N_PUBLISH_WEBHOOK_URL: z.string().url(),
  N8N_SHARED_SECRET: z.string().min(16),
  AUTH_SECRET: z.string().min(32).optional(),
  RELAY_OWNER_EMAIL: z.string().email().optional(),
  RELAY_OWNER_ACTIVATION_TOKEN: z.string().min(32).optional(),
  INSTAGRAM_APP_ID: z.string().min(1).optional(),
  INSTAGRAM_APP_SECRET: z.string().min(1).optional(),
  INSTAGRAM_REDIRECT_URI: z.string().url().optional(),
  X_CLIENT_ID: z.string().min(1).optional(),
  X_CLIENT_SECRET: z.string().min(1).optional(),
  X_REDIRECT_URI: z.string().url().optional(),
}).parse(process.env)

export const config = {
  ...environment,
  INSTAGRAM_REDIRECT_URI: environment.INSTAGRAM_REDIRECT_URI || `${environment.PUBLIC_API_URL}/v1/auth/instagram/callback`,
  X_REDIRECT_URI: environment.X_REDIRECT_URI || `${environment.PUBLIC_API_URL}/v1/auth/x/callback`,
  AUTH_SECRET: environment.AUTH_SECRET || environment.N8N_SHARED_SECRET,
}
