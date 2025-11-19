"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeJsonParse = safeJsonParse;
exports.validateConfidence = validateConfidence;
function safeJsonParse(text) {
    try {
        const jsonText = text.replace(/```json\s*|```/g, '').trim();
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (!jsonMatch)
            throw new SyntaxError("No JSON object found");
        return JSON.parse(jsonMatch[0]);
    }
    catch (e) {
        console.error("❌ Failed to parse JSON:", e);
        return null;
    }
}
function validateConfidence(obj) {
    if (!obj)
        return obj;
    if (typeof obj.confidence === 'number') {
        obj.confidence = Math.min(1, Math.max(0, obj.confidence));
    }
    else {
        obj.confidence = 0.7;
    }
    return obj;
}
