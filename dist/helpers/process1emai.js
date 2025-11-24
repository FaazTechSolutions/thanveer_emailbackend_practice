"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = processSingleEmail;
const calculatetokensfromtext_js_1 = require("../utils/analysis/calculatetokensfromtext.js");
const index_js_1 = __importDefault(require("../utils/email_cleaner/index.js"));
const handleanalysis_js_1 = __importDefault(require("./handleanalysis.js"));
const handletranslation_js_1 = __importDefault(require("./handletranslation.js"));
const savedb_js_1 = __importDefault(require("./savedb.js"));
async function processSingleEmail(email, specificReqId) {
    const reqid = email.RecId;
    const htmlBody = email.Comments || "";
    // Cleaning
    const cleaned = (0, index_js_1.default)(htmlBody);
    const originalEmail = { subject: email.Subject, body: cleaned.cleanText };
    console.log(`🧹 [CLEANED] reqid=${reqid}`);
    const chunks = (0, calculatetokensfromtext_js_1.splitTextIntoChunks)(originalEmail.body, 1500);
    const stats = (0, calculatetokensfromtext_js_1.calculateTokenStats)(chunks);
    console.log(stats);
    // Translation
    const translationResult = await (0, handletranslation_js_1.default)(originalEmail, reqid);
    // Analysis
    const content = translationResult.was_translated
        ? JSON.parse(translationResult.translated_content)
        : originalEmail;
    const analysisResult = await (0, handleanalysis_js_1.default)(content, reqid);
    // Database
    const cleanedandoriginal = { ...cleaned, originalEmail };
    // await saveToDatabaseMSSQL(reqid, cleanedandoriginal, translationResult, analysisResult, specificReqId)
    await (0, savedb_js_1.default)(reqid, cleanedandoriginal, translationResult, analysisResult, specificReqId);
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
