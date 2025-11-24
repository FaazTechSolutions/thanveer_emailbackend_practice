"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mssql_1 = __importDefault(require("mssql"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Configuration object for Azure SQL
// const config: sql.config = {
//   user: process.env.DB_USER || "ftsdev",
//   password: process.env.DB_PASSWORD || "Faaz@123",
//   server: process.env.DB_SERVER || "ftsdev.database.windows.net",
//   database: process.env.DB_NAME || "FreeServerLess",
//   port: parseInt(process.env.DB_PORT || "1433"),
//   options: {
//     encrypt: true, // Azure requires encryption
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
const config = {
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
async function setupTablesMSSQL() {
    let pool;
    try {
        console.log("🚀 Initializing MSSQL database schema...");
        // Connect using config object
        pool = await mssql_1.default.connect(config);
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
    }
    catch (err) {
        console.error("❌ Failed to set up MSSQL tables:", err);
        throw err;
    }
    finally {
        if (pool) {
            await pool.close();
            console.log("🔌 Database connection closed");
        }
    }
}
exports.default = setupTablesMSSQL;
