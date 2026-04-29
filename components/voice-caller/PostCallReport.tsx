"use client";

import { useQuery } from "convex/react";
import { Check, CheckCircle2, Loader2, X, XCircle } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CallLog, QualSignals } from "@/types/voiceCaller";
import type { Id } from "@/convex/_generated/dataModel";

type Props = {
  callLogId: string;
  onClose: () => void;
};

const AUTOMATIONS = [
  { key: "convex", label: "Convex log" },
  { key: "slack", label: "Slack alert" },
  { key: "manychat", label: "Manychat DM" },
  { key: "resend", label: "Email (Resend)" },
  { key: "ghl", label: "GHL pipeline" },
] as const;

function ScoreRing({ score }: { score: number }) {
  const pct = (score / 4) * 100;
  const colored =
    score >= 4 ? "hsl(142 70% 45%)" : score >= 2 ? "hsl(42 90% 55%)" : "hsl(0 70% 55%)";
  return (
    <div
      className="relative flex h-28 w-28 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(${colored} ${pct}%, hsl(var(--muted)) ${pct}%)`,
      }}
    >
      <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-background">
        <div className="text-3xl font-semibold">{score}</div>
        <div className="text-xs text-muted-foreground">/ 4 signals</div>
      </div>
    </div>
  );
}

function SignalCard({ label, on }: { label: string; on: boolean }) {
  return (
    <div
      className={`rounded-md border p-3 ${
        on
          ? "border-emerald-500/50 bg-emerald-500/10"
          : "border-border/60 bg-muted/20 text-muted-foreground"
      }`}
    >
      <div className="flex items-center gap-2">
        {on ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <XCircle className="h-4 w-4" />
        )}
        <div className="text-sm font-medium">{label}</div>
      </div>
    </div>
  );
}

export function PostCallReport({ callLogId, onClose }: Props) {
  const log = useQuery(api.voiceCaller.getCallLog, {
    callLogId: callLogId as Id<"callLogs">,
  }) as CallLog | null | undefined;

  if (log === undefined) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading report…
        </CardContent>
      </Card>
    );
  }

  if (log === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Report not found</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const signalEntries: Array<{ key: keyof QualSignals; label: string }> = [
    { key: "problem", label: "Pain confirmed" },
    { key: "budget", label: "Budget $300+/mo" },
    { key: "decision", label: "Decision maker" },
    { key: "booked", label: "Meeting booked" },
  ];

  const qualified = log.outcome === "qualified";

  return (
    <Card className={qualified ? "border-emerald-500/40" : ""}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            Call report — {log.leadName}
            <Badge
              variant={qualified ? "default" : "secondary"}
              className={qualified ? "bg-emerald-500 hover:bg-emerald-500" : ""}
            >
              {log.outcome}
            </Badge>
          </CardTitle>
          <CardDescription>
            {log.leadPhone} · {log.duration || "—"} ·{" "}
            {new Date(log.createdAt).toLocaleString()}
          </CardDescription>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-6">
          <ScoreRing score={log.qualScore} />
          <div className="max-w-xl text-sm text-muted-foreground">
            {log.summary || "No AI summary available."}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {signalEntries.map((s) => (
            <SignalCard key={s.key} label={s.label} on={log.signals[s.key]} />
          ))}
        </div>

        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            Automations
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
            {AUTOMATIONS.map((a) => {
              const fired = qualified; // best-effort — real status lives in logs
              const forceFired = a.key === "convex";
              const on = forceFired || fired;
              return (
                <div
                  key={a.key}
                  className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm ${
                    on
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-border/60 text-muted-foreground"
                  }`}
                >
                  <Check className={`h-4 w-4 ${on ? "text-emerald-500" : "opacity-40"}`} />
                  {a.label}
                </div>
              );
            })}
          </div>
        </div>

        <details className="rounded-md border border-border/60 bg-muted/20">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
            Full transcript ({log.transcript.length} turns)
          </summary>
          <div className="space-y-2 p-3">
            {log.transcript.map((line, idx) => (
              <div
                key={`${line.ts}-${idx}`}
                className={`rounded-md px-2 py-1.5 text-sm ${
                  line.role === "agent"
                    ? "bg-background"
                    : "bg-emerald-500/10"
                }`}
              >
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {line.role === "agent" ? "Jordan" : log.leadName}
                  {line.signal ? ` · ${line.signal}` : ""}
                </div>
                <div>{line.text}</div>
              </div>
            ))}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
