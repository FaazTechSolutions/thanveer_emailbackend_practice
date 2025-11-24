"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = saveToDatabase;
const serverless_1 = require("@neondatabase/serverless");
// ⚡ Initialize Neon once, outside function
const sql = (0, serverless_1.neon)(process.env.DATABASE_URL);
async function saveToDatabase(reqid, cleaned, translationResult, analysisResult, specificReqId) {
    const targetTable = specificReqId ? "emails_reprocess" : "emails_cleaned";
    try {
        if (specificReqId) {
            // Count previous reprocess entries
            const countRes = await sql `
        SELECT COUNT(*)::int AS count FROM emails_reprocess WHERE req_id = ${reqid};
      `;
            const processLabel = `process${countRes[0].count + 1}`;
            await sql `
        INSERT INTO emails_reprocess (
          req_id, process_label, pretext, core, posttext, clean_text, translated,
          original_email, translated_content, analysis_result, summary,
          requires_human_review, review_reason, processing_time_ms, created_at
        ) VALUES (
          ${reqid}, ${processLabel}, ${cleaned.pretext}, ${cleaned.core}, ${cleaned.posttext},
          ${cleaned.cleanText}, ${translationResult.was_translated},
          ${JSON.stringify(cleaned.originalEmail)},
          ${translationResult.translated_content},
          ${analysisResult ? JSON.stringify(analysisResult) : null},
          ${analysisResult?.summary || null}, ${analysisResult?.requires_human_review || false},
          ${analysisResult?.review_reason || null}, ${analysisResult?.processing_time_ms || 0}, NOW()
        );
      `;
            console.log(`💾 [DB_INSERT] ${targetTable} → ${processLabel} (reqid=${reqid})`);
        }
        else {
            // Upsert for cleaned emails
            await sql `
        INSERT INTO emails_cleaned (
          req_id, pretext, core, posttext, clean_text, translated, original_email,
          translated_content, analysis_result, summary, requires_human_review,
          review_reason, processing_time_ms
        ) VALUES (
          ${reqid}, ${cleaned.pretext}, ${cleaned.core}, ${cleaned.posttext},
          ${cleaned.cleanText}, ${translationResult.was_translated},
          ${JSON.stringify(cleaned.originalEmail)},
          ${translationResult.translated_content},
          ${analysisResult ? JSON.stringify(analysisResult) : null},
          ${analysisResult?.summary || null}, ${analysisResult?.requires_human_review || false},
          ${analysisResult?.review_reason || null}, ${analysisResult?.processing_time_ms || 0}
        )
        ON CONFLICT (req_id)
        DO UPDATE SET
          pretext = EXCLUDED.pretext,
          core = EXCLUDED.core,
          posttext = EXCLUDED.posttext,
          clean_text = EXCLUDED.clean_text,
          translated = EXCLUDED.translated,
          original_email = EXCLUDED.original_email,
          translated_content = EXCLUDED.translated_content,
          analysis_result = EXCLUDED.analysis_result,
          summary = EXCLUDED.summary,
          requires_human_review = EXCLUDED.requires_human_review,
          review_reason = EXCLUDED.review_reason,
          processing_time_ms = EXCLUDED.processing_time_ms;
      `;
            console.log(`💾 [DB_UPSERT] ${targetTable} → reqid=${reqid}`);
        }
    }
    catch (dbErr) {
        console.error(`❌ [DB_ERROR] reqid=${reqid}: ${dbErr.message}`);
        throw dbErr; // optionally re-throw for upstream error handling
    }
}
