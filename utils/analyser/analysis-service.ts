import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {openai} from '@ai-sdk/openai'
import { safeJsonParse, validateConfidence } from './json-utils.js';
import { formatEmailText, formatPrompt } from './text-utils.js';

export interface Classification {
  category: 'billing' | 'technical_support' | 'account_management' | 'product_inquiry' | 'complaint' | 'feedback' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated';
  confidence: number;
}

export interface StructuredData {
  confidence: number;
  [key: string]: {
    value: string | null;
    confidence: number;
  } | number;
}

export interface ActionItem {
  action: string;
  confidence: number;
}

export interface EmailAnalysis {
  classification: Classification;
  structured_data: StructuredData;
  action_items: ActionItem[];
  confidence_scores: {
    overall: number;
    classification: number;
    structured_data: number;
    action_items: number;
  };
  summary: string;  // Added summary field
  requires_human_review: boolean;  // Added human review flag
  review_reason?: string;  // Optional reason for review
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface AnalysisResult extends EmailAnalysis {
  next_best_action?: string;
  action_confidence?: number;
  action_reasoning?: string;
  processing_time_ms?: number;
}

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
const MODEL = process.env.ANALYZER_AI_MODEL || "openai/gpt-4o-mini";

const ANALYSIS_PROMPT = `
You are an expert email analysis agent. Analyze the following email and return structured JSON.
### Instructions:
1. **Classification**: Determine the category, priority, and sentiment with confidence scores (0-1).
   - Categories: billing, technical_support, account_management, product_inquiry, complaint, feedback, other
   - Priority: low, medium, high, urgent
   - Sentiment: positive, neutral, negative, frustrated
2. **Structured Data**: Extract all relevant key-value pairs with confidence scores.
3. **Action Items**: List specific actions with confidence scores.
4. **Summary**: Provide a concise 1-2 sentence summary of the email content.
5. **Confidence Scores**: Provide overall and per-section confidence (0-1).
### Email:
{{EMAIL}}
### Response Format:
{
  "classification": {
    "category": "string",
    "priority": "string",
    "sentiment": "string",
    "confidence": number
  },
  "structured_data": {
    "key1": {"value": "string", "confidence": number},
    ...
    "confidence": number
  },
  "action_items": [
    {"action": "string", "confidence": number},
    ...
  ],
  "summary": "string",
  "confidence_scores": {
    "overall": number,
    "classification": number,
    "structured_data": number,
    "action_items": number
  }
}
`;

const SUMMARY_PROMPT = `
Generate a concise 1-2 sentence summary of this email:
{{EMAIL}}

Focus on:
1. The main topic or request
2. Any urgent matters or deadlines
3. Key details like account numbers or specific issues
`;

export async function analyzeEmail(subject: string, body: string): Promise<EmailAnalysis> {
  const emailText = formatEmailText(subject, body);
  const analysisPrompt = formatPrompt(ANALYSIS_PROMPT, emailText);

  try {
    // First get the main analysis
    const analysisResult = await generateText({
      model: openrouter(MODEL),
      prompt: analysisPrompt,
      temperature: 0.1,
    });

    const parsedAnalysis = safeJsonParse(analysisResult.text);
    if (!parsedAnalysis) throw new Error("Failed to parse analysis result");

    // Generate summary if not provided or if confidence is low
    let summary = parsedAnalysis.summary;
    const confidenceThreshold = 0.7;

    if (!summary || parsedAnalysis.confidence_scores.overall < confidenceThreshold) {
      const summaryPrompt = formatPrompt(SUMMARY_PROMPT, emailText);
      const summaryResult = await generateText({
        model: openrouter(MODEL),
        prompt: summaryPrompt,
        temperature: 0.3,
      
      });
      summary = summaryResult.text.trim()
        .replace(/["'`]/g, '')  // Remove quotes if present
        .replace(/^\s*Summary:\s*/i, '');  // Clean up any prompt artifacts
    }

    // Determine if human review is needed
    const { requires_human_review, review_reason } = checkForHumanReview(parsedAnalysis);

    return {
      classification: validateConfidence(parsedAnalysis.classification || {}),
      structured_data: {
        ...(parsedAnalysis.structured_data || {}),
        confidence: parsedAnalysis.structured_data?.confidence || 0.7
      },
      action_items: (parsedAnalysis.action_items || []).map(validateConfidence),
      summary: summary || generateFallbackSummary(parsedAnalysis, body),
      requires_human_review,
      review_reason,
      confidence_scores: {
        overall: Math.min(1, Math.max(0, parsedAnalysis.confidence_scores?.overall || 0.7)),
        classification: Math.min(1, Math.max(0, parsedAnalysis.confidence_scores?.classification || 0.7)),
        structured_data: Math.min(1, Math.max(0, parsedAnalysis.confidence_scores?.structured_data || 0.7)),
        action_items: Math.min(1, Math.max(0, parsedAnalysis.confidence_scores?.action_items || 0.7)),
      },
      tokenUsage: {
        inputTokens: (analysisResult.usage?.inputTokens || 0) + (summary ? 0 : 0), // Will update if we generate summary
        outputTokens: (analysisResult.usage?.outputTokens || 0) + (summary ? 0 : 0),
        totalTokens: (analysisResult.usage?.totalTokens || 0) + (summary ? 0 : 0),
      }
    };
  } catch (error) {
    console.error("❌ Email analysis failed:", error);
    return getFallbackAnalysis(subject, body);
  }
}

/**
 * Generates a fallback summary when AI summary fails
 */
function generateFallbackSummary(analysis: any, body: string): string {
  const category = analysis.classification?.category || 'general inquiry';
  const priority = analysis.classification?.priority || 'medium';
  const sentiment = analysis.classification?.sentiment || 'neutral';

  // Extract first sentence from body
  const firstSentence = body.split(/[.!?]/)[0] || body.substring(0, 100);

  return `Email about ${category} (${priority} priority, ${sentiment} sentiment). ${firstSentence.trim()}`;
}

/**
 * Determines if human review is required based on confidence scores
 */
function checkForHumanReview(parsedAnalysis: any): {
  requires_human_review: boolean;
  review_reason?: string;
} {
  const reasons: string[] = [];
  const CONFIDENCE_THRESHOLD = 0.7;

  // Check overall confidence
  if (parsedAnalysis.confidence_scores?.overall < CONFIDENCE_THRESHOLD) {
    reasons.push(`low overall confidence (${parsedAnalysis.confidence_scores?.overall})`);
  }

  // Check classification confidence
  if (parsedAnalysis.classification?.confidence < CONFIDENCE_THRESHOLD) {
    reasons.push(`low classification confidence (${parsedAnalysis.classification?.confidence})`);
  }

  // Check if category is "other" with medium confidence
  if (parsedAnalysis.classification?.category === 'other' &&
      parsedAnalysis.classification?.confidence < 0.8) {
    reasons.push('uncertain category classification');
  }

  // Check if priority is medium but confidence is low
  if (parsedAnalysis.classification?.priority === 'medium' &&
      parsedAnalysis.classification?.confidence < 0.75) {
    reasons.push('uncertain priority classification');
  }

  // Check if there are no action items but confidence is high
  if ((parsedAnalysis.action_items?.length === 0 || !parsedAnalysis.action_items) &&
      parsedAnalysis.confidence_scores?.action_items > 0.7) {
    reasons.push('no action items despite high confidence');
  }

  return {
    requires_human_review: reasons.length > 0,
    review_reason: reasons.length > 0 ? `Requires review: ${reasons.join(', ')}` : undefined
  };
}

/**
 * Returns fallback analysis with human review flag
 */
function getFallbackAnalysis(subject: string, body: string): EmailAnalysis {
  const firstSentence = body.split(/[.!?]/)[0] || body.substring(0, 100);

  return {
    classification: {
      category: "other",
      priority: "medium",
      sentiment: "neutral",
      confidence: 0.5
    },
    structured_data: { confidence: 0.5 },
    action_items: [],
    summary: `Email analysis failed. Original subject: "${subject}". First sentence: "${firstSentence.trim()}"`,
    requires_human_review: true,
    review_reason: "Analysis failed - requires manual review",
    confidence_scores: {
      overall: 0.5,
      classification: 0.5,
      structured_data: 0.5,
      action_items: 0.5
    },
    tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
  };
}
