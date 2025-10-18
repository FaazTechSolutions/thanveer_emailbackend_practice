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
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface NextBestAction {
  action: 'Create new ticket' | 'Update existing ticket' | 'Send acknowledgment email' | 'Escalate to agent' | 'Auto-respond with solution' | 'Request missing info';
  confidence: number;
  reasoning: string;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export interface AnalysisResult extends EmailAnalysis {
  next_best_action: NextBestAction['action'];
  action_confidence: number;
  action_reasoning: string;
  processing_time_ms: number;
}
