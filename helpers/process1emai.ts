import cleanEmail from "../utils/email_cleaner/index.ts";
import saveToDatabaseMSSQL from "./dbsavemssql.ts";
import handleAnalysis from "./handleanalysis.ts";
import handleTranslation from "./handletranslation.ts";
import saveToDatabase from "./savedb.ts";

export default async function processSingleEmail(email: any, specificReqId?: string) {
  const reqid = email.RecId;
  const htmlBody = email.Comments || "";

  // Cleaning
  const cleaned = cleanEmail(htmlBody);
  const originalEmail = { subject: email.Subject , body: cleaned.cleanText };
  console.log(`🧹 [CLEANED] reqid=${reqid}`);

  // Translation
  const translationResult = await handleTranslation(originalEmail, reqid);

  // Analysis
  const content = translationResult.was_translated
    ? JSON.parse(translationResult.translated_content!)
    : originalEmail;
  const analysisResult = await handleAnalysis(content, reqid);

  // Database
  const cleanedandoriginal={ ...cleaned, originalEmail }
  await saveToDatabaseMSSQL(reqid, cleanedandoriginal, translationResult, analysisResult, specificReqId)
  // await saveToDatabase(reqid, cleanedandoriginal, translationResult, analysisResult, specificReqId);

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
