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
exports.DEFAULT_CONFIG = void 0;
exports.cleanEmailWithTables = cleanEmailWithTables;
exports.convertTableToJson = convertTableToJson;
exports.removeSignature = removeSignature;
const cheerio = __importStar(require("cheerio"));
exports.DEFAULT_CONFIG = {
    preserveLinks: false,
    maxLength: 10000,
    aggressiveClean: false,
    removeQuotes: true,
    preserveTables: true,
    minContentLength: 50,
};
//
// --------------------------------------------------------
// MAIN CLEANER WITH TABLE JSON INJECTION
// --------------------------------------------------------
//
function cleanEmailWithTables(text, config = {}) {
    if (!text) {
        return {
            finalText: "",
            tables: [],
        };
    }
    const tables = [];
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
        finalText = finalText.replace(`{{TABLE_JSON_${t.index}}}`, JSON.stringify(t.json));
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
function convertTableToJson(table, $) {
    const rows = table.find("tr");
    const result = [];
    let headers = [];
    rows.each((index, row) => {
        const cells = $(row).find("th,td");
        const rowData = {};
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
function removeSignature(text, config = {}) {
    if (!text)
        return "";
    const lines = text.split("\n");
    const minContent = config.minContentLength || 50;
    if (text.length < minContent * 2)
        return text;
    const delimiterIndex = lines.findIndex((l) => /^--\s*$/.test(l.trim()) || /^—{2,}\s*$/.test(l.trim()));
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
        if (!line)
            continue;
        if (strongSignatureMarkers.some((p) => p.test(line))) {
            return lines.slice(0, i).join("\n").trim();
        }
        let matches = weakSignatureMarkers.filter((p) => p.test(line)).length +
            titlePatterns.filter((p) => p.test(line)).length;
        if (matches > 0) {
            signatureConfidence += matches;
            if (signatureStartIndex === lines.length) {
                signatureStartIndex = i;
            }
        }
        if (signatureConfidence >= 3)
            break;
    }
    const before = lines.slice(0, signatureStartIndex).join("\n");
    if (signatureConfidence >= 3 && before.length >= minContent) {
        return before.trim();
    }
    return text;
}
