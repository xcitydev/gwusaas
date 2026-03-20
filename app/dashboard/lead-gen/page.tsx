"use client";

import Link from "next/link";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { Trash2 } from "lucide-react";
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
    </SideBar>
  );
}
