// queues.ts
import { Queue } from "bullmq";
import IORedis from "ioredis";
import dotenv from "dotenv";
dotenv.config();
export const redisConnection = new IORedis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,

  // BullMQ required
  maxRetriesPerRequest: null,
  enableReadyCheck: false,

  // Production stability
  reconnectOnError: () => true,
  retryStrategy(times) {
    return Math.min(times * 50, 2000);
  },
});

export const fetchIngestQueue = new Queue("fetch-ingest", { connection: redisConnection });
export const ingestEmailQueue = new Queue("ingest-email", { connection: redisConnection });
