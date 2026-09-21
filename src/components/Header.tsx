export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-lg font-black text-zinc-950">
            𝕏
          </div>
          <div className="leading-tight">
            <p className="text-[15px] font-semibold tracking-tight text-zinc-50">
              X Content Agent
            </p>
            <p className="text-xs text-zinc-500">AI posts for crypto natives</p>
          </div>
        </div>
      </div>
    </header>
  );
}
