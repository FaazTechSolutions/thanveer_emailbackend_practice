import * as cheerio from "cheerio";

//
// --------------------------------------------------------
// INTERFACES
// --------------------------------------------------------
//

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

export interface ExtractedTable {
  index: number;
  html: string;
  json: any[];
}

export interface FinalCleanResult {
  finalText: string;
  tables: ExtractedTable[];
}

//
// --------------------------------------------------------
// MAIN CLEANER WITH TABLE JSON INJECTION
// --------------------------------------------------------
//

export function cleanEmailWithTables(
  text: string,
  config: CleanerConfig = {}
): FinalCleanResult {
  if (!text) {
    return {
      finalText: "",
      tables: [],
    };
  }

  const tables: ExtractedTable[] = [];
  const $ = cheerio.load(text);

  const tableElements = $("table");

  // Extract tables → convert → replace with placeholders
  tableElements.each((i, table) => {
    const tableHtml = $.html(table);
    const parsedTable = convertTableToJson($(table), $);

    tables.push({
      index: i,
      html: tableHtml,
      json: parsedTable,
    });

    $(table).replaceWith(`{{TABLE_JSON_${i}}}`);
  });

  // Remove signature from text with placeholders
  const htmlWithoutTables = $.html();
  const cleanedText = removeSignature(htmlWithoutTables, config);

  // Reinsert JSON.stringify(table) into placeholders
  let finalText = cleanedText;
  tables.forEach((t) => {
    finalText = finalText.replace(
      `{{TABLE_JSON_${t.index}}}`,
      JSON.stringify(t.json)
    );
  });

  return {
    finalText,
    tables,
  };
}

//
// --------------------------------------------------------
// TABLE → JSON CONVERTER (EXPORTED)
// --------------------------------------------------------
//

export function convertTableToJson(table: any, $: any): any[] {
  const rows = table.find("tr");
  const result: any[] = [];
  let headers: string[] = [];

  rows.each((index, row) => {
    const cells = $(row).find("th,td");
    const rowData: any = {};

    // Header row
    if (index === 0) {
      headers = cells
        .map((_, cell) => $(cell).text().trim())
        .get();
      return;
    }

    // Data rows
    cells.each((i, cell) => {
      const key = headers[i] || `col_${i + 1}`;
      rowData[key] = $(cell).text().trim();
    });

    result.push(rowData);
  });

  return result;
}

//
// --------------------------------------------------------
// ORIGINAL SIGNATURE REMOVAL LOGIC (UNCHANGED)
// --------------------------------------------------------
//

export function removeSignature(text: string, config: CleanerConfig = {}): string {
  if (!text) return "";
  const lines = text.split("\n");
  const minContent = config.minContentLength || 50;

  if (text.length < minContent * 2) return text;

  const delimiterIndex = lines.findIndex(
    (l) => /^--\s*$/.test(l.trim()) || /^—{2,}\s*$/.test(l.trim())
  );

  if (delimiterIndex > 5) {
    return lines.slice(0, delimiterIndex).join("\n").trim();
  }

  let signatureStartIndex = lines.length;
  let signatureConfidence = 0;

  const strongSignatureMarkers = [
    /^Sent from my (iPhone|iPad|Android|BlackBerry|Windows Phone)/i,
    /^Get Outlook for (iOS|Android)/i,
    /^Sent from Mail for Windows/i,
  ];

  const weakSignatureMarkers = [
    /^(Best|Kind|Warm|With)\s+(regards|wishes)/i,
    /^Thanks?,?$/i,
    /^Thank you,?$/i,
    /^Regards,?$/i,
    /^Cheers,?$/i,
    /^Sincerely,?$/i,
    /^\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/,
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    /^https?:\/\//i,
  ];

  const titlePatterns = [
    /^(CEO|CTO|CFO|COO|Director|Manager|Engineer|Developer|Specialist|Analyst|Consultant)/i,
  ];

  const scanStart = Math.floor(lines.length * 0.6);

  for (let i = scanStart; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (strongSignatureMarkers.some((p) => p.test(line))) {
      return lines.slice(0, i).join("\n").trim();
    }

    let matches =
      weakSignatureMarkers.filter((p) => p.test(line)).length +
      titlePatterns.filter((p) => p.test(line)).length;

    if (matches > 0) {
      signatureConfidence += matches;
      if (signatureStartIndex === lines.length) {
        signatureStartIndex = i;
      }
    }

    if (signatureConfidence >= 3) break;
  }

  const before = lines.slice(0, signatureStartIndex).join("\n");

  if (signatureConfidence >= 3 && before.length >= minContent) {
    return before.trim();
  }

  return text;
}
