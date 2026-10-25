import { Queue } from 'bullmq'
import { config } from './config.js'

const connection = { url: config.REDIS_URL }
export const publishQueue = new Queue('publication-dispatch', { connection })

export async function queuePublication(publicationId: string, scheduledAt: Date) {
  const pendingJobs = await publishQueue.getJobs(['delayed', 'waiting', 'prioritized'])
  await Promise.all(pendingJobs.filter((job) => job.data.publicationId === publicationId).map((job) => job.remove()))
  const delay = Math.max(scheduledAt.getTime() - Date.now(), 0)
  // Each scheduling gets its own job: BullMQ silently ignores a jobId still held by a completed or failed job.
  // Double publishing is prevented by the atomic scheduled → dispatching claim in the worker.
  await publishQueue.add('publish', { publicationId }, {
    jobId: `publication:${publicationId}:${Date.now()}`,
    delay,
    attempts: 5,
    backoff: { type: 'exponential', delay: 30_000 },
    removeOnComplete: 1000,
    removeOnFail: 1000,
  })
}
