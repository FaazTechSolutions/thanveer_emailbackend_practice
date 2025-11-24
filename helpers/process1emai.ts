import { calculateTokenStats, splitTextIntoChunks } from "../utils/analysis/calculatetokensfromtext.js";
import cleanEmail from "../utils/email_cleaner/index.js";
import saveToDatabaseMSSQL from "./dbsavemssql.js";
import handleAnalysis from "./handleanalysis.js";
import handleTranslation from "./handletranslation.js";
import saveToDatabase from "./savedb.js";

export default async function processSingleEmail(email: any, specificReqId?: string) {
  const reqid = email.RecId;
  const htmlBody = email.Comments || "";

  // Cleaning
  const cleaned = cleanEmail(htmlBody);
  const originalEmail = { subject: email.Subject , body: cleaned.cleanText };
  console.log(`🧹 [CLEANED] reqid=${reqid}`);
  const chunks = splitTextIntoChunks(originalEmail.body, 1500);

  
const stats = calculateTokenStats(chunks);

console.log(stats);

  // Translation
  const translationResult = await handleTranslation(originalEmail, reqid);

  // Analysis
  const content = translationResult.was_translated
    ? JSON.parse(translationResult.translated_content!)
    : originalEmail;
  const analysisResult = await handleAnalysis(content, reqid);

  // Database
  const cleanedandoriginal={ ...cleaned, originalEmail }
  // await saveToDatabaseMSSQL(reqid, cleanedandoriginal, translationResult, analysisResult, specificReqId)
  await saveToDatabase(reqid, cleanedandoriginal, translationResult, analysisResult, specificReqId);

  return {
    req_id: reqid,
    was_translated: translationResult.was_translated,
    process_label: specificReqId ? "processX" : null,
    summary: analysisResult?.summary,
    requires_human_review: analysisResult?.requires_human_review || false,
    review_reason: analysisResult?.review_reason,
    created_at: new Date().toISOString(),
  };
}

// export default async function processSingleEmailallstep(email: any, specificReqId?: string) {
//   const reqid = email.RecId;
//   const htmlBody = email.Comments || "";

//     // Cleaning
//   const cleaned = cleanEmail(htmlBody);
//   const originalEmail = { subject: email.Subject , body: cleaned.cleanText };
//   console.log(`🧹 [CLEANED] reqid=${reqid}`);
//   const chunks = splitTextIntoChunks(originalEmail.body, 1500);

  
// const stats = calculateTokenStats(chunks);

// console.log(stats);
// console.log("______________________________");
// console.log(originalEmail.body)

  


//   return {

//     req_id: reqid,
//     was_translated: false,
//     process_label: specificReqId ? "processX" : null,
//     summary: "",
//     requires_human_review: false,
//     review_reason: "",
//     created_at: new Date().toISOString(),

//   };
// }



