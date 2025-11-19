import express, { Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import sql from "mssql";
import dotenv from "dotenv";
import cors from "cors";

import cleanEmail from "./utils/email_cleaner/index.js";
import setupTablesMSSQL from "./db/mssqlsetup.js";
import { translateEmail } from "./utils/transulate/index.js";
import { processEmailAnalysis } from "./utils/analyser/index.js";
import fetchEmails from "./helpers/fetchmails.js";
import processSingleEmail from "./helpers/process1emai.js";

dotenv.config();

/**
 * DATABASE CONFIG
 */
const config: sql.config = {
  user: process.env.DB_USER || "ftsdev",
  password: process.env.DB_PASSWORD || "Faaz@123",
  server: process.env.DB_SERVER || "ftsdev.database.windows.net",
  database: process.env.DB_NAME || "FreeServerLess",
  port: parseInt(process.env.DB_PORT || "1433"),
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true,
    connectTimeout: 30000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Validate essential config
if (!config.user || !config.server || !config.database) {
  throw new Error("Database configuration is incomplete. Check your .env file.");
}

/**
 * BOOTSTRAP
 */
async function bootstrap() {
  // DB Connection (pool)
  const pool = await sql.connect(config);

  // Express app
  const app = express();

  // Trust proxy (IIS/reverse-proxy) so req.protocol works
  app.set("trust proxy", true);

  // Global middleware
  app.use(bodyParser.json());
  app.use(cors());

  // Safety: If you want to create tables at startup, uncomment and call setupTablesMSSQL
  // await setupTablesMSSQL(pool);

  // ===== Global request logger (full URL) =====
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    console.log(`[REQUEST] ${req.method} ${fullUrl}`);
    next();
  });

  // ===== IIS x-original-url rewrite (safety) =====
  // If IIS sets x-original-url (when running as sub-app), normalize req.url.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    try {
      const originalUrl = (req.headers["x-original-url"] as string) || "";
      if (originalUrl && typeof originalUrl === "string") {
        // If IIS forwarded a path like /EmailAgent/..., rewrite req.url accordingly
        if (originalUrl.startsWith("/EmailAgent")) {
          // Keep leading slash and everything after prefix
          req.url = originalUrl.substring("/EmailAgent".length) || "/";
          console.log(`[IIS REWRITE] incoming originalUrl=${originalUrl} -> req.url=${req.url}`);
        } else {
          // if originalUrl exists but doesn't start with prefix, still ensure req.url equals it
          req.url = originalUrl;
          console.log(`[IIS REWRITE] normalized req.url=${req.url}`);
        }
      }
    } catch (err) {
      console.error("IIS rewrite middleware error:", err);
    }
    next();
  });

  // ===== Create router and mount under base path /EmailAgent =====
  const router = express.Router();

  // ROOT - /EmailAgent/
  router.get("/", (req: Request, res: Response) => {
    try {
      res.status(200).json({
        message: "📨 Email Agent API (IIS-ready) is running",
        status: "online",
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Root route error:", err);
      res.status(500).json({ error: err?.message ?? "unknown" });
    }
  });

  // HEALTH - /EmailAgent/health
  router.get("/health", (_req: Request, res: Response) => {
    try {
      res.status(200).json({
        status: "healthy",
        database: (pool.connected ? "connected" : "disconnected"),
        time: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Health route error:", err);
      res.status(500).json({ error: err?.message ?? "unknown" });
    }
  });

  // ===========================================================
  // FETCH & INGEST - /EmailAgent/fetch-and-ingest
  // ===========================================================
  router.get("/process-multiple-mails", async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const size = Number(req.query.size) || 1;
    const specificReqId = (req.query.req_id as string) || undefined;

    console.log(`
=============================================================
📥 FETCH & INGEST INITIATED
→ Page: ${page}, Size: ${size}, ReqID: ${specificReqId ?? "ALL"}
=============================================================
    `);

    try {
      const emails = await fetchEmails(page, size, specificReqId);

      if (!emails || emails.length === 0) {
        return res.status(200).json({ success: true, total: 0 });
      }

      const processed: any[] = [];

      for (const email of emails) {
        const reqid = email.RecId;
        try {
          const processedEmail = await processSingleEmail(email, specificReqId);
          processed.push(processedEmail);
        } catch (err: any) {
          console.error(`❌ PROCESS ERROR reqid=${reqid}`, err?.message ?? err);
        }
      }

      return res.status(200).json({
        success: true,
        total: processed.length,
        table: specificReqId ? "emails_reprocess" : "emails_cleaned",
        data: processed,
      });
    } catch (err: any) {
      console.error("❌ Unexpected error:", err?.message ?? err);
      return res.status(500).json({ success: false, error: err?.message ?? "unexpected" });
    }
  });

  // ===========================================================
  // INGEST ONE EMAIL - /EmailAgent/ingest-email
  // ===========================================================
  router.get("/process-single-mail", async (req: Request, res: Response) => {
    const reqid = String(req.query.req_id || "").trim();
    if (!reqid) return res.status(400).json({ success: false, error: "reqid required" });

    try {
      const emails = await fetchEmails(1, 1, reqid);
      if (!emails || emails.length === 0) return res.status(200).json({ success: true, total: 0 });

      const processedEmail = await processSingleEmail(emails[0], reqid);
      return res.json({ success: true, processedEmail });
    } catch (err: any) {
      console.error("Ingest single error:", err);
      return res.status(500).json({ success: false, error: err?.message ?? "error" });
    }
  });

  // ===========================================================
  // GET CLEANED EMAILS - /EmailAgent/mails
  // ===========================================================
  router.get("/get-mails", async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 5;
    const offset = Number(req.query.offset) || 0;

    try {
      const result = await pool
        .request()
        .input("limit", sql.Int, limit)
        .input("offset", sql.Int, offset)
        .query(`
          SELECT *
          FROM emails_cleaned
          ORDER BY created_at DESC
          OFFSET @offset ROWS
          FETCH NEXT @limit ROWS ONLY;
        `);

      return res.json({
        success: true,
        count: result.recordset.length,
        data: result.recordset,
      });
    } catch (err: any) {
      console.error("DB error (mails):", err);
      return res.status(500).json({ success: false, error: err?.message ?? "db error" });
    }
  });

  // ===========================================================
  // GET REPROCESSED EMAILS BY REQ_ID - /EmailAgent/email-by-reqid
  // ===========================================================

  router.get("/get-mails-from-reprocess", async (req: Request, res: Response) => {
    const reqId = String(req.query.req_id || "").trim();
    if (!reqId) return res.status(400).json({ success: false, error: "req_id required" });

    try {
      const result = await pool
        .request()
        .input("reqId", sql.VarChar, reqId)
        .query(`
          SELECT id, req_id, process_label, pretext, core, posttext,
                 clean_text, original_email, translated_content,
                 analysis_result, created_at
          FROM emails_reprocess
          WHERE req_id = @reqId
          ORDER BY id ASC;
        `);

      return res.json({ success: true, data: result.recordset });
    } catch (err: any) {
      console.error("DB error (email-by-reqid):", err);
      return res.status(500).json({ success: false, error: err?.message ?? "db error" });
    }
  });
  // ===========================================================
// GET SINGLE CLEANED EMAIL BY req_id - /EmailAgent/get-clean-mail
// ===========================================================
router.get("/get-mail-from-cleaned", async (req: Request, res: Response) => {
  const reqId = String(req.query.req_id || "").trim();
  if (!reqId)
    return res.status(400).json({ success: false, error: "req_id required" });

  try {
    const result = await pool
      .request()
      .input("reqId", sql.VarChar, reqId)
      .query(`
        SELECT id, req_id, pretext, core, posttext,
               clean_text, original_email, translated_content,
               analysis_result, created_at
        FROM emails_cleaned
        WHERE req_id = @reqId
        ORDER BY id DESC;
      `);

    return res.json({
      success: true,
      count: result.recordset.length,
      data: result.recordset,
    });
  } catch (err: any) {
    console.error("DB error (get-clean-mail):", err);
    return res.status(500).json({
      success: false,
      error: err?.message ?? "db error",
    });
  }
});


  // Optional: you still have your helpers like translateEmail, processEmailAnalysis available
  // If you want routes that call those, add them here (e.g. /translate, /analyze), else leave as internal.

  // Mount router under base path
  app.use("/EmailAgent", router);

  // 404 Handler (for everything else)
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: "Route not found",
      path: req.path,
      method: req.method,
    });
  });

  // Error handler (last)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Server Error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: process.env.NODE_ENV === "production" ? undefined : err?.message ?? String(err),
    });
  });

  // START SERVER
  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, () => {
    console.log(`
========================================
🚀 Email Agent API (IIS-ready) Started
Base Path : /EmailAgent
Port      : ${PORT}
Environment: ${process.env.NODE_ENV || "development"}
Database  : ${config.server}/${config.database}
Time      : ${new Date().toISOString()}
========================================
    `);
  });
}

bootstrap().catch((err) => {
  console.error("❌ Fatal startup error:", err);
  process.exit(1);
});
