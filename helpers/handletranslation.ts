import { isArabic } from "../utils/transulate/arabic-detection.js";
import { translateEmail } from "../utils/transulate/translation-provider.js";

export default async function handleTranslation(originalEmail: any, reqid: string) {
  if (!isArabic(originalEmail.subject) && !isArabic(originalEmail.body))
    return { was_translated: false, translated_content: null };

  try {
    console.log(`🌍 [TRANSLATE] Arabic detected → reqid=${reqid}`);
    const translation = await translateEmail(originalEmail.subject, originalEmail.body);
    return {
      was_translated: translation.wasTranslated,
      translated_content: translation.wasTranslated
        ? JSON.stringify({ subject: translation.subject, body: translation.body })
        : null,
    };
  } catch (err: any) {
    console.error(`❌ [TRANSLATE_FAIL] reqid=${reqid}: ${err.message}`);
    return { was_translated: false, translated_content: null };
  }
}
