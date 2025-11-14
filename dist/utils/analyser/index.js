// import { analyzeEmail } from './analysis-service';
// import { planNextAction } from './action-service';
// export interface Classification {
//   category: 'billing' | 'technical_support' | 'account_management' | 'product_inquiry' | 'complaint' | 'feedback' | 'other';
//   priority: 'low' | 'medium' | 'high' | 'urgent';
//   sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated';
//   confidence: number;
// }
// export interface StructuredData {
//   confidence: number;
//   [key: string]: {
//     value: string | null;
//     confidence: number;
//   } | number;
// }
// export interface ActionItem {
//   action: string;
//   confidence: number;
// }
// export interface EmailAnalysis {
//   classification: Classification;
//   structured_data: StructuredData;
//   action_items: ActionItem[];
//   confidence_scores: {
//     overall: number;
//     classification: number;
//     structured_data: number;
//     action_items: number;
//   };
//   summary: string;
//   requires_human_review: boolean;
//   review_reason?: string;
//   tokenUsage?: {
//     inputTokens: number;
//     outputTokens: number;
//     totalTokens: number;
//   };
// }
// export interface NextBestAction {
//   action: 'Create new ticket' | 'Update existing ticket' | 'Send acknowledgment email' | 'Escalate to agent' | 'Auto-respond with solution' | 'Request missing info';
//   confidence: number;
//   reasoning: string;
//   tokenUsage?: {
//     inputTokens: number;
//     outputTokens: number;
//     totalTokens: number;
//   };
// }
// export interface AnalysisResult extends EmailAnalysis {
//   next_best_action: typeof(NextBestAction['action']);
//   action_confidence: number;
//   action_reasoning: string;
//   processing_time_ms: number;
// }
// export async function processEmailAnalysis(subject: string, body: string): Promise<AnalysisResult> {
//   const startTime = Date.now();
//   try {
//     // First analyze the email
//     const analysis = await analyzeEmail(subject, body);
//     // If human review is required, we can skip action planning or adjust it
//     const finalNextAction = analysis.requires_human_review
//       ? { action: "Escalate to agent", confidence: 0.7, reasoning: analysis.review_reason || "Human review required" }
//       : await planNextAction(analysis.classification, analysis.structured_data);
//     const duration = Date.now() - startTime;
//     return {
//       ...analysis,
//       next_best_action: finalNextAction.action,
//       action_confidence: finalNextAction.confidence,
//       action_reasoning: finalNextAction.reasoning,
//       processing_time_ms: duration,
//       tokenUsage: {
//         inputTokens: (analysis.tokenUsage?.inputTokens || 0) + (finalNextAction.tokenUsage?.inputTokens || 0),
//         outputTokens: (analysis.tokenUsage?.outputTokens || 0) + (finalNextAction.tokenUsage?.outputTokens || 0),
//         totalTokens: (analysis.tokenUsage?.totalTokens || 0) + (finalNextAction.tokenUsage?.totalTokens || 0),
//       }
//     };
//   } catch (error) {
//     console.error("Email processing failed:", error);
//     // Return a fallback result with human review required
//     const duration = Date.now() - startTime;
//     return {
//       classification: {
//         category: "other",
//         priority: "medium",
//         sentiment: "neutral",
//         confidence: 0.5
//       },
//       structured_data: { confidence: 0.5 },
//       action_items: [],
//       confidence_scores: {
//         overall: 0.5,
//         classification: 0.5,
//         structured_data: 0.5,
//         action_items: 0.5
//       },
//       summary: `Email processing failed. Original subject: "${subject}". Requires manual review.`,
//       requires_human_review: true,
//       review_reason: "Processing error occurred",
//       next_best_action: "Escalate to agent",
//       action_confidence: 0.5,
//       action_reasoning: "Processing error occurred",
//       processing_time_ms: duration,
//       tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
//     };
//   }
// }
import { analyzeEmail } from './analysis-service.js';
import { planNextAction } from './action-service.js';
export async function processEmailAnalysis(subject, body) {
    const startTime = Date.now();
    try {
        // First analyze the email
        const analysis = await analyzeEmail(subject, body);
        // If human review is required, we can skip action planning or adjust it
        const nextActionResult = analysis.requires_human_review
            ? {
                action: "Escalate to agent",
                confidence: 0.7,
                reasoning: analysis.review_reason || "Human review required"
            }
            : await planNextAction(analysis.classification, analysis.structured_data);
        const duration = Date.now() - startTime;
        return {
            ...analysis,
            next_best_action: nextActionResult.action,
            action_confidence: nextActionResult.confidence,
            action_reasoning: nextActionResult.reasoning,
            processing_time_ms: duration,
            tokenUsage: {
                inputTokens: (analysis.tokenUsage?.inputTokens || 0) + (nextActionResult.tokenUsage?.inputTokens || 0),
                outputTokens: (analysis.tokenUsage?.outputTokens || 0) + (nextActionResult.tokenUsage?.outputTokens || 0),
                totalTokens: (analysis.tokenUsage?.totalTokens || 0) + (nextActionResult.tokenUsage?.totalTokens || 0),
            }
        };
    }
    catch (error) {
        console.error("Email processing failed:", error);
        // Return a fallback result with human review required
        const duration = Date.now() - startTime;
        return {
            classification: {
                category: "other",
                priority: "medium",
                sentiment: "neutral",
                confidence: 0.5
            },
            structured_data: { confidence: 0.5 },
            action_items: [],
            confidence_scores: {
                overall: 0.5,
                classification: 0.5,
                structured_data: 0.5,
                action_items: 0.5
            },
            summary: `Email processing failed. Original subject: "${subject}". Requires manual review.`,
            requires_human_review: true,
            review_reason: "Processing error occurred",
            next_best_action: "Escalate to agent", // This is now properly typed
            action_confidence: 0.5,
            action_reasoning: "Processing error occurred",
            processing_time_ms: duration,
            tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
        };
    }
}
