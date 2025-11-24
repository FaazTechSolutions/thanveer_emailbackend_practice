// export function stripRepeatedEmailHeaders(input: string): string {
//   if (!input) return "";

//   const normalized = input.replace(/[\u200e\u200f\u202a-\u202e]/g, "");

//   // Match complete email header blocks - capture From, To, Subject
//   const headerBlockRegex = /^From:\s*([^\n]+)\nSent:\s*([^\n]+)\nTo:\s*([^\n\r]+(?:\r?\n[^\n]*?)*?)\n(?:Cc:\s*[^\n\r]+(?:\r?\n[^\n]*?)*?\n)?(?:Subject:\s*([^\n]+)\n)?/gm;

//   const matches = [...normalized.matchAll(headerBlockRegex)];

//   if (matches.length === 0) return normalized;

//   // Get the LATEST (first) header block only
//   const latestMatch = matches[0];
//   const from = latestMatch[1].trim();
//   const to = latestMatch[3].trim();
//   const subject = (latestMatch[4] || "").trim();

//   // Remove ALL header blocks from content
//   let content = normalized.replace(headerBlockRegex, "");

//   // Build simplified header with From, To, Subject only
//   let simplifiedHeader = `From: ${from}\nTo: ${to}\nSubject: ${subject}\n`;

//   // Combine simplified header with content
//   const result = simplifiedHeader + content;

//   return result.replace(/\n{3,}/g, "\n\n").trim();
// }

// export function stripRepeatedEmailHeaders(input: string): string {
//   if (!input) return "";

//   const normalized = input.replace(/[\u200e\u200f\u202a-\u202e]/g, "");

//   const headerBlockRegex =
//     /^From:\s*([^\n]+)\nSent:\s*([^\n]+)\nTo:\s*([^\n\r]+(?:\r?\n[^\n]*?)*?)\n(?:Cc:\s*[^\n\r]+(?:\r?\n[^\n]*?)*?\n)?Subject:\s*([^\n]+)\n/gm;

//   const matches = [...normalized.matchAll(headerBlockRegex)];

//   // ---------------------------------------------------------
//   // CASE 1: Not a thread → zero or one header → no new header
//   // ---------------------------------------------------------
//   if (matches.length <= 1) {
//     const cleaned = normalized.replace(headerBlockRegex, "");
//     return cleaned.replace(/\n{3,}/g, "\n\n").trim();
//   }

//   // ---------------------------------------------------------
//   // CASE 2: Thread → multiple headers → preserve latest header
//   // ---------------------------------------------------------

//   const latest = matches[0];
//   const from = latest[1].trim();
//   const to = latest[3].trim();
//   const subject = (latest[4] || "").trim();

//   // Remove ALL headers
//   let content = normalized.replace(headerBlockRegex, "");

//   const simplifiedHeader =
//     `From: ${from}\n` +
//     `To: ${to}\n` +
//     `Subject: ${subject}\n\n`;

//   const result = simplifiedHeader + content;

//   return result.replace(/\n{3,}/g, "\n\n").trim();
// }
export function stripRepeatedEmailHeaders(input: string): string {
  if (!input) return "";

  const normalized = input.replace(/[\u200e\u200f\u202a-\u202e]/g, "");

  const headerBlockRegex =
    /^From:\s*([^\n]+)\nSent:\s*([^\n]+)\nTo:\s*([^\n\r]+(?:\r?\n[^\n]*?)*?)\n(?:Cc:\s*[^\n\r]+(?:\r?\n[^\n]*?)*?\n)?Subject:\s*([^\n]+)\n/gm;

  const matches = [...normalized.matchAll(headerBlockRegex)];
  if (matches.length === 0) return normalized.trim();

  const lines = normalized.split("\n");

  // Helper: find line number of match
  function getLineNum(idx: number) {
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      count += lines[i].length + 1;
      if (count >= idx) return i + 1;
    }
    return lines.length;
  }

  // -------------------------------------------
  // STEP 1 — Remove header if it appears on line 1
  // -------------------------------------------
  const headerOnLine1 = matches.find(m => getLineNum(m.index ?? 0) === 1);

  let data = normalized;

  if (headerOnLine1) {
    data = data.replace(headerOnLine1[0], ""); // remove default top header
  }

  // Re-scan headers after removal
  const after = [...data.matchAll(headerBlockRegex)];

  if (after.length === 0) {
    return data.trim(); // no real header left
  }

  // -------------------------------------------
  // STEP 2 — Find the first header NOT on line 1
  // That is the REAL header
  // -------------------------------------------
  let realHeader: RegExpMatchArray | null = null;

  for (const m of after) {
    const ln = getLineNum(m.index ?? 0);
    if (ln !== 1) {
      realHeader = m;
      break;
    }
  }

  if (!realHeader) {
    return data.replace(headerBlockRegex, "").trim();
  }

  const from = realHeader[1].trim();
  const to = realHeader[3].trim();
  const subject = (realHeader[4] || "").trim();

  // Remove all headers (clean body)
  let body = data.replace(headerBlockRegex, "");

  const finalHeader =
    `From: ${from}\n` +
    `To: ${to}\n` +
    `Subject: ${subject}\n\n`;

  return (finalHeader + body)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
