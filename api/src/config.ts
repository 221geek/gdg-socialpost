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
}).parse(process.env)

export const config = environment
