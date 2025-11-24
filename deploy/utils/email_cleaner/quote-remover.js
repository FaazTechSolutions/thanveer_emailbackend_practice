"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeQuoteMarkers = removeQuoteMarkers;
function removeQuoteMarkers(text) {
    return text
        .split("\n")
        .map((line) => line.replace(/^>+\s*/, ""))
        .join("\n");
}
