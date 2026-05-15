"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Send,
  Plus,
  Target,
  Sparkles,
  MessageSquare,
  ArrowLeft,
  Instagram,
  Megaphone,
  Inbox,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import SideBar from "@/components/SideBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceFormsSettings } from "@/components/dashboard/ServiceFormsSettings";
import { cn } from "@/lib/utils";

const campaignTypeMeta: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  "real-estate": { label: "Real Estate Outreach", icon: Target },
  general: { label: "Instagram Outreach", icon: Instagram },
  "mass-dm": { label: "Mass DM Blast", icon: Megaphone },
};

const formatDate = (ts?: number) => {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const statusTone = (status?: string) => {
  switch (status) {
    case "setup":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "active":
    case "running":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "paused":
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    case "completed":
      return "bg-primary/10 text-primary border-primary/20";
    default:
      return "bg-white/5 text-muted-foreground border-white/10";
  }
};

type Campaign = {
  _id: string;
  campaignType?: string;
  instagramUsername?: string;
  status?: string;
  createdAt?: number;
  targetAccounts?: string[];
  dmCount?: string;
};

export default function GetNewCustomersPage() {
  const [launcherOpen, setLauncherOpen] = useState(false);

  const campaigns = useQuery(api.outreachCampaigns.list, {}) as
    | Campaign[]
    | undefined;

  const stats = useMemo(() => {
    const rows = campaigns ?? [];
    return {
      total: rows.length,
      active: rows.filter((c) => c.status === "setup" || c.status === "active" || c.status === "running").length,
      targets: rows.reduce((sum, c) => sum + (c.targetAccounts?.length ?? 0), 0),
    };
  }, [campaigns]);

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-6xl p-6 md:p-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest">
              <Send className="w-4 h-4" />
              <span>Get New Customers</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white/90">
              {launcherOpen ? "Launch new outreach" : "Your outreach"}
            </h1>
            <p className="text-muted-foreground font-medium max-w-xl">
              {launcherOpen
                ? "Pick what kind of outreach you want to run. We'll save it as a campaign you can come back to."
                : "Launch a new campaign or review past ones."}
            </p>
          </div>

          {!launcherOpen && (
            <Button
              onClick={() => setLauncherOpen(true)}
              className="h-12 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest amber-glow"
            >
              <Plus className="w-4 h-4 mr-2 stroke-3" />
              Launch New
            </Button>
          )}

          {launcherOpen && (
            <Button
              variant="outline"
              onClick={() => setLauncherOpen(false)}
              className="h-11 px-5 rounded-xl border-white/10 hover:bg-white/5 font-bold"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to campaigns
            </Button>
          )}
        </motion.div>

        {/* Launch flow */}
        <AnimatePresence mode="wait">
          {launcherOpen ? (
            <motion.div
              key="launcher"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <ServiceFormsSettings
                allowedServices={["real-estate", "general", "mass-dm"]}
                title="Pick an outreach style"
                description="Each option creates a saved campaign with your settings."
                onSubmitted={() => setLauncherOpen(false)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-8"
            >
              {/* Stats */}
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Total Campaigns" value={stats.total} icon={Inbox} />
                <StatCard label="Currently Running" value={stats.active} icon={Sparkles} accent />
                <StatCard label="Targets Across All" value={stats.targets} icon={Target} />
              </div>

              {/* List */}
              <Card className="glass-card border-white/5 overflow-hidden">
                <CardHeader className="border-b border-white/5 bg-white/5">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-primary" />
                    Past Campaigns
                  </CardTitle>
                  <CardDescription>
                    Every outreach campaign you&apos;ve launched, newest first.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 md:p-8">
                  {campaigns === undefined && (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  )}

                  {campaigns !== undefined && campaigns.length === 0 && (
                    <div className="text-center py-12 space-y-3">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <MessageSquare className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-medium">No campaigns yet.</p>
                      <p className="text-xs text-muted-foreground">
                        Launch your first outreach to see it here.
                      </p>
                      <Button
                        onClick={() => setLauncherOpen(true)}
                        className="mt-4 h-11 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest amber-glow"
                      >
                        <Plus className="w-4 h-4 mr-2 stroke-3" />
                        Launch First Campaign
                      </Button>
                    </div>
                  )}

                  {campaigns !== undefined && campaigns.length > 0 && (
                    <ul className="space-y-3">
                      {[...campaigns]
                        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
                        .map((c) => {
                          const meta =
                            campaignTypeMeta[c.campaignType ?? ""] ?? {
                              label: c.campaignType ?? "Outreach",
                              icon: MessageSquare,
                            };
                          const Icon = meta.icon;
                          return (
                            <motion.li
                              key={c._id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="rounded-2xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                  <Icon className="w-5 h-5 text-primary" />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-bold text-white/90">
                                      {meta.label}
                                    </p>
                                    <Badge
                                      className={cn(
                                        "text-[9px] font-black uppercase tracking-widest border",
                                        statusTone(c.status)
                                      )}
                                    >
                                      {c.status ?? "draft"}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {c.instagramUsername
                                      ? `@${c.instagramUsername.replace(/^@/, "")}`
                                      : "—"}
                                    {" · "}
                                    {c.targetAccounts?.length
                                      ? `${c.targetAccounts.length} targets`
                                      : c.dmCount
                                      ? `${c.dmCount} DMs`
                                      : "no targets"}
                                    {" · "}
                                    {formatDate(c.createdAt)}
                                  </p>
                                </div>
                              </div>
                            </motion.li>
                          );
                        })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SideBar>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 space-y-3",
        accent
          ? "bg-primary/5 border-primary/20"
          : "glass-card border-white/5"
      )}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "p-2 rounded-lg border",
            accent
              ? "bg-primary/10 border-primary/20 text-primary"
              : "bg-white/5 border-white/5 text-muted-foreground"
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "text-3xl font-black tabular-nums tracking-tight",
            accent ? "text-primary" : "text-white/90"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
