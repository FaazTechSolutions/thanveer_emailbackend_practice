// setupTables.ts
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL is not defined in the environment variables.");
}

const sql = neon(process.env.DATABASE_URL);

async function setupTables() {
  try {
    console.log("🚀 Initializing Neon database schema...");

    // 1️⃣ Create table
    await sql`
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
    console.log("✅ Table created or already exists");

    // 2️⃣ Create index for human review
    await sql`
      CREATE INDEX IF NOT EXISTS idx_emails_cleaned_requires_review
      ON emails_cleaned(requires_human_review);
    `;

    // 3️⃣ Create index for created_at
    await sql`
      CREATE INDEX IF NOT EXISTS idx_emails_cleaned_created_at
      ON emails_cleaned(created_at);
    `;

    console.log("✅ Indexes created or already exist");

  } catch (error) {
    console.error("❌ Failed to set up tables:", error);
    throw error;
  }
}

export default setupTables;
