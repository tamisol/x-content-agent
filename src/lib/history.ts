import type { ContentType, Tone } from "./types";

export interface HistoryEntry {
  id: string;
  text: string;
  contentType: ContentType;
  tone: Tone;
  topic: string;
  context: string;
  timestamp: number;
}

const HISTORY_KEY = "x-agent-history";
const MAX_ENTRIES = 50;

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createEntry(input: {
  text: string;
  contentType: ContentType;
  tone: Tone;
  topic: string;
  context: string;
}): HistoryEntry {
  return { ...input, id: makeId(), timestamp: Date.now() };
}

/** Load history. Safe to call during render — returns [] on server or bad data. */
export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is HistoryEntry =>
          typeof e === "object" &&
          e !== null &&
          typeof (e as HistoryEntry).id === "string" &&
          typeof (e as HistoryEntry).text === "string" &&
          typeof (e as HistoryEntry).timestamp === "number",
      )
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

function persist(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // storage full / unavailable — keep in-memory only
  }
}

/** Prepend entry, cap at 50, persist. Returns the new list. */
export function addEntry(
  entries: HistoryEntry[],
  entry: HistoryEntry,
): HistoryEntry[] {
  const next = [entry, ...entries].slice(0, MAX_ENTRIES);
  persist(next);
  return next;
}

export function removeEntry(
  entries: HistoryEntry[],
  id: string,
): HistoryEntry[] {
  const next = entries.filter((e) => e.id !== id);
  persist(next);
  return next;
}

export function clearHistory(): [] {
  persist([]);
  return [];
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
