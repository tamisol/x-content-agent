"use client";

import { CONTENT_TYPES, TONES } from "@/lib/types";
import type { ContentType, Tone } from "@/lib/types";

interface Props {
  topic: string;
  contentType: ContentType;
  tone: Tone;
  context: string;
  loading: boolean;
  selectedAngleName: string | null;
  researchAttached: boolean;
  onTopic: (v: string) => void;
  onContentType: (v: ContentType) => void;
  onTone: (v: Tone) => void;
  onContext: (v: string) => void;
  onGenerate: () => void;
  onClearAngle: () => void;
  onClearResearch: () => void;
}

const inputCls =
  "min-h-[44px] w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500";

const labelCls =
  "mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500";

export default function GeneratorForm(p: Props) {
  const canSubmit = p.topic.trim().length > 0 && !p.loading;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-2">
        <h2 className="shrink-0 text-sm font-semibold text-zinc-100">
          Create content
        </h2>
        <span className="min-w-0 truncate rounded-md bg-zinc-800/80 px-2 py-1 text-[11px] font-medium text-zinc-400">
          {p.contentType} · {p.tone}
        </span>
      </div>

      {p.selectedAngleName && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">
          <p className="min-w-0 flex-1 truncate text-xs text-zinc-300">
            Using angle:{" "}
            <span className="font-semibold text-zinc-100">
              {p.selectedAngleName}
            </span>
          </p>
          <button
            type="button"
            onClick={p.onClearAngle}
            className="shrink-0 rounded px-2 py-1 text-xs font-medium text-zinc-500 transition hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
          >
            Clear
          </button>
        </div>
      )}

      {p.researchAttached && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">
          <p className="min-w-0 flex-1 truncate text-xs font-medium text-emerald-300">
            Research attached ✓
          </p>
          <button
            type="button"
            onClick={p.onClearResearch}
            className="shrink-0 rounded px-2 py-1 text-xs font-medium text-zinc-500 transition hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
          >
            Clear
          </button>
        </div>
      )}

      {!p.selectedAngleName && !p.researchAttached && (
        <div className="mb-4" />
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="topic" className={labelCls}>
            Topic
          </label>
          <input
            id="topic"
            type="text"
            value={p.topic}
            onChange={(e) => p.onTopic(e.target.value)}
            placeholder="e.g. Ethereum L2s, Solana memecoins, airdrop farming…"
            maxLength={200}
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor="contentType" className={labelCls}>
              Content type
            </label>
            <div className="relative">
              <select
                id="contentType"
                value={p.contentType}
                onChange={(e) => p.onContentType(e.target.value as ContentType)}
                className={`${inputCls} cursor-pointer appearance-none pr-9`}
              >
                {CONTENT_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-zinc-900">
                    {t}
                  </option>
                ))}
              </select>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500"
              >
                ▾
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <label htmlFor="tone" className={labelCls}>
              Tone
            </label>
            <div className="relative">
              <select
                id="tone"
                value={p.tone}
                onChange={(e) => p.onTone(e.target.value as Tone)}
                className={`${inputCls} cursor-pointer appearance-none pr-9`}
              >
                {TONES.map((t) => (
                  <option key={t} value={t} className="bg-zinc-900">
                    {t}
                  </option>
                ))}
              </select>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500"
              >
                ▾
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <label htmlFor="context" className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Extra context <span className="normal-case tracking-normal text-zinc-600">(optional)</span>
            </label>
            <span className="text-[11px] text-zinc-600">{p.context.length}/2000</span>
          </div>
          <textarea
            id="context"
            value={p.context}
            onChange={(e) => p.onContext(e.target.value.slice(0, 2000))}
            placeholder="Link, hot take, data point, or anything the post should reference…"
            rows={3}
            className={`${inputCls} resize-y leading-relaxed`}
          />
        </div>

        <button
          type="button"
          onClick={p.onGenerate}
          disabled={!canSubmit}
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          {p.loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-950" />
              Generating…
            </>
          ) : (
            <>Generate →</>
          )}
        </button>

        {!canSubmit && !p.loading && (
          <p className="text-center text-xs text-zinc-600">
            Enter a topic to generate.
          </p>
        )}
      </div>
    </section>
  );
}
