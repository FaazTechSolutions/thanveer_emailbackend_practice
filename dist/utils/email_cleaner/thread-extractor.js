export function extractLatestThread(text) {
    if (!text)
        return "";
    // Thread markers ordered by specificity
    const threadPatterns = [
        // Most specific first: email client headers
        /^_{10,}\s*$/m,
        /^-{10,}\s*Original Message\s*-{10,}/im,
        /^From:\s+[^\n]+\nSent:\s+[^\n]+\nTo:\s+[^\n]+/im,
        /^From:\s+[^\n]+\nDate:\s+[^\n]+\nSubject:\s+[^\n]+/im,
        // Gmail/Standard reply patterns
        /^On\s+\d{1,2}\/\d{1,2}\/\d{2,4}.+wrote:\s*$/im,
        /^On\s+[A-Z][a-z]{2},\s+[A-Z][a-z]{2}\s+\d{1,2},.+wrote:\s*$/im,
        /^On\s+.{10,100}wrote:\s*$/im,
        // Mobile signatures (keep them for now, signature removal will handle)
        /^Sent from my (iPhone|iPad|Android|Mobile)/im,
        /^Get Outlook for (iOS|Android)/im,
        // Quote blocks (only if multiple levels)
        /^>{2,}/m,
        // Forwarded message patterns
        /^-{3,}\s*Forwarded message\s*-{3,}/im,
        /^Begin forwarded message:/im,
    ];
    let cutIndex = text.length;
    // Find earliest meaningful match (ignore matches in first 50 chars)
    for (const pattern of threadPatterns) {
        const match = text.search(pattern);
        if (match > 50 && match < cutIndex) {
            cutIndex = match;
        }
    }
    const extracted = text.substring(0, cutIndex).trim();
    return extracted.replace(/\n>+\s*$/gm, "").trim();
}
