"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { Check, Copy, Trash2, Zap } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import SideBar from "@/components/SideBar";
import { PlanGate } from "@/components/PlanGate";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";

type Lead = {
  company?: string;
  contactName?: string;
  contactRole?: string;
  email?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  location?: string;
  painPoint?: string;
  outreachAngle?: string;
  confidence?: number;
  sourceEvidence?: string;
};

type VibeLead = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  industry?: string;
  location?: string;
  linkedin?: string;
  website?: string;
  painPoint?: string;
  outreachAngle?: string;
  confidence?: number;
};

type NormalizedLead = {
  name: string;
  email: string;
  phone: string;
  company: string;
  location: string;
  linkedin: string;
};

type ScrapeMethod = "apify-gmaps" | "apify-instagram" | "apify-generic" | "vibe";

type ScrapePill = "Apify Scraper" | "Vibe Prospecting" | "Google Maps" | "Instagram Search";

const SCRAPE_PILLS: ScrapePill[] = [
  "Apify Scraper",
  "Vibe Prospecting",
  "Google Maps",
  "Instagram Search",
];

type NicheDetection = {
  method: ScrapeMethod;
  niche: string;
  actorId: string;
  hint: string;
  highlightedPills: ScrapePill[];
  vibeFilter?: { kind: "job_title" | "industry"; value: string };
};

type VibeFilter = { kind: "job_title" | "industry"; value: string };

type DetectionRule = {
  keywords: string[];
  method: ScrapeMethod;
  niche: string;
  actorId: string;
  hint: string;
  vibeFilter?: VibeFilter;
};

const DETECTION_RULES: DetectionRule[] = [
  {
    keywords: ["med spa", "medspa", "med-spa", "aesthetic", "botox", "filler", "injectable"],
    method: "apify-gmaps",
    niche: "Med Spas",
    actorId: "compass~crawler-google-places",
    hint: "Google Maps will pull local med spas with contact info and reviews.",
    vibeFilter: { kind: "industry", value: "Health & Wellness" },
  },
  {
    keywords: ["realtor", "real estate", "real-estate", "broker", "realty", "property agent"],
    method: "vibe",
    niche: "Real Estate Agents",
    actorId: "",
    hint: "Vibe Prospecting has 2M+ licensed agents with verified emails and phone numbers.",
    vibeFilter: { kind: "job_title", value: "Real Estate Agent" },
  },
  {
    keywords: ["coach", "coaching", "life coach", "mindset coach", "business coach"],
    method: "vibe",
    niche: "Coaches",
    actorId: "",
    hint: "Vibe Prospecting has verified coach contact data with emails and LinkedIn profiles.",
    vibeFilter: { kind: "job_title", value: "Coach" },
  },
  {
    keywords: ["restaurant", "cafe", "café", "dining", "bistro", "eatery", "bakery"],
    method: "apify-gmaps",
    niche: "Restaurants",
    actorId: "compass~crawler-google-places",
    hint: "Google Maps will pull local restaurants with phone, website, and ratings.",
    vibeFilter: { kind: "industry", value: "Food & Beverages" },
  },
  {
    keywords: ["instagram", "influencer", "creator", "ig page", "content creator"],
    method: "apify-instagram",
    niche: "Instagram Creators",
    actorId: "apify~instagram-profile-scraper",
    hint: "Instagram Profile Scraper will extract bios, contact info, follower counts, and engagement.",
  },
  {
    keywords: ["dentist", "dental", "orthodontist", "chiropractor", "clinic", "physiotherapist", "physio"],
    method: "apify-gmaps",
    niche: "Healthcare Clinics",
    actorId: "compass~crawler-google-places",
    hint: "Google Maps will pull local clinics with phone numbers, websites, and patient reviews.",
    vibeFilter: { kind: "industry", value: "Health & Wellness" },
  },
  {
    keywords: ["lawyer", "attorney", "law firm", "law-firm", "legal", "solicitor"],
    method: "vibe",
    niche: "Lawyers",
    actorId: "",
    hint: "Vibe Prospecting has verified lawyer emails, firms, and practice areas.",
    vibeFilter: { kind: "job_title", value: "Attorney" },
  },
  {
    keywords: ["gym", "trainer", "fitness", "yoga", "pilates", "crossfit", "personal trainer"],
    method: "apify-instagram",
    niche: "Fitness Creators",
    actorId: "apify~instagram-profile-scraper",
    hint: "Instagram Scraper will find fitness trainers with contact info in their bios.",
    vibeFilter: { kind: "industry", value: "Health & Wellness" },
  },
  {
    keywords: ["agency", "marketing agency", "ad agency", "consultant", "consulting"],
    method: "vibe",
    niche: "Agencies & Consultants",
    actorId: "",
    hint: "Vibe Prospecting has verified agency owners and consultants with emails and team sizes.",
    vibeFilter: { kind: "job_title", value: "Founder" },
  },
];

function pillsForMethod(method: ScrapeMethod): ScrapePill[] {
  switch (method) {
    case "apify-gmaps":
      return ["Apify Scraper", "Google Maps"];
    case "apify-instagram":
      return ["Apify Scraper", "Instagram Search"];
    case "apify-generic":
      return ["Apify Scraper"];
    case "vibe":
      return ["Vibe Prospecting"];
  }
}

function detectNiche(input: string): (NicheDetection & { vibeFilter?: VibeFilter }) | null {
  const v = input.trim().toLowerCase();
  if (!v) return null;
  for (const rule of DETECTION_RULES) {
    if (rule.keywords.some((k) => v.includes(k))) {
      return {
        method: rule.method,
        niche: rule.niche,
        actorId: rule.actorId,
        hint: rule.hint,
        highlightedPills: pillsForMethod(rule.method),
        vibeFilter: rule.vibeFilter,
      };
    }
  }
  return {
    method: "apify-generic",
    niche: "Custom",
    actorId: "",
    hint: "No preset match — we'll run a general-purpose Apify scraper. Add a specific Actor ID below if you know one.",
    highlightedPills: ["Apify Scraper"],
  };
}

function buildSourceUrl(method: ScrapeMethod, target: string): string {
  const q = encodeURIComponent(target.trim());
  switch (method) {
    case "apify-gmaps":
      return `https://www.google.com/maps/search/${q}`;
    case "apify-instagram":
      return `https://www.instagram.com/explore/tags/${encodeURIComponent(
        target.trim().toLowerCase().replace(/\s+/g, ""),
      )}/`;
    case "apify-generic":
      return `https://www.google.com/search?q=${q}`;
    case "vibe":
      return `https://vibe.local/search?q=${q}`;
  }
}

export default function LeadGenPage() {
  const { user } = useUser();
  const deleteAiGeneration = useMutation(api.aiHistory.deleteAiGeneration);

  const [targetClient, setTargetClient] = useState("");
  const [apifyActorId, setApifyActorId] = useState("");
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [vibeLeads, setVibeLeads] = useState<VibeLead[]>([]);
  const [selectedActor, setSelectedActor] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [vibeLoading, setVibeLoading] = useState(false);

  const detection = useMemo<NicheDetection | null>(
    () => detectNiche(targetClient),
    [targetClient],
  );

  const handleTargetClientChange = (value: string) => {
    setTargetClient(value);
    const next = detectNiche(value);
    if (next && next.actorId) {
      setApifyActorId(next.actorId);
    } else if (!value.trim()) {
      setApifyActorId("");
    }
  };

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const history = useQuery(
    api.aiHistory.listAiGenerations,
    user?.id
      ? {
          userId: user.id,
        }
      : "skip",
  );

  const runScrape = async (overrides?: {
    url?: string;
    apifyActorId?: string;
    businessType?: string;
  }) => {
    setScrapeError(null);
    setLeads([]);
    setVibeLeads([]);
    setSelectedActor(null);
    setScrapeLoading(true);
    try {
      const res = await fetch("/api/lead-gen/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: overrides?.url,
          method: "apify",
          apifyActorId: overrides?.apifyActorId || apifyActorId || undefined,
          businessType: overrides?.businessType ?? targetClient,
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

  const handleExtractLeads = async () => {
    if (!detection || !targetClient.trim() || scrapeLoading) return;
    const scrapeMethod: ScrapeMethod =
      detection.method === "vibe" ? "apify-generic" : detection.method;
    const sourceUrl = buildSourceUrl(scrapeMethod, targetClient);
    await runScrape({
      url: sourceUrl,
      apifyActorId: detection.actorId || apifyActorId,
      businessType: targetClient,
    });
  };

  const runVibeSearch = async () => {
    if (!targetClient.trim() || vibeLoading) return;
    setScrapeError(null);
    setLeads([]);
    setVibeLeads([]);
    setSelectedActor(null);
    setVibeLoading(true);
    try {
      const res = await fetch("/api/lead-gen/vibe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: targetClient.trim(),
          filterKind: detection?.vibeFilter?.kind,
          filterValue: detection?.vibeFilter?.value,
          maxItems: 25,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Vibe Prospecting search failed");
      }
      const data = (await res.json()) as { leads: VibeLead[] };
      setVibeLeads(Array.isArray(data.leads) ? data.leads : []);
      toast.success(`Found ${data.leads?.length ?? 0} B2B prospects from Vibe.`);
    } catch (error) {
      setScrapeError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setVibeLoading(false);
    }
  };

  const normalizedLeads = useMemo<NormalizedLead[]>(() => {
    if (vibeLeads.length > 0) {
      return vibeLeads.map((l) => ({
        name: l.name ?? "",
        email: l.email ?? "",
        phone: l.phone ?? "",
        company: l.company ?? "",
        location: l.location ?? "",
        linkedin: l.linkedin ?? "",
      }));
    }
    return leads.map((l) => ({
      name: l.contactName ?? "",
      email: l.email ?? "",
      phone: l.phone ?? "",
      company: l.company ?? "",
      location: l.location ?? "",
      linkedin: l.linkedin ?? "",
    }));
  }, [leads, vibeLeads]);

  const exportNormalizedCsv = () => {
    if (normalizedLeads.length === 0) return;
    const headers = ["name", "email", "phone", "company", "location", "linkedin"];
    const rows = normalizedLeads.map((lead) =>
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

  const leadGenHistory = history?.filter(
    (item) =>
      item.type === "lead-gen-scrape" || item.type === "lead-gen-vibe",
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
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Lead Gen Hub</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Discover, scrape, and prioritize leads using Vibe Prospecting plus Apify workflows.
          </p>
        </div>

        <PlanGate requiredPlan="growth">
          <Card className="bg-[#111] border-white/5">
            <CardHeader>
              <CardTitle>Lead Scraping Lab</CardTitle>
              <CardDescription>
                Describe who you&apos;re targeting — the right tools are chosen automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="targetClient" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Describe Your Target Client
                </Label>
                <Input
                  id="targetClient"
                  value={targetClient}
                  onChange={(e) => handleTargetClientChange(e.target.value)}
                  placeholder="e.g. med spas in Miami, realtors in Texas, personal trainers..."
                  className="bg-[#1c1c1c] border-white/10 focus-visible:ring-amber-500/40"
                />
                {detection ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Detected: {detection.niche}
                    </span>
                  </div>
                ) : null}
              </div>

              {detection ? (
                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Auto-Selected Method
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {SCRAPE_PILLS.map((pill) => {
                      const active = detection.highlightedPills.includes(pill);
                      return (
                        <span
                          key={pill}
                          className={
                            active
                              ? "rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300"
                              : "rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-muted-foreground"
                          }
                        >
                          {pill}
                        </span>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {detection.hint}
                  </p>
                </div>
              ) : null}

              <Card className="bg-emerald-500/5 border-emerald-500/20">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-emerald-500/15 p-1.5 text-emerald-400">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-emerald-300">
                          Vibe Prospecting — Business Database
                        </h4>
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20">
                          Recommended for B2B leads
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        For B2B niches (coaches, agencies, clinics, law firms) — pull
                        verified emails, phone numbers, and company data instantly. No
                        scraping needed.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {detection && detection.method !== "vibe" ? (
                <div className="space-y-2">
                  <Label
                    htmlFor="apifyActorId"
                    className="text-xs uppercase tracking-wide text-muted-foreground"
                  >
                    Apify Actor ID {detection.actorId ? "(auto-filled)" : "(optional override)"}
                  </Label>
                  <Input
                    id="apifyActorId"
                    value={apifyActorId}
                    onChange={(e) => setApifyActorId(e.target.value)}
                    placeholder="username~actor-name"
                    className="bg-[#1c1c1c] border-white/10 font-mono text-sm"
                  />
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <Button
                  onClick={() => void handleExtractLeads()}
                  disabled={scrapeLoading || !targetClient.trim()}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                >
                  {scrapeLoading ? "Extracting..." : "Extract Leads"}
                </Button>
                <Button
                  onClick={() => void runVibeSearch()}
                  disabled={vibeLoading || !targetClient.trim()}
                  variant="outline"
                  className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200"
                >
                  {vibeLoading ? "Searching..." : "Search Vibe Database"}
                </Button>
              </div>

              {scrapeLoading ? <Skeleton className="h-40 w-full" /> : null}
              {scrapeError ? <p className="text-sm text-red-500">{scrapeError}</p> : null}
              {selectedActor ? (
                <p className="text-sm text-muted-foreground">
                  Auto-selected actor: <span className="font-medium text-foreground">{selectedActor}</span>
                </p>
              ) : null}
              {normalizedLeads.length > 0 ? (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      {normalizedLeads.length} result{normalizedLeads.length === 1 ? "" : "s"}
                      {vibeLeads.length > 0 ? (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300 border border-emerald-500/20">
                          via Vibe Prospecting
                        </span>
                      ) : (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300 border border-amber-500/20">
                          via Apify
                        </span>
                      )}
                    </p>
                    <Button variant="outline" size="sm" onClick={exportNormalizedCsv}>
                      Export CSV
                    </Button>
                  </div>
                  <div className="overflow-x-auto rounded-md border border-white/10 bg-[#0f0f0f]">
                    <table className="w-full text-sm">
                      <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Name</th>
                          <th className="px-3 py-2 text-left font-medium">Email</th>
                          <th className="px-3 py-2 text-left font-medium">Phone</th>
                          <th className="px-3 py-2 text-left font-medium">Company</th>
                          <th className="px-3 py-2 text-left font-medium">Location</th>
                          <th className="px-3 py-2 text-left font-medium">LinkedIn</th>
                        </tr>
                      </thead>
                      <tbody>
                        {normalizedLeads.map((lead, idx) => (
                          <tr
                            key={`${lead.email || lead.name || "lead"}-${idx}`}
                            className="border-t border-white/5 hover:bg-white/[0.02]"
                          >
                            <td className="px-3 py-2 align-top">{lead.name || "—"}</td>
                            <td className="px-3 py-2 align-top">
                              {lead.email ? (
                                <a
                                  href={`mailto:${lead.email}`}
                                  className="text-amber-300 hover:underline break-all"
                                >
                                  {lead.email}
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-3 py-2 align-top whitespace-nowrap">
                              {lead.phone || "—"}
                            </td>
                            <td className="px-3 py-2 align-top">{lead.company || "—"}</td>
                            <td className="px-3 py-2 align-top">{lead.location || "—"}</td>
                            <td className="px-3 py-2 align-top">
                              {lead.linkedin ? (
                                <a
                                  href={lead.linkedin}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-400 hover:underline"
                                >
                                  Profile
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
    </SideBar>
  );
}
