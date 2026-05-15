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
  CheckCircle2,
  CircleDot,
  PauseCircle,
  Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import SideBar from "@/components/SideBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const statusMeta = (status?: string) => {
  switch (status) {
    case "active":
    case "running":
      return {
        label: "Active",
        helper: "Running right now — we're sending DMs.",
        icon: CheckCircle2,
      };
    case "setup":
      return {
        label: "In setup",
        helper: "Waiting for our team to wire up the automation.",
        icon: Settings,
      };
    case "paused":
      return {
        label: "Paused",
        helper: "Temporarily stopped. Reach out to resume.",
        icon: PauseCircle,
      };
    case "completed":
      return {
        label: "Completed",
        helper: "This campaign has finished sending.",
        icon: CheckCircle2,
      };
    default:
      return {
        label: status ?? "Draft",
        helper: "Status unknown.",
        icon: CircleDot,
      };
  }
};

type Campaign = {
  _id: string;
  campaignType?: string;
  instagramUsername?: string;
  instagramPassword?: string;
  backupCodes?: string;
  idealClient?: string;
  targetLocations?: string;
  targetAccounts?: string[];
  outreachScript?: string;
  allowFollow?: boolean;
  enableEngagement?: boolean;
  dmCount?: string;
  contactEmail?: string;
  contactPhone?: string;
  comments?: string;
  status?: string;
  createdAt?: number;
  updatedAt?: number;
};

export default function GetNewCustomersPage() {
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null,
  );

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
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedCampaign(c)}
                                className="w-full text-left rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 hover:bg-white/[0.07] transition-all p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                                          statusTone(c.status),
                                        )}
                                      >
                                        {statusMeta(c.status).label}
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
                                <span className="hidden md:inline text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                                  View details →
                                </span>
                              </button>
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

      <CampaignDetailDialog
        campaign={selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
      />
    </SideBar>
  );
}

function CampaignDetailDialog({
  campaign,
  onClose,
}: {
  campaign: Campaign | null;
  onClose: () => void;
}) {
  const open = campaign !== null;
  const meta = campaign
    ? (campaignTypeMeta[campaign.campaignType ?? ""] ?? {
        label: campaign.campaignType ?? "Outreach",
        icon: MessageSquare,
      })
    : null;
  const status = statusMeta(campaign?.status);
  const StatusIcon = status.icon;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-card border-white/10">
        {campaign && meta && (
          <>
            <DialogHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <meta.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-xl font-black tracking-tight">
                    {meta.label}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Created {formatDate(campaign.createdAt)}
                    {campaign.updatedAt &&
                    campaign.updatedAt !== campaign.createdAt
                      ? ` · Updated ${formatDate(campaign.updatedAt)}`
                      : ""}
                  </DialogDescription>
                </div>
              </div>

              <div
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3",
                  statusTone(campaign.status),
                )}
              >
                <StatusIcon className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-xs font-black uppercase tracking-widest">
                    {status.label}
                  </p>
                  <p className="text-xs opacity-80">{status.helper}</p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-5 mt-2">
              <DetailSection title="Instagram account">
                <DetailRow
                  label="Username"
                  value={
                    campaign.instagramUsername
                      ? `@${campaign.instagramUsername.replace(/^@/, "")}`
                      : undefined
                  }
                />
                <DetailRow
                  label="Password"
                  value={campaign.instagramPassword ? "Provided" : undefined}
                  hint="Stored encrypted — never shown."
                />
                <DetailRow
                  label="Backup codes"
                  value={campaign.backupCodes ? "Provided" : undefined}
                  hint="Stored encrypted — never shown."
                />
              </DetailSection>

              <DetailSection title="Targeting">
                <DetailRow
                  label="Ideal client"
                  value={campaign.idealClient}
                  multiline
                />
                <DetailRow
                  label="Target locations"
                  value={campaign.targetLocations}
                />
                {campaign.targetAccounts && campaign.targetAccounts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Target accounts ({campaign.targetAccounts.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {campaign.targetAccounts.map((t) => (
                        <span
                          key={t}
                          className="text-xs font-mono px-2 py-1 rounded-md bg-white/5 border border-white/10"
                        >
                          @{t.replace(/^@/, "")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <DetailRow label="DM volume" value={campaign.dmCount} />
              </DetailSection>

              <DetailSection title="Outreach settings">
                <DetailRow
                  label="Outreach script"
                  value={campaign.outreachScript}
                  multiline
                />
                <div className="grid grid-cols-2 gap-3">
                  <ToggleRow
                    label="Allow following targets"
                    on={!!campaign.allowFollow}
                  />
                  <ToggleRow
                    label="Free engagement service"
                    on={!!campaign.enableEngagement}
                  />
                </div>
              </DetailSection>

              {(campaign.contactEmail ||
                campaign.contactPhone ||
                campaign.comments) && (
                <DetailSection title="Contact & notes">
                  <DetailRow label="Email" value={campaign.contactEmail} />
                  <DetailRow label="Phone" value={campaign.contactPhone} />
                  <DetailRow
                    label="Comments"
                    value={campaign.comments}
                    multiline
                  />
                </DetailSection>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">
        {title}
      </h3>
      <div className="space-y-3 rounded-xl border border-white/5 bg-white/2 p-4">
        {children}
      </div>
    </section>
  );
}

function DetailRow({
  label,
  value,
  hint,
  multiline,
}: {
  label: string;
  value?: string;
  hint?: string;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {value ? (
        <p
          className={cn(
            "text-sm text-white/90",
            multiline && "whitespace-pre-wrap leading-relaxed",
          )}
        >
          {value}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground italic">Not provided</p>
      )}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ToggleRow({ label, on }: { label: string; on: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 flex items-center justify-between",
        on
          ? "bg-emerald-500/5 border-emerald-500/20"
          : "bg-white/2 border-white/5",
      )}
    >
      <span className="text-xs font-medium text-white/80">{label}</span>
      <span
        className={cn(
          "text-[10px] font-black uppercase tracking-widest",
          on ? "text-emerald-400" : "text-muted-foreground",
        )}
      >
        {on ? "On" : "Off"}
      </span>
    </div>
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
