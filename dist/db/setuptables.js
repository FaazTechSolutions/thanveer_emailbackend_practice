"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const serverless_1 = require("@neondatabase/serverless");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
if (!process.env.DATABASE_URL) {
    throw new Error("❌ DATABASE_URL is not defined in the environment variables.");
}
const sql = (0, serverless_1.neon)(process.env.DATABASE_URL);
async function setupTables() {
    try {
        console.log("🚀 Initializing Neon database schema...");
        // 1️⃣ Create main table
        await sql `
      CREATE TABLE IF NOT EXISTS emails_cleaned (
        id SERIAL PRIMARY KEY,
        req_id BIGINT NOT NULL UNIQUE,
        pretext TEXT,
        core TEXT,
        posttext TEXT,
        clean_text TEXT,
        translated BOOLEAN DEFAULT FALSE,
        original_email JSONB,
        translated_content JSONB,
        analysis_result JSONB,
        summary TEXT,
        requires_human_review BOOLEAN DEFAULT FALSE,
        review_reason TEXT,
        processing_time_ms INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;
        console.log("✅ emails_cleaned table created or already exists");
        // 2️⃣ Create indexes for emails_cleaned
        await sql `CREATE INDEX IF NOT EXISTS idx_emails_cleaned_requires_review ON emails_cleaned(requires_human_review);`;
        await sql `CREATE INDEX IF NOT EXISTS idx_emails_cleaned_created_at ON emails_cleaned(created_at);`;
        // 3️⃣ Create reprocess table
        await sql `
      CREATE TABLE IF NOT EXISTS emails_reprocess (
        id SERIAL PRIMARY KEY,
        req_id VARCHAR(255) NOT NULL,
        process_label VARCHAR(50) NOT NULL,
        pretext TEXT,
        core TEXT,
        posttext TEXT,
        clean_text TEXT,
        translated BOOLEAN DEFAULT FALSE,
        original_email JSONB,
        translated_content TEXT,
        analysis_result JSONB,
        summary TEXT,
        requires_human_review BOOLEAN DEFAULT FALSE,
        review_reason TEXT,
        processing_time_ms INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_req_process UNIQUE(req_id, process_label)
      );
    `;
        console.log("✅ emails_reprocess table created or already exists");
        // 4️⃣ Create indexes for emails_reprocess
        await sql `CREATE INDEX IF NOT EXISTS idx_emails_reprocess_req_id ON emails_reprocess(req_id);`;
        await sql `CREATE INDEX IF NOT EXISTS idx_emails_reprocess_created_at ON emails_reprocess(created_at);`;
        await sql `CREATE INDEX IF NOT EXISTS idx_emails_reprocess_requires_review ON emails_reprocess(requires_human_review);`;
        console.log("✅ All indexes created or verified");
        console.log("🎯 Database setup completed successfully");
    }
    catch (error) {
        console.error("❌ Failed to set up tables:", error);
        throw error;
    }
}
exports.default = setupTables;
