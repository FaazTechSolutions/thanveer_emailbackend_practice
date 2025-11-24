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
//  */
// const config: sql.config = {
//   user: process.env.DB_USER || "ftsdev",
//   password: process.env.DB_PASSWORD || "Faaz@123",
//   server: process.env.DB_SERVER || "ftsdev.database.windows.net",
//   database: process.env.DB_NAME || "FreeServerLess",
//   port: parseInt(process.env.DB_PORT || "1433"),
//   options: {
//     encrypt: true,
//     trustServerCertificate: false,
//     enableArithAbort: true,
//     connectTimeout: 30000,
//   },
//   pool: {
//     max: 10,
//     min: 0,
//     idleTimeoutMillis: 30000,
//   },
// };
const config: sql.config = {
  user: process.env.DB_USER || "OCRADMIN",
  password: process.env.DB_PASSWORD || "Pass@3210",
  server: process.env.DB_SERVER || "dm.mawarid.com.sa",
  database: process.env.DB_NAME || "EmailAgentTest",
  port: parseInt(process.env.DB_PORT || "1433"),
  options: {
    encrypt: process.env.DB_ENCRYPT ? process.env.DB_ENCRYPT === "true" : true,
    trustServerCertificate: process.env.DB_TRUST_CERT
      ? process.env.DB_TRUST_CERT === "true"
      : true,
    enableArithAbort: true,
    connectTimeout: 30000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

if (!config.user || !config.server || !config.database) {
  throw new Error("Database configuration is incomplete.");
}

async function bootstrap() {
  const pool = await sql.connect(config);
  const app = express();
  //  await setupTablesMSSQL();
  app.set("trust proxy", true);
  app.use(bodyParser.json());
  app.use(cors());

  // ============================================================
  // GLOBAL LOGGER
  // ============================================================
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
    console.log(`[REQUEST] ${req.method} ${fullUrl}`);
    next();
  });

  // ============================================================
  // IIS X-ORIGINAL-URL MIDDLEWARE (YOU SAID THIS MUST STAY)
  // ============================================================
  app.use((req: Request, _res: Response, next: NextFunction) => {
    try {
      const originalUrl = (req.headers["x-original-url"] as string) || "";

      if (originalUrl) {
        console.log("X-Original-URL:", originalUrl);

        if (originalUrl.startsWith("/EmailAgent")) {
          req.url = originalUrl.substring("/EmailAgent".length) || "/";
          console.log("Rewritten to:", req.url);
        } else {
          req.url = originalUrl;
          console.log("Normalized req.url:", req.url);
        }
      }
    } catch (err) {
      console.error("IIS rewrite middleware error:", err);
    }
    next();
  });

  // ============================================================
  // NO ROUTER — DIRECT ENDPOINTS
  // ============================================================

  // ROOT
  app.get("/", (_req, res) => {
    res.json({
      message: "📨 Email Agent API running",
      status: "online",
      timestamp: new Date().toISOString(),
    });
  });

  // HEALTH
  app.get("/health", (_req, res) => {
    res.json({
      status: "healthy",
      database: pool.connected ? "connected" : "disconnected",
      time: new Date().toISOString(),
    });
  });

  // MULTIPLE MAIL PROCESS
  app.get("/process-multiple-mails", async (req, res) => {
    const page = Number(req.query.page) || 1;
    const size = Number(req.query.size) || 1;
    const specificReqId = req.query.req_id as string;

    try {
      const emails = await fetchEmails(page, size, specificReqId);
      if (!emails || emails.length === 0) {
        return res.json({ success: true, total: 0 });
      }

      const processed: any[] = [];
      for (const email of emails) {
        try {
          const output = await processSingleEmail(email, specificReqId);
          processed.push(output);
        } catch (err: any) {
          console.error("Processing error:", err);
        }
      }

      res.json({
        success: true,
        total: processed.length,
        table: specificReqId ? "emails_reprocess" : "emails_cleaned",
        data: processed,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // SINGLE MAIL PROCESS
  app.get("/process-single-mail", async (req, res) => {
    const reqid = String(req.query.req_id || "").trim();
    if (!reqid) return res.status(400).json({ error: "req_id required" });

    try {
      const emails = await fetchEmails(1, 1, reqid);
      if (!emails.length) return res.json({ success: true, total: 0 });

      const processedEmail = await processSingleEmail(emails[0], reqid);
      res.json({ success: true, processedEmail });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // GET CLEANED
  app.get("/get-mails", async (req, res) => {
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

      res.json({ success: true, data: result.recordset });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // GET REPROCESS
  app.get("/get-mails-from-reprocess", async (req, res) => {
    const reqId = String(req.query.req_id || "");
    if (!reqId) return res.status(400).json({ error: "req_id required" });

    try {
      const result = await pool
        .request()
        .input("reqId", sql.VarChar, reqId)
        .query(`
          SELECT *
          FROM emails_reprocess
          WHERE req_id = @reqId
          ORDER BY id ASC;
        `);

      res.json({ success: true, data: result.recordset });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // GET CLEAN MAIL BY req_id
  app.get("/get-mail-from-cleaned", async (req, res) => {
    const reqId = String(req.query.req_id || "");
    if (!reqId) return res.status(400).json({ error: "req_id required" });

    try {
      const result = await pool
        .request()
        .input("reqId", sql.VarChar, reqId)
        .query(`
          SELECT *
          FROM emails_cleaned
          WHERE req_id = @reqId
          ORDER BY id DESC;
        `);

      res.json({ success: true, data: result.recordset });
    } catch (err: any) {
      res.status(500).json({ error: err?.message });
    }
  });

  // ============================================================
  // 404 & ERROR HANDLER
  // ============================================================
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: "Route not found",
      path: req.path,
    });
  });

  app.use((err: any, _req, res, _next) => {
    console.error("Server error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: process.env.NODE_ENV === "production" ? undefined : err?.message,
    });
  });

  // START SERVER
  const PORT = process.env.PORT || 3000
  app.listen(PORT, () => {
    console.log(`
========================================
🚀 Email Agent API Started
Base Path : /EmailAgent
Port      : ${PORT}
========================================
    `);
  });
}

bootstrap().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
