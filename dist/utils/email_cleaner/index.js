"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CONFIG = void 0;
exports.default = cleanEmail;
const thread_extractor_js_1 = require("./thread-extractor.js");
const signature_remover_js_1 = require("./signature-remover.js");
const disclaimer_remover_js_1 = require("./disclaimer-remover.js");
const prepost_extractor_js_1 = require("./prepost-extractor.js");
const quote_remover_js_1 = require("./quote-remover.js");
const html_to_text1_js_1 = require("./html-to-text1.js");
exports.DEFAULT_CONFIG = {
    preserveLinks: false,
    maxLength: 10000,
    aggressiveClean: false,
    removeQuotes: true,
    preserveTables: true,
    minContentLength: 50,
};
function cleanEmail(htmlBody, config = {}) {
    const mergedConfig = { ...exports.DEFAULT_CONFIG, ...config };
    // Step 1: HTML to plain text
    // let text = htmlToPlainText(htmlBody, mergedConfig);
    let text = (0, html_to_text1_js_1.finalcleanEmailtext)(htmlBody, mergedConfig);
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
    text = (0, thread_extractor_js_1.extractLatestThread)(text);
    // Step 3: Remove quotes if requested
    if (mergedConfig.removeQuotes) {
        text = (0, quote_remover_js_1.removeQuoteMarkers)(text);
    }
    // Step 4: Remove disclaimers
    text = (0, disclaimer_remover_js_1.removeDisclaimers)(text);
    // Step 5: Remove signature
    text = (0, signature_remover_js_1.removeSignature)(text, mergedConfig);
    // Step 6: Final cleanup
    text = text.trim();
    // Step 7: Truncate if needed
    if (mergedConfig.maxLength && text.length > mergedConfig.maxLength) {
        text = text.substring(0, mergedConfig.maxLength) + "...";
    }
    // Step 8: Extract structured parts
    const { pretext, core, posttext } = (0, prepost_extractor_js_1.extractPrePostText)(text);
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
