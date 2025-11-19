"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateText = translateText;
exports.translateEmail = translateEmail;
const ai_1 = require("ai");
const ai_sdk_provider_1 = require("@openrouter/ai-sdk-provider");
const arabic_detection_js_1 = require("./arabic-detection.js");
const openrouter = (0, ai_sdk_provider_1.createOpenRouter)({
    apiKey: process.env.OPENROUTER_API_KEY,
});
async function translateText(text) {
    if (!text || !(0, arabic_detection_js_1.isArabic)(text)) {
        return {
            text,
            wasTranslated: false,
            language: "en"
        };
    }
    try {
        const result = await (0, ai_1.generateText)({
            model: openrouter.chat(process.env.AI_MODEL || 'mistralai/mistral-small-3.2-24b-instruct:free'),
            prompt: `
        You are a professional translator. Translate the following Arabic text to English precisely,
        keeping the original meaning intact. Do not summarize or omit details.
        Text to translate:
        ${text}
      `,
            temperature: 0.2,
        });
        return {
            text: result.text.trim(),
            wasTranslated: true,
            language: "ar",
            tokenUsage: {
                inputTokens: result.usage?.inputTokens || 0,
                outputTokens: result.usage?.outputTokens || 0,
                totalTokens: result.usage?.totalTokens || 0
            }
        };
    }
    catch (err) {
        console.error("Translation failed:", err);
        return {
            text,
            wasTranslated: false,
            language: "ar"
        };
    }
}
async function translateEmail(subject, body) {
    const hasArabic = (0, arabic_detection_js_1.isArabic)(subject) || (0, arabic_detection_js_1.isArabic)(body);
    if (!hasArabic) {
        return {
            subject,
            body,
            language: "en",
            wasTranslated: false
        };
    }
    try {
        const prompt = `
      Translate the following Arabic email into professional English.
      Preserve ALL formatting, bullet points, headers, and structure.
      Return ONLY the translated text.
      Subject: ${subject}
      Body: ${body}
    `.trim();
        const result = await (0, ai_1.generateText)({
            model: openrouter.chat(process.env.AI_MODEL || 'openai/gpt-4o-mini'),
            prompt,
            temperature: 0.2,
        });
        const lines = result.text.split("\n");
        const translatedSubject = lines[0] || subject;
        const translatedBody = lines.slice(1).join("\n").trim() || body;
        return {
            subject: translatedSubject,
            body: translatedBody,
            language: "ar",
            wasTranslated: true,
            tokenUsage: {
                inputTokens: result.usage?.inputTokens || 0,
                outputTokens: result.usage?.outputTokens || 0,
                totalTokens: result.usage?.totalTokens || 0
            }
        };
    }
    catch (err) {
        console.error("Translation failed:", err);
        return {
            subject,
            body,
            language: "ar",
            wasTranslated: false
        };
    }
}
