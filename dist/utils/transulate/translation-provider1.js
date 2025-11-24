"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateText = translateText;
exports.translateEmail = translateEmail;
const ai_1 = require("ai");
const ai_sdk_provider_1 = require("@openrouter/ai-sdk-provider");
const arabic_detection_js_1 = require("./arabic-detection.js");
const zod_1 = require("zod");
const openrouter = (0, ai_sdk_provider_1.createOpenRouter)({
    apiKey: process.env.OPENROUTER_API_KEY,
    headers: {
        "X-Title": "EmailAgent",
        "HTTP-Referer": "https://emailagentui.vercel.app/",
    },
});
// -------------------------------------------------------
// ZOD SCHEMAS
// -------------------------------------------------------
const TextSchema = zod_1.z.object({
    text: zod_1.z.string(),
    meta: zod_1.z.object({
        languageDetected: zod_1.z.enum(["en", "ar"]),
        translated: zod_1.z.boolean(),
    }),
});
const EmailSchema = zod_1.z.object({
    subject: zod_1.z.string(),
    body: zod_1.z.string(),
    meta: zod_1.z.object({
        languageDetected: zod_1.z.enum(["en", "ar"]),
        translated: zod_1.z.boolean(),
        preservedFormatting: zod_1.z.boolean(),
    }),
});
// -------------------------------------------------------
// TRANSLATE PLAIN TEXT
// -------------------------------------------------------
async function translateText(text) {
    if (!text?.trim() || !(0, arabic_detection_js_1.isArabic)(text)) {
        return { text, wasTranslated: false, language: "en" };
    }
    try {
        const prompt = `
Translate ONLY Arabic content into clear professional English.
Preserve formatting, newlines, spacing, and structure.
Do not translate JSON keys or technical labels.
Output valid JSON exactly matching the schema.

TEXT:
${text}
`.trim();
        const result = await (0, ai_1.generateObject)({
            model: openrouter.chat(process.env.AI_MODEL || "mistralai/mistral-small-3.2-24b-instruct:free"),
            prompt,
            temperature: 0.2,
            schema: TextSchema,
        });
        return {
            text: result.object.text,
            wasTranslated: result.object.meta.translated,
            language: result.object.meta.languageDetected,
            tokenUsage: {
                inputTokens: result.usage?.inputTokens || 0,
                outputTokens: result.usage?.outputTokens || 0,
                totalTokens: result.usage?.totalTokens || 0,
            },
        };
    }
    catch (err) {
        console.error("Translation failed:", err);
        return { text, wasTranslated: false, language: "ar" };
    }
}
// -------------------------------------------------------
// TRANSLATE FULL EMAIL
// -------------------------------------------------------
async function translateEmail(subject, body) {
    console.log("translateEmail called generateobj ");
    const hasArabic = (0, arabic_detection_js_1.isArabic)(subject) || (0, arabic_detection_js_1.isArabic)(body);
    if (!hasArabic) {
        return { subject, body, language: "en", wasTranslated: false };
    }
    try {
        const prompt = `
You are a bilingual email translation engine returning structured JSON.

Translate ONLY Arabic portions into professional English while strictly preserving:
- Formatting, spacing, indentation, newlines
- Bullet points and numbered lists
- JSON, arrays, objects, and Toon blocks
- Placeholders like [[TABLE_1]]
- All field names and structural keys

Do NOT add or remove content.
Return valid JSON exactly matching the schema.

SUBJECT:
${subject}

BODY:
${body}
`.trim();
        const result = await (0, ai_1.generateObject)({
            model: openrouter.chat(process.env.AI_MODEL || "openai/gpt-4o-mini"),
            prompt,
            temperature: 0.2,
            schema: EmailSchema,
        });
        const obj = result.object;
        return {
            subject: obj.subject,
            body: obj.body,
            language: obj.meta.languageDetected,
            wasTranslated: obj.meta.translated,
            tokenUsage: {
                inputTokens: result.usage?.inputTokens || 0,
                outputTokens: result.usage?.outputTokens || 0,
                totalTokens: result.usage?.totalTokens || 0,
            },
        };
    }
    catch (err) {
        console.error("Email translation failed:", err);
        return { subject, body, language: "ar", wasTranslated: false };
    }
}
