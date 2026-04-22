"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import SideBar from "@/components/SideBar";
import { useSelectedClient } from "@/context/ClientContext";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageSquare, Users, Plus, Sparkles, Send, BarChart3, Target, Calendar, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@clerk/nextjs";
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

export default function OutreachPage() {
  const { user } = useUser();
  const { organization, isLoaded: isOrgLoaded } = useOrganization();
  const { selectedClient } = useSelectedClient();
  const selectedClientId = selectedClient?._id;

  const convexOrg = useQuery(
    api.organization.getByClerkId,
    organization?.id ? { clerkOrgId: organization.id } : "skip"
  );

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [messageType, setMessageType] = useState<
    "account_outreach" | "mass_dm" | "follow_up"
  >("account_outreach");
  const [script, setScript] = useState("");
  const [targets, setTargets] = useState("");
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Plan & Usage Logic
  const userPlan = normalizePlan(user?.publicMetadata?.plan);
  const limits = PLAN_LIMITS[userPlan];
  const usageCount = useQuery(api.usage.getUsage, { metric: "dailyDms" }) ?? 0;
  const checkUsage = useMutation(api.usage.checkAndIncrementUsage);

  const createCampaign = useMutation(api.outreachWorkspace.createCampaign);

  const campaigns = useQuery(
    api.outreachWorkspace.listCampaigns,
    user?.id && selectedClientId
      ? { clerkUserId: user.id, clientId: selectedClientId }
      : "skip",
  ) as Array<{
    _id: string;
    campaignName: string;
    messageType: string;
    status: string;
    totalSent: number;
    totalReplies: number;
    totalBooked: number;
    totalClosed: number;
    startedAt?: number;
    isDemo?: boolean;
  }> | undefined;

  const activeCount = campaigns?.filter((c) => c.status === "active").length || 0;

  const stats = useMemo(() => {
    const rows = campaigns || [];
    return {
      sent: rows.reduce((sum, c) => sum + c.totalSent, 0),
      replies: rows.reduce((sum, c) => sum + c.totalReplies, 0),
      booked: rows.reduce((sum, c) => sum + c.totalBooked, 0),
      closed: rows.reduce((sum, c) => sum + c.totalClosed, 0),
    };
  }, [campaigns]);

  const onLaunch = async () => {
    if (!user?.id || !selectedClientId) return;
    try {
      const parsedTargets = targets
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((instagramUsername) => ({ instagramUsername }));
      
      if (parsedTargets.length === 0) {
        toast.error("Please add at least one target");
        return;
      }

      const usageCheck = await checkUsage({
        metric: "dailyDms",
        increment: parsedTargets.length,
      });

      if (!usageCheck.success) {
        setIsUpgradeModalOpen(true);
        return;
      }

      await createCampaign({
        clerkUserId: user.id,
        clientId: selectedClientId,
        campaignName: name.trim(),
        platform: "instagram",
        messageType,
        script: script.trim(),
        targets: parsedTargets,
      });
      setOpen(false);
      setName("");
      setScript("");
      setTargets("");
      toast.success("Campaign launched successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to launch campaign");
    }
  };

  if (!isOrgLoaded || (organization && convexOrg === undefined)) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
          <div className="absolute inset-0 animate-pulse bg-primary/10 rounded-full blur-xl"></div>
        </div>
        <p className="text-sm text-muted-foreground animate-pulse font-bold tracking-widest uppercase">Syncing Communications...</p>
      </div>
    );
  }

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
              <Send className="w-4 h-4" />
              <span>Outreach Command</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white/90">Campaign Control</h1>
            <p className="text-muted-foreground font-medium">Coordinate automated strikes and lead qualification.</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge className="hidden sm:flex h-9 px-4 text-xs font-bold bg-primary/10 text-primary border-primary/20 amber-glow items-center">
              <Sparkles className="h-3.5 w-3.5 mr-2" />
              {Math.max(0, limits.dailyDms - usageCount)} Payload Units Available
            </Badge>
            <Button onClick={() => setOpen(true)} className="h-11 px-6 font-black uppercase tracking-wider amber-glow rounded-xl">
              <Plus className="h-4 w-4 mr-2 stroke-[3]" />
              New Strike
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Active Strikes", val: activeCount, icon: Target, color: "text-primary" },
            { label: "Total Sent", val: stats.sent, icon: Send, color: "text-white/80" },
            { label: "Engagement", val: stats.replies, icon: MessageSquare, color: "text-amber-500" },
            { label: "Pipeline Conversions", val: stats.booked, icon: BarChart3, color: "text-emerald-500" },
          ].map((stat, i) => (
            <motion.div variants={item} key={i}>
              <div className="glass-card rounded-2xl p-6 border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className={cn("p-2 rounded-lg bg-white/5 border border-white/5", stat.color)}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <Badge variant="outline" className="text-[9px] border-white/5 text-muted-foreground font-black">24H</Badge>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                  <p className={cn("text-3xl font-black tabular-nums tracking-tight", stat.color)}>{stat.val}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div variants={item} className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Operational History
            </h3>
          </div>

          {(!campaigns || campaigns.length === 0) ? (
            <div className="glass-card rounded-[2rem] p-12 text-center border-dashed border-2 border-white/5">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                <MessageSquare className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-bold text-white/90">No Active Deployments</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Initialize your first outreach protocol to begin generating high-intent responses.
              </p>
              <Button className="mt-8 amber-glow h-11 px-8 font-black uppercase tracking-widest rounded-xl" onClick={() => setOpen(true)}>
                Deploy First Campaign
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              <AnimatePresence>
                {campaigns.map((campaign, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={campaign._id} 
                    className="glass-card rounded-2xl p-1 border-white/5 hover:border-primary/20 transition-all group"
                  >
                    <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center border border-white/10",
                            campaign.status === "active" ? "bg-primary/20 text-primary amber-glow" : "bg-white/5 text-muted-foreground"
                          )}>
                            <Target className="w-6 h-6" />
                          </div>
                          {campaign.status === "active" && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-ping" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <p className="font-bold text-lg text-white/90 tracking-tight">{campaign.campaignName}</p>
                            <Badge className={cn(
                              "text-[9px] font-black uppercase tracking-widest px-2 py-0.5",
                              campaign.status === "active" ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/20" : "bg-white/10 text-muted-foreground border-white/5"
                            )}>
                              {campaign.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                              <span className="w-1 h-1 rounded-full bg-white/40" />
                              {campaign.messageType.replace(/_/g, " ")}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                              <span className="w-1 h-1 rounded-full bg-white/40" />
                              {campaign.totalSent} DEPLOYED
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-white/70 font-bold">
                              <span className="w-1 h-1 rounded-full bg-primary" />
                              {campaign.totalReplies} REPLIES
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-auto">
                        <Button asChild variant="outline" className="h-10 px-5 font-bold border-white/5 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
                          <Link href={`/dashboard/outreach/${campaign._id}`}>
                            Analytics Center <ArrowRight className="ml-2 w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl bg-zinc-950 border-white/5 rounded-[2rem] p-8 shadow-2xl glass-card">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight text-white/90">Protocol Configuration</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Campaign Identifier</Label>
                <Input 
                  className="h-12 bg-white/5 border-white/5 rounded-xl px-4 font-medium focus:ring-primary/20 transition-all"
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="E.g. Q2 Luxury Real Estate Blast"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Strike Pattern</Label>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {[
                    ["account_outreach", "Infiltration"],
                    ["mass_dm", "Saturation"],
                    ["follow_up", "Re-Engagement"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      className={cn(
                        "h-11 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border",
                        messageType === value 
                          ? "bg-primary text-primary-foreground border-primary amber-glow" 
                          : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                      )}
                      onClick={() =>
                        setMessageType(value as "account_outreach" | "mass_dm" | "follow_up")
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Transmission Script (AI Enhanced)</Label>
                <Textarea
                  className="bg-white/5 border-white/5 rounded-2xl p-4 font-medium focus:ring-primary/20 transition-all min-h-[120px]"
                  rows={4}
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Architect the primary messaging sequence..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Target Nodes (One @username per line)</Label>
                <Textarea
                  className="bg-white/5 border-white/5 rounded-2xl p-4 font-medium focus:ring-primary/20 transition-all min-h-[150px]"
                  rows={5}
                  value={targets}
                  onChange={(e) => setTargets(e.target.value)}
                  placeholder="@node_zero&#10;@node_one"
                />
              </div>
              <Button
                className="w-full h-14 rounded-2xl font-black uppercase tracking-wider amber-glow text-base mt-2"
                disabled={!name.trim() || !script.trim() || !targets.trim()}
                onClick={() => void onLaunch()}
              >
                Launch Protocol
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <UpgradeModal 
          isOpen={isUpgradeModalOpen} 
          onOpenChange={setIsUpgradeModalOpen}
          description={`Quota Limit Reached: Your current ${userPlan} protocol frequency of ${limits.dailyDms} daily DMs is exhausted. Elevate clearance level for high-volume saturation.`}
        />
      </motion.div>
    </SideBar>
  );
}
