"use client";

import type { Angle } from "@/lib/types";

interface Props {
  topic: string;
  loading: boolean;
  error: string | null;
  angles: Angle[];
  mocked: boolean;
  selectedName: string | null;
  onTopic: (v: string) => void;
  onFind: () => void;
  onSelect: (angle: Angle) => void;
  onApply: (angle: Angle) => void;
}

export default function AnglesSection(p: Props) {
  const canSubmit = p.topic.trim().length > 0 && !p.loading;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-100">Content Angles</h2>
      </div>
      <p className="mb-4 text-[13px] leading-relaxed text-zinc-500">
        Drop in a rough idea and get 5–6 different ways to post about it. Pick
        one to steer the generator.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={p.topic}
          onChange={(e) => p.onTopic(e.target.value)}
          placeholder="e.g. I've been watching this Solana memecoin for 3 days…"
          maxLength={200}
          className="w-full flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
        />
        <button
          type="button"
          onClick={p.onFind}
          disabled={!canSubmit}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:w-auto sm:whitespace-nowrap"
        >
          {p.loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-950" />
              Finding…
            </>
          ) : (
            <>Find Angles</>
          )}
        </button>
      </div>

      {p.error && <p className="mt-3 text-sm text-red-400">{p.error}</p>}

      {p.loading && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
            >
              <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
              <div className="mt-3 h-3 w-full animate-pulse rounded bg-zinc-800" />
              <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      )}

      {!p.loading && p.angles.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {p.angles.map((angle) => {
            const selected = p.selectedName === angle.name;
            return (
              <div
                key={angle.name}
                role="button"
                tabIndex={0}
                onClick={() => p.onSelect(angle)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    p.onSelect(angle);
                  }
                }}
                className={`cursor-pointer rounded-xl border p-4 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 ${
                  selected
                    ? "border-zinc-100 bg-zinc-900 ring-1 ring-zinc-100"
                    : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"
                }`}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <p className="min-w-0 flex-1 text-sm font-semibold text-zinc-100">
                    {angle.name}
                  </p>
                  {selected && (
                    <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-950">
                      Selected
                    </span>
                  )}
                </div>
                <p className="text-[13px] leading-relaxed text-zinc-400">
                  {angle.explanation}
                </p>
                <p className="mt-2 break-words border-l-2 border-zinc-700 pl-2 text-[13px] italic leading-relaxed text-zinc-500">
                  &ldquo;{angle.hook}&rdquo;
                </p>
                {selected && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      p.onApply(angle);
                    }}
                    className="mt-3 min-h-[42px] w-full rounded-lg bg-zinc-100 px-3 py-2 text-[13px] font-semibold text-zinc-950 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                  >
                    Use This Angle →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
