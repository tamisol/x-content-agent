"use client";

interface Props {
  output: string;
  loading: boolean;
  error: string | null;
  mocked: boolean;
  copied: boolean;
  actionLoading: string | null;
  onCopy: () => void;
  onRegenerate: () => void;
  onShorter: () => void;
  onNatural: () => void;
}

function charColor(len: number): string {
  if (len === 0) return "text-zinc-600";
  if (len <= 280) return "text-emerald-400";
  if (len <= 2000) return "text-amber-400";
  return "text-red-400";
}

export default function OutputCard(p: Props) {
  const len = p.output.length;
  const hasOutput = p.output.trim().length > 0;

  const btn = (active: boolean) =>
    `min-h-[38px] rounded-lg border px-3.5 py-2 text-[13px] font-medium transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500 ${
      active
        ? "border-zinc-700 bg-zinc-800 text-zinc-100"
        : "border-zinc-800 bg-transparent text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
    } disabled:cursor-not-allowed disabled:opacity-40`;

  return (
    <section className="flex min-h-[300px] flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:min-h-[420px] sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="text-sm font-semibold text-zinc-100">
          Generated content
        </h2>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {p.mocked && hasOutput && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-800/80 px-2 py-1 text-[11px] font-medium text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Offline preview
            </span>
          )}
          <span className={`text-xs font-medium tabular-nums ${charColor(len)}`}>
            {len} chars
          </span>
        </div>
      </div>

      {/* X-style preview */}
      <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        {p.loading ? (
          <div className="space-y-3 py-2" aria-label="Loading">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-800" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 animate-pulse rounded bg-zinc-800" />
                <div className="h-3 w-20 animate-pulse rounded bg-zinc-800/70" />
              </div>
            </div>
            <div className="h-3 w-full animate-pulse rounded bg-zinc-800" />
            <div className="h-3 w-11/12 animate-pulse rounded bg-zinc-800" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-800" />
          </div>
        ) : p.error ? (
          <p className="py-6 text-center text-sm text-red-400">{p.error}</p>
        ) : hasOutput ? (
          <div>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-zinc-300">
                you
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-zinc-100">
                  you.eth <span className="font-normal text-zinc-500">@you · now</span>
                </p>
              </div>
            </div>
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-zinc-100">
              {p.output}
            </p>
          </div>
        ) : (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 py-10 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-xl text-zinc-600">
              𝕏
            </div>
            <p className="text-sm font-medium text-zinc-400">
              Nothing generated yet
            </p>
            <p className="max-w-[260px] text-[13px] leading-relaxed text-zinc-600">
              Fill in a topic on the left and hit Generate to see your post previewed like a real 𝕏 post.
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">        <button
          type="button"
          onClick={p.onCopy}
          disabled={!hasOutput || p.loading}
          className={btn(false)}
        >
          {p.copied ? "✓ Copied" : "Copy"}
        </button>
        <button
          type="button"
          onClick={p.onRegenerate}
          disabled={!hasOutput || p.loading || p.actionLoading !== null}
          className={btn(false)}
        >
          {p.actionLoading === "regenerate" ? "Working…" : "Regenerate"}
        </button>
        <button
          type="button"
          onClick={p.onShorter}
          disabled={!hasOutput || p.loading || p.actionLoading !== null}
          className={btn(false)}
        >
          {p.actionLoading === "shorter" ? "Working…" : "Make shorter"}
        </button>
        <button
          type="button"
          onClick={p.onNatural}
          disabled={!hasOutput || p.loading || p.actionLoading !== null}
          className={btn(false)}
        >
          {p.actionLoading === "natural" ? "Working…" : "Make more natural"}
        </button>
      </div>
    </section>
  );
}
