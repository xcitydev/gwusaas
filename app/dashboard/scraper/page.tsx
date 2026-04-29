"use client";

import { useMemo, useState } from "react";
import SideBar from "@/components/SideBar";
import { useSelectedClient } from "@/context/ClientContext";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Sparkles, Filter, Users, ListFilter, ArrowRight } from "lucide-react";
import { PaywallOverlay } from "@/components/PaywallOverlay";
import { UpgradeModal } from "@/components/UpgradeModal";
import { PLAN_LIMITS, normalizePlan } from "@/lib/plans";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function ScraperPage() {
  const { user } = useUser();
  const { selectedClientId } = useSelectedClient();
  const [sourceAccount, setSourceAccount] = useState("");
  const [idealLead, setIdealLead] = useState("");
  const [limit, setLimit] = useState(500);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Plan & Usage Logic
  const userPlan = normalizePlan(user?.publicMetadata?.plan);
  const limits = PLAN_LIMITS[userPlan];
  
  const usageCount = useQuery(api.usage.getUsage, { metric: "dailyLeadScrapes" }) ?? 0;
  const checkUsage = useMutation(api.usage.checkAndIncrementUsage);

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

  const visibleLimit = limits.visibleLeadsListSize;
  const visibleRows = filteredRows.slice(0, visibleLimit);
  const lockedRows = filteredRows.slice(visibleLimit);
  const hasMoreLocked = lockedRows.length > 0;

  const startScrape = async () => {
    if (!selectedClientId || !user?.id) return;

    const usageCheck = await checkUsage({
      metric: "dailyLeadScrapes",
      increment: 1, 
    });

    if (!usageCheck.success) {
      setIsUpgradeModalOpen(true);
      return;
    }

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
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-7xl space-y-8 p-6 md:p-8"
      >
        <motion.div variants={item} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest">
              <Users className="w-4 h-4" />
              <span>Intelligence Suite</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white/90">Lead Infiltrator</h1>
            <p className="text-muted-foreground font-medium">Extract high-intent followers from any competitor.</p>
          </div>
          <Badge className="w-fit h-9 px-4 text-xs font-bold bg-primary/10 text-primary border-primary/20 amber-glow">
            <Sparkles className="w-4 h-4 mr-2 fill-primary" />
            {Math.max(0, limits.dailyLeadScrapes - usageCount)} Engine Cycles Left
          </Badge>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-12">
          
          {/* Configuration Panel */}
          <motion.div variants={item} className="lg:col-span-5">
            <div className="glass-card rounded-[2rem] p-8 space-y-8 h-full">
              <div className="space-y-1">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  Target Parameters
                </h3>
                <p className="text-xs text-muted-foreground">Configure the extraction protocols</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Competitor Username</Label>
                  <Input
                    className="h-12 bg-white/5 border-white/5 rounded-xl px-4 font-medium focus:ring-primary/20 transition-all"
                    value={sourceAccount}
                    onChange={(e) => setSourceAccount(e.target.value)}
                    placeholder="@competitor_brand"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Ideal Lead Description (AI)</Label>
                  <Textarea
                    className="bg-white/5 border-white/5 rounded-2xl p-4 font-medium focus:ring-primary/20 transition-all min-h-[120px]"
                    value={idealLead}
                    onChange={(e) => setIdealLead(e.target.value)}
                    placeholder="E.g. Real estate agents in Florida with 5k+ followers..."
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Batch Size</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[500, 1000, 2500, 5000].map((size) => (
                      <button
                        key={size}
                        onClick={() => setLimit(size)}
                        className={cn(
                          "h-10 text-[10px] font-black rounded-lg transition-all border outline-none",
                          limit === size 
                            ? "bg-primary text-primary-foreground border-primary amber-glow" 
                            : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                        )}
                      >
                        {size >= 1000 ? `${size/1000}K` : size}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  className="w-full h-14 rounded-2xl font-black uppercase tracking-wider amber-glow text-base"
                  disabled={loading || !sourceAccount.trim() || !idealLead.trim()}
                  onClick={() => void startScrape()}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin" /> Analyzing Nodes...
                    </span>
                  ) : "Initialize Scrape"}
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Results Panel */}
          <motion.div variants={item} className="lg:col-span-7">
            <div className="glass-card rounded-[2rem] p-8 space-y-6 h-full flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    Extraction Feed
                  </h3>
                  <p className="text-xs text-muted-foreground">Real-time intelligence results</p>
                </div>
                <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
                  {["all", "top_lead", "qualified"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={cn(
                        "px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all",
                        statusFilter === status 
                          ? "bg-white/10 text-primary shadow-sm" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {status === "all" ? "All Nodes" : status.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[600px] pr-2 space-y-4 custom-scrollbar">
                {filteredRows.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-12 text-center glass-card rounded-3xl border-dashed border-white/10 border-2">
                    <Search className="h-12 w-12 text-muted-foreground/20 mb-4" />
                    <h3 className="text-lg font-bold text-white/50">Zero Contacts Detected</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-[240px]">Initialize a scrape to begin harvesting high-value intelligence.</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {visibleRows.map((row, i) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={row._id} 
                        className="group relative p-4 rounded-2xl bg-white/5 border border-white/5 transition-all hover:border-primary/20 hover:bg-white/10"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-[10px] text-primary">
                              {row.instagramUsername.charAt(0).toUpperCase()}
                            </div>
                            <p className="font-bold text-white/90">@{row.instagramUsername}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/5 text-[10px] font-black text-white/40">
                              SCORE {row.qualificationScore}
                            </div>
                            <Badge className={cn(
                              "text-[9px] font-black uppercase tracking-widest px-2 py-0.5",
                              row.qualificationStatus === "top_lead" ? "bg-primary/20 text-primary border-primary/30" : "bg-white/10 text-muted-foreground border-white/5"
                            )}>
                              {row.qualificationStatus.replace("_", " ")}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 italic pr-8">
                          {row.bio || "No profile metadata available."}
                        </p>
                        <button className="absolute bottom-4 right-4 w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/20">
                          <ArrowRight className="w-3.5 h-3.5 text-primary" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}

                {hasMoreLocked && (
                  <PaywallOverlay
                    isLocked={true}
                    title={`Unlock ${lockedRows.length} Shadow Leads`}
                    description={`Your ${userPlan} clearance level allows viewing ${visibleLimit} nodes per cycle. Access all ${lockedRows.length} remaining leads.`}
                    className="mt-6 shadow-card"
                  >
                    {/* Placeholder content for overlay blur */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 shadow-card opacity-20">
                      <div className="h-4 w-32 bg-white/10 rounded mb-2" />
                      <div className="h-3 w-48 bg-white/10 rounded" />
                    </div>
                  </PaywallOverlay>
                )}
              </div>
            </div>
          </motion.div>

        </div>
      </motion.div>

      <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onOpenChange={setIsUpgradeModalOpen}
        description={`Command Center: Your daily quota of ${limits.dailyLeadScrapes} scrapes on the ${userPlan} protocol is exhausted. Elevate your clearance for 10K+ daily detections.`}
      />
    </SideBar>
  );
}

// Custom simple refresh component
function RefreshCw(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" />
    </svg>
  )
}
