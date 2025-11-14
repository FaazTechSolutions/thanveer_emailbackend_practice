import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.MSSQL_CONNECTION_STRING) {
  throw new Error("❌ MSSQL_CONNECTION_STRING is not defined.");
}

async function setupTablesMSSQL() {
  let pool;
  try {
    console.log("🚀 Initializing MSSQL database schema...");

    pool = await sql.connect(process.env.MSSQL_CONNECTION_STRING!);

    // ---------- emails_cleaned ----------
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT * FROM sysobjects 
        WHERE name='emails_cleaned' AND xtype='U'
      )
      CREATE TABLE emails_cleaned (
        id INT IDENTITY(1,1) PRIMARY KEY,
        req_id BIGINT NOT NULL UNIQUE,
        pretext NVARCHAR(MAX),
        core NVARCHAR(MAX),
        posttext NVARCHAR(MAX),
        clean_text NVARCHAR(MAX),
        translated BIT DEFAULT 0,
        original_email NVARCHAR(MAX),
        translated_content NVARCHAR(MAX),
        analysis_result NVARCHAR(MAX),
        summary NVARCHAR(MAX),
        requires_human_review BIT DEFAULT 0,
        review_reason NVARCHAR(MAX),
        processing_time_ms INT,
        created_at DATETIME2 DEFAULT SYSDATETIME()
      );
    `);
    console.log("✅ emails_cleaned table created or verified");

    // indexes - emails_cleaned
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT * FROM sys.indexes WHERE name='idx_emails_cleaned_requires_review'
      )
      CREATE INDEX idx_emails_cleaned_requires_review 
      ON emails_cleaned(requires_human_review);
    `);

    await pool.request().query(`
      IF NOT EXISTS (
        SELECT * FROM sys.indexes WHERE name='idx_emails_cleaned_created_at'
      )
      CREATE INDEX idx_emails_cleaned_created_at 
      ON emails_cleaned(created_at);
    `);

    console.log("✅ emails_cleaned indexes created or verified");

    // ---------- emails_reprocess ----------
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT * FROM sysobjects 
        WHERE name='emails_reprocess' AND xtype='U'
      )
      CREATE TABLE emails_reprocess (
        id INT IDENTITY(1,1) PRIMARY KEY,
        req_id VARCHAR(255) NOT NULL,
        process_label VARCHAR(50) NOT NULL,
        pretext NVARCHAR(MAX),
        core NVARCHAR(MAX),
        posttext NVARCHAR(MAX),
        clean_text NVARCHAR(MAX),
        translated BIT DEFAULT 0,
        original_email NVARCHAR(MAX),
        translated_content NVARCHAR(MAX),
        analysis_result NVARCHAR(MAX),
        summary NVARCHAR(MAX),
        requires_human_review BIT DEFAULT 0,
        review_reason NVARCHAR(MAX),
        processing_time_ms INT DEFAULT 0,
        created_at DATETIME2 DEFAULT SYSDATETIME(),
        CONSTRAINT unique_req_process UNIQUE(req_id, process_label)
      );
    `);
    console.log("✅ emails_reprocess table created or verified");

    // indexes - emails_reprocess
    await pool.request().query(`
      IF NOT EXISTS (
        SELECT * FROM sys.indexes WHERE name='idx_emails_reprocess_req_id'
      )
      CREATE INDEX idx_emails_reprocess_req_id 
      ON emails_reprocess(req_id);
    `);

    await pool.request().query(`
      IF NOT EXISTS (
        SELECT * FROM sys.indexes WHERE name='idx_emails_reprocess_created_at'
      )
      CREATE INDEX idx_emails_reprocess_created_at 
      ON emails_reprocess(created_at);
    `);

    await pool.request().query(`
      IF NOT EXISTS (
        SELECT * FROM sys.indexes WHERE name='idx_emails_reprocess_requires_review'
      )
      CREATE INDEX idx_emails_reprocess_requires_review 
      ON emails_reprocess(requires_human_review);
    `);

    console.log("✅ emails_reprocess indexes created or verified");
    console.log("🎯 MSSQL database setup completed successfully");

  } catch (err) {
    console.error("❌ Failed to set up MSSQL tables:", err);
    throw err;
  } finally {
    if (pool) pool.close();
  }
}

setupTablesMSSQL();

export default setupTablesMSSQL;
