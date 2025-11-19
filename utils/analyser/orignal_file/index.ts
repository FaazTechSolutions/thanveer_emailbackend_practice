//this improved error logger so that can move to next

// /********************************************************************
//  * email-analyzer.js
//  * ---------------------------------------------------------------
//  * Classifies emails, extracts structured info + action items,
//  * and determines Next Best Action using LLM.
//  ********************************************************************/
// import { generateText } from 'ai';
// import { createOpenRouter } from '@openrouter/ai-sdk-provider';
// import dotenv from 'dotenv';

// dotenv.config();

// /** -------------------------------
//  * Configuration & Setup
//  * ------------------------------- */
// const openrouter = createOpenRouter({
//   apiKey: process.env.OPENROUTER_API_KEY
// });
// const MODEL = process.env.AI_MODEL || "mistralai/mistral-small-3.2-24b-instruct:free";

// /** -------------------------------
//  * Enhanced Logger Utility
//  * ------------------------------- */
// class Logger {
//   private context: string;

//   constructor(context: string) {
//     this.context = context;
//   }

//   info(message: string, data?: any) {
//     console.log(`ℹ️ [${this.context}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
//   }

//   success(message: string, data?: any) {
//     console.log(`✅ [${this.context}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
//   }

//   warn(message: string, data?: any) {
//     console.warn(`⚠️ [${this.context}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
//   }

//   error(message: string, error?: any) {
//     console.error(`❌ [${this.context}] ${message}`);
//     if (error) {
//       console.error('Error details:', {
//         message: error?.message,
//         stack: error?.stack,
//         ...(error?.response && { response: error.response })
//       });
//     }
//   }
// }

// /** -------------------------------
//  * Types
//  * ------------------------------- */
// interface EmailAnalysis {
//   classification: {
//     category: string;
//     priority: string;
//     sentiment: string;
//     confidence: number;
//   };
//   structured_data: {
//     [key: string]: any;
//     confidence: number;
//   };
//   action_items: {
//     items: string[];
//     confidence: number;
//   }[];
//   confidence_scores: {
//     overall: number;
//     classification: number;
//     structured_data: number;
//     action_items: number;
//   };
//   tokenUsage?: {
//     inputTokens: number;
//     outputTokens: number;
//     totalTokens: number;
//   };
// }

// interface NextBestAction {
//   action: string;
//   confidence: number;
//   reasoning?: string;
//   tokenUsage?: {
//     inputTokens: number;
//     outputTokens: number;
//     totalTokens: number;
//   };
// }

// /** -------------------------------
//  * Custom Error Classes
//  * ------------------------------- */
// class AnalysisError extends Error {
//   constructor(message: string, public originalError?: any) {
//     super(message);
//     this.name = 'AnalysisError';
//   }
// }

// /** -------------------------------
//  * Helper - Format email text from subject and body
//  * ------------------------------- */
// function formatEmailText(subject: string, body: string): string {
//   return `Subject: ${subject}\n\nBody:\n${body}`;
// }

// /** -------------------------------
//  * Email Analysis with direct subject/body input
//  * ------------------------------- */
// async function analyzeEmail(subject: string, body: string): Promise<EmailAnalysis> {
//   const logger = new Logger('analyzeEmail');
//   const emailText = formatEmailText(subject, body);

//   try {
//     logger.info(`Starting email analysis (${emailText.length} characters)`);

//     const prompt = `
// You are an intelligent email analysis agent. Read the customer's email and output structured JSON only.
// Extract the following with confidence scores (0-1):
// 1. classification: {category, priority, sentiment, confidence}
// 2. structured_data: key facts with confidence (customer name, account id, product, issue, date, etc.)
// 3. action_items: specific actions with confidence
// 4. confidence_scores: overall and per-section confidence

// Categories: billing, technical_support, account_management, product_inquiry, complaint, feedback, other
// Priority: low, medium, high, urgent
// Sentiment: positive, neutral, negative, frustrated

// Respond in JSON only, without explanations. Confidence scores must be between 0 and 1.

// ${emailText}
// `;

//     const result:any = await generateText({
//       model: openrouter(MODEL),
//       prompt,
//       temperature: 0.2,
//     });

//     logger.info('Token usage', {
//       input: result.usage.promptTokens,
//       output: result.usage.completionTokens,
//       total: result.usage.totalTokens
//     });

//     const parsed = JSON.parse(result.text);

//     // Validate and normalize confidence scores
//     const validateConfidence = (obj: any) => {
//       if (obj.confidence === undefined) {
//         logger.warn('Missing confidence score, using default 0.8');
//         obj.confidence = 0.8;
//       }
//       obj.confidence = Math.min(1, Math.max(0, Number(obj.confidence) || 0.8));
//       return obj;
//     };

//     // Validate all confidence scores
//     if (parsed.classification) {
//       parsed.classification = validateConfidence(parsed.classification);
//     } else {
//       logger.warn('Missing classification, using defaults');
//       parsed.classification = {
//         category: "unknown",
//         priority: "medium",
//         sentiment: "neutral",
//         confidence: 0.5
//       };
//     }

//     if (parsed.structured_data) {
//       parsed.structured_data = validateConfidence(parsed.structured_data);
//     } else {
//       logger.warn('Missing structured data');
//       parsed.structured_data = { confidence: 0.5 };
//     }

//     if (parsed.action_items && Array.isArray(parsed.action_items)) {
//       parsed.action_items = parsed.action_items.map(validateConfidence);
//     } else {
//       logger.warn('Missing or invalid action items');
//       parsed.action_items = [];
//     }

//     if (parsed.confidence_scores) {
//       Object.keys(parsed.confidence_scores).forEach(key => {
//         parsed.confidence_scores[key] = Math.min(1, Math.max(0, Number(parsed.confidence_scores[key]) || 0.8));
//       });
//     } else {
//       logger.warn('Missing confidence scores, using defaults');
//       parsed.confidence_scores = {
//         overall: 0.8,
//         classification: 0.8,
//         structured_data: 0.8,
//         action_items: 0.8
//       };
//     }

//     // Add token usage
//     parsed.tokenUsage = {
//       inputTokens: result.usage.promptTokens,
//       outputTokens: result.usage.completionTokens,
//       totalTokens: result.usage.totalTokens
//     };

//     logger.success('Email analysis completed', {
//       category: parsed.classification.category,
//       priority: parsed.classification.priority,
//       confidence: parsed.confidence_scores.overall
//     });

//     return parsed;
//   } catch (error) {
//     logger.error('Failed to analyze email', error);

//     if (error instanceof SyntaxError) {
//       logger.error('JSON parsing failed - invalid LLM response format');
//     }

//     throw new AnalysisError('Email analysis failed', error);
//   }
// }

// /** -------------------------------
//  * Next Best Action Planner
//  * ------------------------------- */
// async function planNextAction(
//   classification: any,
//   structuredData: any
// ): Promise<NextBestAction> {
//   const logger = new Logger('planNextAction');

//   try {
//     logger.info('Planning next action');

//     const systemPrompt = `
// You are a support automation planner.
// Given the classification and structured data, decide the next best action (NBA) with confidence score (0-1) and reasoning.
// Possible actions:
// - "Create new ticket"
// - "Update existing ticket"
// - "Send acknowledgment email"
// - "Escalate to agent"
// - "Auto-respond with solution"
// - "Request missing info"

// Output JSON with: action, confidence, reasoning
// `;

//     const contextData = {
//       classification,
//       structured_data: structuredData,
//     };

//     const result:any = await generateText({
//       model: openrouter(MODEL),
//       prompt: `${systemPrompt}\n\nContext:\n${JSON.stringify(contextData, null, 2)}`,
//       temperature: 0.3,
//     });

//     logger.info('Token usage', {
//       input: result.usage.promptTokens,
//       output: result.usage.completionTokens,
//       total: result.usage.totalTokens
//     });

//     const parsed = JSON.parse(result.text);

//     const nextAction: NextBestAction = {
//       action: parsed.action || "Escalate to agent",
//       confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.7)),
//       reasoning: parsed.reasoning || "Default escalation due to parsing error",
//       tokenUsage: {
//         inputTokens: result.usage.promptTokens,
//         outputTokens: result.usage.completionTokens,
//         totalTokens: result.usage.totalTokens
//       }
//     };

//     logger.success('Next action determined', {
//       action: nextAction.action,
//       confidence: nextAction.confidence
//     });

//     return nextAction;
//   } catch (error) {
//     logger.error('Failed to plan next action', error);

//     return {
//       action: "Escalate to agent",
//       confidence: 0.7,
//       reasoning: "Error occurred during action planning, defaulting to human escalation"
//     };
//   }
// }

// /** -------------------------------
//  * Unified Runner with direct subject/body input
//  * ------------------------------- */
// export async function processEmailAnalysis(subject: string, body: string) {
//   const logger = new Logger('processEmailAnalysis');
//   const startTime = Date.now();

//   try {
//     logger.info('Starting email analysis pipeline');

//     // Step 1: Analyze email
//     const analysis = await analyzeEmail(subject, body);

//     // Step 2: Plan next action
//     const nextAction = await planNextAction(
//       analysis.classification,
//       analysis.structured_data
//     );

//     const duration = Date.now() - startTime;

//     logger.success(`Email analysis completed in ${duration}ms`, {
//       category: analysis.classification.category,
//       priority: analysis.classification.priority,
//       nextAction: nextAction.action,
//       confidence: nextAction.confidence,
//       totalTokens: (analysis.tokenUsage?.totalTokens || 0) + (nextAction.tokenUsage?.totalTokens || 0)
//     });

//     return {
//       ...analysis,
//       next_best_action: nextAction.action,
//       action_confidence: nextAction.confidence,
//       action_reasoning: nextAction.reasoning,
//       processing_time_ms: duration
//     };
//   } catch (error) {
//     const duration = Date.now() - startTime;
//     logger.error(`Email analysis failed after ${duration}ms`, error);

//     throw error;
//   }
// }

// // /** -------------------------------
// //  * Example Test Run
// //  * ------------------------------- */
// // if (require.main === module) {
// //   (async () => {
// //     const logger = new Logger('main');

// //     try {
// //       // Example 1: Arabic email
// //       const arabicResult = await processEmailAnalysis(
// //         "مشكلة في الحساب",
// //         `مرحبا فريق الدعم،
// // لا أستطيع تسجيل الدخول إلى حسابي منذ الأمس.
// // الرجاء المساعدة في أقرب وقت ممكن.
// // شكرا، أحمد`
// //       );
// //       logger.success('Arabic email analysis completed');
// //       console.log("\n📊 Arabic Email Analysis Result:\n", JSON.stringify(arabicResult, null, 2));

// //       // Example 2: English email
// //       const englishResult = await processEmailAnalysis(
// //         "Cannot access my account",
// //         `Hello Support Team,

// // I've been trying to log into my account for the past 2 hours but keep getting an error message saying "Invalid credentials" even though I'm sure my password is correct.
// // My account email is john.doe@example.com and my customer ID is CUST-12345.
// // This is urgent as I need to access important documents for a meeting tomorrow morning.
// // Please help!
// // Best regards,
// // John Doe`
// //       );
// //       logger.success('English email analysis completed');
// //       console.log("\n📊 English Email Analysis Result:\n", JSON.stringify(englishResult, null, 2));

// //     } catch (error) {
// //       logger.error('Test failed', error);
// //       process.exit(1);
// //     }
// //   })();
// // }


//this does not include json parse safe function
// /********************************************************************
//  * email-analyzer.js
//  * ---------------------------------------------------------------
//  * Classifies emails, extracts structured info + action items,
//  * and determines Next Best Action using LLM.
//  ********************************************************************/
// import { generateText } from 'ai';
// import { createOpenRouter } from '@openrouter/ai-sdk-provider';
// import dotenv from 'dotenv';

// dotenv.config();

// /** -------------------------------
//  * Configuration & Setup
//  * ------------------------------- */
// const openrouter = createOpenRouter({
//   apiKey: process.env.OPENROUTER_API_KEY
// });
// const MODEL = process.env.analyzer_AI_MODEL || "deepseek/deepseek-chat-v3.1:free";

// /** -------------------------------
//  * Types
//  * ------------------------------- */
// interface EmailAnalysis {
//   classification: {
//     category: string;
//     priority: string;
//     sentiment: string;
//     confidence: number;
//   };
//   structured_data: {
//     [key: string]: any;
//     confidence: number;
//   };
//   action_items: {
//     items: string[];
//     confidence: number;
//   }[];
//   confidence_scores: {
//     overall: number;
//     classification: number;
//     structured_data: number;
//     action_items: number;
//   };
//   tokenUsage?: {
//     inputTokens: number;
//     outputTokens: number;
//     totalTokens: number;
//   };
// }

// interface NextBestAction {
//   action: string;
//   confidence: number;
//   reasoning?: string;
//   tokenUsage?: {
//     inputTokens: number;
//     outputTokens: number;
//     totalTokens: number;
//   };
// }

// /** -------------------------------
//  * Helper - Safe JSON parse
//  * ------------------------------- */
// function safeJsonParse(text: string) {
//   try {
//     // Remove ```json or ``` fences
//     const jsonText = text.replace(/```json\s*|```/g, '').trim();
//     const start = jsonText.indexOf('{');
//     const end = jsonText.lastIndexOf('}');
//     if (start === -1 || end === -1) throw new SyntaxError("No JSON object found");
//     const clean = jsonText.slice(start, end + 1);
//     return JSON.parse(clean);
//   } catch (e) {
//     console.error("❌ Failed safe JSON parse:", e, "\nRaw text:\n", text);
//     throw e;
//   }
// }

// /** -------------------------------
//  * Helper - Format email text from subject and body
//  * ------------------------------- */
// function formatEmailText(subject: string, body: string): string {
//   return `Subject: ${subject}\n\nBody:\n${body}`;
// }

// /** -------------------------------
//  * Email Analysis with direct subject/body input
//  * ------------------------------- */
// async function analyzeEmail(subject: string, body: string): Promise<EmailAnalysis> {
//   const emailText = formatEmailText(subject, body);

//   const prompt = `
// You are an intelligent email analysis agent. Read the customer's email and output structured JSON only.
// Extract the following with confidence scores (0-1):
// 1. classification: {category, priority, sentiment, confidence}
// 2. structured_data: key facts with confidence (customer name, account id, product, issue, date, etc.)
// 3. action_items: specific actions with confidence
// 4. confidence_scores: overall and per-section confidence

// Categories: billing, technical_support, account_management, product_inquiry, complaint, feedback, other
// Priority: low, medium, high, urgent
// Sentiment: positive, neutral, negative, frustrated

// Respond in JSON only, without explanations. Confidence scores must be between 0 and 1.

// ${emailText}
// `;

//   const result: any = await generateText({
//     model: openrouter(MODEL),
//     prompt,
//     temperature: 0.2,
//   });

//   const parsed = safeJsonParse(result.text);

//   const validateConfidence = (obj: any) => {
//     if (obj.confidence === undefined) obj.confidence = 0.8;
//     obj.confidence = Math.min(1, Math.max(0, Number(obj.confidence) || 0.8));
//     return obj;
//   };

//   if (parsed.classification) parsed.classification = validateConfidence(parsed.classification);
//   else parsed.classification = { category: "unknown", priority: "medium", sentiment: "neutral", confidence: 0.5 };

//   if (parsed.structured_data) parsed.structured_data = validateConfidence(parsed.structured_data);
//   else parsed.structured_data = { confidence: 0.5 };

//   if (parsed.action_items && Array.isArray(parsed.action_items)) parsed.action_items = parsed.action_items.map(validateConfidence);
//   else parsed.action_items = [];

//   if (parsed.confidence_scores) {
//     Object.keys(parsed.confidence_scores).forEach(key => {
//       parsed.confidence_scores[key] = Math.min(1, Math.max(0, Number(parsed.confidence_scores[key]) || 0.8));
//     });
//   } else {
//     parsed.confidence_scores = { overall: 0.8, classification: 0.8, structured_data: 0.8, action_items: 0.8 };
//   }

//   parsed.tokenUsage = {
//     inputTokens: result.usage?.promptTokens ?? 0,
//     outputTokens: result.usage?.completionTokens ?? 0,
//     totalTokens: result.usage?.totalTokens ?? 0
//   };

//   return parsed;
// }

// /** -------------------------------
//  * Next Best Action Planner
//  * ------------------------------- */
// async function planNextAction(classification: any, structuredData: any): Promise<NextBestAction> {

//   const systemPrompt = `
// You are a support automation planner.
// Given the classification and structured data, decide the next best action (NBA) with confidence score (0-1) and reasoning.
// Possible actions:
// - "Create new ticket"
// - "Update existing ticket"
// - "Send acknowledgment email"
// - "Escalate to agent"
// - "Auto-respond with solution"
// - "Request missing info"

// Output JSON with: action, confidence, reasoning
// `;

//   const contextData = { classification, structured_data: structuredData };

//   const result: any = await generateText({
//     model: openrouter(MODEL),
//     prompt: `${systemPrompt}\n\nContext:\n${JSON.stringify(contextData, null, 2)}`,
//     temperature: 0.3,
//   });

//   const parsed = safeJsonParse(result.text);

//   return {
//     action: parsed.action || "Escalate to agent",
//     confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.7)),
//     reasoning: parsed.reasoning || "Default escalation due to parsing error",
//     tokenUsage: {
//       inputTokens: result.usage?.promptTokens ?? 0,
//       outputTokens: result.usage?.completionTokens ?? 0,
//       totalTokens: result.usage?.totalTokens ?? 0
//     }
//   };
// }

// /** -------------------------------
//  * Unified Runner with direct subject/body input
//  * ------------------------------- */
// export async function processEmailAnalysis(subject: string, body: string) {
//   const startTime = Date.now();

//   const analysis = await analyzeEmail(subject, body);
//   const nextAction = await planNextAction(analysis.classification, analysis.structured_data);

//   const duration = Date.now() - startTime;

//   return {
//     ...analysis,
//     next_best_action: nextAction.action,
//     action_confidence: nextAction.confidence,
//     action_reasoning: nextAction.reasoning,
//     processing_time_ms: duration
//   };
// }


// // Export for usage


/********************************************************************
 * email-analyzer.js
 * ---------------------------------------------------------------
 * Classifies emails, extracts structured info + action items,
 * and determines Next Best Action using LLM.
 ********************************************************************/
import { generateText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import dotenv from 'dotenv';
dotenv.config();

/** -------------------------------
 * Configuration & Setup
 * ------------------------------- */
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY
});
const MODEL = process.env.analyzer_AI_MODEL || "deepseek/deepseek-chat-v3.1:free";

/** -------------------------------
 * Types
 * ------------------------------- */
interface Classification {
  category: 'billing' | 'technical_support' | 'account_management' | 'product_inquiry' | 'complaint' | 'feedback' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated';
  confidence: number;
}

interface StructuredData {
  confidence: number;
  [key: string]: {
    value: string | null;
    confidence: number;
  } | number;
}

interface ActionItem {
  action: string;
  confidence: number;
}

interface EmailAnalysis {
  classification: Classification;
  structured_data: StructuredData;
  action_items: ActionItem[];
  confidence_scores: {
    overall: number;
    classification: number;
    structured_data: number;
    action_items: number;
  };
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

interface NextBestAction {
  action: 'Create new ticket' | 'Update existing ticket' | 'Send acknowledgment email' | 'Escalate to agent' | 'Auto-respond with solution' | 'Request missing info';
  confidence: number;
  reasoning: string;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

/** -------------------------------
 * Helper - Safe JSON parse with fallback
 * ------------------------------- */
function safeJsonParse(text: string): any {
  try {
    // Remove markdown code blocks if present
    const jsonText = text.replace(/```json\s*|```/g, '').trim();
    // Extract JSON object if wrapped in other text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new SyntaxError("No JSON object found");
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("❌ Failed to parse JSON:", e, "\nRaw text:\n", text);
    return null;
  }
}

/** -------------------------------
 * Helper - Format email text
 * ------------------------------- */
function formatEmailText(subject: string, body: string): string {
  return `Subject: ${subject}\n\nBody:\n${body}`;
}

/** -------------------------------
 * Helper - Validate confidence scores
 * ------------------------------- */
function validateConfidence(obj: any): any {
  if (!obj) return obj;
  if (typeof obj.confidence === 'number') {
    obj.confidence = Math.min(1, Math.max(0, obj.confidence));
  } else {
    obj.confidence = 0.7; // Default confidence
  }
  return obj;
}

/** -------------------------------
 * Email Analysis with direct subject/body input
 * ------------------------------- */
async function analyzeEmail(subject: string, body: string): Promise<EmailAnalysis> {
  const emailText = formatEmailText(subject, body);

  const prompt = `
You are an expert email analysis agent. Analyze the following email and return structured JSON.

### Instructions:
1. **Classification**: Determine the category, priority, and sentiment with confidence scores (0-1).
   - Categories: billing, technical_support, account_management, product_inquiry, complaint, feedback, other
   - Priority: low, medium, high, urgent
   - Sentiment: positive, neutral, negative, frustrated

2. **Structured Data**: Extract all relevant key-value pairs with confidence scores.
   - Example: {"customer_name": {"value": "John Doe", "confidence": 0.95}}

3. **Action Items**: List specific actions with confidence scores.

4. **Confidence Scores**: Provide overall and per-section confidence (0-1).

### Email:
${emailText}

### Response Format:
Return ONLY valid JSON. Do not include explanations or markdown.
{
  "classification": {
    "category": "string",
    "priority": "string",
    "sentiment": "string",
    "confidence": number
  },
  "structured_data": {
    "key1": {"value": "string", "confidence": number},
    "key2": {"value": "string", "confidence": number},
    ...
    "confidence": number
  },
  "action_items": [
    {"action": "string", "confidence": number},
    ...
  ],
  "confidence_scores": {
    "overall": number,
    "classification": number,
    "structured_data": number,
    "action_items": number
  }
}
`;

  try {
    const result: any = await generateText({
      model: openrouter(MODEL),
      prompt,
      temperature: 0.1, // Lower for more deterministic output
  
    });

    const parsed = safeJsonParse(result.text);
    if (!parsed) {
      throw new Error("Failed to parse analysis result");
    }

    // Validate and normalize the response
    const analysis: EmailAnalysis = {
      classification: validateConfidence(parsed.classification || {}),
      structured_data: {
        ...(parsed.structured_data || {}),
        confidence: parsed.structured_data?.confidence || 0.7
      },
      action_items: (parsed.action_items || []).map(validateConfidence),
      confidence_scores: {
        overall: Math.min(1, Math.max(0, parsed.confidence_scores?.overall || 0.7)),
        classification: Math.min(1, Math.max(0, parsed.confidence_scores?.classification || 0.7)),
        structured_data: Math.min(1, Math.max(0, parsed.confidence_scores?.structured_data || 0.7)),
        action_items: Math.min(1, Math.max(0, parsed.confidence_scores?.action_items || 0.7)),
      },
      tokenUsage: {
        inputTokens: result.usage?.promptTokens || 0,
        outputTokens: result.usage?.completionTokens || 0,
        totalTokens: result.usage?.totalTokens || 0,
      }
    };

    // Ensure required fields
    if (!analysis.classification.category) {
      analysis.classification.category = "other";
    }
    if (!analysis.classification.priority) {
      analysis.classification.priority = "medium";
    }
    if (!analysis.classification.sentiment) {
      analysis.classification.sentiment = "neutral";
    }

    return analysis;
  } catch (error) {
    console.error("❌ Email analysis failed:", error);
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
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
    };
  }
}

/** -------------------------------
 * Next Best Action Planner
 * ------------------------------- */
async function planNextAction(classification: Classification, structuredData: StructuredData): Promise<NextBestAction> {
  const systemPrompt = `
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
${JSON.stringify({ classification, structured_data: structuredData }, null, 2)}

### Response Format:
Return ONLY valid JSON. Example:
{
  "action": "Request missing info",
  "confidence": 0.95,
  "reasoning": "The email lacks account ID and specific issue details..."
}
`;

  try {
    const result: any = await generateText({
      model: openrouter(MODEL),
      prompt: systemPrompt,
      temperature: 0.2,

    });

    const parsed = safeJsonParse(result.text);
    if (!parsed) {
      throw new Error("Failed to parse next action result");
    }

    return {
      action: parsed.action || "Escalate to agent",
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
      reasoning: parsed.reasoning || "Default escalation due to parsing error",
      tokenUsage: {
        inputTokens: result.usage?.promptTokens || 0,
        outputTokens: result.usage?.completionTokens || 0,
        totalTokens: result.usage?.totalTokens || 0,
      }
    };
  } catch (error) {
    console.error("❌ Next action planning failed:", error);
    return {
      action: "Escalate to agent",
      confidence: 0.7,
      reasoning: "Fallback due to processing error",
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
    };
  }
}

/** -------------------------------
 * Unified Runner with direct subject/body input
 * ------------------------------- */
export async function processEmailAnalysis(subject: string, body: string) {
  const startTime = Date.now();

  // 1. Analyze email
  const analysis = await analyzeEmail(subject, body);

  // 2. Plan next action
  const nextAction = await planNextAction(analysis.classification, analysis.structured_data);

  const duration = Date.now() - startTime;

  return {
    ...analysis,
    next_best_action: nextAction.action,
    action_confidence: nextAction.confidence,
    action_reasoning: nextAction.reasoning,
    processing_time_ms: duration,
    tokenUsage: {
      inputTokens: (analysis.tokenUsage?.inputTokens || 0) + (nextAction.tokenUsage?.inputTokens || 0),
      outputTokens: (analysis.tokenUsage?.outputTokens || 0) + (nextAction.tokenUsage?.outputTokens || 0),
      totalTokens: (analysis.tokenUsage?.totalTokens || 0) + (nextAction.tokenUsage?.totalTokens || 0),
    }
  };
}
