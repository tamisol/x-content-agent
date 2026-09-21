import { NextResponse } from "next/server";
import { getAiConfig, generateWithProvider } from "@/lib/ai-provider";
import { CONTENT_TYPES, TONES } from "@/lib/types";
import type { ContentType, Tone } from "@/lib/types";

/**
 * Telegram bot webhook. Reuses the existing AI provider + prompts —
 * the bot is just another front door to the same generator.
 *
 * Setup:
 *   1. Set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET (and optionally
 *      ALLOWED_TELEGRAM_IDS) in Vercel env vars, redeploy.
 *   2. Register the webhook:
 *      https://api.telegram.org/bot<TOKEN>/setWebhook?url=<SITE>/api/telegram&secret_token=<SECRET>&drop_pending_updates=true
 *
 * Commands: /start /post <topic> /tone <name> /type <name> /shorter /natural
 */

interface TelegramUser {
  id: number;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number };
  text?: string;
}

interface TelegramCallback {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

interface TelegramUpdate {
  message?: TelegramMessage;
  callback_query?: TelegramCallback;
}

// Per-user prefs + last output. In-memory only: defaults always apply,
// so a cold start just resets to Natural / X Post. No database.
const prefs = new Map<number, { tone: Tone; contentType: ContentType }>();
const lastOutput = new Map<number, string>();

const DEFAULTS = { tone: "Natural", contentType: "X Post" } as const;

function isTone(v: string): v is Tone {
  return (TONES as readonly string[]).includes(v);
}

function isContentType(v: string): v is ContentType {
  return (CONTENT_TYPES as readonly string[]).includes(v);
}

function getAllowedIds(): number[] | null {
  const raw = process.env.ALLOWED_TELEGRAM_IDS?.trim();
  if (!raw) return null;
  const ids = raw
    .split(/[\s,]+/)
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n));
  return ids.length > 0 ? ids : null;
}

async function sendMessage(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    // Telegram caps messages at 4096 chars.
    const body = text.length > 4000 ? `${text.slice(0, 4000)}…` : text;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: body }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    // Best effort — webhook must still answer 200 below.
  }
}

async function answerCallback(id: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: id }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    // ignore
  }
}

async function handleGenerate(
  userId: number,
  chatId: number,
  topic: string,
  mode: "generate" | "shorter" | "natural",
  previousOutput?: string,
): Promise<void> {
  const pref = prefs.get(userId) ?? { ...DEFAULTS };
  const config = getAiConfig();
  const output = config.configured
    ? await generateWithProvider(
        {
          topic,
          contentType: pref.contentType,
          tone: pref.tone,
          mode,
          previousOutput,
        },
        config,
      ).catch(() => null)
    : null;

  if (!output) {
    await sendMessage(
      chatId,
      "Couldn't generate right now — the AI service is unreachable. Try again in a bit.",
    );
    return;
  }
  lastOutput.set(userId, output);
  await sendMessage(chatId, output);
}

const HELP = [
  "X Content Agent bot. Send me an idea, get an X-ready post.",
  "",
  "/post <topic> — generate a post",
  "/tone <natural|degen|funny|professional|storytelling|technical>",
  "/type <x post|reply|quote tweet|thread>",
  "/shorter — tighten the last post",
  "/natural — make the last post sound more human",
].join("\n");

function toneList(): string {
  return `Pick a tone: ${TONES.map((t) => t.toLowerCase()).join(", ")}`;
}

function typeList(): string {
  return `Pick a type: ${CONTENT_TYPES.map((t) => t.toLowerCase()).join(", ")}`;
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

async function handleText(
  userId: number,
  chatId: number,
  rawText: string,
): Promise<void> {
  const text = rawText.trim();
  const [command, ...rest] = text.split(/\s+/);
  const cmd = command.split("@")[0].toLowerCase();
  const arg = rest.join(" ").trim();

  switch (cmd) {
    case "/start":
      await sendMessage(chatId, HELP);
      return;
    case "/post": {
      if (!arg) {
        await sendMessage(chatId, "Give me a topic: /post <your idea>");
        return;
      }
      await handleGenerate(userId, chatId, arg.slice(0, 500), "generate");
      return;
    }
    case "/tone": {
      const tone = titleCase(arg.toLowerCase());
      if (!isTone(tone)) {
        await sendMessage(chatId, toneList());
        return;
      }
      const pref = prefs.get(userId) ?? { ...DEFAULTS };
      prefs.set(userId, { ...pref, tone });
      await sendMessage(chatId, `Tone set to ${tone}.`);
      return;
    }
    case "/type": {
      const type = titleCase(arg.toLowerCase());
      if (!isContentType(type)) {
        await sendMessage(chatId, typeList());
        return;
      }
      const pref = prefs.get(userId) ?? { ...DEFAULTS };
      prefs.set(userId, { ...pref, contentType: type });
      await sendMessage(chatId, `Content type set to ${type}.`);
      return;
    }
    case "/shorter":
    case "/natural": {
      const prev = lastOutput.get(userId);
      if (!prev) {
        await sendMessage(chatId, "Generate something first with /post <topic>.");
        return;
      }
      const pref = prefs.get(userId) ?? { ...DEFAULTS };
      await handleGenerate(
        userId,
        chatId,
        pref.contentType === "X Post" ? "post" : pref.contentType,
        cmd === "/shorter" ? "shorter" : "natural",
        prev,
      );
      return;
    }
    default: {
      // Plain text = treat as a topic.
      if (cmd.startsWith("/")) {
        await sendMessage(chatId, HELP);
        return;
      }
      await handleGenerate(userId, chatId, text.slice(0, 500), "generate");
    }
  }
}

export async function POST(req: Request) {
  // Verify Telegram's secret (header when registered with secret_token,
  // or ?secret= fallback). Never process unverified updates.
  const url = new URL(req.url);
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const provided =
    req.headers.get("x-telegram-bot-api-secret-token") ??
    url.searchParams.get("secret") ??
    "";
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ ok: true, warning: "No bot token configured." });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const msg = update.callback_query?.message ?? update.message;
  const userId =
    update.callback_query?.from.id ?? update.message?.from?.id ?? null;
  if (!msg || userId === null) return NextResponse.json({ ok: true });

  const allowed = getAllowedIds();
  if (allowed && !allowed.includes(userId)) {
    await sendMessage(msg.chat.id, "Sorry — this bot is private.");
    return NextResponse.json({ ok: true });
  }

  if (update.callback_query) {
    await answerCallback(update.callback_query.id);
    return NextResponse.json({ ok: true });
  }

  if (msg.text) {
    await handleText(userId, msg.chat.id, msg.text);
  }
  // Always 200 so Telegram doesn't retry the update.
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "telegram-webhook" });
}
