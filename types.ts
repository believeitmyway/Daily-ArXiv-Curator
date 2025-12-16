export interface Topic {
  id: string;
  title: string;
  searchPrompt: string;
  lastUpdated?: string;
}

export interface Paper {
  id: string; // Unique ID (usually derived from URL or DOI)
  topicId: string; // Links this paper to a specific topic
  title: string;
  authors: string[];
  publishedDate: string; // YYYY-MM-DD
  url: string;
  summary: string; // One sentence summary
  abstract: string; // Full abstract for context
  abstractJa?: string; // Japanese translation of the abstract
  engagementScore: number; // 0-100 calculated score
  engagementReason: string; // Why it was picked
  impactBadge?: string; // Headline e.g. "NeurIPS 2024"
  citationCount?: string; // e.g. "150+"
  webMentionCount?: string; // e.g. "50+ posts"
  imageUrl?: string; // Representative image URL if found
}

export interface DayGroup {
  date: string; // YYYY-MM-DD
  papers: Paper[];
}

export type FetchStatus = 'idle' | 'searching' | 'analyzing' | 'complete' | 'error';
