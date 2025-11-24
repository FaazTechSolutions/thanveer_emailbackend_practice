"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isArabic = isArabic;
function isArabic(text) {
    if (!text)
        return false;
    return /[\u0600-\u06FF]/.test(text);
}
