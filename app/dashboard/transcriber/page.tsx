"use client";

import { useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  FileText,
  Mail,
  Megaphone,
  Mic,
  RefreshCcw,
  Wand2,
} from "lucide-react";
import { useAction } from "convex/react";
import SideBar from "@/components/SideBar";
import { PlanGate } from "@/components/PlanGate";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  detectPlatform,
  getPlatformEmoji,
  getPlatformLabel,
  type Platform,
} from "@/lib/detectPlatform";
import { toast } from "sonner";

type Phase = "input" | "loading" | "result";

type StepState = "pending" | "active" | "done";

type ProgressStep = {
  key: "detect" | "extract" | "transcribe" | "done";
  label: string;
};

const STEPS: ProgressStep[] = [
  { key: "detect", label: "Detecting platform" },
  { key: "extract", label: "Extracting audio" },
  { key: "transcribe", label: "Transcribing with Whisper" },
  { key: "done", label: "Done" },
];

type RefineMode = {
  id: "script" | "hook" | "email" | "caption" | "thread";
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  emoji: string;
};

const REFINE_MODES: RefineMode[] = [
  {
    id: "script",
    label: "Clean Script",
    description: "Removes fillers, adds formatting",
    icon: FileText,
    emoji: "🎬",
  },
  {
    id: "hook",
    label: "Extract Hook",
    description: "Pulls best opening line",
    icon: Wand2,
    emoji: "🪝",
  },
  {
    id: "email",
    label: "Email",
    description: "Email / newsletter format",
    icon: Mail,
    emoji: "📧",
  },
  {
    id: "caption",
    label: "Caption",
    description: "IG / TikTok caption",
    icon: Megaphone,
    emoji: "📸",
  },
  {
    id: "thread",
    label: "X Thread",
    description: "Twitter thread format",
    icon: Megaphone,
    emoji: "🧵",
  },
];

function formatDuration(seconds?: number): string {
  if (!seconds || Number.isNaN(seconds)) return "—";
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8;" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

export default function TranscriberPage() {
  const transcribeUrlAction = useAction(api.actions.transcribe.transcribeUrl);
  const refineTranscriptAction = useAction(
    api.actions.refineTranscript.refineTranscript,
  );

  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<ProgressStep["key"]>("detect");

  const [transcript, setTranscript] = useState("");
  const [metadata, setMetadata] = useState<{
    duration?: number;
    language?: string | null;
    words?: number;
  }>({});

  const [selectedMode, setSelectedMode] = useState<RefineMode["id"] | null>(
    null,
  );
  const [refineLoading, setRefineLoading] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [refinedOutput, setRefinedOutput] = useState("");
  const [showModePicker, setShowModePicker] = useState(true);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const stepTimersRef = useRef<number[]>([]);

  const detectedPlatform: Platform = useMemo(
    () => detectPlatform(url.trim()),
    [url],
  );

  const wordCount = useMemo(() => {
    const t = transcript.trim();
    if (!t) return 0;
    return t.split(/\s+/).length;
  }, [transcript]);

  const copy = async (text: string, key: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success("Copied to clipboard");
      setTimeout(
        () => setCopiedKey((c) => (c === key ? null : c)),
        1500,
      );
    } catch {
      toast.error("Failed to copy");
    }
  };

  const clearStepTimers = () => {
    for (const t of stepTimersRef.current) {
      clearTimeout(t);
    }
    stepTimersRef.current = [];
  };

  const runTranscription = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setError(null);
    setTranscript("");
    setMetadata({});
    setRefinedOutput("");
    setSelectedMode(null);
    setShowModePicker(true);
    setPhase("loading");
    setActiveStep("detect");

    clearStepTimers();
    stepTimersRef.current.push(
      window.setTimeout(() => setActiveStep("extract"), 700),
      window.setTimeout(() => setActiveStep("transcribe"), 2200),
    );

    try {
      const result = await transcribeUrlAction({
        url: trimmed,
        platform: detectedPlatform,
      });

      clearStepTimers();
      setActiveStep("done");

      setTranscript(result.transcript ?? "");
      setMetadata({
        duration: result.duration ?? undefined,
        language: result.language ?? null,
        words: Array.isArray(result.words) ? result.words.length : undefined,
      });

      window.setTimeout(() => setPhase("result"), 450);
    } catch (err) {
      clearStepTimers();
      setError(err instanceof Error ? err.message : "Transcription failed");
      setPhase("input");
    }
  };

  const runRefine = async (mode: RefineMode["id"]) => {
    if (!transcript.trim()) return;
    setRefineError(null);
    setSelectedMode(mode);
    setRefineLoading(true);
    setShowModePicker(false);
    try {
      const output = await refineTranscriptAction({
        transcript,
        mode,
      });
      setRefinedOutput(typeof output === "string" ? output : "");
    } catch (err) {
      setRefineError(err instanceof Error ? err.message : "Refinement failed");
    } finally {
      setRefineLoading(false);
    }
  };

  const resetAll = () => {
    clearStepTimers();
    setUrl("");
    setPhase("input");
    setError(null);
    setActiveStep("detect");
    setTranscript("");
    setMetadata({});
    setSelectedMode(null);
    setRefinedOutput("");
    setRefineError(null);
    setShowModePicker(true);
  };

  const showInputForm = phase === "input";
  const showLoading = phase === "loading";
  const showResult = phase === "result";

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-5xl p-6 md:p-8 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <Mic className="h-7 w-7 text-amber-400" />
              Transcriber
            </h1>
            <p className="text-muted-foreground">
              Paste any link. Get the transcript.
            </p>
          </div>
          {showResult ? (
            <Button
              variant="outline"
              size="sm"
              onClick={resetAll}
              className="gap-2"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              New transcription
            </Button>
          ) : null}
        </div>

        <PlanGate requiredPlan="starter">
          {showInputForm ? (
            <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
              <CardHeader>
                <CardTitle>Paste a link</CardTitle>
                <CardDescription>
                  YouTube, Instagram Reels, TikTok, X, Loom, Spotify podcasts, or any
                  direct MP3/MP4 URL.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">Source URL</Label>
                  <Input
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... or https://instagram.com/reel/..."
                    className="h-11 text-base"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void runTranscription();
                      }
                    }}
                  />
                </div>

                {url.trim() ? (
                  <div
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      detectedPlatform === "unknown"
                        ? "border-red-500/30 bg-red-500/10 text-red-300"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    <span className="text-sm leading-none">
                      {getPlatformEmoji(detectedPlatform)}
                    </span>
                    {detectedPlatform === "unknown" ? (
                      <span>
                        Unrecognized platform — will attempt direct transcription
                      </span>
                    ) : (
                      <span>{getPlatformLabel(detectedPlatform)} detected</span>
                    )}
                  </div>
                ) : null}

                {error ? (
                  <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                    {error}
                  </p>
                ) : null}

                <Button
                  onClick={() => void runTranscription()}
                  disabled={!url.trim()}
                  className="bg-amber-500 text-black hover:bg-amber-400 disabled:bg-amber-500/30 disabled:text-black/50"
                >
                  Transcribe
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {showLoading ? (
            <Card className="animate-in fade-in-0 duration-300">
              <CardHeader>
                <CardTitle>Transcribing…</CardTitle>
                <CardDescription>Usually 30–90 seconds.</CardDescription>
              </CardHeader>
              <CardContent>
                <ProgressStepper activeStep={activeStep} />
              </CardContent>
            </Card>
          ) : null}

          {showResult ? (
            <div className="space-y-5 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
              <Card>
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-lg">Transcript</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => void copy(transcript, "transcript")}
                      >
                        {copiedKey === "transcript" ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() =>
                          downloadText(transcript, "transcript.txt")
                        }
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {metadata.language ? (
                      <MetadataPill icon="🌐" label={metadata.language.toUpperCase()} />
                    ) : null}
                    <MetadataPill
                      icon="⏱"
                      label={formatDuration(metadata.duration)}
                    />
                    <MetadataPill icon="✎" label={`${wordCount} words`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    className="min-h-[320px] resize-y whitespace-pre-wrap font-mono text-sm leading-7"
                    spellCheck={false}
                  />
                </CardContent>
              </Card>

              {showModePicker || !selectedMode ? (
                <Card className="bg-card/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Wand2 className="h-4 w-4 text-amber-400" />
                      Refine with AI
                    </CardTitle>
                    <CardDescription>
                      Pick a format and Claude will reshape the transcript for you.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                      {REFINE_MODES.map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => void runRefine(mode.id)}
                          disabled={refineLoading}
                          className={`group flex h-full flex-col items-start gap-1 rounded-[12px] border bg-background/60 p-3 text-left transition-colors hover:border-amber-500/50 hover:bg-amber-500/5 disabled:cursor-not-allowed disabled:opacity-60 ${
                            selectedMode === mode.id
                              ? "border-amber-500/60 bg-amber-500/10"
                              : "border-white/10"
                          }`}
                        >
                          <span className="text-lg leading-none">{mode.emoji}</span>
                          <span className="text-sm font-semibold text-foreground">
                            {mode.label}
                          </span>
                          <span className="text-[11px] leading-snug text-muted-foreground">
                            {mode.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {selectedMode && (refineLoading || refinedOutput || refineError) ? (
                <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-400">
                  <CardHeader className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl leading-none">
                          {
                            REFINE_MODES.find((m) => m.id === selectedMode)
                              ?.emoji
                          }
                        </span>
                        <div>
                          <CardTitle className="text-base">
                            {
                              REFINE_MODES.find((m) => m.id === selectedMode)
                                ?.label
                            }
                          </CardTitle>
                          <CardDescription>
                            {
                              REFINE_MODES.find((m) => m.id === selectedMode)
                                ?.description
                            }
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() => void runRefine(selectedMode)}
                          disabled={refineLoading}
                        >
                          <RefreshCcw className="h-3.5 w-3.5" />
                          Regenerate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() => {
                            setShowModePicker(true);
                            setRefinedOutput("");
                            setSelectedMode(null);
                          }}
                          disabled={refineLoading}
                        >
                          Try another format
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() => void copy(refinedOutput, "refined")}
                          disabled={!refinedOutput || refineLoading}
                        >
                          {copiedKey === "refined" ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              Copy
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5"
                          onClick={() =>
                            downloadText(
                              refinedOutput,
                              `${selectedMode}-output.txt`,
                            )
                          }
                          disabled={!refinedOutput || refineLoading}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {refineLoading ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="flex gap-1">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400 [animation-delay:-0.3s]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400 [animation-delay:-0.15s]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-400" />
                          </span>
                          Claude is reshaping your transcript…
                        </div>
                        <div className="h-40 w-full animate-pulse rounded-md border border-white/5 bg-white/[0.03]" />
                      </div>
                    ) : refineError ? (
                      <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                        {refineError}
                      </p>
                    ) : (
                      <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-md border border-white/10 bg-background/60 p-4 font-sans text-sm leading-7 text-foreground/95">
                        {refinedOutput}
                      </pre>
                    )}
                  </CardContent>
                </Card>
              ) : null}
            </div>
          ) : null}
        </PlanGate>
      </div>
    </SideBar>
  );
}

function MetadataPill({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-foreground/90">
      <span className="text-sm leading-none">{icon}</span>
      {label}
    </span>
  );
}

function ProgressStepper({
  activeStep,
}: {
  activeStep: ProgressStep["key"];
}) {
  const activeIdx = STEPS.findIndex((s) => s.key === activeStep);

  return (
    <ol className="space-y-3">
      {STEPS.map((step, idx) => {
        let state: StepState = "pending";
        if (idx < activeIdx) state = "done";
        else if (idx === activeIdx) state = "active";
        return (
          <li
            key={step.key}
            className="flex items-center gap-3 rounded-md border border-white/5 bg-white/[0.02] p-3"
          >
            <StepIcon state={state} />
            <span
              className={`text-sm ${
                state === "active"
                  ? "text-amber-300"
                  : state === "done"
                    ? "text-foreground/90"
                    : "text-muted-foreground"
              }`}
            >
              {step.label}
              {state === "active" ? "…" : ""}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function StepIcon({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-green-500/40 bg-green-500/15 text-green-400">
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/15">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-300/70 border-t-transparent" />
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
    </span>
  );
}
