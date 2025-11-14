import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { safeJsonParse } from './json-utils.js';
const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
const MODEL = process.env.ANALYZER_AI_MODEL || "openai/gpt-4o-mini";
const ACTION_PROMPT = `
You are a support automation planner.
Given the email classification and structured data, determine the next best action (NBA) with confidence (0-1) and reasoning.
### Possible Actions:
- Create new ticket
- Update existing ticket
- Send acknowledgment email
- Escalate to agent
- Auto-respond with solution
- Request missing info
### Context:
{{CONTEXT}}
### Response Format:
{JSON_FORMAT}
`;
export async function planNextAction(classification, structuredData) {
    const context = JSON.stringify({ classification, structured_data: structuredData }, null, 2);
    const prompt = ACTION_PROMPT
        .replace('{{CONTEXT}}', context)
        .replace('{JSON_FORMAT}', '{"action": "string", "confidence": number, "reasoning": "string"}');
    try {
        const result = await generateText({
            model: openrouter(MODEL),
            prompt,
            temperature: 0.2,
        });
        const parsed = safeJsonParse(result.text);
        if (!parsed)
            throw new Error("Failed to parse next action result");
        return {
            action: parsed.action || "Escalate to agent",
            confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
            reasoning: parsed.reasoning || "Default escalation due to parsing error",
            tokenUsage: {
                inputTokens: result.usage?.inputTokens || 0,
                outputTokens: result.usage?.outputTokens || 0,
                totalTokens: result.usage?.totalTokens || 0,
            }
        };
    }
    catch (error) {
        console.error("❌ Next action planning failed:", error);
        return {
            action: "Escalate to agent",
            confidence: 0.7,
            reasoning: "Fallback due to processing error",
            tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
        };
    }
}
