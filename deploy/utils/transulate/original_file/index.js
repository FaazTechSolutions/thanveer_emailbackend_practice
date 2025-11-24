"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateEmail = translateEmail;
exports.translateToEnglish = translateToEnglish;
// File: arabic-translation-service.js
const ai_1 = require("ai");
const ai_sdk_provider_1 = require("@openrouter/ai-sdk-provider");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
/** -------------------------------
 * OpenRouter Configuration
 * ------------------------------- */
const openrouter = (0, ai_sdk_provider_1.createOpenRouter)({
    apiKey: process.env.OPENROUTER_API_KEY,
});
/** -------------------------------
 * Arabic Detection (Regex Heuristic)
 * ------------------------------- */
function isArabic(text) {
    return /[\u0600-\u06FF]/.test(text);
}
async function translateEmail(subject, body) {
    console.log("🔹 Checking for Arabic content...");
    const hasArabic = isArabic(subject) || isArabic(body);
    if (!hasArabic) {
        console.log("✅ No Arabic detected, skipping translation.");
        return {
            subject,
            body,
            language: "en",
            wasTranslated: false
        };
    }
    console.log("🌍 Arabic detected — translating...");
    try {
        const prompt = `
      Translate the following Arabic email into professional English.
      Preserve ALL formatting, bullet points, headers, and structure.
      Return ONLY the translated text.

      Subject: ${subject}
      Body: ${body}
    `.trim();
        const result = await (0, ai_1.generateText)({
            model: openrouter.chat(process.env.AI_MODEL || 'mistralai/mistral-small-3.2-24b-instruct:free'),
            prompt,
            temperature: 0.2,
        });
        const lines = result.text.split("\n");
        const translatedSubject = lines[0] || subject;
        const translatedBody = lines.slice(1).join("\n").trim() || body;
        console.log("✅ Translation complete.");
        return {
            subject: translatedSubject,
            body: translatedBody,
            language: "ar",
            wasTranslated: true,
            tokenUsage: {
                inputTokens: result.usage.inputTokens || 0,
                outputTokens: result.usage.outputTokens || 0,
                totalTokens: result.usage.totalTokens || 0
            }
        };
    }
    catch (err) {
        console.error("❌ Translation failed:", err);
        return {
            subject,
            body,
            language: "ar",
            wasTranslated: false
        };
    }
}
async function translateToEnglish(text) {
    if (!text) {
        return {
            text: "",
            wasTranslated: false,
            language: "en"
        };
    }
    if (!isArabic(text)) {
        console.log("✅ No Arabic detected, returning original text.");
        return {
            text,
            wasTranslated: false,
            language: "en"
        };
    }
    console.log("🌍 Detected Arabic — translating to English...");
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
                inputTokens: result.usage.inputTokens || 0,
                outputTokens: result.usage.outputTokens || 0,
                totalTokens: result.usage.totalTokens || 0
            }
        };
    }
    catch (err) {
        console.error("❌ Translation failed:", err);
        return {
            text,
            wasTranslated: false,
            language: "ar"
        };
    }
}
/** -------------------------------
 * Example Usage
//  * ------------------------------- */
// if (require.main === module) {
//   (async () => {
//     // Example 1: Translate email with token usage
//     const emailResult = await translateEmail(
//       "مشكلة في الحساب",
//       `
//         مرحبا فريق الدعم،
//         لا أستطيع تسجيل الدخول إلى حسابي منذ الأمس.
//         الرجاء المساعدة في أقرب وقت ممكن.
//         شكرا،
//         أحمد
//       `
//     );
//     console.log("\n📧 Translated Email:");
//     console.log("Subject:", emailResult.subject);
//     console.log("Body:", emailResult.body);
//     console.log("Language:", emailResult.language);
//     console.log("Was Translated:", emailResult.wasTranslated);
//     if (emailResult.tokenUsage) {
//       console.log("Token Usage:", emailResult.tokenUsage);
//     }
//     // Example 2: Translate simple text
//     const textResult = await translateToEnglish("مرحبا بالعالم");
//     console.log("\n🌍 Translated Text:", textResult.text);
//     console.log("Was Translated:", textResult.wasTranslated);
//     console.log("Language:", textResult.language);
//     if (textResult.tokenUsage) {
//       console.log("Token Usage:", textResult.tokenUsage);
//     }
//     // Example 3: Non-Arabic text (no translation needed)
//     const englishResult = await translateToEnglish("Hello world");
//     console.log("\n🌍 English Text:", englishResult.text);
//     console.log("Was Translated:", englishResult.wasTranslated);
//     console.log("Language:", englishResult.language);
//   })();
// }
