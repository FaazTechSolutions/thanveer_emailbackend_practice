"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.threadPatterns = exports.DEFAULT_CONFIG = void 0;
exports.htmlToPlainText = htmlToPlainText;
exports.finalcleanEmailtextwithtoon = finalcleanEmailtextwithtoon;
exports.finalcleanEmailtextwithjson = finalcleanEmailtextwithjson;
exports.finalcleanEmailtext = finalcleanEmailtext;
exports.tableJsonToMarkdown = tableJsonToMarkdown;
exports.stripRepeatedEmailHeaders = stripRepeatedEmailHeaders;
exports.default = cleanEmail;
const cheerio = __importStar(require("cheerio"));
const html_to_text_1 = require("html-to-text");
const toonconvertor_1 = require("../helpers/toonconvertor");
const quote_remover_1 = require("./quote-remover");
const disclaimer_remover_1 = require("./disclaimer-remover");
const signature_remover_1 = require("./signature-remover");
exports.DEFAULT_CONFIG = {
    preserveLinks: false,
    maxLength: 10000,
    aggressiveClean: false,
    removeQuotes: true,
    preserveTables: true,
    minContentLength: 50,
};
function htmlToPlainText(html, config = {}) {
    if (!html)
        return "";
    try {
        // Pre-clean the HTML
        const cleaned = html
            .replace(/<o:p>\s*<\/o:p>/gis, "")
            .replace(/<v:.*?>[\s\S]*?<\/v:.*?>/gis, "")
            .replace(/<!--\[if.*?endif\]-->/gis, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/&nbsp;/gi, " ");
        const text = (0, html_to_text_1.convert)(cleaned, {
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
    }
    catch (error) {
        console.error("Error in htmlToPlainText:", error);
        return stripHtmlFallback(html);
    }
}
function stripHtmlFallback(html) {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function postProcessText(text) {
    return text
        .replace(/ +/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
function finalcleanEmailtextwithtoon(html, config = {}) {
    if (!html)
        return "";
    const $ = cheerio.load(html);
    const tableStore = [];
    // STEP 1 — Extract tables and classify
    $("table").each((index, table) => {
        const tableHtml = $.html(table);
        const extracted = extractSingleTableToJson(tableHtml);
        const { isSignature, rows } = extracted;
        const isEmpty = !rows || rows.length === 0;
        const isLayoutTable = rows.length === 1 &&
            Object.values(rows[0]).every((v) => !v || v === "");
        // Skip signature tables + empty layout tables
        if (isSignature || isEmpty || isLayoutTable) {
            $(table).remove();
            return;
        }
        const toon = (0, toonconvertor_1.convertToToon)(extracted);
        tableStore.push({
            index,
            toon,
        });
        $(table).replaceWith(`[[TABLE_${index}]]`);
    });
    // STEP 2 — Convert HTML to plain text
    let text = htmlToPlainText($.html(), config);
    // STEP 3 — Protect Toon blocks BEFORE cleaning
    tableStore.forEach((t) => {
        const placeholder = `[[TABLE_${t.index}]]`;
        const safeBlock = `__TABLE_START__${placeholder}__TABLE_END__`;
        text = text.replace(placeholder, safeBlock);
    });
    // STEP 4 — Clean body text in SAFE ORDER
    if (config.removeQuotes !== false) {
        text = (0, quote_remover_1.removeQuoteMarkers)(text);
    }
    text = (0, disclaimer_remover_1.removeDisclaimers)(text);
    text = (0, signature_remover_1.removeSignature)(text, config);
    // STEP 5 — Unprotect blocks
    text = text.replace(/__TABLE_START__/g, "").replace(/__TABLE_END__/g, "");
    // STEP 6 — Inject Toon tables back into cleaned text
    tableStore.forEach((t) => {
        text = text.replace(`[[TABLE_${t.index}]]`, `\n\nTABLE_${t.index + 1}:\n${t.toon}\n\n`);
    });
    // STEP 7 — Final formatting
    text = postProcessText(text);
    return text.trim();
}
function finalcleanEmailtextwithjson(html, config = {}) {
    if (!html)
        return "";
    const $ = cheerio.load(html);
    const tableStore = [];
    // STEP 1 - Extract and classify tables
    $("table").each((index, table) => {
        const tableHtml = $.html(table);
        const extracted = extractSingleTableToJson(tableHtml);
        const { isSignature, rows } = extracted;
        const isEmpty = !rows || rows.length === 0;
        // More robust layout-table detection
        const isLayoutTable = rows.length <= 1 &&
            Object.values(rows[0] || {}).filter(Boolean).length <= 2 &&
            tableHtml.length < 1200;
        if (isSignature || isEmpty || isLayoutTable) {
            $(table).remove();
            return;
        }
        tableStore.push({
            index,
            rows: extracted.rows,
        });
        $(table).replaceWith(`[[TABLE_${index}]]`);
    });
    // STEP 2 - Convert HTML to clean text
    let text = htmlToPlainText($.html(), config);
    text = stripRepeatedEmailHeaders(text);
    // STEP 3 - Protect table placeholders
    tableStore.forEach((t) => {
        const ph = `[[TABLE_${t.index}]]`;
        const protectedTag = `__TABLE_BLOCK_${t.index}__`;
        text = text.replace(ph, protectedTag);
    });
    // STEP 4 - Cleaning steps
    if (config.removeQuotes !== false) {
        text = (0, quote_remover_1.removeQuoteMarkers)(text);
    }
    text = (0, disclaimer_remover_1.removeDisclaimers)(text);
    text = (0, signature_remover_1.removeSignature)(text, config);
    // STEP 5 - Unprotect placeholders back
    tableStore.forEach((t) => {
        const protectedTag = `__TABLE_BLOCK_${t.index}__`;
        const block = `\n\nTABLE_${t.index + 1}:\n` +
            JSON.stringify(t.rows, null, 2) +
            `\n\n`;
        text = text.replace(protectedTag, block);
    });
    // STEP 6 - Final formatting
    return postProcessText(text);
}
// export function finalcleanEmailtextwithtoon(html: string, config: CleanerConfig = {}): string {
//   if (!html) return "";
//   const $ = cheerio.load(html);
//   const tableStore: any[] = [];
//   $("table").each((index, table) => {
//     const tableHtml = $.html(table);
//     const extracted = extractSingleTableToJson(tableHtml);
//     const toon =convertToToon(extracted);
//   //  if (!extracted || extracted.isSignature || extracted.rows.length === 0) {
//   //     $(table).remove();
//   //     return;
//   //   }
//     tableStore.push({
//       index,
//       toon: toon
//     });
//     $(table).replaceWith(`[[TABLE_${index}]]`);
//   });
//   let text = htmlToPlainText($.html(), config);
//   tableStore.forEach(t => {
//     const toonDump = t.toon
//     text = text.replace(
//       `[[TABLE_${t.index}]]`,
//       `\n\nTABLE_${t.index + 1}:\n${toonDump}\n\n`
//     );
//   });
//   return postProcessText(text);
// }
// export function finalcleanEmailtext(html: string, config: CleanerConfig = {}): string {
//   if (!html) return "";
//   const $ = cheerio.load(html);
//   const tableStore: any[] = [];
//   $("table").each((index, table) => {
//     const tableHtml = $.html(table);
//     const extracted = extractSingleTableToJson(tableHtml);
//     if (!extracted || extracted.length === 0) {
//       $(table).remove();
//       return;
//     }
//     tableStore.push({
//       index,
//       json: extracted
//     });
//     $(table).replaceWith(`[[TABLE_${index}]]`);
//   });
//   let text = htmlToPlainText($.html(), config);
//   tableStore.forEach(t => {
//     const jsonDump = JSON.stringify(t.json, null, 2);
//     text = text.replace(
//       `[[TABLE_${t.index}]]`,
//       `\n\nTABLE_${t.index + 1}:\n${jsonDump}\n\n`
//     );
//   });
//   return postProcessText(text);
// }
// function extractSingleTableToJson(htmlTable: string) {
//   const $ = cheerio.load(htmlTable);
//   const rows = $("tr");
//   const jsonRows: any[] = [];
//   let headers: string[] = [];
//   rows.each((rowIndex, row) => {
//     const cells = $(row).find("th, td");
//     if (headers.length === 0 && $(row).find("th").length > 0) {
//       cells.each((i, cell) => {
//         const t = $(cell).text().trim();
//         headers.push(t || `Column_${i + 1}`);
//       });
//       return;
//     }
//     if (headers.length === 0 && rowIndex === 0) {
//       cells.each((i, cell) => {
//         const t = $(cell).text().trim();
//         headers.push(t || `Column_${i + 1}`);
//       });
//       return;
//     }
//     const obj: any = {};
//     cells.each((i, cell) => {
//       const value = $(cell).text().trim();
//       const key = headers[i] || `Column_${i + 1}`;
//       obj[key] = value;
//     });
//     if (Object.keys(obj).length > 0) {
//       jsonRows.push(obj);
//     }
//   });
//   return jsonRows;
// }
// function extractSingleTableToJson(htmlTable: string) {
//   const $ = cheerio.load(htmlTable);
//   const rows = $("tr");
//   const jsonRows: any[] = [];
//   let headers: string[] = [];
//   let headerDetected = false;
//   // Detect signature BEFORE extraction
//   const isSignature = detectSignatureTable($(htmlTable).text());
//   rows.each((rowIndex, row) => {
//     const cells = $(row).find("th, td");
//     // STEP 1 — Header row with <th>
//     if (!headerDetected && $(row).find("th").length > 0) {
//       headers = cells.map((i, cell) => {
//         const t = $(cell).text().trim();
//         return t || `Column_${i + 1}`;
//       }).get();
//       headerDetected = true;
//       return;
//     }
//     // STEP 2 — First row heuristics
//     const rawValues = cells.map((i, cell) => $(cell).text().trim()).get();
//     if (!headerDetected && rowIndex === 0) {
//       const looksHeader = rawValues.some(v => /[a-zA-Z]/.test(v)); // contains letters?
//       if (looksHeader) {
//         headers = rawValues.map((t, i) => t || `Column_${i + 1}`);
//         headerDetected = true;
//         return;
//       }
//       // If it doesn't look like header → treat as DATA row
//       headers = rawValues.map((_, i) => `Column_${i + 1}`);
//       headerDetected = true;
//       const obj: any = {};
//       rawValues.forEach((v, i) => obj[headers[i]] = v);
//       jsonRows.push(obj);
//       return;
//     }
//     // STEP 3 — Normal data rows
//     const obj: any = {};
//     rawValues.forEach((v, i) => {
//       obj[headers[i] || `Column_${i + 1}`] = v;
//     });
//     jsonRows.push(obj);
//   });
//   return {
//     isSignature,
//     rows: jsonRows
//   };
// }
function extractSingleTableToJson(htmlTable) {
    const $ = cheerio.load(htmlTable);
    const rows = $("tr");
    const jsonRows = [];
    // Detect signature once (outside row parsing)
    const isSignature = detectSignatureTable($(htmlTable).text());
    // 1. NORMALIZE all cell values: strip <p>, <span>, RTL noise
    function cleanCell(cell) {
        return cell.text()
            .replace(/\s+/g, " ")
            .replace(/[\u200e\u200f\u202a-\u202e]/g, "") // RTL marks
            .trim();
    }
    // 2. Extract ALL rows as raw arrays
    const rawRows = [];
    rows.each((_, row) => {
        const cells = $(row).find("th, td");
        const cleaned = cells.map((i, cell) => cleanCell($(cell))).get();
        if (cleaned.length > 0)
            rawRows.push(cleaned);
    });
    if (rawRows.length === 0) {
        return { isSignature, rows: [] };
    }
    // 3. Detect header row dynamically (GLOBAL detection)
    const firstRow = rawRows[0];
    const hasLetters = firstRow.some(v => /[a-zA-Z]/.test(v));
    const hasArabicLetters = firstRow.some(v => /[\u0600-\u06FF]/.test(v));
    const tooNumeric = firstRow.filter(v => /^\d+$/.test(v)).length > (firstRow.length / 2);
    const looksLikeData = tooNumeric && !hasLetters && !hasArabicLetters;
    let headers = [];
    if (!looksLikeData) {
        // First row is header
        headers = firstRow.map((h, i) => h || `Column_${i + 1}`);
    }
    else {
        // First row is data → generate synthetic headers
        headers = firstRow.map((_, i) => `Column_${i + 1}`);
        // And include first row as data
        const obj = {};
        firstRow.forEach((v, i) => obj[headers[i]] = v);
        jsonRows.push(obj);
    }
    // 4. Process remaining rows
    for (let r = looksLikeData ? 1 : 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        const obj = {};
        row.forEach((v, i) => {
            obj[headers[i] || `Column_${i + 1}`] = v;
        });
        jsonRows.push(obj);
    }
    return { isSignature, rows: jsonRows };
}
function finalcleanEmailtext(html, config = {}) {
    if (!html)
        return "";
    // Step 1: Load HTML
    const $ = cheerio.load(html);
    const tableStore = [];
    // Step 2: Replace each <table> with a placeholder
    //   $("table").each((index, table) => {
    //     const tableHtml = $.html(table);
    //     const extracted = extractSingleTableToJson(tableHtml);
    //     tableStore.push({
    //       index,
    //       json: extracted
    //     });
    //     // replace table with marker
    //     $(table).replaceWith(`[[TABLE_${index}]]`);
    //   });
    //this is also same empty table all clean
    $("table").each((index, table) => {
        const tableHtml = $.html(table);
        const extracted = extractSingleTableToJson(tableHtml);
        // If table has no usable rows → remove and DO NOT add to tableStore
        if (!extracted || extracted.isSignature || extracted.rows.length === 0) {
            $(table).remove();
            return;
        }
        // Valid table → store and replace with marker
        tableStore.push({
            index,
            json: extracted.rows
        });
        $(table).replaceWith(`[[TABLE_${index}]]`);
    });
    // Step 3: Convert remaining HTML to plaintext
    let text = htmlToPlainText($.html(), config);
    // Step 4: Replace placeholders with JSON blocks
    tableStore.forEach(t => {
        const jsonDump = JSON.stringify(t.json, null, 2);
        text = text.replace(`[[TABLE_${t.index}]]`, `\n\nTABLE_${t.index + 1}:\n${jsonDump}\n\n`);
    });
    // Step 5: Final polish
    return postProcessText(text);
}
function tableJsonToMarkdown(rows) {
    if (!rows || rows.length === 0)
        return "";
    const headers = Object.keys(rows[0]);
    // Build header row
    const headerLine = `| ${headers.join(" | ")} |`;
    // Build separator row
    const separatorLine = `| ${headers.map(() => "---").join(" | ")} |`;
    // Build data rows
    const dataLines = rows.map(row => {
        const cols = headers.map(h => {
            const val = row[h] ?? "";
            return String(val).replace(/\n+/g, " "); // flatten multi-line cells
        });
        return `| ${cols.join(" | ")} |`;
    });
    return [headerLine, separatorLine, ...dataLines].join("\n");
}
function detectSignatureTable(text) {
    const lower = text.toLowerCase();
    // Universal global signature phrases
    const strong = [
        "best regards",
        "kind regards",
        "thanks & regards",
        "warm regards",
        "sent from my iphone",
        "sent from my android",
        "sincerely",
        "yours truly"
    ];
    // Contact block signals – must match at least 2
    const contactSignals = [
        /\+\d{1,3}\s?\d{6,12}/, // international phone
        /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/, // email
        /www\./,
        /\.com\b/,
    ];
    // Address fragment signals (global)
    const addressSignals = [
        "p.o. box",
        "street",
        "road",
        "building",
        "suite",
        "kingdom of saudi arabia",
        "united arab emirates",
        "uae",
        "usa",
        "uk",
        "canada"
    ];
    // 1) Strong signature markers → auto match
    if (strong.some(s => lower.includes(s)))
        return true;
    // 2) Contact info check → require at least 2 hits
    let contactCount = 0;
    contactSignals.forEach(r => { if (r.test(lower))
        contactCount++; });
    if (contactCount >= 2)
        return true;
    // 3) Address check → require at least 1 hit + 1 contact signal
    if (addressSignals.some(s => lower.includes(s)) && contactCount >= 1) {
        return true;
    }
    return false;
}
// function extractSingleTableToJson(htmlTable: string) {
//   const $ = cheerio.load(htmlTable);
//   const rows = $("tr");
//   const jsonRows: any[] = [];
//   let headers: string[] = [];
//   rows.each((rowIndex, row) => {
//     const cells = $(row).find("th, td");
//     // Header detection
//     if (headers.length === 0 && $(row).find("th").length > 0) {
//       cells.each((i, cell) => {
//         const t = $(cell).text().trim();
//         headers.push(t || `Column_${i + 1}`);
//       });
//       return;
//     }
//     if (headers.length === 0 && rowIndex === 0) {
//       cells.each((i, cell) => {
//         const t = $(cell).text().trim();
//         headers.push(t || `Column_${i + 1}`);
//       });
//       return;
//     }
//     // Data rows
//     const obj: any = {};
//     cells.each((i, cell) => {
//       const value = $(cell).text().trim();
//       const key = headers[i] || `Column_${i + 1}`;
//       obj[key] = value;
//     });
//     if (Object.keys(obj).length > 0) {
//       jsonRows.push(obj);
//     }
//   });
//   console.log("Extracted Table JSON:", jsonRows);
//   return jsonRows;
// }
const html = `
<div><div class="WordSection1"><p class="MsoNormal" align="center" style="text-align:center"><span lang="AR-SA" dir="RTL" style="font-size:10.0pt; color:black">الاخ/ هاني</span></p><p class="MsoNormal" align="center" style="text-align:center"><span lang="AR-SA" dir="RTL" style="font-size:10.0pt; color:black">&nbsp;</span></p><p class="MsoNormal" align="center" style="text-align:center"><span lang="AR-SA" dir="RTL" style="font-size:10.0pt; color:black">الموظف ادناه قدم استقاله واخر يوم عمل 02/12/2025</span></p><div align="center"><table class="MsoTableGrid" border="1" cellspacing="0" cellpadding="0" style="border-collapse:collapse; border:none"><tbody><tr style="height:15.0pt"><td width="129" nowrap="" valign="top" style="width:97.05pt; border:solid windowtext 1.0pt; padding:0in 5.4pt 0in 5.4pt; height:15.0pt"><p class="MsoNormal" align="center" style="text-align:center"><b><span style="font-size:11.0pt; font-family:&quot;Aptos Display&quot;,sans-serif; color:black">Company Name:</span></b></p></td><td width="138" nowrap="" valign="top" style="width:103.8pt; border:solid windowtext 1.0pt; border-left:none; padding:0in 5.4pt 0in 5.4pt; height:15.0pt"><p class="MsoNormal" align="center" style="text-align:center"><b><span style="font-size:11.0pt; font-family:&quot;Aptos Display&quot;,sans-serif; color:black">Personnel number</span></b></p></td><td width="189" nowrap="" valign="top" style="width:142.05pt; border:solid windowtext 1.0pt; border-left:none; padding:0in 5.4pt 0in 5.4pt; height:15.0pt"><p class="MsoNormal" align="center" style="text-align:center"><b><span style="font-size:11.0pt; font-family:&quot;Aptos Display&quot;,sans-serif; color:black">Profession</span></b></p></td><td width="102" nowrap="" valign="top" style="width:76.8pt; border:solid windowtext 1.0pt; border-left:none; padding:0in 5.4pt 0in 5.4pt; height:15.0pt"><p class="MsoNormal" align="center" style="text-align:center"><b><span style="font-size:11.0pt; font-family:&quot;Aptos Display&quot;,sans-serif; color:black">Iqama \ SId</span></b></p></td></tr><tr style="height:15.0pt"><td width="129" nowrap="" valign="top" style="width:97.05pt; border:solid windowtext 1.0pt; border-top:none; padding:0in 5.4pt 0in 5.4pt; height:15.0pt"><p class="MsoNormal" align="center" style="text-align:center"><span style="font-size:11.0pt; font-family:&quot;Aptos Display&quot;,sans-serif; color:black">UMESH HAYU</span></p></td><td width="138" nowrap="" valign="top" style="width:103.8pt; border-top:none; border-left:none; border-bottom:solid windowtext 1.0pt; border-right:solid windowtext 1.0pt; padding:0in 5.4pt 0in 5.4pt; height:15.0pt"><p class="MsoNormal" align="center" style="text-align:center"><span style="font-size:11.0pt; font-family:&quot;Aptos Display&quot;,sans-serif; color:black">93199</span></p></td><td width="189" nowrap="" valign="top" style="width:142.05pt; border-top:none; border-left:none; border-bottom:solid windowtext 1.0pt; border-right:solid windowtext 1.0pt; padding:0in 5.4pt 0in 5.4pt; height:15.0pt"><p class="MsoNormal" align="center" style="text-align:center"><span style="font-size:11.0pt; font-family:&quot;Aptos Display&quot;,sans-serif; color:black">Terminal Handling OPS Staff</span></p></td><td width="102" nowrap="" valign="top" style="width:76.8pt; border-top:none; border-left:none; border-bottom:solid windowtext 1.0pt; border-right:solid windowtext 1.0pt; padding:0in 5.4pt 0in 5.4pt; height:15.0pt"><p class="MsoNormal" align="center" style="text-align:center"><span style="font-size:11.0pt; font-family:&quot;Aptos Display&quot;,sans-serif; color:black">2478667328</span></p></td></tr></tbody></table></div><p class="MsoNormal" align="center" style="text-align:center"><span lang="AR-SA" dir="RTL" style="font-size:10.0pt; color:black">&nbsp;</span></p><p class="MsoNormal"><span style="font-size:11.0pt; font-family:&quot;Aptos Display&quot;,sans-serif; color:black">&nbsp;</span></p><div><table class="MsoNormalTable" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse"><tbody><tr><td width="174" valign="top" style="width:130.5pt; padding:5.0pt 5.0pt 5.0pt 5.0pt"><p class="MsoNormal"><a href="https://www.naqelexpress.com/en/sa/" target="_blank"><span style="color:black; text-decoration:none"><img src='https://portal.mawarid.com.sa/apps4x-api/Attachement/1d8d4449-4f11-4230-b671-a41630c536fd.png' alt='cid:image001.png@01DC57BA.D0976AB0'></span></a><span style="color:black"></span></p></td><td width="412" valign="top" style="width:309.2pt; padding:5.0pt 5.0pt 5.0pt 5.0pt"><p class="MsoNormal" style="margin:.75pt"><b><span style="font-size:14.0pt; color:#1F3864">Mawadah Santali</span></b></p><p class="MsoNormal"><span style="color:black">Senior Payroll Specialist | HR Operation</span><span style="color:black"></span></p><p class="MsoNormal"><u><span style="color:black"><a href="mailto:mawadah.santali@naqel.com.sa"><span style="color:#0563C1">mawadah.santali@naqel.com.sa</span></a> </span></u><span style="color:black">&nbsp;|&nbsp;+966539202072</span></p><p class="MsoNormal"><span style="color:black">Head Office -Exit 17 Suly Area Riyadh,11625 SA</span></p><div class="MsoNormal" align="center" style="text-align:center"><span style="color:black"><hr size="3" width="100%" align="center"></span></div><p class="MsoNormal"><a href="https://twitter.com/NaqelCare" target="_blank"><span style="color:black; text-decoration:none"><img src='https://portal.mawarid.com.sa/apps4x-api/Attachement/60d93c0d-37ca-4296-ad16-867386b1a2ee.png' alt='cid:image002.png@01DC57BA.D0976AB0'></span></a><a href="https://www.facebook.com/NaqelExpr" target="_blank"><span style="color:black; text-decoration:none"><img src='https://portal.mawarid.com.sa/apps4x-api/Attachement/baa08b70-190d-49aa-b7eb-a90a08b68527.png' alt='cid:image003.png@01DC57BA.D0976AB0'></span></a><a href="https://www.linkedin.com/authwall?trk=bf&amp;trkInfo=AQGDy0eN4dTeqgAAAYvN9OKgaBRURaWrQ4cv4RGt33MGQSWfdAOWCGHmx3DHKD2U8q-QxilGorOO9hdR3B5GOO78AMJln6zr6yC4sq1uuUIf3-wzRGxoDRkGYSD1YsAWqy94Y94=&amp;original_referer=&amp;sessionRedirect=https%3A%2F%2Fwww.linkedin.com%2Fcompany%2F516668%2Fadmin%2F" target="_blank"><span style="color:black; text-decoration:none"><img src='https://portal.mawarid.com.sa/apps4x-api/Attachement/3bd3efb7-14cc-4de5-825b-e93c319b68b1.png' alt='cid:image004.png@01DC57BA.D0976AB0'></span></a><a href="https://www.instagram.com/naqelexpr/" target="_blank"><span style="color:black; text-decoration:none"><img src='https://portal.mawarid.com.sa/apps4x-api/Attachement/6d27b186-3292-49a3-b41a-d1f7ca864efd.png' alt='cid:image005.png@01DC57BA.D0976AB0'></span></a><span style="color:black"></span></p></td></tr></tbody></table><p class="MsoNormal"><span style="font-family:&quot;Cambria&quot;,serif; color:black">&nbsp;</span></p></div><p class="MsoNormal">&nbsp;</p></div></div>
`;
;
exports.threadPatterns = [
    /^_{10,}\s*$/m,
    /^-{10,}\s*Original Message\s*-{10,}/im,
    /^From:\s+[^\n]+\nSent:\s+[^\n]+\nTo:\s+[^\n]+/im,
    /^From:\s+[^\n]+\nDate:\s+[^\n]+\nSubject:\s+[^\n]+/im,
    /^On\s+\d{1,2}\/\d{1,2}\/\d{2,4}.+wrote:\s*$/im,
    /^On\s+[A-Z][a-z]{2},\s+[A-Z][a-z]{2}\s+\d{1,2},.+wrote:\s*$/im,
    /^On\s+.{10,100}wrote:\s*$/im,
    /^Sent from my (iPhone|iPad|Android|Mobile)/im,
    /^Get Outlook for (iOS|Android)/im,
    /^>{2,}/m,
    /^-{3,}\s*Forwarded message\s*-{3,}/im,
    /^Begin forwarded message:/im,
];
/**
 * Cleans an email thread by stripping old messages while preserving TABLE_x blocks.
 *
 */
function parseHeaderBlock(block) {
    // Remove noise
    const cleaned = block
        .replace(/\s+/g, " ")
        .replace(/[\u200e\u200f\u202a-\u202e]/g, "")
        .trim();
    const extract = (labels) => {
        const regex = new RegExp(`(?:${labels})\\s*:?\\s*([^\\n]+)`, "i");
        const match = cleaned.match(regex);
        return match ? match[1].trim() : "";
    };
    return {
        from: extract("From|من"),
        to: extract("To|إلى"),
        subject: extract("Subject|الموضوع")
    };
}
function buildCombinedHeaderRegex() {
    return new RegExp(String.raw `
      (?:
        # English
        From:\s*[^\n]+
        (?:\n(?!From:|من:)[^\n]*)*
        \nSent:\s*[^\n]+
        (?:\n(?!From:|من:)[^\n]*)*
        (?:\nTo:\s*[^\n]+(?:\n(?!From:|من:)[^\n]*)*)?
        (?:\nCc:\s*[^\n]+(?:\n(?!From:|من:)[^\n]*)*)?
        (?:\nSubject:\s*[^\n]+(?:\n(?!From:|من:)[^\n]*)*)?

        |

        # Arabic
        من:\s*[^\n]+
        (?:\n(?!From:|من:)[^\n]*)*
        \n(?:تم الإرسال|تاريخ الإرسال):\s*[^\n]+
        (?:\n(?!From:|من:)[^\n]*)*
        (?:\nإلى:\s*[^\n]+(?:\n(?!From:)[^\n]*)*)?
        (?:\nنسخة:\s*[^\n]+(?:\n(?!From:)[^\n]*)*)?
        (?:\nالموضوع:\s*[^\n]+(?:\n(?!From:)[^\n]*)*)?
      )
    `.replace(/\s+/g, ""), "gi");
}
function stripRepeatedEmailHeaders(input) {
    if (!input)
        return "";
    const normalized = input.replace(/[\u200e\u200f\u202a-\u202e]/g, "");
    const headerRegex = buildCombinedHeaderRegex();
    const matches = [...normalized.matchAll(headerRegex)];
    if (matches.length <= 1)
        return normalized;
    // Convert located header blocks into structured comparable objects
    const headers = matches.map(m => {
        const block = m[0];
        const index = m.index;
        const parsed = parseHeaderBlock(block);
        return { block, index, parsed };
    });
    let output = normalized;
    const seenKeys = new Set();
    // Remove duplicates from last → first
    for (let i = headers.length - 1; i >= 0; i--) {
        const h = headers[i];
        const key = `${h.parsed.from}|${h.parsed.to}|${h.parsed.subject}`;
        // Same core thread → remove duplicates
        if (seenKeys.has(key)) {
            output =
                output.slice(0, h.index) +
                    output.slice(h.index + h.block.length);
        }
        else {
            seenKeys.add(key);
        }
    }
    return output.replace(/\n{3,}/g, "\n\n").trim();
}
function cleanEmail(htmlBody, config = {}) {
    const mergedConfig = { ...exports.DEFAULT_CONFIG, ...config };
    // Step 1: HTML to plain text
    let text = finalcleanEmailtext(htmlBody);
    //   console.log(text)
    // Step 2: Extract latest thread
    text = stripRepeatedEmailHeaders(text);
    console.log(text);
    //   // Step 3: Remove quotes if requested
    //   if (mergedConfig.removeQuotes) {
    //     text = removeQuoteMarkers(text);
    //   }
    //   // Step 4: Remove disclaimers
    //   text = removeDisclaimers(text);
    //   // Step 5: Remove signature
    //   text = removeSignature(text, mergedConfig);
    //   // Step 6: Final cleanup
    //   text = text.trim();
    //   // Step 7: Truncate if needed
    //   if (mergedConfig.maxLength && text.length > mergedConfig.maxLength) {
    //     text = text.substring(0, mergedConfig.maxLength) + "...";
    //   }
    //   // Step 8: Extract structured parts
    //   const { pretext, core, posttext } = extractPrePostText(text);
    //   const finalCore = core || text;
    return {
        metadata: {
            originalLength: htmlBody.length,
            cleanedLength: text.length,
            compressionRatio: htmlBody.length > 0
                ? ((1 - text.length / htmlBody.length) * 100).toFixed(2) + "%"
                : "0%",
        },
    };
}
// console.log(cleanEmail(html));
