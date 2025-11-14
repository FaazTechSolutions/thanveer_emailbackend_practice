import express from "express";
import bodyParser from "body-parser";
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
import cors from "cors";
import fetchEmails from "./helpers/fetchmails.js";
import processSingleEmail from "./helpers/process1emai.js";
dotenv.config();
if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not set");
const sql = neon(process.env.DATABASE_URL);
const app = express();
app.use(bodyParser.json());
app.use(cors());
// --- Setup DB and start server ---
(async () => {
    // await setupTables();
    app.get("/fetch-and-ingest", async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 1;
        const specificReqId = req.query.reqid;
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
                }
                catch (err) {
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
        }
        catch (outerErr) {
            console.error(`🚨 [UNEXPECTED_ERROR] ${outerErr.message}`);
            return res.status(500).json({ success: false, error: "Internal server error" });
        }
    });
    app.get("/ingest-email", async (req, res) => {
        const reqid1 = req.query.reqid;
        try {
            const emails = await fetchEmails(1, 1, reqid1);
            if (!emails.length) {
                console.warn("⚠️ [API_EMPTY] No emails fetched from source.");
                return res.status(200).json({
                    success: true,
                    total: 0,
                    message: "No new data available.",
                });
            }
            console.log(`Fetched email with ReqID=${emails[0]} for ingestion.`);
            const processed = [];
            console.log(`🧠 [PROCESSING] Starting pipeline for ${emails.length} email(s)...`);
            console.log(`\n--- 🔍 Processing ReqID=${reqid1} ---`);
            try {
                const processedEmail = await processSingleEmail(emails[0], reqid1);
                console.log(`
=============================================================
✅ FETCH & INGEST COMPLETED
→ Total processed: ${processed.length}
→ Table used: ${reqid1 ? "emails_reprocess" : "emails_cleaned"}
=============================================================
    `);
                res.json({ status: 'success',
                    processedEmail
                });
            }
            catch (err) {
                console.error(`💥 [PROCESS_FATAL] reqid=${reqid1}: ${err.message}`);
            }
        }
        catch (err) {
            console.error(`❌ [INGEST_FAIL] reqid=${reqid1}: ${err.message}`);
            return res.status(500).json({ success: false, error: err.message });
        }
    });
    app.get("/emails", async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const size = parseInt(req.query.size) || 10;
        const orderBy = req.query.orderby || "CreatedDateTime";
        const orderDir = parseInt(req.query.orderdir) || 0; // 0=asc, 1=desc
        const typeFilter = req.query.type || "Tickets";
        const ENTITY_ID = "ETN0000041";
        const BASE_URL = "https://portal.mawarid.com.sa/apps4x-api/api/v1/data/LGE0000001";
        try {
            // Build query params
            const params = new URLSearchParams({
                entityid: ENTITY_ID,
                $page: page.toString(),
                $size: size.toString(),
                $orderby: orderBy,
                $orderbydirection: orderDir.toString(),
                "$filter:Type": `eq:${typeFilter}`,
            });
            const response = await fetch(`${BASE_URL}?${params.toString()}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${process.env.Api_token || ""}`,
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok) {
                throw new Error(`API responded with status ${response.status}`);
            }
            const data = await response.json();
            return res.status(200).json({
                success: true,
                page,
                size,
                total: data?.TotalCount || data?.length || 0,
                data: data?.Items || data,
            });
        }
        catch (err) {
            console.error("❌ Fetch emails failed:", err.message);
            return res.status(500).json({ success: false, error: err.message });
        }
    });
    app.get("/email-by-reqid", async (req, res) => {
        const reqId = req.query.req_id;
        if (!reqId) {
            return res.status(400).json({ success: false, error: "req_id query param is required" });
        }
        try {
            const result = await sql `
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
        }
        catch (err) {
            console.error("❌ Failed to fetch emails by req_id:", err.message);
            return res.status(500).json({ success: false, error: err.message });
        }
    });
    // 🔹 Fetch Mails Endpoint with cleaner logs
    app.get("/mails", async (req, res) => {
        const limit = parseInt(req.query.limit) || 5;
        const offset = parseInt(req.query.offset) || 0;
        console.log(`📬 [FETCH_MAILS] limit=${limit}, offset=${offset}`);
        try {
            const rows = await sql `
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
        }
        catch (err) {
            console.error(`❌ [FETCH_MAILS_FAIL] ${err.message}`);
            res.status(500).json({
                success: false,
                error: "Server error fetching emails",
            });
        }
    });
    // Helper function to detect Arabic (add this if not already present)
    function isArabic(text) {
        return /[\u0600-\u06FF]/.test(text);
    }
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
})();
