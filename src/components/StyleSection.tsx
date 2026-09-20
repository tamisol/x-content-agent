"use client";

interface Props {
  value: string;
  savedCount: number;
  onChange: (v: string) => void;
  onSave: () => void;
  onClear: () => void;
}

export default function StyleSection(p: Props) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-100">My Style</h2>
        {p.savedCount > 0 && (
          <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-[11px] font-medium text-emerald-300">
            {p.savedCount} sample{p.savedCount > 1 ? "s" : ""} saved
          </span>
        )}
      </div>
      <p className="mb-4 text-[13px] leading-relaxed text-zinc-500">
        Paste 3–5 of your best 𝕏 posts below. Future generations will match
        your voice, slang and formatting.
      </p>

      <textarea
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        placeholder={`Paste one post per line, e.g.\ngm. bitcoin doesn't care about your feelings.\njust bought more ETH. no notes.\nthreads are dead. post like you talk.`}
        rows={5}
        className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-3 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-700 outline-none transition focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
      />

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={p.onSave}
          className="min-h-[42px] flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-[13px] font-semibold text-zinc-100 transition hover:bg-zinc-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
        >
          Save style
        </button>
        {p.savedCount > 0 && (
          <button
            type="button"
            onClick={p.onClear}
            className="min-h-[42px] rounded-lg border border-zinc-800 px-4 py-2.5 text-[13px] font-medium text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500"
          >
            Clear
          </button>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
        Stored only in your browser. Sent with every generation so outputs
        sound like you.
      </p>
    </section>
  );
}
