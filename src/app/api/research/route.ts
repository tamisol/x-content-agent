import { NextResponse } from "next/server";
import { getAiConfig, generateResearchWithProvider } from "@/lib/ai-provider";

const MAX_INPUT_CHARS = 12_000;
const MIN_USEFUL_CHARS = 200;

function isUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/** Best-effort text extraction from HTML. No scraping framework needed. */
function htmlToText(html: string): string {
  const text = decodeEntities(
    html
      .slice(0, 200_000)
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(header|nav|footer|aside|form|button|svg|canvas|iframe|img|input|select|textarea)[\s>][\s\S]*?(<\/\1>|\/>|>)/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\r]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n")
    .trim();
  return text.slice(0, MAX_INPUT_CHARS);
}

async function fetchUrlText(
  url: string,
): Promise<{ ok: true; text: string } | { ok: false }> {
  try {
    const res = await fetch(url.trim(), {
      headers: {
        "User-Agent": "XContentAgent/1.0 (research; +local)",
        Accept: "text/html,text/plain,*/*",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { ok: false };
    const contentType = res.headers.get("content-type") ?? "";
    if (
      !/text\/(html|plain)|application\/(xhtml\+xml|json)/i.test(contentType) &&
      contentType.length > 0
    ) {
      return { ok: false };
    }
    const raw = await res.text();
    const text = /<html|<!doctype/i.test(raw) ? htmlToText(raw) : raw.slice(0, MAX_INPUT_CHARS).trim();
    if (text.replace(/\s/g, "").length < MIN_USEFUL_CHARS) return { ok: false };
    return { ok: true, text };
  } catch {
    return { ok: false };
  }
}

export async function POST(req: Request) {
  let body: { input?: unknown };
  try {
    body = (await req.json()) as { input?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rawInput = (body.input ?? "").toString();
  if (rawInput.trim().length === 0) {
    return NextResponse.json(
      { error: "Paste some text or a URL to research first." },
      { status: 400 },
    );
  }

  let material = rawInput.slice(0, MAX_INPUT_CHARS);
  let source: "text" | "url" = "text";

  if (isUrl(rawInput)) {
    source = "url";
    const fetched = await fetchUrlText(rawInput);
    if (!fetched.ok) {
      // Never pretend a URL was researched when it wasn't.
      return NextResponse.json(
        {
          error:
            "I couldn't read that URL (it may block bots, need JavaScript, or not be an article page). Paste the article or announcement text instead and I'll analyze that.",
        },
        { status: 422 },
      );
    }
    material = fetched.text;
  } else if (rawInput.replace(/\s/g, "").length < MIN_USEFUL_CHARS) {
    return NextResponse.json(
      { error: "That looks a bit short — paste at least a paragraph or two so there's something to analyze." },
      { status: 400 },
    );
  }

  // Deliberately no mock fallback: fabricated "findings" would invent facts.
  const config = getAiConfig();
  const research = config.configured
    ? await generateResearchWithProvider(material, config).catch(() => null)
    : null;

  if (!research) {
    // Distinguish "provider is down" from "provider answered unusably" so
    // the UI can show the right message. Cheap probe, failure path only.
    // Only Ollama runs locally and can be "not running".
    let providerDown = false;
    if (config.configured && config.provider === "ollama") {
      try {
        const probe = await fetch(`${config.baseUrl}/api/version`, {
          signal: AbortSignal.timeout(4000),
        });
        providerDown = !probe.ok;
      } catch {
        providerDown = true;
      }
    }
    return NextResponse.json(
      {
        error: !config.configured
          ? "Research needs a configured AI provider and none is available."
          : providerDown
            ? "Ollama isn't running. Start Ollama and try again."
            : "The AI service didn't return usable research (it may be overloaded or the material too messy). Try again or paste cleaner text.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    research,
    source,
    charsAnalyzed: material.length,
  });
}
