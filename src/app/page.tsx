"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import GeneratorForm from "@/components/GeneratorForm";
import OutputCard from "@/components/OutputCard";
import StyleSection from "@/components/StyleSection";
import HistorySection from "@/components/HistorySection";
import AnglesSection from "@/components/AnglesSection";
import ResearchSection from "@/components/ResearchSection";
import type {
  Angle,
  AnglesResponse,
  ContentType,
  GenerateMode,
  GenerateResponse,
  ResearchOpportunity,
  ResearchResponse,
  ResearchResult,
  Tone,
} from "@/lib/types";
import {
  addEntry,
  clearHistory as clearStoredHistory,
  createEntry,
  loadHistory,
  removeEntry,
} from "@/lib/history";
import type { HistoryEntry } from "@/lib/history";

const STYLE_KEY = "x-agent-style";

function parseStyleSamples(raw: string): string[] {
  return raw
    .split(/\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 10);
}

export default function Home() {
  const [topic, setTopic] = useState("");
  const [contentType, setContentType] = useState<ContentType>("X Post");
  const [tone, setTone] = useState<Tone>("Natural");
  const [context, setContext] = useState("");
  const [styleText, setStyleText] = useState("");
  const [savedSamples, setSavedSamples] = useState<string[]>([]);

  const [output, setOutput] = useState("");
  const [mocked, setMocked] = useState(true);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const [anglesTopic, setAnglesTopic] = useState("");
  const [angles, setAngles] = useState<Angle[]>([]);
  const [anglesLoading, setAnglesLoading] = useState(false);
  const [anglesError, setAnglesError] = useState<string | null>(null);
  const [anglesMocked, setAnglesMocked] = useState(true);
  const [selectedAngle, setSelectedAngle] = useState<Angle | null>(null);

  const [researchInput, setResearchInput] = useState("");
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [researchSource, setResearchSource] = useState<"text" | "url" | null>(
    null,
  );
  const [selectedOpp, setSelectedOpp] = useState<ResearchOpportunity | null>(
    null,
  );
  const [researchFindings, setResearchFindings] = useState<string | null>(null);

  // In-flight guards: state updates lag, so refs prevent duplicate requests
  // from rapid double-clicks while a request is already running.
  const generateBusy = useRef(false);
  const anglesBusy = useRef(false);
  const researchBusy = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STYLE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        if (Array.isArray(parsed)) {
          setSavedSamples(parsed.filter((s) => typeof s === "string"));
          setStyleText(parsed.join("\n"));
        }
      }
    } catch {
      // ignore corrupt storage
    }
  }, []);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const callGenerate = useCallback(
    async (mode: GenerateMode, previousOutput?: string) => {
      if (generateBusy.current) return;
      generateBusy.current = true;
      const isRegenerate = mode === "generate" && previousOutput !== undefined;
      if (mode === "generate" && !isRegenerate) setLoading(true);
      else setActionLoading(mode === "generate" ? "regenerate" : mode);

      setError(null);
      setCopied(false);

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic,
            contentType,
            tone,
            context,
            styleSamples: savedSamples,
            mode,
            previousOutput: previousOutput ?? output,
            angle: selectedAngle
              ? `${selectedAngle.name} — ${selectedAngle.explanation} (example direction, don't copy verbatim: "${selectedAngle.hook}")`
              : undefined,
            research: researchFindings ?? undefined,
          }),
        });

        const data = (await res.json()) as GenerateResponse & { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Generation failed.");

        setOutput(data.output);
        setMocked(data.mocked);
        setHistory((prev) =>
          addEntry(
            prev,
            createEntry({
              text: data.output,
              contentType: data.contentType,
              tone: data.tone,
              topic,
              context,
            }),
          ),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        generateBusy.current = false;
        setLoading(false);
        setActionLoading(null);
      }
    },
    [topic, contentType, tone, context, savedSamples, selectedAngle, researchFindings, output],
  );

  const handleCopy = useCallback(async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy — select the text manually.");
    }
  }, [output]);

  const handleSaveStyle = useCallback(() => {
    const samples = parseStyleSamples(styleText);
    setSavedSamples(samples);
    try {
      localStorage.setItem(STYLE_KEY, JSON.stringify(samples));
    } catch {
      // storage full / unavailable — still keep in memory
    }
  }, [styleText]);

  const handleClearStyle = useCallback(() => {
    setSavedSamples([]);
    setStyleText("");
    try {
      localStorage.removeItem(STYLE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const handleUseAgain = useCallback((entry: HistoryEntry) => {
    setTopic(entry.topic);
    setContentType(entry.contentType);
    setTone(entry.tone);
    setContext(entry.context);
    setError(null);
    setCopied(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleDeleteEntry = useCallback((id: string) => {
    setHistory((prev) => removeEntry(prev, id));
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory(clearStoredHistory());
  }, []);

  const handleFindAngles = useCallback(async () => {
    if (anglesTopic.trim().length === 0 || anglesBusy.current) return;
    anglesBusy.current = true;
    setAnglesLoading(true);
    setAnglesError(null);
    try {
      const res = await fetch("/api/angles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: anglesTopic }),
      });
      const data = (await res.json()) as AnglesResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not find angles.");
      setAngles(data.angles);
      setAnglesMocked(data.mocked);
      setSelectedAngle(null);
    } catch (e) {
      setAnglesError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      anglesBusy.current = false;
      setAnglesLoading(false);
    }
  }, [anglesTopic]);

  const handleSelectAngle = useCallback((angle: Angle) => {
    setSelectedAngle((cur) => (cur?.name === angle.name ? null : angle));
  }, []);

  const handleApplyAngle = useCallback(
    (angle: Angle) => {
      setSelectedAngle(angle);
      setTopic(anglesTopic);
      setError(null);
      setCopied(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [anglesTopic],
  );

  const handleClearAngle = useCallback(() => {
    setSelectedAngle(null);
  }, []);

  const handleAnalyzeResearch = useCallback(async () => {
    if (researchInput.trim().length === 0 || researchBusy.current) return;
    researchBusy.current = true;
    setResearchLoading(true);
    setResearchError(null);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: researchInput }),
      });
      const data = (await res.json()) as ResearchResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Research failed.");
      setResearch(data.research);
      setResearchSource(data.source);
      setSelectedOpp(null);
    } catch (e) {
      setResearchError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      researchBusy.current = false;
      setResearchLoading(false);
    }
  }, [researchInput]);

  const handleSelectOpp = useCallback((op: ResearchOpportunity) => {
    setSelectedOpp((cur) => (cur?.title === op.title ? null : op));
  }, []);

  const handleGenerateFromResearch = useCallback(() => {
    if (!research || !selectedOpp) return;
    const findings = [
      `Key points: ${research.keyPoints.join(" ")}`,
      research.importantDetails.length > 0
        ? `Details: ${research.importantDetails.join("; ")}`
        : null,
      `Chosen angle: ${selectedOpp.title} — ${selectedOpp.description}`,
    ]
      .filter((s): s is string => typeof s === "string")
      .join("\n");
    setResearchFindings(findings);
    setTopic(research.suggestedTopic);
    setSelectedAngle({
      name: selectedOpp.title,
      explanation: selectedOpp.description,
      hook: "",
    });
    setError(null);
    setCopied(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [research, selectedOpp]);

  const handleClearResearch = useCallback(() => {
    setResearch(null);
    setResearchSource(null);
    setSelectedOpp(null);
    setResearchFindings(null);
  }, []);

  return (
    <div className="flex min-h-full flex-col">
      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {/* Hero */}
        <div className="mb-8 max-w-2xl">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
            X Content Agent
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-zinc-400">
            Turn one idea into a post, reply, quote tweet or thread — in your
            voice. Built for Web3 builders, traders and memecoin philosophers.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["X Post", "Reply", "Quote Tweet", "Thread"].map((t) => (
              <span
                key={t}
                className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Dashboard grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[400px_1fr]">
          <div className="space-y-5">
            <GeneratorForm
              topic={topic}
              contentType={contentType}
              tone={tone}
              context={context}
              loading={loading}
              selectedAngleName={selectedAngle?.name ?? null}
              researchAttached={researchFindings !== null}
              onTopic={setTopic}
              onContentType={setContentType}
              onTone={setTone}
              onContext={setContext}
              onGenerate={() => callGenerate("generate")}
              onClearAngle={handleClearAngle}
              onClearResearch={handleClearResearch}
            />
            <StyleSection
              value={styleText}
              savedCount={savedSamples.length}
              onChange={setStyleText}
              onSave={handleSaveStyle}
              onClear={handleClearStyle}
            />
          </div>

          <OutputCard
            output={output}
            loading={loading}
            error={error}
            mocked={mocked}
            copied={copied}
            actionLoading={actionLoading}
            onCopy={handleCopy}
            onRegenerate={() => callGenerate("generate", output)}
            onShorter={() => callGenerate("shorter", output)}
            onNatural={() => callGenerate("natural", output)}
          />
        </div>

        {/* Content Angles */}
        <div className="mt-5">
          <AnglesSection
            topic={anglesTopic}
            loading={anglesLoading}
            error={anglesError}
            angles={angles}
            mocked={anglesMocked}
            selectedName={selectedAngle?.name ?? null}
            onTopic={setAnglesTopic}
            onFind={handleFindAngles}
            onSelect={handleSelectAngle}
            onApply={handleApplyAngle}
          />
        </div>

        {/* Research Mode */}
        <div className="mt-5">
          <ResearchSection
            input={researchInput}
            loading={researchLoading}
            error={researchError}
            result={research}
            source={researchSource}
            selectedTitle={selectedOpp?.title ?? null}
            onInput={setResearchInput}
            onAnalyze={handleAnalyzeResearch}
            onSelect={handleSelectOpp}
            onGenerate={handleGenerateFromResearch}
            onClear={handleClearResearch}
          />
        </div>

        {/* History */}
        <div className="mt-10">
          <HistorySection
            entries={history}
            onUseAgain={handleUseAgain}
            onDelete={handleDeleteEntry}
            onClear={handleClearHistory}
          />
        </div>

        {/* How it works */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              n: "01",
              t: "Describe the idea",
              d: "One topic + optional context is enough. Pick a format and tone.",
            },
            {
              n: "02",
              t: "Generate & refine",
              d: "Copy, regenerate, shorten, or make it sound more natural.",
            },
            {
              n: "03",
              t: "Teach it your style",
              d: "Save sample posts in My Style so outputs sound like you.",
            },
          ].map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
            >
              <p className="text-xs font-semibold text-zinc-600">{s.n}</p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">{s.t}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
                {s.d}
              </p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-zinc-800/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>X Content Agent — write like yourself, only faster.</p>
          <p>No account needed</p>
        </div>
      </footer>
    </div>
  );
}
