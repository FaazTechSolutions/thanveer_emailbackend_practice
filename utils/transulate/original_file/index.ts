// File: arabic-translation-service.ts
import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import dotenv from 'dotenv';

dotenv.config();

/** -------------------------------
 * OpenRouter Configuration
 * ------------------------------- */
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

/** -------------------------------
 * Arabic Detection (Regex Heuristic)
 * ------------------------------- */
function isArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

/** -------------------------------
 * Enhanced Email Translation with Token Usage
 * ------------------------------- */
interface TranslatedEmail {
  subject: string;
  body: string;
  language: "en" | "ar";
  wasTranslated: boolean;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export async function translateEmail(
  subject: string,
  body: string
): Promise<TranslatedEmail> {
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

    const result = await generateText({
      model: openrouter.chat(process.env.AI_MODEL ||'mistralai/mistral-small-3.2-24b-instruct:free'),
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
        inputTokens: result.usage.inputTokens  || 0,
        outputTokens: result.usage.outputTokens || 0,
        totalTokens: result.usage.totalTokens || 0
      }
    };
  } catch (err) {
    console.error("❌ Translation failed:", err);
    return {
      subject,
      body,
      language: "ar",
      wasTranslated: false
    };
  }
}

/** -------------------------------
 * Enhanced Simple Text Translation
 * ------------------------------- */
interface TranslatedText {
  text: string;
  wasTranslated: boolean;
  language: "en" | "ar";
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export async function translateToEnglish(text: string): Promise<TranslatedText> {
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
    const result = await generateText({
      model: openrouter.chat(process.env.AI_MODEL ||'mistralai/mistral-small-3.2-24b-instruct:free'),
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
  } catch (err) {
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