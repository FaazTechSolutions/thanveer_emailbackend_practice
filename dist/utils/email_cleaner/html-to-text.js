import { convert } from "html-to-text";
export const DEFAULT_CONFIG = {
    preserveLinks: false,
    maxLength: 10000,
    aggressiveClean: false,
    removeQuotes: true,
    preserveTables: true,
    minContentLength: 50,
};
export function htmlToPlainText(html, config = {}) {
    if (!html)
        return "";
    try {
        // Pre-processing: Remove tracking/noise, preserve content
        let cleaned = html
            .replace(/<o:p>\s*<\/o:p>/gis, "")
            .replace(/<v:.*?>\s*<\/v:.*?>/gis, "")
            .replace(/<!--\[if.*?endif\]-->/gis, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<img[^>]*width=["']?1["']?[^>]*height=["']?1["']?[^>]*>/gi, "")
            .replace(/<img[^>]*height=["']?1["']?[^>]*width=["']?1["']?[^>]*>/gi, "")
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
                {
                    selector: "a",
                    options: {
                        ignoreHref: !config.preserveLinks,
                        hideLinkHrefIfSameAsText: true,
                    },
                },
                {
                    selector: "table",
                    format: config.preserveTables ? "dataTable" : "block",
                },
                { selector: "img", format: "skip" },
                { selector: "style", format: "skip" },
                { selector: "script", format: "skip" },
                { selector: "head", format: "skip" },
                { selector: "nav", format: "skip" },
                { selector: "iframe", format: "skip" },
                { selector: "noscript", format: "skip" },
                { selector: "svg", format: "skip" },
                { selector: "canvas", format: "skip" },
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
function stripHtmlFallback(html) {
    return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&[a-z]+;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function postProcessText(text, config) {
    let cleaned = text
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n\s*\n\s*\n+/g, "\n\n")
        .replace(/([.!?])\1{2,}/g, "$1")
        .replace(/^\s*[\[\(]?cid:.*?[\]\)]?\s*$/gim, "")
        .replace(/\[image:.*?\]/gi, "")
        .replace(/\[Image removed by sender\]/gi, "")
        .replace(/\[cid:.*?\]/gi, "");
    cleaned = cleaned
        .split("\n")
        .map(line => line.trim())
        .join("\n")
        .trim();
    cleaned = cleaned.replace(/^\n+/, "").replace(/\n+$/, "");
    return cleaned;
}
