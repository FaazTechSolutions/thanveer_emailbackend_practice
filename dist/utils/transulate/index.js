export { translateEmail, translateText } from './translation-provider.js';
export { isArabic } from './arabic-detection.js';
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
