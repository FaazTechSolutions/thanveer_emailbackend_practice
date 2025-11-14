import sql from "mssql";
const config: sql.config = {
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
// Re-use global config pool
const poolPromise = sql.connect(config);

export default async function saveToDatabaseMSSQL(
  reqid: string,
  cleaned: any,
  translationResult: any,
  analysisResult: any,
  specificReqId?: string
) {
  const targetTable = specificReqId ? "emails_reprocess" : "emails_cleaned";

  try {
    const pool = await poolPromise;

    if (specificReqId) {
      // ---------- REPROCESS FLOW ----------
      const countResult = await pool
        .request()
        .input("reqid", sql.VarChar, reqid)
        .query(`
          SELECT COUNT(*) AS count
          FROM emails_reprocess
          WHERE req_id = @reqid;
        `);

      const count = countResult.recordset[0].count;
      const processLabel = `process${count + 1}`;

      await pool.request()
        .input("reqid", sql.VarChar, reqid)
        .input("process_label", sql.VarChar, processLabel)
        .input("pretext", sql.NVarChar, cleaned.pretext)
        .input("core", sql.NVarChar, cleaned.core)
        .input("posttext", sql.NVarChar, cleaned.posttext)
        .input("clean_text", sql.NVarChar, cleaned.cleanText)
        .input("translated", sql.Bit, translationResult.was_translated)
        .input("original_email", sql.NVarChar, JSON.stringify(cleaned.originalEmail))
        .input("translated_content", sql.NVarChar, translationResult.translated_content)
        .input("analysis_result", sql.NVarChar, analysisResult ? JSON.stringify(analysisResult) : null)
        .input("summary", sql.NVarChar, analysisResult?.summary || null)
        .input("requires_human_review", sql.Bit, analysisResult?.requires_human_review || false)
        .input("review_reason", sql.NVarChar, analysisResult?.review_reason || null)
        .input("processing_time_ms", sql.Int, analysisResult?.processing_time_ms || 0)
        .query(`
          INSERT INTO emails_reprocess (
            req_id, process_label, pretext, core, posttext, clean_text, translated,
            original_email, translated_content, analysis_result, summary,
            requires_human_review, review_reason, processing_time_ms, created_at
          )
          VALUES (
            @reqid, @process_label, @pretext, @core, @posttext, @clean_text, @translated,
            @original_email, @translated_content, @analysis_result, @summary,
            @requires_human_review, @review_reason, @processing_time_ms, SYSDATETIME()
          );
        `);

      console.log(`💾 [DB_INSERT] ${targetTable} → ${processLabel} (reqid=${reqid})`);
      return;
    }

    // ---------- UPSERT FOR emails_cleaned ----------
    await pool.request()
      .input("reqid", sql.BigInt, reqid)
      .input("pretext", sql.NVarChar, cleaned.pretext)
      .input("core", sql.NVarChar, cleaned.core)
      .input("posttext", sql.NVarChar, cleaned.posttext)
      .input("clean_text", sql.NVarChar, cleaned.cleanText)
      .input("translated", sql.Bit, translationResult.was_translated)
      .input("original_email", sql.NVarChar, JSON.stringify(cleaned.originalEmail))
      .input("translated_content", sql.NVarChar, translationResult.translated_content)
      .input("analysis_result", sql.NVarChar, analysisResult ? JSON.stringify(analysisResult) : null)
      .input("summary", sql.NVarChar, analysisResult?.summary || null)
      .input("requires_human_review", sql.Bit, analysisResult?.requires_human_review || false)
      .input("review_reason", sql.NVarChar, analysisResult?.review_reason || null)
      .input("processing_time_ms", sql.Int, analysisResult?.processing_time_ms || 0)
      .query(`
        MERGE emails_cleaned AS target
        USING (SELECT @reqid AS req_id) AS src
        ON target.req_id = src.req_id

        WHEN MATCHED THEN
          UPDATE SET
            pretext = @pretext,
            core = @core,
            posttext = @posttext,
            clean_text = @clean_text,
            translated = @translated,
            original_email = @original_email,
            translated_content = @translated_content,
            analysis_result = @analysis_result,
            summary = @summary,
            requires_human_review = @requires_human_review,
            review_reason = @review_reason,
            processing_time_ms = @processing_time_ms

        WHEN NOT MATCHED THEN
          INSERT (
            req_id, pretext, core, posttext, clean_text, translated, original_email,
            translated_content, analysis_result, summary, requires_human_review,
            review_reason, processing_time_ms, created_at
          )
          VALUES (
            @reqid, @pretext, @core, @posttext, @clean_text, @translated, @original_email,
            @translated_content, @analysis_result, @summary,
            @requires_human_review, @review_reason, @processing_time_ms, SYSDATETIME()
          );
      `);

    console.log(`💾 [DB_UPSERT] ${targetTable} → reqid=${reqid}`);

  } catch (err: any) {
    console.error(`❌ [DB_ERROR] reqid=${reqid}: ${err.message}`);
    throw err;
  }
}
