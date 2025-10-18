export function safeJsonParse(text: string): any {
  try {
    const jsonText = text.replace(/```json\s*|```/g, '').trim();
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new SyntaxError("No JSON object found");
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("❌ Failed to parse JSON:", e);
    return null;
  }
}

export function validateConfidence(obj: any): any {
  if (!obj) return obj;
  if (typeof obj.confidence === 'number') {
    obj.confidence = Math.min(1, Math.max(0, obj.confidence));
  } else {
    obj.confidence = 0.7;
  }
  return obj;
}
