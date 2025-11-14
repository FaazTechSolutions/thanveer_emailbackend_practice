import express from "express";
import bodyParser from "body-parser";
import sql from "mssql";
import dotenv from "dotenv";
import cors from "cors";

import cleanEmail from "./utils/email_cleaner/index.ts";
import setupTablesMSSQL from "./db/mssqlsetup.ts";
import { translateEmail } from "./utils/transulate/index.ts";
import { processEmailAnalysis } from "./utils/analyser/index.ts";
import fetchEmails from "./helpers/fetchmails.ts";
import processSingleEmail from "./helpers/process1emai.ts";

dotenv.config();

if (!process.env.MSSQL_CONNECTION_STRING)
  throw new Error("MSSQL_CONNECTION_STRING is not set");

const pool = await sql.connect(process.env.MSSQL_CONNECTION_STRING);

const app = express();
app.use(bodyParser.json());
app.use(cors());

// ===========================================================
// 🔥 FETCH & INGEST
// ===========================================================

app.get("/fetch-and-ingest", async (req, res) => {
  const page = Number(req.query.page) || 1;
  const size = Number(req.query.size) || 1;
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
      return res.status(200).json({ success: true, total: 0 });
    }

    const processed: any[] = [];

    for (const email of emails) {
      const reqid = email.RecId;

      try {
        const processedEmail = await processSingleEmail(email, specificReqId);
        processed.push(processedEmail);
      } catch (err: any) {
        console.error(`❌ PROCESS ERROR reqid=${reqid}`, err.message);
      }
    }

    return res.status(200).json({
      success: true,
      total: processed.length,
      table: specificReqId ? "emails_reprocess" : "emails_cleaned",
      data: processed,
    });
  } catch (err: any) {
    console.error("❌ Unexpected error:", err.message);
    return res.status(500).json({ success: false });
  }
});

// ===========================================================
// 🔥 INGEST ONE EMAIL
// ===========================================================

app.get("/ingest-email", async (req, res) => {
  const reqid = req.query.reqid as string;

  if (!reqid)
    return res.status(400).json({ success: false, error: "reqid required" });

  try {
    const emails = await fetchEmails(1, 1, reqid);

    if (!emails.length)
      return res.status(200).json({ success: true, total: 0 });

    const processedEmail = await processSingleEmail(emails[0], reqid);

    res.json({
      success: true,
      processedEmail,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ===========================================================
// 🔥 EMAILS FROM MSSQL (emails_cleaned)
// ===========================================================

app.get("/mails", async (req, res) => {
  const limit = Number(req.query.limit) || 5;
  const offset = Number(req.query.offset) || 0;

  try {
    const result = await pool.request()
      .input("limit", sql.Int, limit)
      .input("offset", sql.Int, offset)
      .query(`
        SELECT *
        FROM emails_cleaned
        ORDER BY created_at DESC
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY;
      `);

    res.json({
      success: true,
      count: result.recordset.length,
      data: result.recordset,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===========================================================
// 🔥 EMAILS FROM emails_reprocess by req_id
// ===========================================================

app.get("/email-by-reqid", async (req, res) => {
  const reqId = req.query.req_id as string;

  if (!reqId)
    return res.status(400).json({ success: false, error: "req_id required" });

  try {
    const result = await pool.request()
      .input("reqId", sql.VarChar, reqId)
      .query(`
        SELECT id, req_id, process_label, pretext, core, posttext,
               clean_text, original_email, translated_content,
               analysis_result, created_at
        FROM emails_reprocess
        WHERE req_id = @reqId
        ORDER BY id ASC;
      `);

    res.json({ success: true, data: result.recordset });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===========================================================
// UTIL
// ===========================================================

function isArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

// ===========================================================
// START SERVER
// ===========================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 MSSQL Server running on port ${PORT}`));
