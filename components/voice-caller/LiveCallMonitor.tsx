"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { QualSignals, ScriptStage, TranscriptLine } from "@/types/voiceCaller";

type LiveState = {
  callSid: string;
  campaignId: string;
  leadName: string;
  leadPhone: string;
  scriptStage: ScriptStage;
  signals: QualSignals;
  qualScore: number;
  transcript: TranscriptLine[];
  startedAt: number;
  finalized?: boolean;
};

type Props = {
  campaignId: string;
  leadName: string;
  leadPhone: string;
  onClose: () => void;
};

const STAGES: { id: ScriptStage; label: string }[] = [
  { id: "opener", label: "Opener" },
  { id: "pain", label: "Pain" },
  { id: "budget", label: "Budget" },
  { id: "authority", label: "Authority" },
  { id: "cta", label: "CTA" },
];

function formatDuration(startedAt: number): string {
  const secs = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ScoreRing({ score }: { score: number }) {
  const pct = (score / 4) * 100;
  return (
    <div
      className="relative flex h-24 w-24 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(hsl(142 70% 45%) ${pct}%, hsl(var(--muted)) ${pct}%)`,
      }}
    >
      <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-background">
        <div className="text-2xl font-semibold">{score}</div>
        <div className="text-xs text-muted-foreground">/ 4 signals</div>
      </div>
    </div>
  );
}

export function LiveCallMonitor({ campaignId, leadName, leadPhone, onClose }: Props) {
  const [state, setState] = useState<LiveState | null>(null);
  const [live, setLive] = useState(true);
  const [, forceRerender] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    async function poll() {
      try {
        const url = `/api/voice-caller/transcript?campaignId=${encodeURIComponent(campaignId)}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const json = (await res.json()) as {
          live: boolean;
          state: LiveState | null;
        };
        setLive(json.live);
        if (json.state) setState(json.state);
      } catch {
        /* swallow */
      }
    }
    void poll();
    intervalRef.current = window.setInterval(poll, 2000) as unknown as number;
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [campaignId]);

  // Tick once per second to update the timer.
  useEffect(() => {
    const id = window.setInterval(() => forceRerender((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const timer = useMemo(
    () => (state ? formatDuration(state.startedAt) : "0:00"),
    // Re-evaluate every render; dependency on state.startedAt alone is fine,
    // the ticker above triggers rerenders.
    [state],
  );

  const signalEntries: Array<{ key: keyof QualSignals; label: string }> = [
    { key: "problem", label: "Pain confirmed" },
    { key: "budget", label: "Budget $300+" },
    { key: "decision", label: "Decision maker" },
    { key: "booked", label: "Meeting booked" },
  ];

  return (
    <Card className="border-emerald-500/30">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className={`absolute inline-flex h-full w-full rounded-full ${live ? "animate-ping bg-emerald-400" : "bg-muted"} opacity-75`}></span>
              <span className={`relative inline-flex h-3 w-3 rounded-full ${live ? "bg-emerald-500" : "bg-muted"}`}></span>
            </span>
            {live ? "Live AI call" : "Call ended"} — {leadName}
          </CardTitle>
          <CardDescription>
            <Phone className="mr-1 inline h-3.5 w-3.5" /> {leadPhone} · {timer}
          </CardDescription>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-5 md:grid-cols-[auto,1fr]">
          <ScoreRing score={state?.qualScore ?? 0} />

          <div className="space-y-3">
            <div>
              <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                Script stage
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STAGES.map((stage) => {
                  const current = state?.scriptStage ?? "opener";
                  const currentIdx = STAGES.findIndex((s) => s.id === current);
                  const stageIdx = STAGES.findIndex((s) => s.id === stage.id);
                  const done = stageIdx < currentIdx;
                  const active = stage.id === current;
                  return (
                    <Badge
                      key={stage.id}
                      variant={active ? "default" : done ? "secondary" : "outline"}
                      className={active ? "bg-amber-500 hover:bg-amber-500" : ""}
                    >
                      {stage.label}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                Qualification signals
              </div>
              <div className="grid grid-cols-2 gap-2">
                {signalEntries.map(({ key, label }) => {
                  const on = state?.signals[key] ?? false;
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm ${
                        on
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600"
                          : "border-border/60 text-muted-foreground"
                      }`}
                    >
                      <Check className={`h-4 w-4 ${on ? "opacity-100" : "opacity-30"}`} />
                      {label}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Transcript
            </div>
          </div>
          <div className="max-h-64 space-y-2 overflow-auto rounded-md border border-border/60 bg-muted/20 p-3">
            {state?.transcript?.length ? (
              state.transcript.map((line, idx) => (
                <div
                  key={`${line.ts}-${idx}`}
                  className={`rounded-md px-2 py-1.5 text-sm ${
                    line.role === "agent"
                      ? "bg-background"
                      : "bg-emerald-500/10 text-foreground"
                  }`}
                >
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {line.role === "agent" ? "Jordan" : leadName}
                  </div>
                  <div>{line.text}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                Waiting for the lead to speak…
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
