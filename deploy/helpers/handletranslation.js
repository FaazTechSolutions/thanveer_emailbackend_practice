"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handleTranslation;
const arabic_detection_js_1 = require("../utils/transulate/arabic-detection.js");
const translation_provider_js_1 = require("../utils/transulate/translation-provider.js");
async function handleTranslation(originalEmail, reqid) {
    if (!(0, arabic_detection_js_1.isArabic)(originalEmail.subject) && !(0, arabic_detection_js_1.isArabic)(originalEmail.body))
        return { was_translated: false, translated_content: null };
    try {
        console.log(`🌍 [TRANSLATE] Arabic detected → reqid=${reqid}`);
        const translation = await (0, translation_provider_js_1.translateEmail)(originalEmail.subject, originalEmail.body);
        return {
            was_translated: translation.wasTranslated,
            translated_content: translation.wasTranslated
                ? JSON.stringify({ subject: translation.subject, body: translation.body })
                : null,
        };
    }
    catch (err) {
        console.error(`❌ [TRANSLATE_FAIL] reqid=${reqid}: ${err.message}`);
        return { was_translated: false, translated_content: null };
    }
}
