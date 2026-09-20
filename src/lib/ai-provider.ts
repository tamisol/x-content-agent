import type { Angle, GenerateRequest, ResearchResult } from "./types";

/**
 * AI provider configuration — kept separate so the route handler
 * and UI never need to change when swapping models.
 *
 * Supported providers:
 *   AI_PROVIDER=ollama   # local Ollama server (default, no API key needed)
 *   AI_PROVIDER=groq      # Groq cloud API (free tier, needs GROQ_API_KEY)
 *
 * Env vars (all server-side only, never exposed to the client):
 *   AI_PROVIDER=ollama          # default: "ollama"
 *   AI_MODEL=llama3.2           # Ollama tag, or Groq model id
 *   AI_BASE_URL=http://localhost:11434  # Ollama address (or Groq base URL)
 *   AI_API_KEY=...              # optional for Ollama; required for Groq
 *   GROQ_API_KEY=...            # alias for AI_API_KEY when using Groq
 */

export interface AiConfig {
  provider: string;
  model: string;
  baseUrl: string;
  apiKey: string | undefined;
  configured: boolean;
}

export function getAiConfig(): AiConfig {
  const provider = process.env.AI_PROVIDER ?? "ollama";
  const defaultModel =
    provider === "groq" ? "openai/gpt-oss-120b" : "llama3.2";
  const model = process.env.AI_MODEL ?? defaultModel;
  const defaultBase =
    provider === "groq"
      ? "https://api.groq.com/openai/v1"
      : "http://localhost:11434";
  const baseUrl = process.env.AI_BASE_URL ?? process.env.OLLAMA_BASE_URL ?? defaultBase;
  const apiKey =
    process.env.AI_API_KEY ?? process.env.GROQ_API_KEY ?? process.env.OPENAI_API_KEY;

  return {
    provider,
    model,
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey,
    // Local Ollama needs no API key — it is configured as long as
    // a base URL is set. Cloud providers still require a key.
    configured: provider === "ollama" ? true : Boolean(apiKey),
  };
}

function buildSystemPrompt(req: GenerateRequest): string {
  const mode = req.mode ?? "generate";

  const base = [
    "You are an X (Twitter) content-writing agent for Web3 and crypto users.",
    "You write short, punchy posts that sound like a real person posting, not an AI.",
    "",
    "Hard rules:",
    "- Sound natural and human. Never use generic AI phrasing (no “delve”, “game-changer”, “in today's fast-paced world”, no robotic transitions).",
    "- No unnecessary hashtags. At most one, and only if it clearly adds value.",
    "- No unnecessary emojis. Most outputs should have none.",
    "- Respect the requested tone exactly.",
    "- Write concise, X-style: short lines, plain words, lowercase ok when it fits the voice.",
    "- Never invent facts, events, prices, or claims the user did not provide. Do not state that something happened unless it is in the topic, context, or style samples.",
    "- Output ONLY the post content. No explanations, no quotation marks around it, no preamble like “Here's your post”.",
  ].join("\n");

  const format: Record<GenerateRequest["contentType"], string> = {
    "X Post":
      "Format: a single standalone X post. Keep it under 280 characters when possible.",
    Reply:
      "Format: a short reply to someone else's post. Conversational, lowercase-friendly, under 280 characters when possible.",
    "Quote Tweet":
      "Format: a quote tweet — a brief comment that adds a take, followed by the quoted idea it reacts to.",
    Thread:
      "Format: a thread of 3-5 numbered posts (1/, 2/, 3/ …). Each post under 280 characters. End with a short TL;DR post.",
  };

  const task =
    mode === "shorter"
      ? "Task: rewrite the PREVIOUS OUTPUT below to be shorter while preserving its exact meaning, tone, and voice. Cut filler, keep the point."
      : mode === "natural"
        ? "Task: rewrite the PREVIOUS OUTPUT below so it sounds more human and less AI-generated. Same meaning, same tone — just more natural: plain words, relaxed rhythm, no AI tells."
        : "Task: write fresh content from the TOPIC below.";

  return [base, "", format[req.contentType], task].join("\n");
}

function buildUserPrompt(req: GenerateRequest): string {
  const mode = req.mode ?? "generate";
  const parts: string[] = [];

  if (mode === "generate") {
    parts.push(`Topic: ${req.topic.trim()}`);
    parts.push(`Content type: ${req.contentType}`);
    parts.push(`Tone: ${req.tone}`);
    if (req.context?.trim()) parts.push(`Extra context: ${req.context.trim()}`);
  } else {
    parts.push(`Content type: ${req.contentType}`);
    parts.push(`Tone: ${req.tone}`);
    parts.push(`Previous output to rewrite:\n${(req.previousOutput ?? "").trim()}`);
    if (req.context?.trim()) parts.push(`Extra context: ${req.context.trim()}`);
  }

  if (req.styleSamples && req.styleSamples.length > 0) {
    parts.push(
      [
        "The user's own writing style — match its voice, slang, rhythm, and formatting:",
        ...req.styleSamples.map((s, i) => `Style ${i + 1}: ${s}`),
      ].join("\n"),
    );
  }

  const angle = req.angle?.trim();
  if (angle) {
    parts.push(
      `Selected content angle — frame the whole post around this angle: ${angle}`,
    );
  }

  const research = req.research?.trim();
  if (research) {
    parts.push(
      `Research findings — ground the post in these facts. Do not invent beyond them: ${research}`,
    );
  }

  return parts.join("\n\n");
}

interface OllamaChatResponse {
  message?: { content?: unknown };
  error?: unknown;
}

async function callOllama(
  system: string,
  prompt: string,
  config: AiConfig,
  opts?: { timeoutMs?: number; numPredict?: number; logLabel?: string },
): Promise<string | null> {
  try {
    const res = await fetch(`${config.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        stream: false,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        options: { num_predict: opts?.numPredict ?? 1200 },
      }),
      // Don't hang the API route if Ollama is slow or down.
      signal: AbortSignal.timeout(opts?.timeoutMs ?? 60_000),
    });

    if (opts?.logLabel) {
      console.error(`[${opts.logLabel}] Ollama HTTP status: ${res.status}`);
    }
    if (!res.ok) return null;

    // Read raw text (not res.json) so failures can be logged server-side.
    const raw = await res.text();
    if (opts?.logLabel) {
      console.error(
        `[${opts.logLabel}] Ollama raw body (first 500 chars):`,
        raw.slice(0, 500),
      );
    }
    let data: OllamaChatResponse;
    try {
      data = JSON.parse(raw) as OllamaChatResponse;
    } catch {
      if (opts?.logLabel) {
        console.error(`[${opts.logLabel}] Ollama body was not JSON.`);
      }
      return null;
    }
    const text =
      typeof data.message?.content === "string" ? data.message.content.trim() : "";
    if (opts?.logLabel) {
      console.error(
        `[${opts.logLabel}] Extracted message (first 500 chars):`,
        text.slice(0, 500),
      );
    }
    return text.length > 0 ? text : null;
  } catch {
    // Ollama unavailable / timed out / bad response → caller falls back to mock.
    return null;
  }
}

interface OpenAIChatResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
}

/**
 * OpenAI-compatible chat completions caller (used for Groq).
 * Same contract as callOllama: prompt in, text out, null on any failure.
 * Plain fetch — no SDK. Never throws.
 */
async function callCloudChat(
  system: string,
  prompt: string,
  config: AiConfig,
  opts?: { timeoutMs?: number; maxTokens?: number },
): Promise<string | null> {
  if (!config.apiKey) return null;
  try {
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        stream: false,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        max_tokens: opts?.maxTokens ?? 1200,
      }),
      signal: AbortSignal.timeout(opts?.timeoutMs ?? 60_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as OpenAIChatResponse;
    const content = data.choices?.[0]?.message?.content;
    const text = typeof content === "string" ? content.trim() : "";
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

/**
 * Generate via the configured provider.
 * Returns null when generation isn't possible so callers
 * can fall back to mock content. Never throws.
 */
export async function generateWithProvider(
  req: GenerateRequest,
  config: AiConfig,
): Promise<string | null> {
  const system = buildSystemPrompt(req);
  const prompt = buildUserPrompt(req);
  if (config.provider === "groq") {
    return callCloudChat(system, prompt, config).catch(() => null);
  }
  if (config.provider !== "ollama") return null;
  const output = await callOllama(system, prompt, config).catch(() => null);
  return output;
}

const ANGLES_SYSTEM_PROMPT = [
  "You are an X (Twitter) content strategist for Web3 and crypto users.",
  "Given a topic, propose 5-6 genuinely different content angles for X posts.",
  "",
  "Rules:",
  "- Each angle must be meaningfully different — a different framing, not the same idea reworded.",
  "- Keep every angle practical for short X/Twitter content.",
  "- No generic corporate or social-media advice (no “leverage synergies”, no “post consistently”).",
  "- For crypto/Web3 topics, use Crypto-Twitter language naturally.",
  "- Keep explanations to 1-2 sentences and hooks to one short post-length line.",
  '- Respond with ONLY a complete JSON array with 5-6 items including the closing bracket, no preamble, no code fences, no commentary. Schema: [{"name": "...", "explanation": "...", "hook": "..."}].',
].join("\n");

/** Validate a parsed value into an Angle list. Null when unusable. */
function toAngles(parsed: unknown): Angle[] | null {
  const list = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as Record<string, unknown>).angles)
      ? ((parsed as Record<string, unknown>).angles as unknown[])
      : null;
  if (!list) return null;
  const pick = (a: Record<string, unknown>, keys: string[], max: number) => {
    for (const k of keys) {
      if (typeof a[k] === "string" && (a[k] as string).trim().length > 0) {
        return (a[k] as string).trim().slice(0, max);
      }
    }
    return "";
  };
  const angles = list
    .filter(
      (a): a is Record<string, unknown> =>
        typeof a === "object" && a !== null,
    )
    .map((a) => ({
      name: pick(a, ["name", "title", "angle"], 80),
      explanation: pick(a, ["explanation", "description", "detail"], 500),
      hook: pick(a, ["hook", "example", "sample"], 500),
    }))
    .filter((a) => a.name.length > 0 && a.explanation.length > 0)
    .slice(0, 6);
  return angles.length >= 2 ? angles : null;
}

/** Extract a validated Angle[] from free-form model text. Null when unusable. */
function parseAnglesText(text: string): Angle[] | null {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();

  const candidates: string[] = [];
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    candidates.push(cleaned.slice(start, end + 1));
  }
  if (start !== -1) {
    // Model sometimes stops before the closing bracket.
    candidates.push(`${cleaned.slice(start)}]`);
  }
  candidates.push(cleaned);

  for (const c of candidates) {
    try {
      const angles = toAngles(JSON.parse(c) as unknown);
      if (angles) return angles;
    } catch {
      // try next candidate
    }
  }
  return null;
}

/**
 * Generate content angles via the configured Ollama server.
 * Reuses the same connection config — no second provider.
 * Returns null when unavailable so callers can fall back to mock angles.
 * Never throws.
 */
export async function generateAnglesWithProvider(
  topic: string,
  config: AiConfig,
): Promise<Angle[] | null> {
  const prompt = `Topic: ${topic.trim()}`;
  if (config.provider === "groq") {
    const text = await callCloudChat(
      ANGLES_SYSTEM_PROMPT,
      prompt,
      config,
      { timeoutMs: 120_000, maxTokens: 1500 },
    ).catch(() => null);
    if (!text) return null;
    return parseAnglesText(text);
  }
  if (config.provider !== "ollama") return null;
  const text = await callOllama(
    ANGLES_SYSTEM_PROMPT,
    prompt,
    config,
    // Angle lists are long generations — allow slow local models more time.
    // Still aborts eventually so the route falls back to mock angles.
    { timeoutMs: 300_000, numPredict: 1500 },
  ).catch(() => null);
  if (!text) return null;
  return parseAnglesText(text);
}

/**
 * Analyze research material via the configured provider.
 * Returns null when unavailable or unparsable. Never throws.
 * NOTE: unlike generation, there is intentionally NO mock fallback —
 * fabricating "research findings" would mean inventing facts.
 */
export async function generateResearchWithProvider(
  material: string,
  config: AiConfig,
): Promise<ResearchResult | null> {
  const prompt = `Material to analyze:\n${material.trim()}`;
  if (config.provider === "groq") {
    const text = await callCloudChat(
      RESEARCH_SYSTEM_PROMPT,
      prompt,
      config,
      { timeoutMs: 120_000, maxTokens: 2000 },
    ).catch(() => null);
    if (!text) return null;
    return parseResearchText(text);
  }
  if (config.provider !== "ollama") return null;
  const text = await callOllama(
    RESEARCH_SYSTEM_PROMPT,
    prompt,
    config,
    { timeoutMs: 300_000, numPredict: 2000, logLabel: "research" },
  ).catch(() => null);
  if (!text) {
    console.error("[research] Ollama returned an empty response.");
    return null;
  }
  const parsed = parseResearchText(text);
  if (!parsed) {
    // Server log only — never exposed to the client.
    console.error(
      "[research] Could not parse model output. First 500 chars:",
      text.slice(0, 500),
    );
    return null;
  }
  return parsed;
}

const RESEARCH_SYSTEM_PROMPT = [
  "Return ONLY valid JSON. No Markdown. No explanation before or after the JSON.",
  "",
  "Exact schema:",
  '{"suggestedTopic": "Solana memecoin trading", "keyPoints": ["Low fees attract traders", "Pump.fun makes launches easy"], "importantDetails": [], "contentOpportunities": [{"title": "Personal Take", "description": "Share your own view on why traders pick Solana"}, {"title": "Educational", "description": "Explain how low fees change token launches"}, {"title": "Contrarian", "description": "Argue the speculation will end badly"}]}',
  "",
  "Rules:",
  "- keyPoints and importantDetails are arrays of plain strings only, never objects.",
  "- Do not invent information. Use only the supplied material.",
  "- Keep arrays concise. Return 3-6 key points. Return 3-5 content opportunities.",
  "- importantDetails holds names, numbers, dates, features, announcements when present, otherwise [].",
  "- The schema above shows EXAMPLES only. Do NOT reuse the example titles or descriptions — create fresh ones specific to the supplied material.",
  "- Finish the JSON completely, including all closing brackets and braces.",
].join("\n");

/** Pick the first non-empty string value from a list of candidate keys. */
function pickStr(
  o: Record<string, unknown>,
  keys: string[],
  maxLen: number,
): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim().length > 0) {
      return v.trim().slice(0, maxLen);
    }
  }
  return "";
}

/** Pick the first array value from a list of candidate keys. */
function pickArr(o: Record<string, unknown>, keys: string[]): unknown[] {
  for (const k of keys) {
    const v = o[k];
    if (Array.isArray(v)) return v;
  }
  return [];
}

/** Validate a parsed value into a ResearchResult. Null when unusable. */
function toResearch(parsed: unknown): ResearchResult | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const o = parsed as Record<string, unknown>;
  const strList = (v: unknown, maxItems: number, maxLen: number): string[] =>
    Array.isArray(v)
      ? v
          .map((s): string => {
            if (typeof s === "string") return s;
            // The model sometimes wraps strings as objects like
            // {"key": "1", "value": "the point"} — unwrap them.
            if (typeof s === "object" && s !== null) {
              const o = s as Record<string, unknown>;
              for (const k of ["value", "text", "point", "detail", "name"]) {
                if (typeof o[k] === "string" && (o[k] as string).trim().length > 0) {
                  return o[k] as string;
                }
              }
            }
            return "";
          })
          .map((s) => s.trim().slice(0, maxLen))
          .filter((s) => s.length > 0)
          .slice(0, maxItems)
      : [];
  const opportunities = pickArr(o, [
    "opportunities",
    "contentOpportunities",
    "content_opportunities",
    "angles",
    "ideas",
  ])
    .filter(
      (a): a is Record<string, unknown> =>
        typeof a === "object" && a !== null,
    )
    .map((a) => ({
      title: pickStr(a, ["title", "name", "heading"], 80),
      description: pickStr(a, ["description", "detail", "text", "summary"], 500),
    }))
    .filter((a) => a.title.length > 0 && a.description.length > 0)
    .slice(0, 5);
  const suggestedTopic = pickStr(
    o,
    ["suggestedTopic", "suggested_topic", "topic", "title"],
    100,
  );
  const result: ResearchResult = {
    suggestedTopic:
      suggestedTopic.length > 0 ? suggestedTopic : "Research notes",
    keyPoints: strList(
      pickArr(o, ["keyPoints", "key_points", "points", "facts"]),
      6,
      500,
    ),
    importantDetails: strList(
      pickArr(o, ["importantDetails", "important_details", "details", "data"]),
      10,
      300,
    ),
    opportunities,
  };
  return result.keyPoints.length >= 1 && result.opportunities.length >= 1
    ? result
    : null;
}

/**
 * Close any brackets the model left open (it sometimes stops early).
 * Only tracks braces outside of strings so content is untouched.
 */
function closeBrackets(s: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (const ch of s) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      stack.push("}");
    } else if (ch === "[") {
      stack.push("]");
    } else if (ch === "}" || ch === "]") {
      stack.pop();
    }
  }
  if (inString) return s; // cut inside a string — can't repair safely
  return s + stack.reverse().join("");
}

/** Candidate JSON slices from one source string. */
function researchCandidates(src: string): string[] {
  const out: string[] = [];
  const start = src.indexOf("{");
  const end = src.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    out.push(src.slice(start, end + 1));
  }
  if (start !== -1) {
    // Truncated output: repair unclosed brackets, e.g. `...}]` missing.
    out.push(closeBrackets(src.slice(start)));
  }
  out.push(src);
  return out;
}

/** Extract a validated ResearchResult from free-form model text. */
function parseResearchText(text: string): ResearchResult | null {
  // Strip markdown code fences before parsing.
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();

  // Small models sometimes emit juxtaposed arrays/objects (`}] [{`)
  // instead of comma-separated items — normalize as fallback sources only.
  const sources = [
    cleaned,
    cleaned.replace(/\]\s*\[/g, ","),
    cleaned.replace(/\}\s*\{/g, "},{"),
  ];

  for (const src of sources) {
    for (const c of researchCandidates(src)) {
      try {
        const research = toResearch(JSON.parse(c) as unknown);
        if (research) return research;
      } catch {
        // try next candidate
      }
    }
  }
  return null;
}
