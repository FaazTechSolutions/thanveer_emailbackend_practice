import { neon } from "@neondatabase/serverless";

// ⚡ Initialize Neon once, outside function
const sql = neon(process.env.DATABASE_URL!);

export default async function saveToDatabase(
  reqid: string,
  cleaned: any,
  translationResult: any,
  analysisResult: any,
  specificReqId?: string
) {
  const targetTable = specificReqId ? "emails_reprocess" : "emails_cleaned";

  try {
    if (specificReqId) {
      // Count previous reprocess entries
      const countRes = await sql`
        SELECT COUNT(*)::int AS count FROM emails_reprocess WHERE req_id = ${reqid};
      `;
      const processLabel = `process${countRes[0].count + 1}`;

      await sql`
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
    } else {
      // Upsert for cleaned emails
      await sql`
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
  } catch (dbErr: any) {
    console.error(`❌ [DB_ERROR] reqid=${reqid}: ${dbErr.message}`);
    throw dbErr; // optionally re-throw for upstream error handling
  }
}
// import { neon } from "@neondatabase/serverless";

// // ⚡ Initialize Neon once, outside function
// const sql = neon(process.env.DATABASE_URL!);

// export default async function saveToDatabase(
//   reqid: string,
//   cleaned: any,
//   translationResult: any,
//   analysisResult: any,
//   specificReqId?: string
// ) {
//   const targetTable = specificReqId ? "emails_reprocess" : "emails_cleaned";

//   try {
//     if (specificReqId) {
//       // Count previous reprocess entries
//       const countRes = await sql`
//         SELECT COUNT(*)::int AS count FROM emails_reprocess WHERE req_id = ${reqid};
//       `;
//       const processLabel = `process${countRes[0].count + 1}`;

//       await sql`
//         INSERT INTO emails_reprocess (
//           req_id, process_label, pretext, core, posttext, clean_text, translated,
//           original_email, translated_content, analysis_result, summary,
//           requires_human_review, review_reason, processing_time_ms, created_at
//         ) VALUES (
//           ${reqid}, ${processLabel}, ${cleaned.pretext}, ${cleaned.core}, ${cleaned.posttext},
//           ${cleaned.cleanText}, ${translationResult.was_translated},
//           ${JSON.stringify(cleaned.originalEmail)},
//           ${translationResult.translated_content},
//           ${analysisResult ? JSON.stringify(analysisResult) : null},
//           ${analysisResult?.summary || null}, ${analysisResult?.requires_human_review || false},
//           ${analysisResult?.review_reason || null}, ${analysisResult?.processing_time_ms || 0}, NOW()
//         );
//       `;
//       console.log(`💾 [DB_INSERT] ${targetTable} → ${processLabel} (reqid=${reqid})`);
//     } else {
//       // Upsert for cleaned emails
//       await sql`
//         INSERT INTO emails_cleaned (
//           req_id, pretext, core, posttext, clean_text, translated, original_email,
//           translated_content, analysis_result, summary, requires_human_review,
//           review_reason, processing_time_ms
//         ) VALUES (
//           ${reqid}, ${cleaned.pretext}, ${cleaned.core}, ${cleaned.posttext},
//           ${cleaned.cleanText}, ${translationResult.was_translated},
//           ${JSON.stringify(cleaned.originalEmail)},
//           ${translationResult.translated_content},
//           ${analysisResult ? JSON.stringify(analysisResult) : null},
//           ${analysisResult?.summary || null}, ${analysisResult?.requires_human_review || false},
//           ${analysisResult?.review_reason || null}, ${analysisResult?.processing_time_ms || 0}
//         )
//         ON CONFLICT (req_id)
//         DO UPDATE SET
//           pretext = EXCLUDED.pretext,
//           core = EXCLUDED.core,
//           posttext = EXCLUDED.posttext,
//           clean_text = EXCLUDED.clean_text,
//           translated = EXCLUDED.translated,
//           original_email = EXCLUDED.original_email,
//           translated_content = EXCLUDED.translated_content,
//           analysis_result = EXCLUDED.analysis_result,
//           summary = EXCLUDED.summary,
//           requires_human_review = EXCLUDED.requires_human_review,
//           review_reason = EXCLUDED.review_reason,
//           processing_time_ms = EXCLUDED.processing_time_ms;
//       `;
//       console.log(`💾 [DB_UPSERT] ${targetTable} → reqid=${reqid}`);
//     }
//   } catch (dbErr: any) {
//     console.error(`❌ [DB_ERROR] reqid=${reqid}: ${dbErr.message}`);
//     throw dbErr; // optionally re-throw for upstream error handling
//   }
// }




/*  
====================================================
🔥 NEW FUNCTION: Update ONE column, INSERT if missing
====================================================
*/
export async function upsertSingleColumn(
  reqid: string,
  column: string,
  value: any,
) {
  const targetTable = "emails_reprocess";

  const allowedColumns = [
    "pretext",
    "core",
    "posttext",
    "clean_text",
    "translated",
    "original_email",
    "translated_content",
    "analysis_result",
    "summary",
    "requires_human_review",
    "review_reason",
    "processing_time_ms",
    "process_label"
  ];

  if (!allowedColumns.includes(column)) {
    throw new Error(`Column '${column}' is not permitted for update.`);
  }

  try {
    await sql`
      INSERT INTO "${targetTable}"
        ("req_id", "${column}")
      VALUES (${reqid}, ${value})
      ON CONFLICT ("req_id")
      DO UPDATE SET "${column}" = ${value};
    `;

    console.log(
      `📝 [DB_SINGLE_UPSERT] ${targetTable}.${column} updated for reqid=${reqid}`
    );

  } catch (err: any) {
    console.error(
      `❌ [DB_SINGLE_UPSERT_ERROR] reqid=${reqid}: ${err.message}`
    );
    throw err;
  }
}



