"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = processSingleEmail;
const index_js_1 = __importDefault(require("../utils/email_cleaner/index.js"));
const dbsavemssql_js_1 = __importDefault(require("./dbsavemssql.js"));
const handleanalysis_js_1 = __importDefault(require("./handleanalysis.js"));
const handletranslation_js_1 = __importDefault(require("./handletranslation.js"));
async function processSingleEmail(email, specificReqId) {
    const reqid = email.RecId;
    const htmlBody = email.Comments || "";
    // Cleaning
    const cleaned = (0, index_js_1.default)(htmlBody);
    const originalEmail = { subject: email.Subject, body: cleaned.cleanText };
    console.log(`🧹 [CLEANED] reqid=${reqid}`);
    // Translation
    const translationResult = await (0, handletranslation_js_1.default)(originalEmail, reqid);
    // Analysis
    const content = translationResult.was_translated
        ? JSON.parse(translationResult.translated_content)
        : originalEmail;
    const analysisResult = await (0, handleanalysis_js_1.default)(content, reqid);
    // Database
    const cleanedandoriginal = { ...cleaned, originalEmail };
    await (0, dbsavemssql_js_1.default)(reqid, cleanedandoriginal, translationResult, analysisResult, specificReqId);
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
