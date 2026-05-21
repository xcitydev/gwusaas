"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Bot,
  Pause,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
  Zap,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import SideBar from "@/components/SideBar";
import { PlanGate } from "@/components/PlanGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Channel = "instagram" | "sms" | "email" | "facebook" | "whatsapp";
type Mode = "approval" | "autonomous";
type Goal = "book-call" | "qualify" | "send-pricing" | "custom";

const CHANNEL_LABELS: Record<Channel, string> = {
  instagram: "Instagram",
  sms: "SMS",
  email: "Email",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
};

const GOAL_LABELS: Record<Goal, string> = {
  "book-call": "Book a call",
  qualify: "Qualify the lead",
  "send-pricing": "Share pricing",
  custom: "Custom",
};

const STAGE_COLUMNS: Array<{
  key: string;
  label: string;
}> = [
  { key: "contacted", label: "Contacted" },
  { key: "replied", label: "Replied" },
  { key: "call-booked", label: "Call Booked" },
  { key: "call-done", label: "Call Done" },
  { key: "proposal-sent", label: "Proposal Sent" },
  { key: "closed-won", label: "Closed Won" },
  { key: "closed-lost", label: "Closed Lost" },
];

export default function AutomationsPage() {
  const rules = useQuery(api.automations.list, {});
  const deals = useQuery(api.automations.listDeals, {});
  const updateRule = useMutation(api.automations.update);
  const removeRule = useMutation(api.automations.remove);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"automations"> | null>(null);
  const [deleteId, setDeleteId] = useState<Id<"automations"> | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const stats = useMemo(() => {
    const active = rules?.filter((r) => r.status === "active").length ?? 0;
    const totalReplies =
      rules?.reduce((sum, r) => sum + r.totalRepliesSent, 0) ?? 0;
    const totalRuns =
      rules?.reduce((sum, r) => sum + r.totalRunsStarted, 0) ?? 0;
    return { active, totalReplies, totalRuns };
  }, [rules]);

  const dealsByStage = useMemo(() => {
    const groups: Record<string, Doc<"automationDeals">[]> = {};
    for (const col of STAGE_COLUMNS) groups[col.key] = [];
    for (const deal of deals ?? []) {
      const bucket = groups[deal.stage] ?? groups["contacted"];
      bucket.push(deal);
    }
    return groups;
  }, [deals]);

  const toggleRule = async (rule: Doc<"automations">) => {
    try {
      await updateRule({
        id: rule._id,
        status: rule.status === "active" ? "paused" : "active",
      });
      toast.success(
        rule.status === "active" ? "Automation paused" : "Automation activated",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await removeRule({ id: deleteId });
      toast.success("Automation deleted");
      setDeleteId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 md:p-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-xs sm:text-sm uppercase tracking-widest">
              <Bot className="w-4 h-4" />
              <span>Automations</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white/90">
              AI auto-replies
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground font-medium max-w-2xl">
              Set a trigger (e.g. someone DMs &quot;Miami&quot;) and the AI
              will reply on your behalf — drafting for your approval or
              sending autonomously — until the deal closes.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setWizardOpen(true);
            }}
            className="h-12 px-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest amber-glow"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Automation
          </Button>
        </div>

        <PlanGate requiredPlan="growth">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Active rules" value={stats.active} icon={Zap} />
            <StatCard
              label="Threads handled"
              value={stats.totalRuns}
              icon={Sparkles}
            />
            <StatCard
              label="Replies sent"
              value={stats.totalReplies}
              icon={Wand2}
            />
          </div>

          {/* Rules list */}
          <Card>
            <CardHeader>
              <CardTitle>Your automations</CardTitle>
              <CardDescription>
                Toggle on/off. Click any rule to edit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rules === undefined && (
                <p className="text-sm text-muted-foreground">Loading…</p>
              )}
              {rules && rules.length === 0 && (
                <div className="text-center py-12 space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">
                    No automations yet.
                  </p>
                  <Button
                    onClick={() => {
                      setEditing(null);
                      setWizardOpen(true);
                    }}
                    variant="outline"
                    className="font-bold"
                  >
                    Create your first
                  </Button>
                </div>
              )}
              {rules && rules.length > 0 && (
                <ul className="space-y-2">
                  {rules.map((rule) => (
                    <li
                      key={rule._id}
                      className="rounded-xl border border-white/5 bg-white/2 hover:border-primary/20 transition p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(rule);
                          setWizardOpen(true);
                        }}
                        className="flex-1 min-w-0 text-left space-y-1"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-white/90">{rule.name}</p>
                          <Badge
                            className={cn(
                              "text-[9px] font-black uppercase tracking-widest border",
                              rule.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
                            )}
                          >
                            {rule.status}
                          </Badge>
                          <Badge
                            className={cn(
                              "text-[9px] font-black uppercase tracking-widest border",
                              rule.mode === "autonomous"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-primary/10 text-primary border-primary/20",
                            )}
                          >
                            {rule.mode === "autonomous"
                              ? "Auto-send"
                              : "Approval"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Trigger: <span className="text-white/80 font-mono">&quot;{rule.triggerValue}&quot;</span>
                          {" · "}
                          {rule.channels.map((c) => CHANNEL_LABELS[c as Channel] ?? c).join(", ")}
                          {" · "}
                          Goal: {GOAL_LABELS[rule.goal as Goal] ?? rule.goal}
                          {" · "}
                          {rule.totalRepliesSent} replies sent
                        </p>
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleRule(rule)}
                          className="gap-1.5"
                        >
                          {rule.status === "active" ? (
                            <>
                              <Pause className="w-3.5 h-3.5" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" />
                              Activate
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(rule._id)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Pipeline */}
          <Card>
            <CardHeader>
              <CardTitle>Automation pipeline</CardTitle>
              <CardDescription>
                Deals the AI has opened. Move cards manually as conversations
                progress. Closed-Won / Closed-Lost stops the automation for
                that thread.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-1 px-1">
                <div className="flex gap-3 min-w-max pb-2">
                  {STAGE_COLUMNS.map((col) => (
                    <div
                      key={col.key}
                      className="w-56 shrink-0 rounded-xl bg-white/2 border border-white/5 p-3 space-y-2"
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                        {col.label}
                        <span className="text-primary">
                          {dealsByStage[col.key]?.length ?? 0}
                        </span>
                      </p>
                      <div className="space-y-2">
                        {(dealsByStage[col.key] ?? []).map((deal) => (
                          <DealCard key={deal._id} deal={deal} />
                        ))}
                        {(dealsByStage[col.key]?.length ?? 0) === 0 && (
                          <p className="text-[10px] text-muted-foreground italic">
                            Empty
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </PlanGate>
      </div>

      <AutomationWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        editing={editing}
      />

      <Dialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete automation?</DialogTitle>
            <DialogDescription>
              This stops the rule and any in-progress threads. Past replies
              and runs are kept for history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleteLoading}
            >
              {deleteLoading ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SideBar>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-5 space-y-3">
      <div className="p-2 rounded-lg bg-white/5 border border-white/5 w-fit text-muted-foreground">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight text-white/90">
          {value}
        </p>
      </div>
    </div>
  );
}

function DealCard({ deal }: { deal: Doc<"automationDeals"> }) {
  const setStage = useMutation(api.automations.setDealStage);
  return (
    <div className="rounded-lg bg-white/5 border border-white/10 p-3 space-y-2">
      <p className="text-xs font-bold text-white/90 truncate">
        {deal.contactLabel}
      </p>
      {deal.dealValue ? (
        <p className="text-[10px] text-primary font-bold">
          ${deal.dealValue.toLocaleString()}
        </p>
      ) : null}
      <select
        value={deal.stage}
        onChange={(e) =>
          setStage({ dealId: deal._id, stage: e.target.value }).catch((err) =>
            toast.error(err instanceof Error ? err.message : "Update failed"),
          )
        }
        className="w-full text-[10px] bg-white/5 border border-white/10 rounded px-1.5 py-1 text-white/80"
      >
        {STAGE_COLUMNS.map((s) => (
          <option key={s.key} value={s.key} className="bg-background">
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function AutomationWizard({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: Doc<"automations"> | null;
}) {
  const create = useMutation(api.automations.create);
  const update = useMutation(api.automations.update);
  const isEditing = editing !== null;

  const [name, setName] = useState(editing?.name ?? "");
  const [triggerValue, setTriggerValue] = useState(editing?.triggerValue ?? "");
  const [channels, setChannels] = useState<Channel[]>(
    (editing?.channels as Channel[]) ?? ["instagram"],
  );
  const [mode, setMode] = useState<Mode>((editing?.mode as Mode) ?? "approval");
  const [goal, setGoal] = useState<Goal>((editing?.goal as Goal) ?? "book-call");
  const [persona, setPersona] = useState(editing?.persona ?? "");
  const [maxReplies, setMaxReplies] = useState(
    editing?.maxRepliesPerThread ?? 8,
  );
  const [disclaimerRequired, setDisclaimerRequired] = useState(
    editing?.disclaimerRequired ?? true,
  );
  const [autoCreateDeal, setAutoCreateDeal] = useState(
    editing?.autoCreateDeal ?? true,
  );
  const [dealValue, setDealValue] = useState(
    editing?.defaultDealValue?.toString() ?? "",
  );
  const [submitting, setSubmitting] = useState(false);

  // Reset form when editing target changes
  useMemo(() => {
    if (open) {
      setName(editing?.name ?? "");
      setTriggerValue(editing?.triggerValue ?? "");
      setChannels((editing?.channels as Channel[]) ?? ["instagram"]);
      setMode((editing?.mode as Mode) ?? "approval");
      setGoal((editing?.goal as Goal) ?? "book-call");
      setPersona(editing?.persona ?? "");
      setMaxReplies(editing?.maxRepliesPerThread ?? 8);
      setDisclaimerRequired(editing?.disclaimerRequired ?? true);
      setAutoCreateDeal(editing?.autoCreateDeal ?? true);
      setDealValue(editing?.defaultDealValue?.toString() ?? "");
    }
  }, [open, editing]);

  const toggleChannel = (c: Channel) => {
    setChannels((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Give it a name");
      return;
    }
    if (!triggerValue.trim()) {
      toast.error("Add a trigger keyword");
      return;
    }
    if (channels.length === 0) {
      toast.error("Pick at least one channel");
      return;
    }
    setSubmitting(true);
    try {
      const args = {
        name: name.trim(),
        triggerValue: triggerValue.trim(),
        channels,
        mode,
        goal,
        persona,
        maxRepliesPerThread: maxReplies,
        disclaimerRequired,
        autoCreateDeal,
        defaultDealValue:
          dealValue.trim() && !Number.isNaN(Number(dealValue))
            ? Number(dealValue)
            : undefined,
      };
      if (isEditing && editing) {
        await update({ id: editing._id, ...args });
        toast.success("Automation updated");
      } else {
        await create(args);
        toast.success("Automation created");
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit automation" : "New automation"}
          </DialogTitle>
          <DialogDescription>
            Define a trigger, pick channels, and tell the AI how to behave.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          <FieldGroup label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Miami leads autoresponder"
            />
          </FieldGroup>

          <FieldGroup
            label="Trigger keyword"
            hint="Case-insensitive. Fires when an inbound message contains this text."
          >
            <Input
              value={triggerValue}
              onChange={(e) => setTriggerValue(e.target.value)}
              placeholder="e.g. miami"
            />
          </FieldGroup>

          <FieldGroup label="Channels" hint="Pick which inboxes this rule listens to.">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CHANNEL_LABELS) as Channel[]).map((c) => {
                const active = channels.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleChannel(c)}
                    className={cn(
                      "px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest transition",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10",
                    )}
                  >
                    {CHANNEL_LABELS[c]}
                  </button>
                );
              })}
            </div>
          </FieldGroup>

          <FieldGroup label="Mode" hint="Approval = drafts queued for your review. Autonomous = AI sends immediately.">
            <div className="grid grid-cols-2 gap-2">
              <ModeOption
                active={mode === "approval"}
                onClick={() => setMode("approval")}
                title="Approval"
                description="Drafts wait for your one-tap Send."
              />
              <ModeOption
                active={mode === "autonomous"}
                onClick={() => setMode("autonomous")}
                title="Autonomous"
                description="AI sends without asking. Use after you trust it."
              />
            </div>
          </FieldGroup>

          <FieldGroup label="Goal">
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as Goal)}
              className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white/90"
            >
              {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
                <option key={g} value={g} className="bg-background">
                  {GOAL_LABELS[g]}
                </option>
              ))}
            </select>
          </FieldGroup>

          <FieldGroup
            label="Persona / instructions"
            hint="Voice, what you sell, how you talk. The AI uses this verbatim in its system prompt."
          >
            <Textarea
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              placeholder={"e.g. I run a marketing agency for real estate agents in Florida. I'm friendly and direct. Always end by offering a 15-min Calendly call: https://cal.com/me/15."}
              className="min-h-[120px]"
            />
          </FieldGroup>

          <div className="grid gap-4 sm:grid-cols-2">
            <FieldGroup label="Max replies per thread" hint="Safety cap. AI won't keep pinging if the lead goes quiet.">
              <Input
                type="number"
                min={1}
                max={50}
                value={maxReplies}
                onChange={(e) => setMaxReplies(Number(e.target.value) || 8)}
              />
            </FieldGroup>
            <FieldGroup label="Default deal value (optional)" hint="Used in the pipeline view + future analytics.">
              <Input
                type="number"
                min={0}
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                placeholder="e.g. 5000"
              />
            </FieldGroup>
          </div>

          <ToggleRow
            label="Add 'AI assistant' disclaimer on first reply"
            description="Recommended. Lets the lead know they're chatting with an AI on your behalf."
            checked={disclaimerRequired}
            onChange={setDisclaimerRequired}
          />
          <ToggleRow
            label="Create a deal in the automation pipeline"
            description="When this rule first fires on a thread, open a deal at the Contacted stage."
            checked={autoCreateDeal}
            onChange={setAutoCreateDeal}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={submitting}
            className="amber-glow font-black uppercase tracking-widest text-xs"
          >
            {submitting
              ? "Saving…"
              : isEditing
                ? "Save changes"
                : "Create automation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ModeOption({
  active,
  onClick,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-left p-3 rounded-xl border transition",
        active
          ? "bg-primary/10 border-primary/40"
          : "bg-white/5 border-white/10 hover:bg-white/10",
      )}
    >
      <p className="font-bold text-sm text-white/90">{title}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
    </button>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full text-left p-3 rounded-xl border border-white/5 bg-white/2 hover:bg-white/5 transition flex items-start gap-3"
    >
      <div
        className={cn(
          "mt-0.5 w-9 h-5 rounded-full transition relative shrink-0",
          checked ? "bg-primary" : "bg-white/10",
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all",
            checked ? "left-4" : "left-0.5",
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white/90">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
      </div>
    </button>
  );
}
