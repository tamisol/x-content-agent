"use client";

import { useState } from "react";
import { timeAgo } from "@/lib/history";
import type { HistoryEntry } from "@/lib/history";

interface Props {
  entries: HistoryEntry[];
  onUseAgain: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

export default function HistorySection(p: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleCopy(entry: HistoryEntry) {
    try {
      await navigator.clipboard.writeText(entry.text);
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId((cur) => (cur === entry.id ? null : cur)), 2000);
    } catch {
      // clipboard unavailable — user can select manually
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-100">History</h2>
        {p.entries.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-zinc-800/80 px-2 py-1 text-[11px] font-medium text-zinc-400">
              {p.entries.length} saved
            </span>
            <button
              type="button"
              onClick={p.onClear}
              className="rounded-md border border-zinc-800 px-2 py-1 text-[11px] font-medium text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300"
            >
              Clear history
            </button>
          </div>
        )}
      </div>
      <p className="mb-4 text-[13px] leading-relaxed text-zinc-500">
        Your recent generations, stored locally in this browser.
      </p>

      {p.entries.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-8 text-center">
          <p className="text-sm font-medium text-zinc-400">No history yet</p>
          <p className="max-w-[260px] text-[13px] leading-relaxed text-zinc-600">
            Generate your first post above and it will show up here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {p.entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
            >
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                  {entry.contentType}
                </span>
                <span className="rounded-md bg-zinc-800/80 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                  {entry.tone}
                </span>
                <span className="ml-auto text-[11px] text-zinc-600">
                  {timeAgo(entry.timestamp)}
                </span>
              </div>

              {entry.topic && (
                <p className="mb-1 truncate text-xs text-zinc-500">
                  Topic: {entry.topic}
                </p>
              )}
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-100">
                {entry.text}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(entry)}
                  className="min-h-[36px] rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
                >
                  {copiedId === entry.id ? "✓ Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => p.onUseAgain(entry)}
                  className="min-h-[36px] rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
                >
                  Use Again
                </button>
                <button
                  type="button"
                  onClick={() => p.onDelete(entry.id)}
                  className="ml-auto min-h-[36px] rounded-lg border border-transparent px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-zinc-800 hover:text-red-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
