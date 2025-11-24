import { generateObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { isArabic } from "./arabic-detection.js";
import { z } from "zod";

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
  headers: {
    "X-Title": "EmailAgent",
    "HTTP-Referer": "https://emailagentui.vercel.app/",
  },
});

// -------------------------------------------------------
// ZOD SCHEMAS
// -------------------------------------------------------

const TextSchema = z.object({
  text: z.string(),
  meta: z.object({
    languageDetected: z.enum(["en", "ar"]),
    translated: z.boolean(),
  }),
});

const EmailSchema = z.object({
  subject: z.string(),
  body: z.string(),
  meta: z.object({
    languageDetected: z.enum(["en", "ar"]),
    translated: z.boolean(),
    preservedFormatting: z.boolean(),
  }),
});

// -------------------------------------------------------
// TRANSLATE PLAIN TEXT
// -------------------------------------------------------

export async function translateText(text: string): Promise<TranslatedText> {
  if (!text?.trim() || !isArabic(text)) {
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

    const result = await generateObject({
      model: openrouter.chat(
        process.env.AI_MODEL || "mistralai/mistral-small-3.2-24b-instruct:free"
      ),
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
  } catch (err) {
    console.error("Translation failed:", err);
    return { text, wasTranslated: false, language: "ar" };
  }
}

// -------------------------------------------------------
// TRANSLATE FULL EMAIL
// -------------------------------------------------------

export async function translateEmail(
  subject: string,
  body: string
): Promise<TranslatedEmail> {
    console.log("translateEmail called generateobj ");
  const hasArabic = isArabic(subject) || isArabic(body);

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

    const result = await generateObject({
      model: openrouter.chat(
        process.env.AI_MODEL || "openai/gpt-4o-mini"
      ),
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
  } catch (err) {
    console.error("Email translation failed:", err);
    return { subject, body, language: "ar", wasTranslated: false };
  }
}
