"use client";

import { useMemo, useState } from "react";
import SideBar from "@/components/SideBar";
import { useSelectedClient } from "@/context/ClientContext";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search } from "lucide-react";

export default function ScraperPage() {
  const { user } = useUser();
  const { selectedClientId } = useSelectedClient();
  const [sourceAccount, setSourceAccount] = useState("");
  const [idealLead, setIdealLead] = useState("");
  const [limit, setLimit] = useState(500);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const rows = useQuery(
    api.outreachWorkspace.listScrapedFollowers,
    selectedClientId ? { clientId: selectedClientId } : "skip",
  ) as Array<{
    _id: string;
    instagramUsername: string;
    bio?: string;
    followerCount?: number;
    qualificationScore: number;
    qualificationStatus: string;
    addedToCampaign: boolean;
  }> | undefined;

  const filteredRows = useMemo(() => {
    const all = rows || [];
    if (statusFilter === "all") return all;
    return all.filter((r) => r.qualificationStatus === statusFilter);
  }, [rows, statusFilter]);

  const startScrape = async () => {
    if (!selectedClientId || !user?.id) return;
    setLoading(true);
    try {
      const res = await fetch("/api/scraper/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          sourceAccount,
          idealLeadDescription: idealLead,
          limit,
        }),
      });
      const payload = (await res.json()) as { error?: string; totalFound?: number };
      if (!res.ok) throw new Error(payload.error || "Failed to scrape");
      toast.success(`Scrape complete. Found ${payload.totalFound || 0} profiles.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to scrape");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
        <div>
          <h1 className="text-3xl font-bold">Follower Scraper</h1>
          <p className="text-muted-foreground">
            Find people, score them, and add the best ones to your campaigns.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Start a new scrape</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Account to scrape</Label>
              <Input
                value={sourceAccount}
                onChange={(e) => setSourceAccount(e.target.value)}
                placeholder="@username"
              />
            </div>
            <div className="space-y-1.5">
              <Label>What are we looking for?</Label>
              <Textarea
                rows={3}
                value={idealLead}
                onChange={(e) => setIdealLead(e.target.value)}
                placeholder="Small business owners in the US with 1k-50k followers"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[500, 1000, 2500, 5000].map((size) => (
                <Button
                  key={size}
                  variant={limit === size ? "default" : "outline"}
                  onClick={() => setLimit(size)}
                >
                  {size.toLocaleString()}
                </Button>
              ))}
            </div>
            <Button
              disabled={loading || !sourceAccount.trim() || !idealLead.trim()}
              onClick={() => void startScrape()}
            >
              {loading ? "Scraping followers..." : "Start scraping"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Qualified leads results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {["all", "top_lead", "qualified", "maybe", "unqualified"].map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={statusFilter === status ? "default" : "outline"}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === "all" ? "All" : status.replace("_", " ")}
                </Button>
              ))}
            </div>

            {filteredRows.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Search className="mx-auto h-8 w-8 text-muted-foreground" />
                <h3 className="mt-3 text-lg font-semibold">No follower scrapes yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter an account username above to get started. It only takes a few minutes.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRows.map((row) => (
                  <div key={row._id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">@{row.instagramUsername}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Score {row.qualificationScore}</Badge>
                        <Badge>{row.qualificationStatus.replace("_", " ")}</Badge>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {row.bio || "No bio available"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SideBar>
  );
}
