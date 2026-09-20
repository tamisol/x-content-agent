import { NextResponse } from "next/server";
import { getAiConfig, generateAnglesWithProvider } from "@/lib/ai-provider";
import type { Angle } from "@/lib/types";

function buildMockAngles(topic: string): Angle[] {
  const t = topic.trim() || "crypto";
  return [
    {
      name: "Personal Take",
      explanation: "Share your own perspective or experience with the topic.",
      hook: `My honest read on ${t} after watching it closely…`,
    },
    {
      name: "Observation",
      explanation: "Point out something subtle most people are missing.",
      hook: `Nobody is talking about this side of ${t}.`,
    },
    {
      name: "Contrarian",
      explanation: "Push back on the popular narrative around the topic.",
      hook: `Unpopular opinion on ${t}: everyone has it backwards.`,
    },
    {
      name: "Story",
      explanation: "Tell a short personal story connected to the topic.",
      hook: `3 days ago I started watching ${t}. Here's what happened.`,
    },
    {
      name: "Educational",
      explanation: "Teach one concrete thing about the topic, simply.",
      hook: `${t} explained in 30 seconds:`,
    },
    {
      name: "Funny / Degen",
      explanation: "Make people laugh with an exaggerated, degen-flavored take.",
      hook: `me checking ${t} for the 47th time today:`,
    },
  ];
}

export async function POST(req: Request) {
  let body: { topic?: unknown };
  try {
    body = (await req.json()) as { topic?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const topic = (body.topic ?? "").toString().slice(0, 500);
  if (topic.trim().length === 0) {
    return NextResponse.json({ error: "Topic is required." }, { status: 400 });
  }

  // Same provider as /api/generate — falls back to mock when Ollama is down.
  const config = getAiConfig();
  const live = config.configured
    ? await generateAnglesWithProvider(topic, config).catch(() => null)
    : null;

  if (live && live.length > 0) {
    return NextResponse.json({ angles: live, mocked: false });
  }

  return NextResponse.json({ angles: buildMockAngles(topic), mocked: true });
}
