"use client";

import { useMemo, useState } from "react";
import SideBar from "@/components/SideBar";
import { PlanGate } from "@/components/PlanGate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function renderAuditValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return <p className="text-sm text-muted-foreground">No data</p>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <p className="text-sm text-muted-foreground">No items</p>;
    }
    return (
      <div className="space-y-1 text-sm">
        {value.map((item, idx) => (
          <div key={`arr-${idx}`} className="whitespace-pre-wrap break-words">
            - {typeof item === "object" && item !== null ? JSON.stringify(item, null, 2) : String(item)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return <p className="text-sm text-muted-foreground">No fields</p>;
    }
    return (
      <div className="space-y-2 text-sm">
        {entries.map(([subKey, subValue]) => (
          <div key={subKey} className="rounded-md border border-border/60 p-2">
            <p className="font-medium capitalize">
              {subKey.replace(/([A-Z])/g, " $1").trim()}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words">
              {typeof subValue === "object" && subValue !== null
                ? JSON.stringify(subValue, null, 2)
                : String(subValue)}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-sm whitespace-pre-wrap break-words">{String(value)}</p>;
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
      const data = (await res.json()) as { analysis: CompetitorResult };
      setCompetitor(data.analysis);
    } catch (error) {
      setCompetitorError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setCompetitorLoading(false);
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
                    <div className="grid gap-3 md:grid-cols-2">
                      {Object.entries(auditResult).map(([key, value]) => (
                        <Card key={key}>
                          <CardHeader>
                            <CardTitle className="text-base capitalize">
                              {key.replace(/([A-Z])/g, " $1").trim()}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {renderAuditValue(value)}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
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

          <TabsContent value="technical">
            <PlanGate requiredPlan="growth">
              <Card>
                <CardHeader>
                  <CardTitle>Technical SEO</CardTitle>
                  <CardDescription>
                    Crawl controls, indexing, performance, and architecture checks.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Empty state: connect your site data sources to run technical diagnostics.
                  </p>
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
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Empty state: backlink campaign modules will show here.
                  </p>
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
