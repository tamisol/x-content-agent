"use client";

import type { ResearchOpportunity, ResearchResult } from "@/lib/types";

interface Props {
  input: string;
  loading: boolean;
  error: string | null;
  result: ResearchResult | null;
  source: "text" | "url" | null;
  selectedTitle: string | null;
  onInput: (v: string) => void;
  onAnalyze: () => void;
  onSelect: (op: ResearchOpportunity) => void;
  onGenerate: () => void;
  onClear: () => void;
}

const MAX_INPUT = 12_000;

export default function ResearchSection(p: Props) {
  const trimmed = p.input.trim();
  const looksLikeUrl = /^https?:\/\/\S+$/i.test(trimmed);
  const canSubmit = trimmed.length > 0 && !p.loading;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-100">Research Mode</h2>
        {p.result && p.source && (
          <span className="rounded-md bg-zinc-800/80 px-2 py-1 text-[11px] font-medium text-zinc-400">
            researched from {p.source === "url" ? "URL" : "pasted text"}
          </span>
        )}
      </div>
      <p className="mb-4 text-[13px] leading-relaxed text-zinc-500">
        Paste an article, announcement, or project info — the local AI pulls
        out the useful bits. If a URL can&apos;t be read, you&apos;ll be asked
        to paste the text instead.
      </p>

      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <label
          htmlFor="research-input"
          className="text-xs font-medium uppercase tracking-wider text-zinc-500"
        >
          Article text or URL{" "}
          {trimmed.length > 0 && (
            <span className="ml-1 rounded-md bg-zinc-800/80 px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-zinc-400">
              {looksLikeUrl ? "URL detected" : "text"}
            </span>
          )}
        </label>
        <span className="text-[11px] text-zinc-600">
          {p.input.length}/{MAX_INPUT}
        </span>
      </div>
      <textarea
        id="research-input"
        value={p.input}
        onChange={(e) => p.onInput(e.target.value.slice(0, MAX_INPUT))}
        placeholder={"Paste article/announcement text here, or drop in a URL like https://…"}
        rows={5}
        className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-700 outline-none transition focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
      />

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={p.onAnalyze}
          disabled={!canSubmit}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          {p.loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-950" />
              Analyzing…
            </>
          ) : (
            <>Analyze →</>
          )}
        </button>
        {p.result && (
          <button
            type="button"
            onClick={p.onClear}
            className="rounded-lg border border-zinc-800 px-4 py-2.5 text-[13px] font-medium text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300"
          >
            Clear
          </button>
        )}
      </div>

      {p.error && <p className="mt-3 text-sm text-red-400">{p.error}</p>}

      {p.loading && (
        <div className="mt-4 space-y-3" aria-label="Loading">
          <div className="h-4 w-28 animate-pulse rounded bg-zinc-800" />
          <div className="h-3 w-full animate-pulse rounded bg-zinc-800" />
          <div className="h-3 w-11/12 animate-pulse rounded bg-zinc-800" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-800" />
        </div>
      )}

      {!p.loading && p.result && (
        <div className="mt-5 space-y-5">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Key points
            </h3>
            <ul className="space-y-1.5">
              {p.result.keyPoints.map((point, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm leading-relaxed text-zinc-200"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {p.result.importantDetails.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Important details
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {p.result.importantDetails.map((detail, i) => (
                  <span
                    key={i}
                    className="min-w-0 break-words rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs leading-relaxed text-zinc-300"
                  >
                    {detail}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Content opportunities — pick one
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {p.result.opportunities.map((op) => {
                const selected = p.selectedTitle === op.title;
                return (
                  <div
                    key={op.title}
                    role="button"
                    tabIndex={0}
                    onClick={() => p.onSelect(op)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        p.onSelect(op);
                      }
                    }}
                    className={`cursor-pointer rounded-xl border p-3.5 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 ${
                      selected
                        ? "border-zinc-100 bg-zinc-900 ring-1 ring-zinc-100"
                        : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 flex-1 text-sm font-semibold text-zinc-100">
                        {op.title}
                      </p>
                      {selected && (
                        <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-950">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
                      {op.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={p.onGenerate}
            disabled={!p.selectedTitle}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            Generate Post →
          </button>
          {!p.selectedTitle && (
            <p className="text-center text-xs text-zinc-600">
              Select a content opportunity above to generate.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
