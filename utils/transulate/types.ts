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
