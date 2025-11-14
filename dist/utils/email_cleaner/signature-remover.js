export const DEFAULT_CONFIG = {
    preserveLinks: false,
    maxLength: 10000,
    aggressiveClean: false,
    removeQuotes: true,
    preserveTables: true,
    minContentLength: 50,
};
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
    if (delimiterIndex > 5) {
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
