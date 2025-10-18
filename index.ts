import express from "express";
import bodyParser from "body-parser";
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
import cleanEmail from "./utils/email_cleaner/index.ts"; // ← named export
import setupTables from "./db/setuptables.ts";// ← named export
import cors from "cors";
import { translateEmail } from "./utils/transulate/index.ts";
import { processEmailAnalysis } from "./utils/analyser/index.ts";

dotenv.config();

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

const sql = neon(process.env.DATABASE_URL);

interface CleanedEmail {
  pretext: string;
  core: string;
  posttext: string;
  cleanText: string;
  summary: string;
}

const app = express();
app.use(bodyParser.json());
app.use(cors());

// --- Setup DB and start server ---
(async () => {
  await setupTables(); // ← ensure tables exist

  // first has only clean

// app.get("/fetch-and-ingest", async (req: express.Request, res: express.Response) => {
//   try {
//     const page = parseInt(req.query.page as string) || 1;
//     const size = parseInt(req.query.size as string) || 10;

//     console.log(`🔹 Fetching emails (page=${page}, size=${size})...`);

//     const API_URL = `https://portal.mawarid.com.sa/apps4x-api/api/v1/data/LGE0000001?entityid=ETN0000041&$page=${page}&$size=${size}`;

//     const response = await fetch(API_URL, {
//       headers: {
//         Authorization: `Bearer ${process.env.Api_token}`,
//         Accept: "application/json",
//       },
//     });

//     if (!response.ok) throw new Error(`API error: ${response.status} `);

//     const data = await response.json();
//     if (!data.Data || data.Data.length === 0) {
//       return res.json({ status: "success", total: 0, page, size, data: [] });
//     }

//     const allProcessed: any[] = [];

//     for (const email of data.Data) {
//       const htmlBody = email.Comments || ""; // adjust depending on API
//       const reqid = email.RecId;

//       // Clean email using your cleaner
//       const cleaned: CleanedEmail = cleanEmail(htmlBody);

//       // Construct original email JSON
//       const originalEmail = {
//         subject: email.Subject || "",
//         body: cleaned.cleanText,
//       };

//       // Insert into the new table
//       await sql`
//         INSERT INTO emails_cleaned (
//           req_id,
//           pretext,
//           core,
//           posttext,
//           clean_text,
//           translated,
//           original_email,
//           translated_content
//         ) VALUES (
//           ${reqid},
//           ${cleaned.pretext},
//           ${cleaned.core},
//           ${cleaned.posttext},
//           ${cleaned.cleanText},
//           ${false},                  -- translation not done yet
//           ${originalEmail},
//           ${null}                     -- translated content not available yet
//         )
//       `;

//       allProcessed.push({
//         req_id: reqid,
//         original: originalEmail,
//         cleaned: cleaned.cleanText,
//         summary: cleaned.summary,
//         translated: false,
//         created_at: new Date().toISOString(),
//       });
//     }

//     res.json({
//       status: "success",
//       total: allProcessed.length,
//       page,
//       size,
//       data: allProcessed,
//     });

//   } catch (error: any) {
//     console.error("❌ Failed to fetch and ingest emails:", error.message);
//     res.status(500).json({ error: error.message });
//   }
// });

//second  your existing route file has clean and translate
// app.get("/fetch-and-ingest", async (req: express.Request, res: express.Response) => {
//   try {
//     const page = parseInt(req.query.page as string) || 1;
//     const size = parseInt(req.query.size as string) || 10;
//     console.log(`🔹 Fetching emails (page=${page}, size=${size})...`);

//     const API_URL = `https://portal.mawarid.com.sa/apps4x-api/api/v1/data/LGE0000001?entityid=ETN0000041&$page=${page}&$size=${size}`;
//     const response = await fetch(API_URL, {
//       headers: {
//         Authorization: `Bearer ${process.env.Api_token}`,
//         Accept: "application/json",
//       },
//     });

//     if (!response.ok) throw new Error(`API error: ${response.status}`);

//     const data = await response.json();
//     if (!data.Data || data.Data.length === 0) {
//       return res.json({ status: "success", total: 0, page, size, data: [] });
//     }

//     const allProcessed: any[] = [];

//     for (const email of data.Data) {
//       const htmlBody = email.Comments || "";
//       const reqid = email.RecId;

//       // 1. Clean the email
//       const cleaned: CleanedEmail = cleanEmail(htmlBody);

//       // 2. Construct original email JSON
//       const originalEmail = {
//         subject: email.Subject || "",
//         body: cleaned.cleanText,
//       };

//       // 3. Check for Arabic content and translate if needed
//       const hasArabic = isArabic(originalEmail.subject) || isArabic(originalEmail.body);
//       let translationResult:any = {
//         was_translated: false,
//         translated_content: null
//       };

//       if (hasArabic) {
//         console.log(`🌍 Arabic detected in email ${reqid}, translating...`);
//         try {
//           const translation = await translateEmail(
//             originalEmail.subject,
//             originalEmail.body
//           );

//           translationResult = {
//             was_translated: translation.wasTranslated,
//             translated_content: translation.wasTranslated ?
//               JSON.stringify({
//                 subject: translation.subject,
//                 body: translation.body
//               }) : null
//           };
//         } catch (transError) {
//           console.error(`❌ Translation failed for email ${reqid}:`, transError);
//         }
//       }

//       // 4. Insert into database with translation results
//       try {
//         await sql`
//   INSERT INTO emails_cleaned (
//     req_id,
//     pretext,
//     core,
//     posttext,
//     clean_text,
//     translated,
//     original_email,
//     translated_content
//   ) VALUES (
//     ${reqid},
//     ${cleaned.pretext},
//     ${cleaned.core},
//     ${cleaned.posttext},
//     ${cleaned.cleanText},
//     ${translationResult.was_translated},
//     ${JSON.stringify(originalEmail)},
//     ${translationResult.translated_content}
//   )
//   ON CONFLICT (req_id)
//   DO UPDATE SET
//     pretext = EXCLUDED.pretext,
//     core = EXCLUDED.core,
//     posttext = EXCLUDED.posttext,
//     clean_text = EXCLUDED.clean_text,
//     translated = EXCLUDED.translated,
//     original_email = EXCLUDED.original_email,
//     translated_content = EXCLUDED.translated_content
// `;


//         allProcessed.push({
//           req_id: reqid,
//           was_translated: translationResult.was_translated,
//           created_at: new Date().toISOString(),
//         });
//       } catch (dbError) {
//         console.error(`❌ Database error for email ${reqid}:`, dbError);
//       }
//     }

//     res.json({
//       status: "success",
//       total: allProcessed.length,
//       page,
//       size,
//       data: allProcessed,
//     });

//   } catch (error: any) {
//     console.error("❌ Failed to fetch and ingest emails:", error.message);
//     res.status(500).json({ error: error.message });
//   }
// });

// Helper function to detect Arabic
//third third has cleans and transulate 

// app.get("/fetch-and-ingest", async (req: express.Request, res: express.Response) => {
//   try {
//     const page = parseInt(req.query.page as string) || 1;
//     const size = parseInt(req.query.size as string) || 10;
//     console.log(`🔹 Fetching emails (page=${page}, size=${size})...`);

//     const API_URL = `https://portal.mawarid.com.sa/apps4x-api/api/v1/data/LGE0000001?entityid=ETN0000041&$page=${page}&$size=${size}&$orderby=CreatedDateTime&$orderbydirection=0&$filter:Type=eq:Tickets`;
//     const response = await fetch(API_URL, {
//       headers: {
//         Authorization: `Bearer ${process.env.Api_token}`,
//         Accept: "application/json",
//       },
//     });

//     if (!response.ok) throw new Error(`API error: ${response.status}`);

//     const data = await response.json();
//     if (!data.Data || data.Data.length === 0) {
//       return res.json({ status: "success", total: 0, page, size, data: [] });
//     }

//     const allProcessed: any[] = [];

//     for (const email of data.Data) {
//       const htmlBody = email.Comments || "";
//       const reqid = email.RecId;

//       // 1. Clean the email
//       const cleaned: CleanedEmail = cleanEmail(htmlBody);

//       // 2. Construct original email
//       const originalEmail = {
//         subject: email.Subject || "",
//         body: cleaned.cleanText,
//       };

//       // 3. Translate if Arabic detected
//       const hasArabic = isArabic(originalEmail.subject) || isArabic(originalEmail.body);
//       let translationResult: { was_translated: boolean; translated_content: string | null } = {
//         was_translated: false,
//         translated_content: null
//       };

//       if (hasArabic) {
//         console.log(`🌍 Arabic detected in email ${reqid}, translating...`);
//         try {
//           const translation = await translateEmail(originalEmail.subject, originalEmail.body);
//           translationResult = {
//             was_translated: translation.wasTranslated,
//             translated_content: translation.wasTranslated
//               ? JSON.stringify({ subject: translation.subject, body: translation.body })
//               : null
//           };
//         } catch (transError) {
//           console.error(`❌ Translation failed for email ${reqid}:`, transError);
//         }
//       }

//       // 4. Choose content to analyze
//       const contentToAnalyze = translationResult.was_translated
//         ? JSON.parse(translationResult.translated_content!)
//         : originalEmail;

//       let analysisResult = null;
//       try {
//         const analysis = await processEmailAnalysis(contentToAnalyze.subject, contentToAnalyze.body);
//         analysisResult = {
//           classification: analysis.classification,
//           structured_data: analysis.structured_data,
//           action_items: analysis.action_items,
//           confidence_scores: analysis.confidence_scores,
//           next_best_action: analysis.next_best_action,
//           action_confidence: analysis.action_confidence
//         };
//       } catch (analysisError) {
//         console.error(`❌ Analysis failed for email ${reqid}:`, analysisError);
//       }

//       // 5. Insert into DB
//       try {
//         await sql`
//           INSERT INTO emails_cleaned (
//             req_id,
//             pretext,
//             core,
//             posttext,
//             clean_text,
//             translated,
//             original_email,
//             translated_content,
//             analysis_result
//           ) VALUES (
//             ${reqid},
//             ${cleaned.pretext},
//             ${cleaned.core},
//             ${cleaned.posttext},
//             ${cleaned.cleanText},
//             ${translationResult.was_translated},
//             ${JSON.stringify(originalEmail)},
//             ${translationResult.translated_content},
//             ${analysisResult ? JSON.stringify(analysisResult) : null}
//           )
//           ON CONFLICT (req_id)
//           DO UPDATE SET
//             pretext = EXCLUDED.pretext,
//             core = EXCLUDED.core,
//             posttext = EXCLUDED.posttext,
//             clean_text = EXCLUDED.clean_text,
//             translated = EXCLUDED.translated,
//             original_email = EXCLUDED.original_email,
//             translated_content = EXCLUDED.translated_content,
//             analysis_result = EXCLUDED.analysis_result
//         `;

//         allProcessed.push({
//           req_id: reqid,
//           was_translated: translationResult.was_translated,
//           analysis: analysisResult,
//           created_at: new Date().toISOString(),
//         });
//       } catch (dbError) {
//         console.error(`❌ Database error for email ${reqid}:`, dbError);
//       }
//     }

//     res.json({
//       status: "success",
//       total: allProcessed.length,
//       page,
//       size,
//       data: allProcessed,
//     });
//   } catch (error: any) {
//     console.error("❌ Failed to fetch and ingest emails:", error.message);
//     res.status(500).json({ error: error.message });
//   }
// });

//it has cleans ,transulate and analyse add summary human review 

app.get("/fetch-and-ingest", async (req: express.Request, res: express.Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const size = parseInt(req.query.size as string) || 10;
    console.log(`🔹 Fetching emails (page=${page}, size=${size})...`);

    const API_URL = `https://portal.mawarid.com.sa/apps4x-api/api/v1/data/LGE0000001?entityid=ETN0000041&$page=${page}&$size=${size}&$orderby=CreatedDateTime&$orderbydirection=0&$filter:Type=eq:Tickets`;

    const response = await fetch(API_URL, {
      headers: {
        Authorization: `Bearer ${process.env.Api_token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();

    if (!data.Data || data.Data.length === 0) {
      return res.json({ status: "success", total: 0, page, size, data: [] });
    }

    const allProcessed: any[] = [];

    for (const email of data.Data) {
      const htmlBody = email.Comments || "";
      const reqid = email.RecId;

      // 1. Clean the email
      const cleaned: CleanedEmail = cleanEmail(htmlBody);

      // 2. Construct original email
      const originalEmail = {
        subject: email.Subject || "",
        body: cleaned.cleanText,
      };

      // 3. Translate if Arabic detected
      const hasArabic = isArabic(originalEmail.subject) || isArabic(originalEmail.body);
      let translationResult: { was_translated: boolean; translated_content: string | null } = {
        was_translated: false,
        translated_content: null
      };

      if (hasArabic) {
        console.log(`🌍 Arabic detected in email ${reqid}, translating...`);
        try {
          const translation = await translateEmail(originalEmail.subject, originalEmail.body);
          translationResult = {
            was_translated: translation.wasTranslated,
            translated_content: translation.wasTranslated
              ? JSON.stringify({ subject: translation.subject, body: translation.body })
              : null
          };
        } catch (transError) {
          console.error(`❌ Translation failed for email ${reqid}:`, transError);
        }
      }

      // 4. Choose content to analyze
      const contentToAnalyze = translationResult.was_translated
        ? JSON.parse(translationResult.translated_content!)
        : originalEmail;

      let analysisResult = null;

      try {
        const analysis = await processEmailAnalysis(contentToAnalyze.subject, contentToAnalyze.body);

        // Store the complete analysis result including new fields
        analysisResult = {
          classification: analysis.classification,
          structured_data: analysis.structured_data,
          action_items: analysis.action_items,
          confidence_scores: analysis.confidence_scores,
          next_best_action: analysis.next_best_action,
          action_confidence: analysis.action_confidence,
          action_reasoning: analysis.action_reasoning,
          summary: analysis.summary,  // New field
          requires_human_review: analysis.requires_human_review,  // New field
          review_reason: analysis.review_reason,  // New field
          processing_time_ms: analysis.processing_time_ms
        };
      } catch (analysisError) {
        console.error(`❌ Analysis failed for email ${reqid}:`, analysisError);
      }

      // 5. Insert into DB - Updated to include new fields
      try {
        await sql`
          INSERT INTO emails_cleaned (
            req_id,
            pretext,
            core,
            posttext,
            clean_text,
            translated,
            original_email,
            translated_content,
            analysis_result,
            summary,
            requires_human_review,
            review_reason,
            processing_time_ms
          ) VALUES (
            ${reqid},
            ${cleaned.pretext},
            ${cleaned.core},
            ${cleaned.posttext},
            ${cleaned.cleanText},
            ${translationResult.was_translated},
            ${JSON.stringify(originalEmail)},
            ${translationResult.translated_content},
            ${analysisResult ? JSON.stringify(analysisResult) : null},
            ${analysisResult?.summary || null},
            ${analysisResult?.requires_human_review || false},
            ${analysisResult?.review_reason || null},
            ${analysisResult?.processing_time_ms || 0}
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
            processing_time_ms = EXCLUDED.processing_time_ms
        `;

        allProcessed.push({
          req_id: reqid,
          was_translated: translationResult.was_translated,
          analysis: analysisResult,
          created_at: new Date().toISOString(),
          summary: analysisResult?.summary,
          requires_human_review: analysisResult?.requires_human_review || false,
          review_reason: analysisResult?.review_reason
        });
      } catch (dbError) {
        console.error(`❌ Database error for email ${reqid}:`, dbError);
      }
    }

    res.json({
      status: "success",
      total: allProcessed.length,
      page,
      size,
      data: allProcessed,
    });
  } catch (error: any) {
    console.error("❌ Failed to fetch and ingest emails:", error.message);
    res.status(500).json({ error: error.message });
  }
});
app.get("/mails", async(req:any, res:any)=>{
   try {
    const limit = parseInt(req.query.limit) || 2;
    const offset = parseInt(req.query.offset) || 0;

    // ✅ Correct Neon template syntax
    const rows = await sql`
      SELECT *
      FROM emails_cleaned
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset};
    `;

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (err:any) {
    console.error("❌ Error fetching latest emails:", err);
    res.status(500).json({
      success: false,
      message: "Server error fetching emails",
      error: err.message,
    });
  }



})




// Helper function to detect Arabic (add this if not already present)
function isArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}




  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
})();
