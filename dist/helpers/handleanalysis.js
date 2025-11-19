"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handleAnalysis;
const index_js_1 = require("../utils/analyser/index.js");
async function handleAnalysis(content, reqid) {
    try {
        const analysis = await (0, index_js_1.processEmailAnalysis)(content.subject, content.body);
        console.log(`🧩 [ANALYSIS_SUCCESS] reqid=${reqid}`);
        return { ...analysis };
    }
    catch (err) {
        console.error(`❌ [ANALYSIS_FAIL] reqid=${reqid}: ${err.message}`);
        return null;
    }
}
