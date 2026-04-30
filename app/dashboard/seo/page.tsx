"use client";

import { useMemo, useRef, useState } from "react";
import SideBar from "@/components/SideBar";
import { PlanGate } from "@/components/PlanGate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type KeywordRow = {
  keyword: string;
  searchIntent: "informational" | "navigational" | "transactional" | "commercial";
  estimatedDifficulty: number;
  contentIdea: string;
  priority: "high" | "medium" | "low";
};

type CompetitorResult = {
  strengthsOfCompetitor?: string[];
  weaknessesOfCompetitor?: string[];
  opportunitiesWeCanExploit?: string[];
  keywordGaps?: string[];
  contentGaps?: string[];
  backlinkStrategyRecommendations?: string[];
  overallCompetitiveThreatScore?: number;
};

type AiSearchOptimizeContentBlock = {
  question: string;
  directAnswer: string;
  expanded: string;
  bullets?: string[];
};

type AiSearchOptimizeQueryRow = {
  query: string;
  answer: string;
  contentBlock: AiSearchOptimizeContentBlock;
};

type AiSearchOptimizeResult = {
  queries: AiSearchOptimizeQueryRow[];
  authority: {
    credibility: string[];
    differentiators: string[];
    trustSignals: string[];
  };
  faqs: { question: string; answer: string }[];
  externalSignals: {
    websites: string[];
    platforms: string[];
    prStrategies: string[];
  };
  visibilityScore: {
    score: number;
    explanation: string;
  };
};

function normalizeCompetitorResult(raw: any): CompetitorResult {
  if (!raw || typeof raw !== "object") return {};
  return {
    strengthsOfCompetitor: raw.strengthsOfCompetitor ?? raw.strengths ?? [],
    weaknessesOfCompetitor: raw.weaknessesOfCompetitor ?? raw.weaknesses ?? [],
    opportunitiesWeCanExploit:
      raw.opportunitiesWeCanExploit ?? raw.opportunities ?? [],
    keywordGaps: raw.keywordGaps ?? raw.keyword_gaps ?? [],
    contentGaps: raw.contentGaps ?? raw.content_gaps ?? [],
    backlinkStrategyRecommendations:
      raw.backlinkStrategyRecommendations ?? raw.backlink_recommendations ?? [],
    overallCompetitiveThreatScore:
      raw.overallCompetitiveThreatScore ?? raw.threat_score ?? raw.score ?? 0,
  };
}

type JsonObject = Record<string, unknown>;

async function readSseText(res: Response, onToken: (token: string) => void): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("Streaming response not available");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let finalText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const event of events) {
      if (!event.startsWith("data: ")) continue;
      const payload = JSON.parse(event.slice(6)) as {
        type: "token" | "done" | "error";
        token?: string;
        text?: string;
        message?: string;
      };
      if (payload.type === "token" && payload.token) {
        onToken(payload.token);
      }
      if (payload.type === "done" && payload.text) {
        finalText = payload.text;
      }
      if (payload.type === "error") {
        throw new Error(payload.message || "SSE stream error");
      }
    }
  }

  return finalText;
}

function tryParseJson(value: string): JsonObject | null {
  try {
    const trimmed = value.trim();
    const withoutFence = trimmed
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
    const parsed = JSON.parse(withoutFence) as unknown;
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as JsonObject;
    }
    return null;
  } catch {
    return null;
  }
}

function normalizeAuditUrl(input: string) {
  const raw = input.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

type AuditSection = {
  present?: boolean;
  content?: string;
  length?: number;
  issues?: string[];
  recommendations?: string[];
  score?: number;
};

function snakeToTitleCase(key: string): string {
  return key
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getScoreStatus(score: number): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  if (score <= 0) {
    return {
      label: "Critical",
      color: "#ef4444",
      bg: "rgba(239, 68, 68, 0.12)",
      border: "rgba(239, 68, 68, 0.35)",
    };
  }
  if (score < 8) {
    return {
      label: "Needs Work",
      color: "#eab308",
      bg: "rgba(234, 179, 8, 0.12)",
      border: "rgba(234, 179, 8, 0.35)",
    };
  }
  return {
    label: "Good",
    color: "#22c55e",
    bg: "rgba(34, 197, 94, 0.12)",
    border: "rgba(34, 197, 94, 0.35)",
  };
}

function isAuditSection(value: unknown): value is AuditSection {
  return (
    typeof value === "object" &&
    value !== null &&
    ("score" in (value as Record<string, unknown>) ||
      "issues" in (value as Record<string, unknown>) ||
      "recommendations" in (value as Record<string, unknown>) ||
      "present" in (value as Record<string, unknown>))
  );
}

function computeOverallScore(result: JsonObject): number {
  const topLevel =
    result.overall_score ??
    result.seo_score ??
    result.overall_seo_score ??
    result.score;
  if (typeof topLevel === "number") return topLevel;

  const scores: number[] = [];
  for (const value of Object.values(result)) {
    if (
      typeof value === "object" &&
      value !== null &&
      "score" in (value as Record<string, unknown>) &&
      typeof (value as Record<string, unknown>).score === "number"
    ) {
      scores.push((value as { score: number }).score);
    }
  }
  if (scores.length === 0) return 0;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(avg * 10);
}

function getOverallColor(score: number): string {
  if (score < 40) return "#ef4444";
  if (score < 75) return "#eab308";
  return "#22c55e";
}

type Html2PdfInstance = {
  set: (opts: Record<string, unknown>) => Html2PdfInstance;
  from: (el: HTMLElement) => Html2PdfInstance;
  save: () => Promise<void>;
};

function loadHtml2Pdf(): Promise<() => Html2PdfInstance> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as { html2pdf?: () => Html2PdfInstance };
    if (w.html2pdf) {
      resolve(w.html2pdf);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-html2pdf="true"]',
    );
    if (existing) {
      existing.addEventListener("load", () => {
        if (w.html2pdf) resolve(w.html2pdf);
        else reject(new Error("html2pdf failed to initialize"));
      });
      existing.addEventListener("error", () => reject(new Error("html2pdf failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    script.async = true;
    script.dataset.html2pdf = "true";
    script.onload = () => {
      if (w.html2pdf) resolve(w.html2pdf);
      else reject(new Error("html2pdf failed to initialize"));
    };
    script.onerror = () => reject(new Error("html2pdf failed to load"));
    document.body.appendChild(script);
  });
}

function CircularScore({ score, color }: { score: number; color: string }) {
  const size = 132;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score));
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold tracking-tight" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          out of 100
        </span>
      </div>
    </div>
  );
}

function AuditSectionCard({
  sectionKey,
  section,
}: {
  sectionKey: string;
  section: AuditSection;
}) {
  const score = typeof section.score === "number" ? section.score : 0;
  const status = getScoreStatus(score);
  const title = snakeToTitleCase(sectionKey);
  const issues = Array.isArray(section.issues) ? section.issues : [];
  const recommendations = Array.isArray(section.recommendations)
    ? section.recommendations
    : [];
  const hasContent =
    typeof section.content === "string" && section.content.trim().length > 0;

  return (
    <div
      className="rounded-[12px] border bg-card/60 p-5 shadow-sm transition-colors hover:border-amber-500/30"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        backgroundColor: "rgba(255,255,255,0.02)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-tight">{title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{
                color: status.color,
                backgroundColor: status.bg,
                border: `1px solid ${status.border}`,
              }}
            >
              {status.label}
            </span>
            {typeof section.length === "number" ? (
              <span className="text-[11px] text-muted-foreground">
                {section.length} chars
              </span>
            ) : null}
            {section.present === false ? (
              <span className="text-[11px] text-muted-foreground">missing</span>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xl font-bold leading-none" style={{ color: status.color }}>
            {score}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            / 10
          </div>
        </div>
      </div>

      {hasContent ? (
        <div className="mt-3">
          <code className="inline-block max-w-full truncate rounded-md border border-white/5 bg-black/30 px-2 py-1 font-mono text-[11px] text-muted-foreground">
            {section.content}
          </code>
        </div>
      ) : null}

      {issues.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Issues
          </p>
          <ul className="space-y-1.5">
            {issues.map((issue, idx) => (
              <li
                key={`issue-${idx}`}
                className="flex gap-2 text-sm leading-snug text-foreground/90"
              >
                <span aria-hidden className="select-none">❌</span>
                <span className="min-w-0 break-words">{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {recommendations.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recommendations
          </p>
          <ul className="space-y-1.5">
            {recommendations.map((rec, idx) => (
              <li
                key={`rec-${idx}`}
                className="flex gap-2 text-sm leading-snug text-foreground/90"
              >
                <span aria-hidden className="select-none">💡</span>
                <span className="min-w-0 break-words">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {issues.length === 0 && recommendations.length === 0 && !hasContent ? (
        <p className="mt-4 text-sm text-muted-foreground">No additional details.</p>
      ) : null}
    </div>
  );
}

function AuditResultsDashboard({
  result,
  auditUrl,
}: {
  result: JsonObject;
  auditUrl: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [exporting, setExporting] = useState(false);

  const sectionEntries = Object.entries(result).filter(
    ([key, value]) =>
      isAuditSection(value) &&
      !["overall_score", "seo_score", "overall_seo_score", "score"].includes(
        key,
      ),
  ) as [string, AuditSection][];

  const overall = computeOverallScore(result);
  const overallColor = getOverallColor(overall);

  const handleExportJson = () => {
    try {
      const blob = new Blob([JSON.stringify(result, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const slug =
        auditUrl
          .replace(/^https?:\/\//i, "")
          .replace(/[^a-z0-9]+/gi, "-")
          .replace(/^-+|-+$/g, "")
          .toLowerCase() || "seo-audit";
      a.download = `${slug}-seo-audit.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export JSON", err);
    }
  };

  const handleExportPdf = async () => {
    if (!containerRef.current) return;
    setExporting(true);
    try {
      const html2pdf = await loadHtml2Pdf();
      const slug =
        auditUrl
          .replace(/^https?:\/\//i, "")
          .replace(/[^a-z0-9]+/gi, "-")
          .replace(/^-+|-+$/g, "")
          .toLowerCase() || "seo-audit";
      await html2pdf()
        .set({
          margin: 10,
          filename: `${slug}-seo-audit.pdf`,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: {
            scale: 2,
            backgroundColor: "#0a0a0a",
            useCORS: true,
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        })
        .from(containerRef.current)
        .save();
    } catch (err) {
      console.error("Failed to export PDF", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500 space-y-5"
    >
      <div
        className="rounded-[12px] border p-5 md:p-6"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          backgroundColor: "rgba(255,255,255,0.02)",
        }}
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <CircularScore score={overall} color={overallColor} />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-amber-400/90">
                Overall
              </p>
              <h2 className="text-2xl font-bold leading-tight">
                SEO Performance Score
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Averaged across {sectionEntries.length} audited{" "}
                {sectionEntries.length === 1 ? "section" : "sections"}
                {auditUrl ? (
                  <>
                    {" "}· <span className="text-foreground/80">{auditUrl}</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
          <div
            className="flex flex-wrap gap-2"
            data-html2canvas-ignore="true"
          >
            <Button
              onClick={handleExportJson}
              variant="outline"
              className="border-amber-500/30 bg-transparent text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
            >
              Export JSON
            </Button>
            <Button
              onClick={handleExportPdf}
              disabled={exporting}
              className="bg-amber-500 text-black hover:bg-amber-400"
            >
              {exporting ? "Exporting…" : "Export PDF"}
            </Button>
          </div>
        </div>

        <div className="mt-5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${overall}%`,
                backgroundColor: overallColor,
              }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>
      </div>

      {sectionEntries.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sectionEntries.map(([key, section]) => (
            <AuditSectionCard key={key} sectionKey={key} section={section} />
          ))}
        </div>
      ) : (
        <div
          className="rounded-[12px] border p-5 text-sm text-muted-foreground"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            backgroundColor: "rgba(255,255,255,0.02)",
          }}
        >
          The audit response did not contain any scored sections.
        </div>
      )}
    </div>
  );
}

export default function SeoHubPage() {
  const [auditUrl, setAuditUrl] = useState("");
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditRaw, setAuditRaw] = useState("");
  const [auditResult, setAuditResult] = useState<JsonObject | null>(null);

  const [topic, setTopic] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [keywordsError, setKeywordsError] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<KeywordRow[]>([]);
  const [sortField, setSortField] = useState<"keyword" | "estimatedDifficulty" | "priority">("estimatedDifficulty");

  const [competitorUrl, setCompetitorUrl] = useState("");
  const [ourUrl, setOurUrl] = useState("");
  const [competitorLoading, setCompetitorLoading] = useState(false);
  const [competitorError, setCompetitorError] = useState<string | null>(null);
  const [competitor, setCompetitor] = useState<CompetitorResult | null>(null);

  const [asoBusinessName, setAsoBusinessName] = useState("");
  const [asoIndustry, setAsoIndustry] = useState("");
  const [asoAudience, setAsoAudience] = useState("");
  const [asoLocation, setAsoLocation] = useState("");
  const [asoServices, setAsoServices] = useState("");
  const [asoLoading, setAsoLoading] = useState(false);
  const [asoError, setAsoError] = useState<string | null>(null);
  const [asoResult, setAsoResult] = useState<AiSearchOptimizeResult | null>(null);
  const [technicalUrl, setTechnicalUrl] = useState("");
  const [technicalLoading, setTechnicalLoading] = useState(false);
  const [technicalError, setTechnicalError] = useState<string | null>(null);
  const [technicalRaw, setTechnicalRaw] = useState("");
  const [technicalResult, setTechnicalResult] = useState<JsonObject | null>(null);

  const [backlinkUrl, setBacklinkUrl] = useState("");
  const [backlinkLoading, setBacklinkLoading] = useState(false);
  const [backlinkError, setBacklinkError] = useState<string | null>(null);
  const [backlinkRaw, setBacklinkRaw] = useState("");
  const [backlinkResult, setBacklinkResult] = useState<JsonObject | null>(null);

  const runAudit = async () => {
    setAuditLoading(true);
    setAuditError(null);
    setAuditRaw("");
    setAuditResult(null);
    try {
      const normalizedUrl = normalizeAuditUrl(auditUrl);
      if (!normalizedUrl) {
        throw new Error("Please enter a website URL");
      }

      const res = await fetch("/api/ai/seo-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "Failed to run SEO audit");
      }
      const finalText = await readSseText(res, (token) =>
        setAuditRaw((prev) => prev + token),
      );
      const finalOutput = finalText || "";
      setAuditRaw(finalOutput);
      setAuditResult(tryParseJson(finalOutput));
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setAuditLoading(false);
    }
  };

  const runKeywords = async () => {
    setKeywordsLoading(true);
    setKeywordsError(null);
    setKeywords([]);
    try {
      const res = await fetch("/api/ai/keyword-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, targetAudience }),
      });
      if (!res.ok) {
        throw new Error("Failed to generate keyword research");
      }
      const data = (await res.json()) as { keywords: KeywordRow[] };
      setKeywords(Array.isArray(data.keywords) ? data.keywords : []);
    } catch (error) {
      setKeywordsError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setKeywordsLoading(false);
    }
  };

  const runCompetitor = async () => {
    setCompetitorLoading(true);
    setCompetitorError(null);
    setCompetitor(null);
    try {
      const res = await fetch("/api/ai/competitor-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorUrl, ourUrl }),
      });
      if (!res.ok) {
        throw new Error("Failed to run competitor analysis");
      }
      const data = (await res.json()) as { analysis: any };
      setCompetitor(normalizeCompetitorResult(data.analysis));
    } catch (error) {
      setCompetitorError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setCompetitorLoading(false);
    }
  };

  const runAiSearchOptimize = async () => {
    setAsoLoading(true);
    setAsoError(null);
    setAsoResult(null);
    try {
      const body: {
        businessName: string;
        industry: string;
        audience: string;
        services: string;
        location?: string;
      } = {
        businessName: asoBusinessName.trim(),
        industry: asoIndustry.trim(),
        audience: asoAudience.trim(),
        services: asoServices.trim(),
      };
      const loc = asoLocation.trim();
      if (loc) body.location = loc;

      const res = await fetch("/api/ai-search-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = (await res.json().catch(() => null)) as
        | AiSearchOptimizeResult
        | { error?: string; details?: unknown }
        | null;

      if (!res.ok) {
        const msg =
          payload && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "Failed to run AI search optimization";
        throw new Error(msg);
      }

      if (!payload || !("queries" in payload)) {
        throw new Error("Invalid response from server");
      }

      setAsoResult(payload as AiSearchOptimizeResult);
    } catch (error) {
      setAsoError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setAsoLoading(false);
    }
  };

  const runTechnical = async () => {
    setTechnicalLoading(true);
    setTechnicalError(null);
    setTechnicalRaw("");
    setTechnicalResult(null);
    try {
      const normalizedUrl = normalizeAuditUrl(technicalUrl);
      const res = await fetch("/api/ai/technical-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      if (!res.ok) throw new Error("Failed to run technical SEO audit");
      const finalText = await readSseText(res, (token) =>
        setTechnicalRaw((prev) => prev + token),
      );
      setTechnicalResult(tryParseJson(finalText));
    } catch (err) {
      setTechnicalError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setTechnicalLoading(false);
    }
  };

  const runBacklinks = async () => {
    setBacklinkLoading(true);
    setBacklinkError(null);
    setBacklinkRaw("");
    setBacklinkResult(null);
    try {
      const normalizedUrl = normalizeAuditUrl(backlinkUrl);
      const res = await fetch("/api/ai/backlink-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      if (!res.ok) throw new Error("Failed to generate backlink strategy");
      const finalText = await readSseText(res, (token) =>
        setBacklinkRaw((prev) => prev + token),
      );
      setBacklinkResult(tryParseJson(finalText));
    } catch (err) {
      setBacklinkError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setBacklinkLoading(false);
    }
  };

  const sortedKeywords = useMemo(() => {
    const values = [...keywords];
    if (sortField === "keyword") {
      return values.sort((a, b) => a.keyword.localeCompare(b.keyword));
    }
    if (sortField === "estimatedDifficulty") {
      return values.sort((a, b) => a.estimatedDifficulty - b.estimatedDifficulty);
    }
    const priorityRank: Record<KeywordRow["priority"], number> = {
      high: 1,
      medium: 2,
      low: 3,
    };
    return values.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
  }, [keywords, sortField]);

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-7xl p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">SEO Hub</h1>
          <p className="text-muted-foreground">Audit, keyword, technical, backlink, and competitor workflows.</p>
        </div>

        <Tabs defaultValue="audit" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="ai-search">AI search</TabsTrigger>
            <TabsTrigger value="technical">Technical</TabsTrigger>
            <TabsTrigger value="backlinks">Backlinks</TabsTrigger>
            <TabsTrigger value="competitor">Competitor</TabsTrigger>
          </TabsList>

          <TabsContent value="audit">
            <PlanGate requiredPlan="starter">
              <Card>
                <CardHeader>
                  <CardTitle>AI SEO Audit</CardTitle>
                  <CardDescription>
                    Paste a URL and stream a structured Claude SEO audit.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="auditUrl">Website URL</Label>
                    <Input id="auditUrl" value={auditUrl} onChange={(e) => setAuditUrl(e.target.value)} />
                  </div>
                  <Button onClick={runAudit} disabled={!auditUrl || auditLoading}>
                    Run Audit
                  </Button>
                  {auditLoading ? <Skeleton className="h-40 w-full" /> : null}
                  {auditError ? <p className="text-sm text-red-500">{auditError}</p> : null}
                  {!auditLoading && !auditError && !auditRaw ? (
                    <p className="text-sm text-muted-foreground">Empty state: no audit result yet.</p>
                  ) : null}
                  {auditResult ? (
                    <AuditResultsDashboard result={auditResult} auditUrl={auditUrl} />
                  ) : null}
                  {auditRaw && !auditResult ? (
                    <pre className="text-xs whitespace-pre-wrap rounded-md border p-4 overflow-x-auto">
                      {auditRaw}
                    </pre>
                  ) : null}
                </CardContent>
              </Card>
            </PlanGate>
          </TabsContent>

          <TabsContent value="keywords">
            <PlanGate requiredPlan="starter">
              <Card>
                <CardHeader>
                  <CardTitle>AI Keyword Research</CardTitle>
                  <CardDescription>Generate 20 keywords with intent, difficulty, and priority.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="topic">Topic</Label>
                      <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="targetAudience">Target Audience</Label>
                      <Input
                        id="targetAudience"
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button disabled={!topic || !targetAudience || keywordsLoading} onClick={runKeywords}>
                      Generate Keywords
                    </Button>
                    <select
                      value={sortField}
                      onChange={(e) =>
                        setSortField(
                          e.target.value as "keyword" | "estimatedDifficulty" | "priority",
                        )
                      }
                      className="border rounded-md bg-background px-3 py-2 text-sm"
                    >
                      <option value="estimatedDifficulty">Sort: Difficulty</option>
                      <option value="keyword">Sort: Keyword</option>
                      <option value="priority">Sort: Priority</option>
                    </select>
                  </div>
                  {keywordsLoading ? <Skeleton className="h-56 w-full" /> : null}
                  {keywordsError ? <p className="text-sm text-red-500">{keywordsError}</p> : null}
                  {!keywordsLoading && !keywordsError && sortedKeywords.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Empty state: no keywords generated yet.</p>
                  ) : null}
                  {sortedKeywords.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Keyword</TableHead>
                          <TableHead>Intent</TableHead>
                          <TableHead>Difficulty</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Content Idea</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedKeywords.map((row, index) => (
                          <TableRow key={`${row.keyword}-${index}`}>
                            <TableCell>{row.keyword}</TableCell>
                            <TableCell>{row.searchIntent}</TableCell>
                            <TableCell>{row.estimatedDifficulty}</TableCell>
                            <TableCell>{row.priority}</TableCell>
                            <TableCell>{row.contentIdea}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : null}
                </CardContent>
              </Card>
            </PlanGate>
          </TabsContent>

          <TabsContent value="ai-search">
            <PlanGate requiredPlan="starter">
              <Card>
                <CardHeader>
                  <CardTitle>AI search optimization</CardTitle>
                  <CardDescription>
                    Queries, answers, and authority signals aimed at ChatGPT, Perplexity, and Google AI
                    recommendations.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="asoBusinessName">Business name</Label>
                      <Input
                        id="asoBusinessName"
                        value={asoBusinessName}
                        onChange={(e) => setAsoBusinessName(e.target.value)}
                        placeholder="Acme Co."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="asoIndustry">Industry</Label>
                      <Input
                        id="asoIndustry"
                        value={asoIndustry}
                        onChange={(e) => setAsoIndustry(e.target.value)}
                        placeholder="Home services"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="asoAudience">Target audience</Label>
                      <Input
                        id="asoAudience"
                        value={asoAudience}
                        onChange={(e) => setAsoAudience(e.target.value)}
                        placeholder="Homeowners in metro areas"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="asoLocation">Location (optional)</Label>
                      <Input
                        id="asoLocation"
                        value={asoLocation}
                        onChange={(e) => setAsoLocation(e.target.value)}
                        placeholder="Austin, TX"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="asoServices">Services / products</Label>
                      <Textarea
                        id="asoServices"
                        value={asoServices}
                        onChange={(e) => setAsoServices(e.target.value)}
                        placeholder="List main offerings…"
                        rows={4}
                        className="resize-y min-h-[100px]"
                      />
                    </div>
                  </div>
                  <Button
                    disabled={
                      !asoBusinessName.trim() ||
                      !asoIndustry.trim() ||
                      !asoAudience.trim() ||
                      !asoServices.trim() ||
                      asoLoading
                    }
                    onClick={runAiSearchOptimize}
                  >
                    {asoLoading ? "Generating…" : "Generate AI search pack"}
                  </Button>
                  {asoLoading ? <Skeleton className="h-48 w-full" /> : null}
                  {asoError ? <p className="text-sm text-red-500">{asoError}</p> : null}
                  {!asoLoading && !asoError && !asoResult ? (
                    <p className="text-sm text-muted-foreground">
                      Fill in business details, then generate a structured pack for AI answer surfaces.
                    </p>
                  ) : null}
                  {asoResult ? (
                    <div className="space-y-6 pt-2">
                      <div
                        className="rounded-[12px] border p-5 md:flex md:items-center md:justify-between md:gap-6"
                        style={{
                          borderColor: "rgba(255,255,255,0.08)",
                          backgroundColor: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-amber-400/90">
                            Visibility score
                          </p>
                          <p className="mt-1 text-4xl font-bold tabular-nums">
                            {asoResult.visibilityScore.score}
                            <span className="text-lg font-normal text-muted-foreground"> / 100</span>
                          </p>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground md:mt-0 md:max-w-xl md:text-right">
                          {asoResult.visibilityScore.explanation}
                        </p>
                      </div>

                      <div>
                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                          Queries & answers
                        </h3>
                        <div className="space-y-4">
                          {asoResult.queries.map((row, idx) => (
                            <div
                              key={`${row.query}-${idx}`}
                              className="rounded-lg border border-white/10 bg-card/40 p-4"
                            >
                              <p className="font-medium text-foreground">{row.query}</p>
                              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                {row.answer}
                              </p>
                              <div className="mt-4 rounded-md border border-white/5 bg-black/20 p-3 text-sm">
                                <p className="text-xs font-semibold uppercase text-amber-500/90">
                                  Content block
                                </p>
                                <p className="mt-2 font-medium">{row.contentBlock.question}</p>
                                <p className="mt-1 text-muted-foreground">{row.contentBlock.directAnswer}</p>
                                <p className="mt-2 text-muted-foreground">{row.contentBlock.expanded}</p>
                                {row.contentBlock.bullets && row.contentBlock.bullets.length > 0 ? (
                                  <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                                    {row.contentBlock.bullets.map((b, bi) => (
                                      <li key={`${idx}-b-${bi}`}>{b}</li>
                                    ))}
                                  </ul>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Credibility</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm text-muted-foreground">
                            {asoResult.authority.credibility.map((item, i) => (
                              <p key={`cred-${i}`}>• {item}</p>
                            ))}
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Differentiators</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm text-muted-foreground">
                            {asoResult.authority.differentiators.map((item, i) => (
                              <p key={`diff-${i}`}>• {item}</p>
                            ))}
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Trust signals</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm text-muted-foreground">
                            {asoResult.authority.trustSignals.map((item, i) => (
                              <p key={`trust-${i}`}>• {item}</p>
                            ))}
                          </CardContent>
                        </Card>
                      </div>

                      <div>
                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                          FAQs
                        </h3>
                        <div className="space-y-3">
                          {asoResult.faqs.map((faq, fi) => (
                            <div
                              key={`faq-${fi}`}
                              className="rounded-lg border border-white/10 p-4"
                            >
                              <p className="font-medium">{faq.question}</p>
                              <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Websites</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm text-muted-foreground">
                            {asoResult.externalSignals.websites.map((w, i) => (
                              <p key={`web-${i}`}>• {w}</p>
                            ))}
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">Platforms</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm text-muted-foreground">
                            {asoResult.externalSignals.platforms.map((p, i) => (
                              <p key={`plat-${i}`}>• {p}</p>
                            ))}
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">PR strategies</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm text-muted-foreground">
                            {asoResult.externalSignals.prStrategies.map((s, i) => (
                              <p key={`pr-${i}`}>• {s}</p>
                            ))}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </PlanGate>
          </TabsContent>

          <TabsContent value="technical">
            <PlanGate requiredPlan="growth">
              <Card>
                <CardHeader>
                  <CardTitle>Technical SEO</CardTitle>
                  <CardDescription>
                    Crawl controls, indexing, performance, and architecture checks.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="technicalUrl">Website URL</Label>
                    <Input
                      id="technicalUrl"
                      value={technicalUrl}
                      onChange={(e) => setTechnicalUrl(e.target.value)}
                      placeholder="example.com"
                    />
                  </div>
                  <Button
                    onClick={runTechnical}
                    disabled={!technicalUrl || technicalLoading}
                  >
                    {technicalLoading ? "Analyzing…" : "Run Technical Audit"}
                  </Button>
                  {technicalLoading && !technicalRaw ? (
                    <Skeleton className="h-40 w-full" />
                  ) : null}
                  {technicalError ? (
                    <p className="text-sm text-red-500">{technicalError}</p>
                  ) : null}
                  {technicalResult ? (
                    <AuditResultsDashboard
                      result={technicalResult}
                      auditUrl={technicalUrl}
                    />
                  ) : technicalRaw ? (
                    <pre className="text-xs whitespace-pre-wrap rounded-md border p-4 overflow-x-auto bg-black/20">
                      {technicalRaw}
                    </pre>
                  ) : null}
                </CardContent>
              </Card>
            </PlanGate>
          </TabsContent>

          <TabsContent value="backlinks">
            <PlanGate requiredPlan="growth">
              <Card>
                <CardHeader>
                  <CardTitle>Backlink Strategy</CardTitle>
                  <CardDescription>
                    On-page and off-page authority building workflows.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="backlinkUrl">Website URL</Label>
                    <Input
                      id="backlinkUrl"
                      value={backlinkUrl}
                      onChange={(e) => setBacklinkUrl(e.target.value)}
                      placeholder="example.com"
                    />
                  </div>
                  <Button
                    onClick={runBacklinks}
                    disabled={!backlinkUrl || backlinkLoading}
                  >
                    {backlinkLoading ? "Generating…" : "Generate Strategy"}
                  </Button>
                  {backlinkLoading && !backlinkRaw ? (
                    <Skeleton className="h-40 w-full" />
                  ) : null}
                  {backlinkError ? (
                    <p className="text-sm text-red-500">{backlinkError}</p>
                  ) : null}
                  {backlinkResult ? (
                    <div className="space-y-4">
                      <Card className="bg-amber-500/5 border-amber-500/20">
                        <CardHeader>
                          <CardTitle className="text-base text-amber-200">
                            Strategy Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                          {String(backlinkResult.summary || "")}
                        </CardContent>
                      </Card>
                      <div className="grid gap-4 md:grid-cols-2">
                        {Object.entries(backlinkResult)
                          .filter(([k]) => k !== "summary")
                          .map(([key, data]: [string, any]) => (
                            <Card key={key} className="bg-white/5 border-white/10">
                              <CardHeader>
                                <div className="flex items-center justify-between">
                                  <CardTitle className="text-sm font-bold uppercase tracking-wider">
                                    {snakeToTitleCase(key)}
                                  </CardTitle>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                                    {data.potential_impact || "Medium"} Impact
                                  </span>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <p className="text-xs text-muted-foreground">
                                  {data.strategy_description}
                                </p>
                                <div className="space-y-1">
                                  <p className="text-[10px] font-bold uppercase text-amber-500/80">
                                    Action Steps
                                  </p>
                                  <ul className="text-xs space-y-1">
                                    {(data.action_steps || []).map(
                                      (step: string, i: number) => (
                                        <li key={i} className="flex gap-2">
                                          <span>•</span>
                                          <span>{step}</span>
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    </div>
                  ) : backlinkRaw ? (
                    <pre className="text-xs whitespace-pre-wrap rounded-md border p-4 overflow-x-auto bg-black/20">
                      {backlinkRaw}
                    </pre>
                  ) : null}
                </CardContent>
              </Card>
            </PlanGate>
          </TabsContent>

          <TabsContent value="competitor">
            <PlanGate requiredPlan="growth">
              <Card>
                <CardHeader>
                  <CardTitle>AI Competitor Analysis</CardTitle>
                  <CardDescription>Compare your site with a competitor and expose strategic gaps.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="competitorUrl">Competitor URL</Label>
                      <Input
                        id="competitorUrl"
                        value={competitorUrl}
                        onChange={(e) => setCompetitorUrl(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ourUrl">Our URL</Label>
                      <Input id="ourUrl" value={ourUrl} onChange={(e) => setOurUrl(e.target.value)} />
                    </div>
                  </div>
                  <Button disabled={!competitorUrl || !ourUrl || competitorLoading} onClick={runCompetitor}>
                    Run Competitor Analysis
                  </Button>
                  {competitorLoading ? <Skeleton className="h-56 w-full" /> : null}
                  {competitorError ? <p className="text-sm text-red-500">{competitorError}</p> : null}
                  {!competitorLoading && !competitorError && !competitor ? (
                    <p className="text-sm text-muted-foreground">Empty state: no competitor report yet.</p>
                  ) : null}
                  {competitor ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <Card>
                        <CardHeader><CardTitle className="text-base">Strengths</CardTitle></CardHeader>
                        <CardContent className="text-sm space-y-1">
                          {(competitor.strengthsOfCompetitor ?? []).map((entry) => <p key={entry}>- {entry}</p>)}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader><CardTitle className="text-base">Weaknesses</CardTitle></CardHeader>
                        <CardContent className="text-sm space-y-1">
                          {(competitor.weaknessesOfCompetitor ?? []).map((entry) => <p key={entry}>- {entry}</p>)}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader><CardTitle className="text-base">Opportunities</CardTitle></CardHeader>
                        <CardContent className="text-sm space-y-1">
                          {(competitor.opportunitiesWeCanExploit ?? []).map((entry) => <p key={entry}>- {entry}</p>)}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader><CardTitle className="text-base">Threat Score</CardTitle></CardHeader>
                        <CardContent className="text-2xl font-semibold">
                          {competitor.overallCompetitiveThreatScore ?? "N/A"} / 10
                        </CardContent>
                      </Card>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </PlanGate>
          </TabsContent>
        </Tabs>
      </div>
    </SideBar>
  );
}
