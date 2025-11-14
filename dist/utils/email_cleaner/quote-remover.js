export function removeQuoteMarkers(text) {
    return text
        .split("\n")
        .map((line) => line.replace(/^>+\s*/, ""))
        .join("\n");
}
