import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";
import cors from "cors";
import fetch from "node-fetch"; // Add this import

// Load environment variables first
dotenv.config();

// Import your modules after environment setup
import cleanEmail from "./utils/email_cleaner/index.js";
import setupTables from "./db/setuptables.js";
import { translateEmail } from "./utils/transulate/index.js";
import { processEmailAnalysis } from "./utils/analyser/index.js";
import fetchEmails from "./helpers/fetchmails.js";
import processSingleEmail from "./helpers/process1emai.js";

// Validate environment variables
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(process.env.DATABASE_URL);

interface CleanedEmail {
  pretext: string;
  core: string;
  posttext: string;
  cleanText: string;
  summary: string;
}

const app = express();
app.use(bodyParser.json());
const allowedOrigins = [
  "https://emailagentpractice.netlify.app",
  "http://localhost:3000", // optional for local dev
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow Postman or server-to-server requests
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `CORS policy: ${origin} not allowed`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// Add health check endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "AI Email Agents API is running", 
    status: "OK",
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    service: "AI Email Agents API"
  });
});

// Enhanced /emails endpoint with better error handling
app.get("/emails", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const size = parseInt(req.query.size as string) || 10;
  const orderBy = (req.query.orderby as string) || "CreatedDateTime";
  const orderDir = parseInt(req.query.orderdir as string) || 0;
  const typeFilter = (req.query.type as string) || "Tickets";

  const ENTITY_ID = "ETN0000041";
  const BASE_URL = "https://portal.mawarid.com.sa/apps4x-api/api/v1/data/LGE0000001";

  console.log(`📧 [FETCH_EMAILS] Request:`, { page, size, orderBy, orderDir, typeFilter });

  try {
    // Validate API token
    if (!process.env.Api_token) {
      throw new Error("API token is not configured");
    }

    // Build query params
    const params = new URLSearchParams({
      entityid: ENTITY_ID,
      $page: page.toString(),
      $size: size.toString(),
      $orderby: orderBy,
      $orderbydirection: orderDir.toString(),
      "$filter:Type": `eq:${typeFilter}`,
    });

    const apiUrl = `${BASE_URL}?${params.toString()}`;
    console.log(`🔗 [API_REQUEST] URL: ${apiUrl}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.Api_token}`,
        "Content-Type": "application/json",
        "User-Agent": "AIEmailAgents/1.0.0"
      },
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));

    console.log(`📡 [API_RESPONSE] Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [API_ERROR] HTTP ${response.status}:`, errorText.substring(0, 200));
      throw new Error(`API responded with status ${response.status}`);
    }

    const data:any = await response.json();
    console.log(`✅ [API_SUCCESS] Received ${data?.Items?.length || data?.length || 0} items`);

    return res.status(200).json({
      success: true,
      page,
      size,
      total: data?.TotalCount || data?.length || 0,
      data: data?.Items || data,
    });
  } catch (err: any) {
    console.error("❌ Fetch emails failed:", err.message);
    
    let userMessage = err.message;
    if (err.name === 'AbortError') {
      userMessage = 'Request timeout - API server took too long to respond';
    }

    return res.status(500).json({ 
      success: false, 
      error: userMessage 
    });
  }
});

app.get("/fetch-and-ingest", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const size = parseInt(req.query.size as string) || 1;
  const specificReqId = req.query.reqid as string | undefined;

  console.log(`
=============================================================
📥 FETCH & INGEST INITIATED
→ Page: ${page}, Size: ${size}, ReqID: ${specificReqId ?? "ALL"}
=============================================================
  `);

  try {
    const emails = await fetchEmails(page, size, specificReqId);
    if (!emails.length) {
      console.warn("⚠️ [API_EMPTY] No emails fetched from source.");
      return res.status(200).json({
        success: true,
        total: 0,
        message: "No new data available.",
      });
    }

    const processed = [];
    console.log(`🧠 [PROCESSING] Starting pipeline for ${emails.length} email(s)...`);

    for (const email of emails) {
      const reqid = email.RecId;
      console.log(`\n--- 🔍 Processing ReqID=${reqid} ---`);

      try {
        const processedEmail = await processSingleEmail(email, specificReqId);
        processed.push(processedEmail);
      } catch (err: any) {
        console.error(`💥 [PROCESS_FATAL] reqid=${reqid}: ${err.message}`);
      }
    }

    console.log(`
=============================================================
✅ FETCH & INGEST COMPLETED
→ Total processed: ${processed.length}
→ Table used: ${specificReqId ? "emails_reprocess" : "emails_cleaned"}
=============================================================
    `);

    return res.status(200).json({
      success: true,
      total: processed.length,
      page,
      size,
      table: specificReqId ? "emails_reprocess" : "emails_cleaned",
      data: processed,
    });
  } catch (outerErr: any) {
    console.error(`🚨 [UNEXPECTED_ERROR] ${outerErr.message}`);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.get("/ingest-email", async (req, res) => {
  const reqid1 = req.query.reqid as string;
  
  if (!reqid1) {
    return res.status(400).json({ success: false, error: "reqid query parameter is required" });
  }

  try {
    const emails = await fetchEmails(1, 1, reqid1);
    if (!emails.length) {
      console.warn("⚠️ [API_EMPTY] No emails fetched from source.");
      return res.status(200).json({
        success: true,
        total: 0,
        message: "No email found with the specified ReqID",
      });
    }

    console.log(`Fetched email with ReqID=${emails[0].RecId} for ingestion.`);

    console.log(`🧠 [PROCESSING] Starting pipeline for 1 email...`);
    console.log(`\n--- 🔍 Processing ReqID=${reqid1} ---`);

    try {
      const processedEmail = await processSingleEmail(emails[0], reqid1);
      console.log(`
=============================================================
✅ FETCH & INGEST COMPLETED
→ ReqID: ${reqid1}
→ Table used: emails_reprocess
=============================================================
      `);
      
      res.json({
        status: 'success',
        processedEmail
      });
    } catch (err: any) {
      console.error(`💥 [PROCESS_FATAL] reqid=${reqid1}: ${err.message}`);
      return res.status(500).json({ success: false, error: err.message });
    }

  } catch (err: any) {
    console.error(`❌ [INGEST_FAIL] reqid=${reqid1}: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/email-by-reqid", async (req, res) => {
  const reqId = req.query.req_id as string;

  if (!reqId) {
    return res.status(400).json({ success: false, error: "req_id query param is required" });
  }

  try {
    const result = await sql`
      SELECT id, req_id, process_label, pretext, core, posttext,
             clean_text,
             original_email::json,
             translated_content::json,
             analysis_result::json,
             created_at
      FROM emails_reprocess
      WHERE req_id = ${reqId}
      ORDER BY id ASC
    `;

    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    console.error("❌ Failed to fetch emails by req_id:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/mails", async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 5;
  const offset = parseInt(req.query.offset as string) || 0;

  console.log(`📬 [FETCH_MAILS] limit=${limit}, offset=${offset}`);

  try {
    const rows = await sql`
      SELECT *
      FROM emails_cleaned
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset};
    `;

    console.log(`✅ [FETCH_MAILS_SUCCESS] Retrieved ${rows.length} record(s)`);

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (err: any) {
    console.error(`❌ [FETCH_MAILS_FAIL] ${err.message}`);
    res.status(500).json({
      success: false,
      error: "Server error fetching emails",
    });
  }
});

// Helper function to detect Arabic
function isArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`🔑 API Token: ${process.env.Api_token ? 'Present' : 'Missing'}`);
});
