export const CONTENT_TYPES = [
  "X Post",
  "Reply",
  "Quote Tweet",
  "Thread",
] as const;

export const TONES = [
  "Natural",
  "Degen",
  "Funny",
  "Professional",
  "Storytelling",
  "Technical",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];
export type Tone = (typeof TONES)[number];

export type GenerateMode = "generate" | "shorter" | "natural";

export interface GenerateRequest {
  topic: string;
  contentType: ContentType;
  tone: Tone;
  context?: string;
  styleSamples?: string[];
  mode?: GenerateMode;
  previousOutput?: string;
  /** Selected content angle, e.g. "Contrarian — Challenge the hype: ...". */
  angle?: string;
  /** Research findings summary to ground the post in. */
  research?: string;
}

export interface GenerateResponse {
  output: string;
  contentType: ContentType;
  tone: Tone;
  mocked: boolean;
}

export interface Angle {
  name: string;
  explanation: string;
  hook: string;
}

export interface AnglesResponse {
  angles: Angle[];
  mocked: boolean;
}

export interface ResearchOpportunity {
  title: string;
  description: string;
}

export interface ResearchResult {
  /** Short topic label for the generator, e.g. "Solana memecoin launch". */
  suggestedTopic: string;
  keyPoints: string[];
  importantDetails: string[];
  opportunities: ResearchOpportunity[];
}

export interface ResearchResponse {
  research: ResearchResult;
  source: "text" | "url";
  charsAnalyzed: number;
}
