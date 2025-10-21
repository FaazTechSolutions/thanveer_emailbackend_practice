import { analyzeEmail} from "../utils/analyser/analysis-service.js";
import { processEmailAnalysis } from "../utils/analyser/index.js";

export default async function handleAnalysis(content: any, reqid: string) {
  try {
    const analysis = await processEmailAnalysis(content.subject, content.body);
    console.log(`🧩 [ANALYSIS_SUCCESS] reqid=${reqid}`);
    return { ...analysis };
  } catch (err: any) {
    console.error(`❌ [ANALYSIS_FAIL] reqid=${reqid}: ${err.message}`);
    return null;
  }
}
