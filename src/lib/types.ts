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
