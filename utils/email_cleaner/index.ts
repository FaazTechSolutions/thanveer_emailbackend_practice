
import { htmlToPlainText } from "./html-to-text.js";
import { extractLatestThread } from "./thread-extractor.js";
import { removeSignature } from "./signature-remover.js";
import { removeDisclaimers } from "./disclaimer-remover.js";
import { extractPrePostText } from "./prepost-extractor.js";
import { removeQuoteMarkers } from "./quote-remover.js";
export interface CleanerConfig {
  preserveLinks?: boolean;
  maxLength?: number;
  aggressiveClean?: boolean;
  removeQuotes?: boolean;
  preserveTables?: boolean;
  minContentLength?: number;
}

export const DEFAULT_CONFIG: CleanerConfig = {
  preserveLinks: false,
  maxLength: 10000,
  aggressiveClean: false,
  removeQuotes: true,
  preserveTables: true,
  minContentLength: 50,
};

export interface CleanedEmail {
  pretext: string;
  core: string;
  posttext: string;
  cleanText: string;
  summary: string;
  metadata: {
    originalLength: number;
    cleanedLength: number;
    compressionRatio: string;
    warning?: string;
  };
}

export default function cleanEmail(
  htmlBody: string,
  config: CleanerConfig = {}
): CleanedEmail {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Step 1: HTML to plain text
  let text = htmlToPlainText(htmlBody, mergedConfig);
  if (!text || text.length < 10) {
    return {
      pretext: "",
      core: "",
      posttext: "",
      cleanText: text,
      summary: "",
      metadata: {
        originalLength: htmlBody.length,
        cleanedLength: 0,
        compressionRatio: "100.00%",
        warning: "Content too short or empty after HTML cleaning",
      },
    };
  }

  // Step 2: Extract latest thread
  text = extractLatestThread(text);

  // Step 3: Remove quotes if requested
  if (mergedConfig.removeQuotes) {
    text = removeQuoteMarkers(text);
  }

  // Step 4: Remove disclaimers
  text = removeDisclaimers(text);

  // Step 5: Remove signature
  text = removeSignature(text, mergedConfig);

  // Step 6: Final cleanup
  text = text.trim();

  // Step 7: Truncate if needed
  if (mergedConfig.maxLength && text.length > mergedConfig.maxLength) {
    text = text.substring(0, mergedConfig.maxLength) + "...";
  }

  // Step 8: Extract structured parts
  const { pretext, core, posttext } = extractPrePostText(text);
  const finalCore = core || text;

  return {
    pretext,
    core: finalCore,
    posttext,
    cleanText: text,
    summary: `${finalCore.slice(0, 150)}${finalCore.length > 150 ? "..." : ""}`,
    metadata: {
      originalLength: htmlBody.length,
      cleanedLength: text.length,
      compressionRatio: htmlBody.length > 0
        ? ((1 - text.length / htmlBody.length) * 100).toFixed(2) + "%"
        : "0%",
    },
  };
}
