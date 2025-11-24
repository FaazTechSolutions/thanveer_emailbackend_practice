import { encode,decode } from "gpt-tokenizer";  // npm install gpt-tokenizer

// Count tokens for a single text
export function countTokens(text: string): number {
  return encode(text || "").length;
}

export function splitTextIntoChunks(text: string, maxTokens = 1500): string[] {
  if (!text || text.trim() === "") return [];

  const tokens = encode(text);
  const chunks: string[] = [];

  for (let i = 0; i < tokens.length; i += maxTokens) {
    const slice = tokens.slice(i, i + maxTokens);
    chunks.push(decode(slice));
  }

  return chunks;
}
// Calculate token statistics for an array of texts
export function calculateTokenStats(texts: string[]) {
  if (!texts || texts.length === 0) {
    return {
      average: 0,
      max: 0,
      min: 0,
      count: 0,
    };
  }

  const tokenCounts = texts.map(t => countTokens(t));

  const total = tokenCounts.reduce((a, b) => a + b, 0);
  const max = Math.max(...tokenCounts);
  const min = Math.min(...tokenCounts);
  const average = Math.round(total / texts.length);

  return {
    average,
    max,
    min,
    count: texts.length,
  };
}
