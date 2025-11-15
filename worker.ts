// worker.ts
import dotenv from "dotenv";
dotenv.config();

import { Worker } from "bullmq";
import { redisConnection } from "./queues.js";
import fetchEmails from "./helpers/fetchmails.js";
import processSingleEmail from "./helpers/process1emai.js";

const concurrency = 5;

// PROCESSING MULTI EMAIL IMPORT
new Worker(
  "fetch-ingest",
  async job => {
    const { page, size, specificReqId } = job.data;

    console.log(`[Worker] Running fetch-ingest job ${job.id}`);

    const emails = await fetchEmails(page, size, specificReqId);

    if (!emails.length) return { processed: 0 };

    const output = [];

    for (const email of emails) {
      try {
        await processSingleEmail(email, specificReqId);
        output.push({ reqid: email.RecId, status: "done" });
      } catch (err) {
        output.push({ reqid: email.RecId, status: "failed", msg: err.message });
      }
    }

    return { total: output.length, output };
  },
  { connection: redisConnection, concurrency }
);

// PROCESSING SINGLE EMAIL
new Worker(
  "ingest-email",
  async job => {
    const { reqid } = job.data;

    console.log(`[Worker] Running ingest-email job ${job.id}`);

    const emails = await fetchEmails(1, 1, reqid);
    if (!emails.length) return { processed: 0 };

    const result = await processSingleEmail(emails[0], reqid);

    return { processed: 1, data: result };
  },
  { connection: redisConnection, concurrency: 3 }
);
