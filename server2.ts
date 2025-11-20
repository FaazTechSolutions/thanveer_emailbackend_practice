import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import { neon } from "@neondatabase/serverless";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL is not defined in the environment variables.");
}

const sql = neon(process.env.DATABASE_URL);
import cleanEmail from "./utils/email_cleaner/index.js";
import  setupTables from "./db/setuptables.js";
    
import fetchEmails from "./helpers/fetchmails.js";
import processSingleEmail from "./helpers/process1emai.js";

dotenv.config();

async function bootstrap() {
  console.log("🚀 Connecting to Neon...");
  await setupTables();

  const app = express();
  app.set("trust proxy", true);
  app.use(bodyParser.json());
  app.use(cors());

  // ======================================================
  // GLOBAL REQUEST LOGGER
  // ======================================================
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[REQUEST] ${req.method} ${req.originalUrl}`);
    next();
  });

  // ======================================================
  // IIS X-ORIGINAL-URL MIDDLEWARE (KEEP)
  // ======================================================
  app.use((req: Request, _res: Response, next: NextFunction) => {
    try {
      const originalUrl = (req.headers["x-original-url"] as string) || "";

      if (originalUrl) {
        console.log("X-Original-URL:", originalUrl);
        if (originalUrl.startsWith("/EmailAgent")) {
          req.url = originalUrl.substring("/EmailAgent".length) || "/";
        } else {
          req.url = originalUrl;
        }
        console.log("Rewritten URL:", req.url);
      }
    } catch (e) {
      console.error("Rewrite error", e);
    }
    next();
  });

  // ======================================================
  // ROOT
  // ======================================================
  app.get("/", (_req, res) => {
    res.json({
      message: "📨 Email Agent API (Neon Edition)",
      status: "online",
      timestamp: new Date().toISOString(),
    });
  });

  // ======================================================
  // HEALTH
  // ======================================================
  app.get("/health", async (_req, res) => {
    res.json({
      status: "healthy",
      database: "connected",
      time: new Date().toISOString(),
    });
  });

  // ======================================================
  // PROCESS MULTIPLE EMAILS
  // ======================================================
  app.get("/process-multiple-mails", async (req, res) => {
    const page = Number(req.query.page) || 1;
    const size = Number(req.query.size) || 1;
    const specificReqId = req.query.req_id as string;

    try {
      const emails = await fetchEmails(page, size, specificReqId);
      if (!emails.length) return res.json({ success: true, total: 0 });

      const processed = [];
      for (const email of emails) {
        try {
          processed.push(await processSingleEmail(email, specificReqId));
        } catch (e) {
          console.error("Process error:", e);
        }
      }

      res.json({
        success: true,
        total: processed.length,
        table: specificReqId ? "emails_reprocess" : "emails_cleaned",
        data: processed,
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  // ======================================================
  // PROCESS SINGLE EMAIL
  // ======================================================
  app.get("/process-single-mail", async (req, res) => {
    const reqId = String(req.query.req_id || "");
    if (!reqId) return res.status(400).json({ error: "req_id required" });

    try {
      const emails = await fetchEmails(1, 1, reqId);
      if (!emails.length) return res.json({ success: true, total: 0 });

      const processed = await processSingleEmail(emails[0], reqId);
      res.json({ success: true, processed });
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  // ======================================================
  // GET CLEANED EMAILS
  // ======================================================
  app.get("/get-mails", async (req, res) => {
    const limit = Number(req.query.limit) || 5;
    const offset = Number(req.query.offset) || 0;

    try {
      const rows = await sql`
        SELECT *
        FROM emails_cleaned
        ORDER BY created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      res.json({ success: true, data: rows });
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  // ======================================================
  // GET REPROCESS BY req_id
  // ======================================================
  app.get("/get-mails-from-reprocess", async (req, res) => {
    const reqId = String(req.query.req_id || "");
    if (!reqId) return res.status(400).json({ error: "req_id required" });

    try {
      const rows = await sql`
        SELECT *
        FROM emails_reprocess
        WHERE req_id = ${reqId}
        ORDER BY id ASC
      `;

      res.json({ success: true, data: rows });
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  // ======================================================
  // GET ONE CLEAN MAIL
  // ======================================================
  app.get("/get-mail-from-cleaned", async (req, res) => {
    const reqId = String(req.query.req_id || "");
    if (!reqId) return res.status(400).json({ error: "req_id required" });

    try {
      const rows = await sql`
        SELECT *
        FROM emails_cleaned
        WHERE req_id = ${reqId}
        ORDER BY id DESC
      `;
      res.json({ success: true, data: rows });
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  });

  // ======================================================
  // 404
  // ======================================================
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: "Route not found",
      path: req.path,
    });
  });

  // ======================================================
  // ERROR HANDLER
  // ======================================================
  app.use((err: any, _req, res, _next) => {
    res.status(500).json({
      success: false,
      message: err?.message,
    });
  });

  // ======================================================
  // START SERVER
  // ======================================================
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`
========================================
🚀 Email Agent API (NEON)
Port : ${PORT}
========================================
    `);
  });
}

bootstrap().catch((err) => {
  console.error("Startup failure:", err);
  process.exit(1);
});
