import * as cheerio from 'cheerio';
import { convert } from "html-to-text";

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
// MASTER CLEANER – TABLE TO JSON + HTML CLEANING PIPELINE
// --------------------------------------------------------
//

export function cleanEmail(text: string, config: CleanerConfig = {}): FinalCleanResult {
  if (!text) return { finalText: "", tables: [] };

  const tables: ExtractedTable[] = [];
  const $ = cheerio.load(text);

  //
  // Step 1: Extract tables → JSON → Create a unique marker that survives conversion
  //
  $("table").each((i, el) => {
    const $table = $(el);
    const tableHtml = $.html($table);
    const tableJson = convertTableToJson($table);

    tables.push({
      index: i,
      html: tableHtml,
      json: tableJson,
    });

    // Use a more distinctive placeholder that's less likely to be transformed
    const placeholder = `\n\n___TABLE_MARKER_${i}___\n\n`;
    $table.replaceWith(placeholder);
  });

  console.log("Tables extracted:", tables.length);

  // Get the modified HTML
  let htmlWithoutTables = $.html();

  //
  // Step 2: Convert remaining HTML → plain text
  //
  let plainText = htmlToPlainText(htmlWithoutTables, config);

  //
  // Step 3: Remove signature
  //
  plainText = removeSignature(plainText, config);

  //
  // Step 4: Insert JSON.stringify tables back in
  //
  let finalText = plainText;

  tables.forEach((tbl) => {
    const marker = `___TABLE_MARKER_${tbl.index}___`;
    const tableContent = `\n\n[TABLE ${tbl.index}]\n${JSON.stringify(tbl.json, null, 2)}\n`;
    
    // Replace the marker with the JSON content
    finalText = finalText.replace(marker, tableContent);
  });

  // Clean up any remaining markers (in case some weren't replaced)
  finalText = finalText.replace(/___TABLE_MARKER_\d+___/g, '');

  console.log("Final tables in result:", tables.length);

  return {
    finalText,
    tables,
  };
}

//
// --------------------------------------------------------
// TABLE → JSON CONVERTER (FIXED)
// --------------------------------------------------------
//

export function convertTableToJson(table: cheerio.Cheerio): any[] {
  const $ = cheerio.load(table.html() || "");
  const rows = $("tr");
  const output: any[] = [];
  let headers: string[] = [];

  rows.each((rowIndex, row) => {
    const cells = $(row).find("th, td");
    
    // Check if this is a header row (contains <th> elements)
    const hasHeaderCells = $(row).find("th").length > 0;

    if (hasHeaderCells && headers.length === 0) {
      // This is the header row
      cells.each((i, cell) => {
        const text = $(cell).text().trim();
        headers.push(text || `Column_${i + 1}`);
      });
      return; // Skip to next row
    }

    // If we still don't have headers and this is the first row, use it as headers
    if (headers.length === 0 && rowIndex === 0) {
      cells.each((i, cell) => {
        const text = $(cell).text().trim();
        headers.push(text || `Column_${i + 1}`);
      });
      return; // Skip to next row
    }

    // Data row
    const rowObj: any = {};
    let hasData = false;

    cells.each((cellIndex, cell) => {
      const cellText = $(cell).text().trim();
      const key = headers[cellIndex] || `Column_${cellIndex + 1}`;
      rowObj[key] = cellText;
      
      if (cellText) hasData = true;
    });

    // Only add row if it has at least some data
    if (hasData) {
      output.push(rowObj);
    }
  });

  return output;
}

//
// --------------------------------------------------------
// HTML → PLAIN TEXT WITH PROPER PRESERVATION
// --------------------------------------------------------
//

export function htmlToPlainText(html: string, config: CleanerConfig = {}): string {
  if (!html) return "";

  try {
    // Pre-clean the HTML
    const cleaned = html
      .replace(/<o:p>\s*<\/o:p>/gis, "")
      .replace(/<v:.*?>[\s\S]*?<\/v:.*?>/gis, "")
      .replace(/<!--\[if.*?endif\]-->/gis, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/&nbsp;/gi, " ");

    const text = convert(cleaned, {
      wordwrap: false,
      preserveNewlines: true,
      selectors: [
        {
          selector: "a",
          options: {
            ignoreHref: !config.preserveLinks,
            hideLinkHrefIfSameAsText: true,
          },
        },
        {
          selector: "table",
          format: "skip", // Changed to skip since we handle tables separately
        },
        { selector: "img", format: "skip" },
        { selector: "script", format: "skip" },
        { selector: "style", format: "skip" },
        { selector: "iframe", format: "skip" },
      ],
    });

    return postProcessText(text);
  } catch (error) {
    console.error("Error in htmlToPlainText:", error);
    return stripHtmlFallback(html);
  }
}

//
// --------------------------------------------------------
// SIGNATURE CLEANER (UNCHANGED)
// --------------------------------------------------------
//

export function removeSignature(text: string, config: CleanerConfig = {}): string {
  const lines = text.split("\n");
  const minContent = config.minContentLength || 50;

  if (text.length < minContent * 2) return text;

  let signatureStart = lines.length;
  let confidence = 0;

  const strong = [
    /^Sent from my/i,
    /^Get Outlook/i,
    /^Sent from Mail for Windows/i,
  ];

  const weak = [
    /Best regards/i,
    /^Regards/i,
    /^Thanks/i,
    /^\+?\d{1,3}.*\d{4}$/i,
    /^[^@]+@[^@]+\.[a-z]{2,}$/i,
  ];

  for (let i = Math.floor(lines.length * 0.6); i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (strong.some((p) => p.test(line))) {
      return lines.slice(0, i).join("\n");
    }

    const matches = weak.filter((p) => p.test(line)).length;

    if (matches > 0) {
      confidence += matches;
      if (signatureStart === lines.length) signatureStart = i;
      if (confidence >= 3) break;
    }
  }

  const cut = lines.slice(0, signatureStart).join("\n");
  if (confidence >= 3 && cut.length >= minContent) return cut;
  return text;
}

//
// --------------------------------------------------------
// SUPPORT UTILITIES
// --------------------------------------------------------
//

function stripHtmlFallback(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function postProcessText(text: string): string {
  return text
    .replace(/ +/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}