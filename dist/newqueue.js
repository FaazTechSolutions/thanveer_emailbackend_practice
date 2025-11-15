// server.ts
import express from "express";
import bodyParser from "body-parser";
import sql from "mssql";
import dotenv from "dotenv";
import cors from "cors";
import { fetchIngestQueue, ingestEmailQueue } from "./queues.js";
dotenv.config();
// =================== DB CONFIG =======================
const config = {
    user: process.env.DB_USER || "ftsdev",
    password: process.env.DB_PASSWORD || "Faaz@123",
    server: process.env.DB_SERVER || "ftsdev.database.windows.net",
    database: process.env.DB_NAME || "FreeServerLess",
    port: parseInt(process.env.DB_PORT || "1433"),
    options: {
        encrypt: true, // Azure requires encryption
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
const pool = await sql.connect(config);
// =================== EXPRESS =========================
const app = express();
app.use(bodyParser.json());
app.use(cors());
// ======================================================
// FETCH & INGEST (QUEUE)
// ======================================================
app.get("/fetch-and-ingest", async (req, res) => {
    const page = Number(req.query.page) || 1;
    const size = Number(req.query.size) || 1;
    const specificReqId = req.query.reqid;
    try {
        const job = await fetchIngestQueue.add("fetch-ingest-job", { page, size, specificReqId }, {
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
        });
        return res.status(202).json({ queued: true, jobId: job.id });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ success: false });
    }
});
// ======================================================
// INGEST SINGLE EMAIL (QUEUE)
// ======================================================
app.get("/ingest-email", async (req, res) => {
    const reqid = req.query.reqid;
    if (!reqid)
        return res.status(400).json({ error: "reqid required" });
    try {
        const job = await ingestEmailQueue.add("ingest-email-job", { reqid }, { attempts: 3 });
        res.status(202).json({ queued: true, jobId: job.id });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ======================================================
// READ EMAILS CLEANED
// ======================================================
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
        res.json({ success: true, count: result.recordset.length, data: result.recordset });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ======================================================
// EMAIL REPROCESS (BY REQ ID)
// ======================================================
app.get("/email-by-reqid", async (req, res) => {
    const reqId = req.query.req_id;
    if (!reqId)
        return res.status(400).json({ error: "req_id required" });
    try {
        const result = await pool.request()
            .input("reqId", sql.VarChar, reqId)
            .query(`
        SELECT *
        FROM emails_reprocess
        WHERE req_id = @reqId
        ORDER BY id ASC;
      `);
        res.json({ success: true, data: result.recordset });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ======================================================
// START SERVER
// ======================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
