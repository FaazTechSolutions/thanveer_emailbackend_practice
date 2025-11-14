//this has pure clean email 
// /********************************************************************
//  * email-cleaner.js
//  * ---------------------------------------------------------------
//  * Unified email text preprocessing pipeline for AI email systems.
//  * Tasks handled:
//  *   1. HTML → Text
//  *   2. Email Thread Extraction
//  *   3. Signature Removal
//  *   4. Disclaimer / Warning Removal
//  *   5. Pretext & Posttext Extraction
//  *
//  * Designed for Fastify / Node.js backend (TypeScript)
//  * Dependencies: html-to-text
//  ********************************************************************/
// import { convert } from "html-to-text";
// /** -------------------------------
//  * 1️⃣ HTML → Plain Text
//  * ------------------------------- */
// export function htmlToPlainText(html: string): string {
//   if (!html) return "";
//   try {
//     return convert(html, {
//       wordwrap: false,
//       selectors: [
//         { selector: "a", options: { hideLinkHrefIfSameAsText: true } },
//         { selector: "img", format: "skip" },
//         { selector: "style", format: "skip" },
//         { selector: "script", format: "skip" },
//         { selector: "footer", format: "skip" },
//       ],
//     }).trim();
//   } catch (err) {
//     console.error("Error converting HTML to text:", err);
//     return html;
//   }
// }
// /** -------------------------------
//  * 2️⃣ Extract Latest Email Thread
//  * ------------------------------- */
// export function extractLatestThread(text: string): string {
//   if (!text) return "";
//   const patterns = [
//     /^On\s.+wrote:/im,
//     /^From:\s.+/im,
//     /-----Original Message-----/im,
//     /<div class="gmail_quote">/im,
//     /Sent from my /im,
//   ];
//   for (const p of patterns) {
//     const match = text.search(p);
//     if (match > -1) return text.substring(0, match).trim();
//   }
//   return text.trim();
// }
// /** -------------------------------
//  * 3️⃣ Signature Removal
//  * ------------------------------- */
// export function removeSignature(text: string): string {
//   if (!text) return "";
//   const signaturePatterns = [
//     /Best regards[, ]*/i,
//     /Kind regards[, ]*/i,
//     /Sincerely[, ]*/i,
//     /Thanks[, ]*/i,
//     /Sent from my iPhone/i,
//     /Sent from my Android/i,
//     /This message was sent from my/i,
//   ];
//   for (const p of signaturePatterns) {
//     const match = text.search(p);
//     if (match > -1) return text.substring(0, match).trim();
//   }
//   // Standard “--” signature delimiter
//   const lines = text.split("\n");
//   const sigIndex = lines.findIndex((l) => l.trim().startsWith("--"));
//   if (sigIndex > -1) return lines.slice(0, sigIndex).join("\n").trim();
//   return text;
// }
// /** -------------------------------
//  * 4️⃣ Disclaimer / Warning Removal
//  * ------------------------------- */
// export function removeDisclaimers(text: string): string {
//   if (!text) return "";
//   const disclaimerPatterns = [
//     /This email( message)? (and any attachments )?(are|is) confidential/i,
//     /If you (have )?received this email in error/i,
//     /The views expressed in this message/i,
//     /Scanned (by|for) (virus|viruses|malware)/i,
//     /This communication (may )?contain confidential information/i,
//     /Company Confidential/i,
//     /Internal Use Only/i,
//     /This e-mail message is intended only for the named recipient/i,
//     /Please delete this email/i,
//     /Legally privileged/i,
//     /This email has been scanned/i,
//   ];
//   for (const p of disclaimerPatterns) {
//     const match = text.search(p);
//     if (match > -1) return text.substring(0, match).trim();
//   }
//   return text;
// }
// /** -------------------------------
//  * 5️⃣ Pretext & Posttext Extraction
//  * ------------------------------- */
// export function extractPrePostText(text: string) {
//   if (!text) return { pretext: "", core: "", posttext: "" };
//   const lines = text
//     .split("\n")
//     .map((l) => l.trim())
//     .filter((l) => l.length);
//   const preIndex = lines.findIndex((l) => /^hi|hello|dear/i.test(l));
//   const postIndex = lines.findIndex((l) => /^(thanks|regards|sincerely)/i.test(l));
//   const pretext = preIndex >= 0 ? lines.slice(0, preIndex + 1).join("\n") : "";
//   const posttext = postIndex >= 0 ? lines.slice(postIndex).join("\n") : "";
//   const core = lines
//     .slice(preIndex + 1, postIndex > 0 ? postIndex : undefined)
//     .join("\n");
//   return { pretext, core, posttext };
// }
// /** -------------------------------
//  * Unified Processor
//  * ------------------------------- */
// export default function cleanEmail(htmlBody: string) {
//   const plain = htmlToPlainText(htmlBody);
//   const latest = extractLatestThread(plain);
//   const noSignature = removeSignature(latest);
//   const noDisclaimer = removeDisclaimers(noSignature);
//   const { pretext, core, posttext } = extractPrePostText(noDisclaimer);
//   return {
//     pretext,
//     core,
//     posttext,
//     cleanText: noDisclaimer,
//     summary: `${core.slice(0, 150)}${core.length > 150 ? "..." : ""}`,
//   };
// }
/** -------------------------------
 * Example Usage
 * ------------------------------- */
// if (require.main === module) {
//   const sampleEmail = `
//     <html>
//       <body>
//         <p>Hi Support Team,</p>
//         <p>I have an issue with my account login. Can you please assist?</p>
//         <p>Thanks,<br>John</p>
//         <p>--<br>John Doe<br>Customer Success Manager<br>ACME Corp</p>
//         <p>This email and any attachments are confidential and intended solely for the addressee.</p>
//       </body>
//     </html>
//   `;
//   const result = cleanEmail(sampleEmail);
//   console.log("\n🧹 Cleaned Email Result:");
//   console.log(JSON.stringify(result, null, 2));
// }
/********************************************************************
 * email-cleaner-advanced.js
 * ---------------------------------------------------------------
 * Production-grade email text preprocessing with multi-level regex
 * Advanced features:
 *   - Aggressive HTML cleaning with DOMPurify-style approach
 *   - Multi-pass thread extraction
 *   - Smart signature detection with ML-like heuristics
 *   - Comprehensive disclaimer removal
 *   - Quote level detection
 *   - Forwarded email handling
 ********************************************************************/
/********************************************************************
 * email-cleaner-advanced.js
 * ---------------------------------------------------------------
 * Production-grade email text preprocessing with balanced cleaning
 * Fixed issues: Better table handling, signature detection, content preservation
 ********************************************************************/
import { convert } from "html-to-text";
const DEFAULT_CONFIG = {
    preserveLinks: false,
    maxLength: 10000,
    aggressiveClean: false,
    removeQuotes: true,
    preserveTables: true,
    minContentLength: 50,
};
/** -------------------------------
 * 1️⃣ ADVANCED HTML → Plain Text
 * ------------------------------- */
export function htmlToPlainText(html, config = {}) {
    if (!html)
        return "";
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
            // Remove tracking pixels (1x1 images) but keep regular images
            .replace(/<img[^>]*width=["']?1["']?[^>]*height=["']?1["']?[^>]*>/gi, "")
            .replace(/<img[^>]*height=["']?1["']?[^>]*width=["']?1["']?[^>]*>/gi, "")
            // Convert HTML entities FIRST (important for text extraction)
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
        // Main conversion with proper table handling
        const plainText = convert(cleaned, {
            wordwrap: false,
            preserveNewlines: true,
            selectors: [
                // Links
                {
                    selector: "a",
                    options: {
                        ignoreHref: !config.preserveLinks,
                        hideLinkHrefIfSameAsText: true
                    }
                },
                // Tables - PRESERVE by default for data tables
                {
                    selector: "table",
                    format: config.preserveTables ? "dataTable" : "block"
                },
                // Skip decorative elements
                { selector: "img", format: "skip" },
                { selector: "style", format: "skip" },
                { selector: "script", format: "skip" },
                { selector: "head", format: "skip" },
                { selector: "nav", format: "skip" },
                { selector: "iframe", format: "skip" },
                { selector: "noscript", format: "skip" },
                { selector: "svg", format: "skip" },
                { selector: "canvas", format: "skip" },
                // Email client specific - only skip if it's a quote block
                { selector: "blockquote[type='cite']", format: "skip" },
            ],
        });
        // Post-processing cleanup
        return postProcessText(plainText, config);
    }
    catch (err) {
        console.error("Error converting HTML to text:", err);
        return stripHtmlFallback(html);
    }
}
/** -------------------------------
 * Fallback HTML stripper
 * ------------------------------- */
function stripHtmlFallback(html) {
    return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&[a-z]+;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}
/** -------------------------------
 * Post-process text cleanup
 * ------------------------------- */
function postProcessText(text, config) {
    let cleaned = text
        // Remove zero-width and invisible characters
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        // Remove excessive whitespace but preserve paragraph breaks
        .replace(/[ \t]+/g, " ")
        .replace(/\n\s*\n\s*\n+/g, "\n\n")
        // Remove repeated punctuation
        .replace(/([.!?])\1{2,}/g, "$1")
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
 * 2️⃣ ADVANCED Thread Extraction
 * ------------------------------- */
export function extractLatestThread(text) {
    if (!text)
        return "";
    // Thread markers ordered by specificity
    const threadPatterns = [
        // Most specific first
        /^_{10,}\s*$/m,
        /^-{10,}\s*Original Message\s*-{10,}/im,
        /^From:\s+[^\n]+\nSent:\s+[^\n]+\nTo:\s+[^\n]+/im,
        /^From:\s+[^\n]+\nDate:\s+[^\n]+\nSubject:\s+[^\n]+/im,
        // Gmail/Standard reply
        /^On\s+\d{1,2}\/\d{1,2}\/\d{2,4}.+wrote:\s*$/im,
        /^On\s+[A-Z][a-z]{2},\s+[A-Z][a-z]{2}\s+\d{1,2},.+wrote:\s*$/im,
        /^On\s+.{10,100}wrote:\s*$/im,
        // Mobile signatures (keep them for now, signature removal will handle)
        /^Sent from my (iPhone|iPad|Android|Mobile)/im,
        /^Get Outlook for (iOS|Android)/im,
        // Quote blocks (only if multiple levels)
        /^>{2,}/m,
        // Forwarded
        /^-{3,}\s*Forwarded message\s*-{3,}/im,
        /^Begin forwarded message:/im,
    ];
    let cutIndex = text.length;
    // Find earliest meaningful match
    for (const pattern of threadPatterns) {
        const match = text.search(pattern);
        if (match > 50 && match < cutIndex) { // Ignore matches in first 50 chars
            cutIndex = match;
        }
    }
    const extracted = text.substring(0, cutIndex).trim();
    return extracted.replace(/\n>+\s*$/gm, "").trim();
}
/** -------------------------------
 * 3️⃣ SMART Signature Removal
 * ------------------------------- */
export function removeSignature(text, config = {}) {
    if (!text)
        return "";
    const lines = text.split("\n");
    const minContent = config.minContentLength || 50;
    // Don't remove signature if content is already very short
    if (text.length < minContent * 2) {
        return text;
    }
    // Standard delimiter check (highest confidence)
    const delimiterIndex = lines.findIndex((l) => /^--\s*$/.test(l.trim()) || /^—{2,}\s*$/.test(l.trim()));
    if (delimiterIndex > 5) { // Only if it's not in first few lines
        return lines.slice(0, delimiterIndex).join("\n").trim();
    }
    // Signature detection with context awareness
    let signatureStartIndex = lines.length;
    let signatureConfidence = 0;
    // Strong signature markers (high confidence)
    const strongSignatureMarkers = [
        /^Sent from my (iPhone|iPad|Android|BlackBerry|Windows Phone)/i,
        /^Get Outlook for (iOS|Android)/i,
        /^Sent from Mail for Windows/i,
    ];
    // Weak signature markers (need multiple to confirm)
    const weakSignatureMarkers = [
        /^(Best|Kind|Warm|With)\s+(regards|wishes)/i,
        /^Thanks?,?$/i,
        /^Thank you,?$/i,
        /^Regards,?$/i,
        /^Cheers,?$/i,
        /^Sincerely,?$/i,
        /^\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/, // Phone
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, // Email
        /^https?:\/\//i, // URL
    ];
    // Professional title patterns
    const titlePatterns = [
        /^(CEO|CTO|CFO|COO|Director|Manager|Engineer|Developer|Specialist|Analyst|Consultant)/i,
    ];
    // Scan from 60% of email onwards (signatures are usually at end)
    const scanStart = Math.floor(lines.length * 0.6);
    for (let i = Math.max(scanStart, 0); i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line)
            continue;
        // Check strong markers (immediate signature detection)
        for (const pattern of strongSignatureMarkers) {
            if (pattern.test(line)) {
                return lines.slice(0, i).join("\n").trim();
            }
        }
        // Check weak markers (accumulate confidence)
        let lineMatches = 0;
        for (const pattern of weakSignatureMarkers) {
            if (pattern.test(line)) {
                lineMatches++;
            }
        }
        for (const pattern of titlePatterns) {
            if (pattern.test(line)) {
                lineMatches++;
            }
        }
        if (lineMatches > 0) {
            signatureConfidence += lineMatches;
            if (signatureStartIndex === lines.length) {
                signatureStartIndex = i;
            }
        }
        // If we've accumulated enough confidence, cut there
        if (signatureConfidence >= 3 && signatureStartIndex < lines.length) {
            break;
        }
    }
    // Only remove signature if we're confident AND there's enough content before it
    const contentBeforeSignature = lines.slice(0, signatureStartIndex).join("\n");
    if (signatureConfidence >= 3 && contentBeforeSignature.length >= minContent) {
        return contentBeforeSignature.trim();
    }
    return text;
}
/** -------------------------------
 * 4️⃣ COMPREHENSIVE Disclaimer Removal
 * ------------------------------- */
export function removeDisclaimers(text) {
    if (!text)
        return "";
    // High-confidence disclaimer patterns
    const disclaimerPatterns = [
        // Multi-line disclaimer blocks (most specific)
        /^-{5,}.*?(confidential|disclaimer|notice)[\s\S]{0,800}?$/im,
        /^={5,}.*?(confidential|disclaimer|notice)[\s\S]{0,800}?$/im,
        /^\*{5,}.*?(confidential|disclaimer|notice)[\s\S]{0,800}?$/im,
        // Confidentiality (only if it starts a paragraph)
        /^This (email|e-mail|message)(\s+and any attachments?)?\s+(is|are)\s+confidential[\s\S]{0,500}?$/im,
        /^CONFIDENTIALITY NOTICE[\s\S]{0,500}?$/im,
        /^DISCLAIMER:[\s\S]{0,500}?$/im,
        // Legal disclaimers (only if at start of paragraph)
        /^If you (have |are not the intended recipient|received this (email|message) in error)[\s\S]{0,300}?$/im,
        // Virus scanning at end
        /\n\s*This email has been (scanned|checked)[\s\S]*$/i,
        /\n\s*Scanned (by|for) (virus(es)?|malware)[\s\S]*$/i,
    ];
    let cleaned = text;
    // Apply each pattern once
    for (const pattern of disclaimerPatterns) {
        cleaned = cleaned.replace(pattern, "");
    }
    // Remove trailing disclaimer-like paragraphs
    const lines = cleaned.split("\n").map(l => l.trim()).filter(l => l);
    let lastValidLine = lines.length;
    // Scan last 3 lines only
    for (let i = Math.max(0, lines.length - 3); i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        if ((line.includes("confidential") && line.length < 100) ||
            (line.includes("disclaimer") && line.length < 100) ||
            (line.includes("virus") && line.includes("scan"))) {
            lastValidLine = Math.min(lastValidLine, i);
        }
    }
    return lines.slice(0, lastValidLine).join("\n").trim();
}
/** -------------------------------
 * 5️⃣ SMART Pretext & Core Extraction
 * ------------------------------- */
export function extractPrePostText(text) {
    if (!text)
        return { pretext: "", core: "", posttext: "" };
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    // More specific greeting patterns (avoid false positives)
    const greetingPatterns = [
        /^(Hi|Hello|Hey|Dear)\s+[A-Z]/i, // Must have name after
        /^Good\s+(morning|afternoon|evening)/i,
        /^To whom it may concern/i,
    ];
    // Specific closing patterns
    const closingPatterns = [
        /^(Thanks?|Thank you|Regards|Best regards|Kind regards|Best|Sincerely|Cheers|Cordially)/i,
        /^(Looking forward|Talk soon|Speak soon)/i,
    ];
    let pretextEndIndex = -1;
    let posttextStartIndex = lines.length;
    // Find greeting (only in first 3 lines)
    for (let i = 0; i < Math.min(3, lines.length); i++) {
        const line = lines[i].trim();
        if (greetingPatterns.some((p) => p.test(line))) {
            pretextEndIndex = i;
            break;
        }
    }
    // Find closing (only in last 5 lines)
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
        const line = lines[i].trim();
        if (closingPatterns.some((p) => p.test(line))) {
            posttextStartIndex = i;
            break;
        }
    }
    // Ensure we have meaningful core content
    const coreStartIndex = pretextEndIndex + 1;
    const coreEndIndex = posttextStartIndex < lines.length ? posttextStartIndex : lines.length;
    // If core is too small, include more
    if (coreEndIndex - coreStartIndex < 2 && pretextEndIndex >= 0) {
        pretextEndIndex = -1; // Don't split if core is tiny
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
export function removeQuoteMarkers(text) {
    return text
        .split("\n")
        .map((line) => line.replace(/^>+\s*/, ""))
        .join("\n");
}
/** -------------------------------
 * 7️⃣ UNIFIED PROCESSOR
 * ------------------------------- */
export default function cleanEmail(htmlBody, config = {}) {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    // Step 1: HTML to plain text (preserve tables by default)
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
    // Step 4: Remove disclaimers BEFORE signature (disclaimers are usually after signature)
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
/** -------------------------------
 * EXPORT ALL UTILITIES
 * ------------------------------- */
