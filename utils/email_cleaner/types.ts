export interface CleanerConfig {
  preserveLinks?: boolean;
  maxLength?: number;
  aggressiveClean?: boolean;
  removeQuotes?: boolean;
  preserveTables?: boolean;
  minContentLength?: number;
}

export const DEFAULT_CONFIG: CleanerConfig = {
  preserveLinks: false,
  maxLength: 10000,
  aggressiveClean: false,
  removeQuotes: true,
  preserveTables: true,
  minContentLength: 50,
};

export interface CleanedEmail {
  pretext: string;
  core: string;
  posttext: string;
  cleanText: string;
  summary: string;
  metadata: {
    originalLength: number;
    cleanedLength: number;
    compressionRatio: string;
    warning?: string;
  };
}
