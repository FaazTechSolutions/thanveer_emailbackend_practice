export function extractPrePostText(text: string) {
  if (!text) return { pretext: "", core: "", posttext: "" };
  const lines = text.split("\n").filter((l) => l.trim().length > 0);

  // Greeting patterns (avoid false positives)
  const greetingPatterns = [
    /^(Hi|Hello|Hey|Dear)\s+[A-Z]/i,  // Must have name after
    /^Good\s+(morning|afternoon|evening)/i,
    /^To whom it may concern/i,
  ];

  // Closing patterns
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
    pretextEndIndex = -1;
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
