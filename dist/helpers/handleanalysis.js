import { processEmailAnalysis } from "../utils/analyser/index.js";
export default async function handleAnalysis(content, reqid) {
    try {
        const analysis = await processEmailAnalysis(content.subject, content.body);
        console.log(`🧩 [ANALYSIS_SUCCESS] reqid=${reqid}`);
        return { ...analysis };
    }
    catch (err) {
        console.error(`❌ [ANALYSIS_FAIL] reqid=${reqid}: ${err.message}`);
        return null;
    }
}
