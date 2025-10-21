import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { isArabic } from './arabic-detection.js';
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface TranslatedEmail {
  subject: string;
  body: string;
  language: "en" | "ar";
  wasTranslated: boolean;
  tokenUsage?: TokenUsage;
}

export interface TranslatedText {
  text: string;
  wasTranslated: boolean;
  language: "en" | "ar";
  tokenUsage?: TokenUsage;
}

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function translateText(text: string): Promise<TranslatedText> {
  if (!text || !isArabic(text)) {
    return {
      text,
      wasTranslated: false,
      language: "en"
    };
  }

  try {
    const result = await generateText({
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
  } catch (err) {
    console.error("Translation failed:", err);
    return {
      text,
      wasTranslated: false,
      language: "ar"
    };
  }
}

export async function translateEmail(
  subject: string,
  body: string
): Promise<TranslatedEmail> {
  const hasArabic = isArabic(subject) || isArabic(body);

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

    const result = await generateText({
      model: openrouter.chat(process.env.AI_MODEL || 'mistralai/mistral-small-3.2-24b-instruct:free'),
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
  } catch (err) {
    console.error("Translation failed:", err);
    return {
      subject,
      body,
      language: "ar",
      wasTranslated: false
    };
  }
}
