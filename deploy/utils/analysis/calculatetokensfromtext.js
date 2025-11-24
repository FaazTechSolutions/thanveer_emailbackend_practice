"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.countTokens = countTokens;
exports.splitTextIntoChunks = splitTextIntoChunks;
exports.calculateTokenStats = calculateTokenStats;
const gpt_tokenizer_1 = require("gpt-tokenizer"); // npm install gpt-tokenizer
// Count tokens for a single text
function countTokens(text) {
    return (0, gpt_tokenizer_1.encode)(text || "").length;
}
function splitTextIntoChunks(text, maxTokens = 1500) {
    if (!text || text.trim() === "")
        return [];
    const tokens = (0, gpt_tokenizer_1.encode)(text);
    const chunks = [];
    for (let i = 0; i < tokens.length; i += maxTokens) {
        const slice = tokens.slice(i, i + maxTokens);
        chunks.push((0, gpt_tokenizer_1.decode)(slice));
    }
    return chunks;
}
// Calculate token statistics for an array of texts
function calculateTokenStats(texts) {
    if (!texts || texts.length === 0) {
        return {
            average: 0,
            max: 0,
            min: 0,
            count: 0,
        };
    }
    const tokenCounts = texts.map(t => countTokens(t));
    const total = tokenCounts.reduce((a, b) => a + b, 0);
    const max = Math.max(...tokenCounts);
    const min = Math.min(...tokenCounts);
    const average = Math.round(total / texts.length);
    return {
        average,
        max,
        min,
        count: texts.length,
    };
}
