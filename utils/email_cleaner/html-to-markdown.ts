import TurndownService from 'turndown';

/** -------------------------------
 * CONFIGURATION
 * ------------------------------- */
interface CleanerConfig {
  preserveLinks?: boolean;
  maxLength?: number;
  aggressiveClean?: boolean;
  removeQuotes?: boolean;
  preserveTables?: boolean;
  minContentLength?: number;
  preserveSignatures?: boolean;
}

const DEFAULT_CONFIG: CleanerConfig = {
  preserveLinks: false,
  maxLength: 10000,
  aggressiveClean: false,
  removeQuotes: true,
  preserveTables: true,
  minContentLength: 50,
  preserveSignatures: false,
};

// Initialize turndown service with basic settings
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
});

// Add custom table support
turndownService.addRule('tables', {
  filter: ['table'],
  replacement: function (content, node) {
    const table = node as any;
    const rows = Array.from(table.rows || []);
    
    if (rows.length === 0) return '';
    
    const markdownRows: string[] = [];
    
    rows.forEach((row: any, index: number) => {
      const cells = Array.from(row.cells || []);
      const markdownCells = cells.map((cell: any) => {
        let cellContent = turndownService.turndown(cell);
        cellContent = cellContent.replace(/\n/g, ' ').replace(/\|/g, '\\|').trim();
        return cellContent || ' ';
      });
      
      markdownRows.push(`| ${markdownCells.join(' | ')} |`);
      
      // Add separator after header row
      if (index === 0) {
        const separator = markdownCells.map(() => '---').join(' | ');
        markdownRows.push(`| ${separator} |`);
      }
    });

    return '\n\n' + markdownRows.join('\n') + '\n\n';
  }
});

/** -------------------------------
 * 1️⃣ HTML → Markdown using Turndown
 * ------------------------------- */
export function htmlToMarkdown(html: string, config: CleanerConfig = {}): string {
  if (!html) return "";

  try {
    // Pre-processing: Remove only tracking/noise, preserve content
    let cleaned = html
      // Remove outlook/gmail specific empty tags
      .replace(/<o:p>\s*<\/o:p>/gis, "")
      .replace(/<v:.*?>\s*<\/v:.*?>/gis, "")
      .replace(/<!--\[if.*?endif\]-->/gis, "")
      
      // Remove style and script tags with content
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      
      // Remove tracking pixels (1x1 images)
      .replace(/<img[^>]*width=["']?1["']?[^>]*height=["']?1["']?[^>]*>/gi, "")
      .replace(/<img[^>]*height=["']?1["']?[^>]*width=["']?1["']?[^>]*>/gi, "")
      
      // Convert HTML entities
      .replace(/&nbsp;/gi, " ")
      .replace(/&mdash;/gi, "—")
      .replace(/&ndash;/gi, "–")
      .replace(/&quot;/gi, '"')
      .replace(/&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&")
      .replace(/&bull;/gi, "•")
      .replace(/&trade;/gi, "™")
      .replace(/&copy;/gi, "©")
      .replace(/&reg;/gi, "®");

    // Convert HTML to Markdown using Turndown
    const markdownText = turndownService.turndown(cleaned);

    // Post-processing cleanup
    return postProcessMarkdown(markdownText, config);
  } catch (err) {
    console.error("Error converting HTML to Markdown:", err);
    return fallbackHtmlToMarkdown(html);
  }
}

/** -------------------------------
 * Fallback HTML to Markdown
 * ------------------------------- */
function fallbackHtmlToMarkdown(html: string): string {
  // First extract and preserve tables
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  const tables: string[] = [];
  let tableIndex = 0;
  
  // Replace tables with placeholders and store them
  let processedHtml = html.replace(tableRegex, (match) => {
    tables.push(match);
    return `@@TABLE_${tableIndex++}@@`;
  });

  // Remove unwanted elements from the non-table content
  processedHtml = processedHtml
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<o:p>[\s\S]*?<\/o:p>/gi, "")
    .replace(/<!--\[if[^>]*>[\s\S]*?<!\[endif\]-->/gi, "");

  // Convert basic HTML tags to text
  let text = processedHtml
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p[^>]*>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<div[^>]*>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<h[1-6][^>]*>/gi, "\n## ")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<ul[^>]*>/gi, "\n")
    .replace(/<\/ul>/gi, "\n")
    .replace(/<ol[^>]*>/gi, "\n")
    .replace(/<\/ol>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\s+/g, " ")
    .trim();

  // Now convert tables to markdown and reinsert them
  tables.forEach((tableHtml, index) => {
    const markdownTable = convertTableToMarkdown(tableHtml);
    text = text.replace(`@@TABLE_${index}@@`, markdownTable);
  });

  return text;
}

/** -------------------------------
 * Convert HTML table to Markdown (fallback)
 * ------------------------------- */
function convertTableToMarkdown(tableHtml: string): string {
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRegex = /<(td|th)[^>]*>([\s\S]*?)<\/(td|th)>/gi;
  
  const rows: string[][] = [];
  let rowMatch;
  
  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const rowContent = rowMatch[1];
    const cells: string[] = [];
    let cellMatch;
    
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      let cellContent = cellMatch[2]
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
      
      cellContent = cellContent.replace(/\|/g, '\\|');
      cells.push(cellContent);
    }
    
    if (cells.length > 0) {
      rows.push(cells);
    }
  }
  
  if (rows.length === 0) return "";
  
  let markdownTable = '\n\n';
  
  rows.forEach((row, index) => {
    markdownTable += `| ${row.join(' | ')} |\n`;
    
    if (index === 0) {
      const separator = row.map(() => '---').join(' | ');
      markdownTable += `| ${separator} |\n`;
    }
  });
  
  markdownTable += '\n';
  return markdownTable;
}

/** -------------------------------
 * Post-process Markdown cleanup
 * ------------------------------- */
function postProcessMarkdown(text: string, config: CleanerConfig): string {
  let cleaned = text
    // Remove zero-width and invisible characters
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    
    // Clean up table formatting
    .replace(/\|\s+\|/g, "| |")
    
    // Remove excessive whitespace but preserve paragraph breaks
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    
    // Clean up common artifacts
    .replace(/^\s*[\[\(]?cid:.*?[\]\)]?\s*$/gim, "")
    .replace(/\[image:.*?\]/gi, "")
    .replace(/\[Image removed by sender\]/gi, "")
    .replace(/\[cid:.*?\]/gi, "");

  // Trim each line but preserve structure
  cleaned = cleaned
    .split("\n")
    .map(line => line.trim())
    .join("\n")
    .trim();

  // Remove excessive blank lines at start/end
  cleaned = cleaned.replace(/^\n+/, "").replace(/\n+$/, "");

  return cleaned;
}

/** -------------------------------
 * 2️⃣ Thread Extraction
 * ------------------------------- */
export function extractLatestThread(text: string): string {
  if (!text) return "";

  const threadPatterns = [
    /^-{10,}\s*Original Message\s*-{10,}/im,
    /^From:\s+[^\n]+\nSent:\s+[^\n]+\nTo:\s+[^\n]+(?:\nSubject:\s+[^\n]+)?/im,
    /^-{3,}\s*Forwarded message\s*-{3,}/im,
    /^Begin forwarded message:/im,
  ];

  let cutIndex = text.length;

  for (const pattern of threadPatterns) {
    const match = text.search(pattern);
    if (match > text.length * 0.3 && match < cutIndex) {
      cutIndex = match;
    }
  }

  return text.substring(0, cutIndex).trim();
}

/** -------------------------------
 * 3️⃣ Signature Removal
 * ------------------------------- */
export function removeSignature(text: string, config: CleanerConfig = {}): string {
  if (!text) return "";

  const lines = text.split("\n");
  const minContent = config.minContentLength || 50;
  
  if (text.length < minContent * 2) {
    return text;
  }

  // Check if text contains tables
  const hasTables = text.includes('| --- |') || (text.match(/\|.*\|/g) || []).length > 3;
  
  if (hasTables) {
    const lastTableIndex = findLastTableEnd(lines);
    if (lastTableIndex > 0 && lastTableIndex < lines.length - 3) {
      const contentBeforeLastTable = lines.slice(0, lastTableIndex + 1).join("\n");
      const contentAfterLastTable = lines.slice(lastTableIndex + 1).join("\n");
      
      const cleanedAfterTable = removeSimpleSignature(contentAfterLastTable);
      return contentBeforeLastTable + (cleanedAfterTable ? "\n" + cleanedAfterTable : "");
    }
  }

  return removeSimpleSignature(text);
}

function findLastTableEnd(lines: string[]): number {
  let inTable = false;
  let lastTableLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.includes('|') && line.includes('---')) {
      inTable = true;
      lastTableLine = i;
    } else if (inTable && line.includes('|')) {
      lastTableLine = i;
    } else if (inTable && !line.includes('|') && line.length > 0) {
      inTable = false;
    }
  }
  
  return lastTableLine;
}

function removeSimpleSignature(text: string): string {
  const lines = text.split("\n");

  // Standard delimiter check
  const delimiterIndex = lines.findIndex((l) => 
    /^--\s*$/.test(l.trim()) || /^—{2,}\s*$/.test(l.trim())
  );
  if (delimiterIndex > 5 && delimiterIndex < lines.length - 2) {
    return lines.slice(0, delimiterIndex).join("\n").trim();
  }

  // Strong signature markers
  const strongSignatureMarkers = [
    /^Sent from my (iPhone|iPad|Android|BlackBerry|Windows Phone)/i,
    /^Get Outlook for (iOS|Android)/i,
    /^Sent from Mail for Windows/i,
    /^Mawadah Santali/i,
    /^Senior Payroll Specialist/i,
    /^HR Operation/i,
    /^mawadah\.santali@naqel\.com\.sa/i,
    /^\+966539202072/i,
  ];

  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 10); i--) {
    const line = lines[i].trim();
    for (const pattern of strongSignatureMarkers) {
      if (pattern.test(line)) {
        return lines.slice(0, i).join("\n").trim();
      }
    }
  }

  return text;
}

/** -------------------------------
 * 4️⃣ Disclaimer Removal
 * ------------------------------- */
export function removeDisclaimers(text: string): string {
  if (!text) return "";

  const disclaimerPatterns = [
    /^-{5,}.*?(confidential|disclaimer|notice)[\s\S]{0,800}?$/im,
    /^CONFIDENTIALITY NOTICE[\s\S]{0,500}?$/im,
    /^DISCLAIMER:[\s\S]{0,500}?$/im,
    /\n\s*This email has been (scanned|checked)[\s\S]*$/i,
  ];

  let cleaned = text;
  
  for (const pattern of disclaimerPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  return cleaned.trim();
}

/** -------------------------------
 * 5️⃣ Pretext & Core Extraction
 * ------------------------------- */
export function extractPrePostText(text: string) {
  if (!text) return { pretext: "", core: "", posttext: "" };

  const lines = text.split("\n").filter((l) => l.trim().length > 0);

  const greetingPatterns = [
    /^(Hi|Hello|Hey|Dear)\s+[A-Z]/i,
    /^Good\s+(morning|afternoon|evening)/i,
  ];

  const closingPatterns = [
    /^(Thanks?|Thank you|Regards|Best regards|Kind regards|Best|Sincerely|Cheers)/i,
  ];

  let pretextEndIndex = -1;
  let posttextStartIndex = lines.length;

  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const line = lines[i].trim();
    if (greetingPatterns.some((p) => p.test(line))) {
      pretextEndIndex = i;
      break;
    }
  }

  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
    const line = lines[i].trim();
    if (closingPatterns.some((p) => p.test(line))) {
      posttextStartIndex = i;
      break;
    }
  }

  const pretext = pretextEndIndex >= 0 
    ? lines.slice(0, pretextEndIndex + 1).join("\n") 
    : "";
  
  const posttext = posttextStartIndex < lines.length 
    ? lines.slice(posttextStartIndex).join("\n") 
    : "";
  
  const finalCoreStart = pretextEndIndex + 1;
  const finalCoreEnd = posttextStartIndex < lines.length ? posttextStartIndex : lines.length;
  const core = lines.slice(finalCoreStart, finalCoreEnd).join("\n").trim();

  return { pretext, core, posttext };
}

/** -------------------------------
 * 6️⃣ Remove Quote Levels
 * ------------------------------- */
export function removeQuoteMarkers(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/^>+\s*/, ""))
    .join("\n");
}

/** -------------------------------
 * 7️⃣ UNIFIED PROCESSOR
 * ------------------------------- */
export default function cleanEmail(
  htmlBody: string,
  config: CleanerConfig = {}
) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Step 1: HTML to Markdown using Turndown
  let text = htmlToMarkdown(htmlBody, mergedConfig);

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
        warning: "Content too short or empty after HTML cleaning"
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
  if (!mergedConfig.preserveSignatures) {
    text = removeSignature(text, mergedConfig);
  }

  // Step 6: Final cleanup
  text = text.trim();

  // Step 7: Truncate if needed
  if (mergedConfig.maxLength && text.length > mergedConfig.maxLength) {
    text = text.substring(0, mergedConfig.maxLength) + "...";
  }

  // Step 8: Extract structured parts
  const { pretext, core, posttext } = extractPrePostText(text);

  // If core is empty, use full text
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

// Export the main function
export { htmlToMarkdown as htmlToPlainText };