"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isArabic = exports.translateText = exports.translateEmail = void 0;
var translation_provider_js_1 = require("./translation-provider.js");
Object.defineProperty(exports, "translateEmail", { enumerable: true, get: function () { return translation_provider_js_1.translateEmail; } });
Object.defineProperty(exports, "translateText", { enumerable: true, get: function () { return translation_provider_js_1.translateText; } });
var arabic_detection_js_1 = require("./arabic-detection.js");
Object.defineProperty(exports, "isArabic", { enumerable: true, get: function () { return arabic_detection_js_1.isArabic; } });
// sample
// import { translateEmail, translateText, isArabic } from './arabic-translation-service';
// // Example 1: Translate email
// const emailResult = await translateEmail(
//   "مشكلة في الحساب",
//   `
//     مرحبا فريق الدعم،
//     لا أستطيع تسجيل الدخول إلى حسابي منذ الأمس.
//     الرجاء المساعدة في أقرب وقت ممكن.
//     شكرا،
//     أحمد
//   `
// );
// console.log("Translated Email:", emailResult);
// // Example 2: Translate simple text
// const textResult = await translateText("مرحبا بالعالم");
// console.log("Translated Text:", textResult);
// // Example 3: Check if text is Arabic
// console.log("Is Arabic:", isArabic("مرحبا بالعالم")); // true
// console.log("Is Arabic:", isArabic("Hello world"));   // false
