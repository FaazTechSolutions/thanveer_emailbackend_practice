export function removeQuoteMarkers(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/^>+\s*/, ""))
    .join("\n");
}
