export function removeDisclaimers(text) {
    if (!text)
        return "";
    // High-confidence disclaimer patterns
    const disclaimerPatterns = [
        // Multi-line disclaimer blocks (most specific)
        /^-{5,}.*?(confidential|disclaimer|notice)[\s\S]{0,800}?$/im,
        /^={5,}.*?(confidential|disclaimer|notice)[\s\S]{0,800}?$/im,
        /^\*{5,}.*?(confidential|disclaimer|notice)[\s\S]{0,800}?$/im,
        // Confidentiality notices
        /^This (email|e-mail|message)(\s+and any attachments?)?\s+(is|are)\s+confidential[\s\S]{0,500}?$/im,
        /^CONFIDENTIALITY NOTICE[\s\S]{0,500}?$/im,
        /^DISCLAIMER:[\s\S]{0,500}?$/im,
        // Legal disclaimers
        /^If you (have |are not the intended recipient|received this (email|message) in error)[\s\S]{0,300}?$/im,
        // Virus scanning notices
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
