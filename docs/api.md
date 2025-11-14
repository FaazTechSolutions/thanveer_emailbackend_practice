# API Documentation

This document provides detailed API documentation for the AI Email Agent system modules and functions.

## Table of Contents

- [Email Cleaner](#email-cleaner)
- [Email Analyzer](#email-analyzer)
- [Translation Service](#translation-service)
- [Decision Agent](#decision-agent)
- [REST API Endpoints](#rest-api-endpoints)

## Email Cleaner

The email cleaner module processes raw HTML email content to extract clean, readable text.

### `cleanEmail(htmlBody: string, config?: CleanerConfig): CleanedEmail`

Cleans HTML email content by removing formatting, signatures, disclaimers, and quotes.

**Parameters:**
- `htmlBody` (string): The raw HTML content of the email
- `config` (CleanerConfig, optional): Configuration options for cleaning

**Returns:** `CleanedEmail` object

### Interfaces

#### `CleanerConfig`
```typescript
interface CleanerConfig {
  preserveLinks?: boolean;      // Whether to keep links in the text
  maxLength?: number;           // Maximum length of cleaned text
  aggressiveClean?: boolean;    // Use aggressive cleaning methods
  removeQuotes?: boolean;       // Remove quoted text from replies
  preserveTables?: boolean;     // Keep table structures
  minContentLength?: number;    // Minimum content length threshold
}
```

#### `CleanedEmail`
```typescript
interface CleanedEmail {
  pretext: string;              // Text before the main content
  core: string;                 // Main content of the email
  posttext: string;             // Text after the main content
  cleanText: string;            // Fully cleaned text
  summary: string;              // Brief summary of the content
  metadata: {
    originalLength: number;     // Original HTML length
    cleanedLength: number;      // Cleaned text length
    compressionRatio: string;   // Compression percentage
    warning?: string;           // Warning if content is too short
  };
}
```

**Example:**
```typescript
import cleanEmail from './utils/email_cleaner/index.ts';

const result = cleanEmail('<html><body>Hello <b>world</b>!</body></html>');
console.log(result.cleanText); // "Hello world!"
```

## Email Analyzer

The analyzer module uses AI to classify, extract structured data, and determine actions for emails.

### `processEmailAnalysis(subject: string, body: string): Promise<AnalysisResult>`

Analyzes email content using AI to provide classification, structured data extraction, and action recommendations.

**Parameters:**
- `subject` (string): Email subject line
- `body` (string): Email body content

**Returns:** Promise resolving to `AnalysisResult`

### Interfaces

#### `Classification`
```typescript
interface Classification {
  category: 'billing' | 'technical_support' | 'account_management' |
           'product_inquiry' | 'complaint' | 'feedback' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated';
  confidence: number;  // 0-1 confidence score
}
```

#### `StructuredData`
```typescript
interface StructuredData {
  confidence: number;  // Overall confidence in extracted data
  [key: string]: {
    value: string | null;
    confidence: number;
  } | number;
}
```

#### `ActionItem`
```typescript
interface ActionItem {
  action: string;      // Description of the action
  confidence: number;  // Confidence in this action being needed
}
```

#### `AnalysisResult`
```typescript
interface AnalysisResult extends EmailAnalysis {
  next_best_action: ActionType;
  action_confidence: number;
  action_reasoning: string;
  processing_time_ms: number;
}
```

#### `ActionType`
```typescript
type ActionType =
  | 'Create new ticket'
  | 'Update existing ticket'
  | 'Send acknowledgment email'
  | 'Escalate to agent'
  | 'Auto-respond with solution'
  | 'Request missing info';
```

**Example:**
```typescript
import { processEmailAnalysis } from './utils/analyser/index.ts';

const result = await processEmailAnalysis(
  "Billing Issue",
  "I haven't received my invoice for last month."
);

console.log(result.classification.category); // "billing"
console.log(result.next_best_action); // "Send acknowledgment email"
```

## Translation Service

The translation service detects Arabic content and translates it to English using AI.

### `translateEmail(subject: string, body: string): Promise<TranslatedEmail>`

Translates an email's subject and body from Arabic to English.

**Parameters:**
- `subject` (string): Email subject
- `body` (string): Email body

**Returns:** Promise resolving to `TranslatedEmail`

### `translateText(text: string): Promise<TranslatedText>`

Translates plain text from Arabic to English.

**Parameters:**
- `text` (string): Text to translate

**Returns:** Promise resolving to `TranslatedText`

### `isArabic(text: string): boolean`

Detects if text contains Arabic characters.

**Parameters:**
- `text` (string): Text to check

**Returns:** Boolean indicating if Arabic characters are present

### Interfaces

#### `TranslatedEmail`
```typescript
interface TranslatedEmail {
  subject: string;
  body: string;
  language: "en" | "ar";
  wasTranslated: boolean;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}
```

#### `TranslatedText`
```typescript
interface TranslatedText {
  text: string;
  wasTranslated: boolean;
  language: "en" | "ar";
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}
```

**Example:**
```typescript
import { translateEmail, isArabic } from './utils/transulate/index.ts';

if (isArabic(emailBody)) {
  const translated = await translateEmail(subject, emailBody);
  console.log(translated.subject);
  console.log(translated.body);
}
```

## Decision Agent

The decision agent makes automated decisions about how to handle processed emails.

### `runDecisionAgent(analysisResult: any): Promise<void>`

Runs the decision agent to automatically handle emails based on analysis results.

**Parameters:**
- `analysisResult` (any): The result from email analysis

**Returns:** Promise that resolves when decision is executed

**Example:**
```typescript
import { runDecisionAgent } from './utils/agents/email_decision_agent.ts';

await runDecisionAgent(analysisResult);
```

## REST API Endpoints

The system exposes REST API endpoints for email processing operations.

### GET `/fetch-and-ingest`

Fetches emails from external API and processes them through the complete pipeline.

**Query Parameters:**
- `page` (number, optional): Page number for pagination (default: 1)
- `size` (number, optional): Number of emails per page (default: 10)
- `reqid` (string, optional): Specific request ID to reprocess

**Response:**
```json
{
  "success": true,
  "total": 5,
  "page": 1,
  "size": 10,
  "table": "emails_cleaned",
  "data": [
    {
      "req_id": "12345",
      "was_translated": false,
      "analysis": {
        "classification": {
          "category": "technical_support",
          "priority": "medium",
          "sentiment": "neutral",
          "confidence": 0.85
        },
        "next_best_action": "Create new ticket",
        "summary": "User reporting technical issue..."
      },
      "created_at": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

### POST `/ingest-email`

Processes a single email object through the pipeline.

**Request Body:**
```json
{
  "email": {
    "RecId": "12345",
    "Subject": "Email Subject",
    "Comments": "<html>Email content...</html>"
  },
  "reqid": "optional_specific_id"
}
```

**Response:**
```json
{
  "success": true,
  "table": "emails_cleaned",
  "data": {
    "req_id": "12345",
    "was_translated": false,
    "analysis": { ... },
    "created_at": "2024-01-01T12:00:00.000Z"
  }
}
```

### GET `/mails`

Retrieves processed emails from the database.

**Query Parameters:**
- `limit` (number, optional): Maximum number of emails to return (default: 5)
- `offset` (number, optional): Number of emails to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "req_id": "12345",
      "pretext": "",
      "core": "Cleaned email content...",
      "posttext": "",
      "clean_text": "Cleaned email content...",
      "translated": false,
      "original_email": { "subject": "...", "body": "..." },
      "translated_content": null,
      "analysis_result": { ... },
      "summary": "Brief summary...",
      "requires_human_review": false,
      "created_at": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

## Error Handling

All API endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (missing required parameters)
- `500`: Internal Server Error (processing failed)

## Configuration

The system can be configured through environment variables:

- `DATABASE_URL`: PostgreSQL/Neon database connection string
- `Api_token`: External email API token
- `OPENAI_API_KEY`: OpenAI API key
- `OPENROUTER_API_KEY`: OpenRouter API key
- `AI_MODEL`: AI model to use for processing (default: mistralai/mistral-small-3.2-24b-instruct:free)
- `PORT`: Server port (default: 3000)