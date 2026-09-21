import { NextResponse } from "next/server";
import { getAiConfig, generateWithProvider } from "@/lib/ai-provider";
import type {
  ContentType,
  GenerateRequest,
  Tone,
} from "@/lib/types";
import { CONTENT_TYPES, TONES } from "@/lib/types";

function isContentType(v: unknown): v is ContentType {
  return (
    typeof v === "string" && (CONTENT_TYPES as readonly string[]).includes(v)
  );
}

function isTone(v: unknown): v is Tone {
  return typeof v === "string" && (TONES as readonly string[]).includes(v);
}

function toneLine(tone: Tone, topic: string): string {
  switch (tone) {
    case "Degen":
      return `Degen take on ${topic}: apes together strong. LFG.`;
    case "Funny":
      return `Hot take on ${topic} (no financial advice, just vibes).`;
    case "Professional":
      return `A clear, concise perspective on ${topic}.`;
    case "Storytelling":
      return `I learned this about ${topic} the hard way:`;
    case "Technical":
      return `Breaking down ${topic} — first principles:`;
    case "Natural":
    default:
      return `My honest take on ${topic}:`;
  }
}

function buildMock(req: GenerateRequest): string {
  const topic = req.topic.trim() || "crypto";
  const extra = req.context?.trim();
  const mode = req.mode ?? "generate";
  const prev = req.previousOutput?.trim();

  if (mode === "shorter" && prev) {
    const firstLine = prev.split("\n").find((l) => l.trim().length > 0) ?? prev;
    return `${firstLine.trim()}\n\nLess noise, more signal.`;
  }

  if (mode === "natural" && prev) {
    const firstLine = prev.split("\n\n")[0]?.trim() ?? prev;
    return `${firstLine}\n\nJust saying what everyone is thinking, plain and simple.`;
  }

  const hook = toneLine(req.tone, topic);

  switch (req.contentType) {
    case "Thread":
      return [
        `1/ ${hook}`,
        ``,
        `2/ Most people overcomplicate ${topic}. Here's the simple version: incentives > narratives. Watch flows, not hype.`,
        ``,
        `3/ What I'm watching next:${extra ? ` ${extra}` : " positioning, onchain activity, and how CT reacts to the next leg."}`,
        ``,
        `4/ TL;DR: stay curious, stay liquid, don't get chopped.`,
      ].join("\n");
    case "Reply":
      return `agree — ${topic} is one of those things where patience pays.\n\nmost people fade it too early.${extra ? `\n\nre: ${extra}` : ""}`;
    case "Quote Tweet":
      return `quoting this because ${topic} deserves more attention.\n\n${hook}${extra ? `\n\nContext: ${extra}` : ""}`;
    case "X Post":
    default:
      return `${hook}\n\nNobody talks about the boring part: showing up every day, managing risk, ignoring the noise.\n\nThat's the whole game.${extra ? `\n\nContext: ${extra}` : ""}`;
  }
}

export async function POST(req: Request) {
  let body: Partial<GenerateRequest>;
  try {
    body = (await req.json()) as Partial<GenerateRequest>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const topic = (body.topic ?? "").toString().slice(0, 500);
  const contentType: ContentType = isContentType(body.contentType)
    ? body.contentType
    : "X Post";
  const tone: Tone = isTone(body.tone) ? body.tone : "Natural";
  const context = (body.context ?? "").toString().slice(0, 2000);
  const styleSamples = Array.isArray(body.styleSamples)
    ? body.styleSamples
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.slice(0, 1000))
        .filter((s) => s.trim().length > 0)
        .slice(0, 10)
    : [];
  const mode = body.mode === "shorter" || body.mode === "natural" ? body.mode : "generate";
  const previousOutput = (body.previousOutput ?? "").toString().slice(0, 5000);
  const angle = (body.angle ?? "").toString().slice(0, 1000);

  if (mode === "generate" && topic.trim().length === 0) {
    return NextResponse.json(
      { error: "Topic is required." },
      { status: 400 },
    );
  }
  if ((mode === "shorter" || mode === "natural") && previousOutput.trim().length === 0) {
    return NextResponse.json(
      { error: "previousOutput is required for this mode." },
      { status: 400 },
    );
  }

  const request: GenerateRequest = {
    topic,
    contentType,
    tone,
    context,
    styleSamples,
    mode,
    previousOutput,
    angle: angle.trim().length > 0 ? angle : undefined,
  };

  // Prefer live generation; fall back to mock content when the model
  // is unavailable so the UI stays usable offline.
  const config = getAiConfig();
  const live = config.configured
    ? await generateWithProvider(request, config).catch(() => null)
    : null;

  let output = live;
  let mocked = false;
  if (!output) {
    output = buildMock(request);
    mocked = true;
  }

  return NextResponse.json({
    output,
    contentType,
    tone,
    mocked,
  });
}
