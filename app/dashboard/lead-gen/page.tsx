"use client";

import Link from "next/link";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useAction, useMutation, useQuery } from "convex/react";
import { Check, Copy, RefreshCcw, Sparkles, Trash2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import SideBar from "@/components/SideBar";
import { PlanGate } from "@/components/PlanGate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizePlan } from "@/lib/plans";
import { toast } from "sonner";

type Strategy = {
  icpSummary?: string;
  channels?: Array<{
    channel?: string;
    whyItWorks?: string;
    tooling?: string;
    firstActions?: string;
  }>;
  scrapingPlaybooks?: Array<{
    sourceType?: string;
    searchPattern?: string;
    collectionMethod?: string;
    complianceNotes?: string;
  }>;
  outreachAngles?: Array<{
    angle?: string;
    openingLine?: string;
    cta?: string;
  }>;
  weeklyExecutionPlan?: string[];
};

type Lead = {
  company?: string;
  contactName?: string;
  contactRole?: string;
  email?: string;
  phone?: string;
  website?: string;
  location?: string;
  painPoint?: string;
  outreachAngle?: string;
  confidence?: number;
  sourceEvidence?: string;
};

type LeadProfile = {
  icp?: string;
  pain_points?: string[];
  best_platforms?: Array<{ platform?: string; reason?: string }>;
  dm_opener?: string;
  hashtags?: string[];
  apify_queries?: string[];
  email_subject?: string;
  error?: string;
  raw?: string;
};

export default function LeadGenPage() {
  const { user } = useUser();
  const deleteAiGeneration = useMutation(api.aiHistory.deleteAiGeneration);

  const [businessType, setBusinessType] = useState("");
  const [targetGeo, setTargetGeo] = useState("");
  const [offer, setOffer] = useState("");
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategyError, setStrategyError] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<Strategy | null>(null);

  const [url, setUrl] = useState("");
  const [method, setMethod] = useState<"firecrawl" | "apify">("firecrawl");
  const [apifyActorId, setApifyActorId] = useState("");
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedActor, setSelectedActor] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [niche, setNiche] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profile, setProfile] = useState<LeadProfile | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const generateLeadProfile = useAction(
    api.actions.generateLeadProfile.generateLeadProfile,
  );

  const userPlan = normalizePlan(user?.publicMetadata?.plan);

  const history = useQuery(
    api.aiHistory.listAiGenerations,
    user?.id
      ? {
          userId: user.id,
        }
      : "skip",
  );

  const runStrategy = async () => {
    setStrategyError(null);
    setStrategy(null);
    setStrategyLoading(true);
    try {
      const res = await fetch("/api/lead-gen/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessType, targetGeo, offer }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Could not generate strategy");
      }
      const data = (await res.json()) as { strategy: Strategy };
      setStrategy(data.strategy);
    } catch (error) {
      setStrategyError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setStrategyLoading(false);
    }
  };

  const runScrape = async () => {
    setScrapeError(null);
    setLeads([]);
    setSelectedActor(null);
    setScrapeLoading(true);
    try {
      const res = await fetch("/api/lead-gen/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          method,
          apifyActorId: apifyActorId || undefined,
          businessType,
          targetGeo,
          offer,
          maxItems: 50,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Could not scrape leads");
      }
      const data = (await res.json()) as { leads: Lead[]; selectedActor?: string };
      setLeads(Array.isArray(data.leads) ? data.leads : []);
      setSelectedActor(data.selectedActor || null);
    } catch (error) {
      setScrapeError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setScrapeLoading(false);
    }
  };

  const runProfile = async () => {
    setProfileError(null);
    setProfile(null);
    setProfileLoading(true);
    try {
      const result = (await generateLeadProfile({ niche: niche.trim() })) as LeadProfile;
      if (result && typeof result.error === "string") {
        setProfileError(result.error);
      } else {
        setProfile(result);
      }
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleGenerateProfile = () => {
    if (!niche.trim() || profileLoading) return;
    if (userPlan === "free") {
      setUpgradeOpen(true);
      return;
    }
    void runProfile();
  };

  const resetProfile = () => {
    setNiche("");
    setProfile(null);
    setProfileError(null);
  };

  const copyText = async (text: string, key: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      toast.success("Copied to clipboard");
      setTimeout(
        () => setCopiedKey((current) => (current === key ? null : current)),
        1500,
      );
    } catch {
      toast.error("Failed to copy");
    }
  };

  const exportLeadsCsv = () => {
    if (leads.length === 0) return;
    const headers = [
      "company",
      "contactName",
      "contactRole",
      "email",
      "phone",
      "website",
      "location",
      "painPoint",
      "outreachAngle",
      "confidence",
      "sourceEvidence",
    ];
    const rows = leads.map((lead) =>
      headers
        .map((key) => {
          const value = String((lead as Record<string, unknown>)[key] ?? "");
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(href);
  };

  const leadGenHistory = history?.filter(
    (item) => item.type === "lead-gen-strategy" || item.type === "lead-gen-scrape",
  );

  const deleteHistoryItem = async (generationId: string) => {
    if (!user?.id) return;
    setPendingDeleteId(generationId);
  };

  const confirmDeleteHistoryItem = async () => {
    if (!user?.id || !pendingDeleteId) return;
    setDeleteLoading(true);
    try {
      await deleteAiGeneration({
        userId: user.id,
        generationId: pendingDeleteId as Id<"aiGenerations">,
      });
      toast.success("History item deleted");
      setPendingDeleteId(null);
    } catch (error) {
      console.error("Failed to delete history item", error);
      toast.error("Failed to delete history item");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-7xl p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Lead Gen Hub</h1>
          <p className="text-muted-foreground">
            Discover, scrape, and prioritize leads using AI research plus Firecrawl/Apify workflows.
          </p>
        </div>

        <PlanGate requiredPlan="growth">
          <Card>
            <CardHeader>
              <CardTitle>Lead Strategy Research</CardTitle>
              <CardDescription>
                Generate channel recommendations and scraping playbooks for your offer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type</Label>
                  <Input
                    id="businessType"
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    placeholder="e.g. Local web design agency"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetGeo">Target Geography</Label>
                  <Input
                    id="targetGeo"
                    value={targetGeo}
                    onChange={(e) => setTargetGeo(e.target.value)}
                    placeholder="e.g. Toronto + remote North America"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offer">Offer</Label>
                  <Input
                    id="offer"
                    value={offer}
                    onChange={(e) => setOffer(e.target.value)}
                    placeholder="e.g. Conversion-focused website redesign"
                  />
                </div>
              </div>
              <Button
                onClick={() => void runStrategy()}
                disabled={strategyLoading || !businessType || !targetGeo || !offer}
              >
                Generate Lead Strategy
              </Button>
              {strategyLoading ? <Skeleton className="h-32 w-full" /> : null}
              {strategyError ? <p className="text-sm text-red-500">{strategyError}</p> : null}
              {strategy ? (
                <div className="space-y-4">
                  <Card className="bg-card/60">
                    <CardHeader>
                      <CardTitle className="text-base">ICP Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">{strategy.icpSummary || "N/A"}</CardContent>
                  </Card>
                  <div className="grid gap-4 md:grid-cols-2">
                    {(strategy.channels || []).map((channel, idx) => (
                      <Card key={`${channel.channel ?? "channel"}-${idx}`}>
                        <CardHeader>
                          <CardTitle className="text-base">{channel.channel || "Channel"}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <p><strong>Why:</strong> {channel.whyItWorks || "N/A"}</p>
                          <p><strong>Tooling:</strong> {channel.tooling || "N/A"}</p>
                          <p><strong>First Actions:</strong> {channel.firstActions || "N/A"}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </PlanGate>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                  AI Lead Profiler
                </CardTitle>
                <CardDescription>
                  Instantly profile any niche — pain points, platforms, DM openers, and scraping queries.
                </CardDescription>
              </div>
              {profile ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetProfile}
                  className="gap-2"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Reset
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="niche">Niche</Label>
                <Input
                  id="niche"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="e.g. med spa owner in Miami, NY realtor, fitness coach"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleGenerateProfile();
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleGenerateProfile}
                disabled={!niche.trim() || profileLoading}
                className="bg-amber-500 text-black hover:bg-amber-400 disabled:bg-amber-500/40 disabled:text-black/60"
              >
                {profileLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/70 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/70 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/70" />
                    </span>
                    Profiling…
                  </span>
                ) : (
                  "Generate Lead Profile"
                )}
              </Button>
            </div>

            {profileLoading ? (
              <div className="space-y-3 animate-in fade-in-0 duration-300">
                <Skeleton className="h-16 w-full" />
                <div className="grid gap-3 md:grid-cols-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
                <Skeleton className="h-20 w-full" />
              </div>
            ) : null}

            {profileError ? (
              <p className="text-sm text-red-500">{profileError}</p>
            ) : null}

            {profile && !profileLoading ? (
              <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
                {profile.icp ? (
                  <Card className="border-l-4 border-l-amber-500 bg-card/60">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm uppercase tracking-wider text-amber-400/90">
                        ICP Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-base italic leading-relaxed text-foreground/90">
                        {profile.icp}
                      </p>
                    </CardContent>
                  </Card>
                ) : null}

                {profile.pain_points && profile.pain_points.length > 0 ? (
                  <Card className="bg-card/60">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Pain Points</CardTitle>
                      <CardDescription>
                        What keeps this niche up at night.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ol className="space-y-2">
                        {profile.pain_points.map((pain, idx) => (
                          <li
                            key={`pain-${idx}`}
                            className="flex items-start gap-3"
                          >
                            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 text-xs font-semibold text-amber-300">
                              {idx + 1}
                            </span>
                            <span className="inline-flex flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-foreground/90">
                              {pain}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </CardContent>
                  </Card>
                ) : null}

                {profile.best_platforms && profile.best_platforms.length > 0 ? (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Best Platforms
                    </h3>
                    <div className="grid gap-3 md:grid-cols-3">
                      {profile.best_platforms.map((item, idx) => (
                        <Card
                          key={`${item.platform ?? "platform"}-${idx}`}
                          className="bg-card/60 transition-colors hover:border-amber-500/30"
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base font-bold">
                              {item.platform || "Platform"}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                              {item.reason || "—"}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : null}

                {(profile.dm_opener || profile.email_subject) ? (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Outreach Toolkit
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Card className="bg-card/60">
                        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-base">DM Opener</CardTitle>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
                            onClick={() =>
                              void copyText(profile.dm_opener ?? "", "dm_opener")
                            }
                            disabled={!profile.dm_opener}
                          >
                            {copiedKey === "dm_opener" ? (
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
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-md border border-white/10 bg-background/60 p-3 text-sm leading-relaxed text-foreground/90">
                            {profile.dm_opener || "—"}
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-card/60">
                        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-base">Email Subject</CardTitle>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
                            onClick={() =>
                              void copyText(
                                profile.email_subject ?? "",
                                "email_subject",
                              )
                            }
                            disabled={!profile.email_subject}
                          >
                            {copiedKey === "email_subject" ? (
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
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-md border border-white/10 bg-background/60 p-3 text-sm leading-relaxed text-foreground/90">
                            {profile.email_subject || "—"}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : null}

                {profile.hashtags && profile.hashtags.length > 0 ? (
                  <Card className="bg-card/60">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Hashtags</CardTitle>
                      <CardDescription>
                        Click any tag to copy it.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {profile.hashtags.map((tag, idx) => {
                          const key = `hashtag-${idx}`;
                          const active = copiedKey === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => void copyText(tag, key)}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                                active
                                  ? "border-amber-300/60 bg-amber-400/20 text-amber-100"
                                  : "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:border-amber-400/60 hover:bg-amber-500/20 hover:text-amber-200"
                              }`}
                            >
                              {active ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3 opacity-60" />
                              )}
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {profile.apify_queries && profile.apify_queries.length > 0 ? (
                  <Card className="bg-card/60">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Apify Scraping Queries</CardTitle>
                      <CardDescription>
                        Feed these into your Apify Google Maps or IG scraper.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {profile.apify_queries.map((query, idx) => {
                        const key = `apify-${idx}`;
                        const active = copiedKey === key;
                        return (
                          <div
                            key={key}
                            className="flex items-center gap-2 rounded-md border border-white/10 bg-background/60 p-2"
                          >
                            <code className="flex-1 overflow-x-auto whitespace-pre font-mono text-xs text-amber-200/90">
                              {query}
                            </code>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 shrink-0 gap-1.5 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
                              onClick={() => void copyText(query, key)}
                            >
                              {active ? (
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
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            ) : null}

            {!profile && !profileLoading && !profileError ? (
              <p className="text-sm text-muted-foreground">
                Enter a niche above and we&apos;ll draft an ICP, pain points, DM opener,
                hashtags, and scraping queries you can paste straight into Apify.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <PlanGate requiredPlan="growth">
          <Card>
            <CardHeader>
              <CardTitle>Lead Scraping Lab</CardTitle>
              <CardDescription>
                Scrape a source URL and extract lead opportunities with AI.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="url">Source URL</Label>
                  <Input
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/directory-or-list"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="method">Method</Label>
                  <select
                    id="method"
                    value={method}
                    onChange={(e) => setMethod(e.target.value as "firecrawl" | "apify")}
                    className="w-full border rounded-md bg-background px-3 py-2 text-sm"
                  >
                    <option value="firecrawl">Firecrawl</option>
                    <option value="apify">Apify</option>
                  </select>
                </div>
              </div>
              {method === "apify" ? (
                <div className="space-y-2">
                  <Label htmlFor="apifyActorId">Apify Actor ID (optional)</Label>
                  <Input
                    id="apifyActorId"
                    value={apifyActorId}
                    onChange={(e) => setApifyActorId(e.target.value)}
                    placeholder="username~actor-name"
                  />
                </div>
              ) : null}
              <Button onClick={() => void runScrape()} disabled={scrapeLoading || !url}>
                Extract Leads
              </Button>
              {scrapeLoading ? <Skeleton className="h-40 w-full" /> : null}
              {scrapeError ? <p className="text-sm text-red-500">{scrapeError}</p> : null}
              {selectedActor ? (
                <p className="text-sm text-muted-foreground">
                  Auto-selected actor: <span className="font-medium text-foreground">{selectedActor}</span>
                </p>
              ) : null}
              {leads.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={exportLeadsCsv}>
                      Export CSV (Google Sheets ready)
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {leads.map((lead, idx) => (
                      <Card key={`${lead.company ?? "lead"}-${idx}`}>
                        <CardHeader>
                          <CardTitle className="text-base">{lead.company || "Unknown company"}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-2">
                          <p><strong>Contact:</strong> {lead.contactName || "N/A"}</p>
                          <p><strong>Role:</strong> {lead.contactRole || "N/A"}</p>
                          <p><strong>Email:</strong> {lead.email || "N/A"}</p>
                          <p><strong>Phone:</strong> {lead.phone || "N/A"}</p>
                          <p><strong>Website:</strong> {lead.website || "N/A"}</p>
                          <p><strong>Location:</strong> {lead.location || "N/A"}</p>
                          <p><strong>Pain Point:</strong> {lead.painPoint || "N/A"}</p>
                          <p><strong>Angle:</strong> {lead.outreachAngle || "N/A"}</p>
                          <p><strong>Confidence:</strong> {lead.confidence ?? "N/A"}</p>
                          <p><strong>Evidence:</strong> {lead.sourceEvidence || "N/A"}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lead Gen History</CardTitle>
              <CardDescription>
                Saved strategy and scraping runs for this user.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!leadGenHistory ? (
                <Skeleton className="h-20 w-full" />
              ) : leadGenHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No lead gen runs yet.</p>
              ) : (
                leadGenHistory.map((item) => (
                  <div
                    key={item._id}
                    className="rounded-lg border p-3 hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/dashboard/lead-gen/${item._id}`} className="block flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.type}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-300"
                        onClick={() => void deleteHistoryItem(String(item._id))}
                        aria-label="Delete history item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </PlanGate>
      </div>
      <Dialog
        open={Boolean(pendingDeleteId)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete history item?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The selected lead gen history item will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDeleteId(null)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDeleteHistoryItem()}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              Upgrade to unlock AI Lead Profiler
            </DialogTitle>
            <DialogDescription>
              Upgrade to Starter or above to use AI Lead Profiler. You&apos;ll get
              unlimited niche profiling with ICPs, pain points, DM openers, and
              ready-to-paste Apify queries.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUpgradeOpen(false)}
            >
              Maybe later
            </Button>
            <Button
              asChild
              className="bg-amber-500 text-black hover:bg-amber-400"
            >
              <Link href="/pricing">View plans</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SideBar>
  );
}
