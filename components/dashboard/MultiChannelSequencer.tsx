"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Layers, Plus, Trash2, Mail, MessageCircle, Save, Clock, ArrowDown } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type Step = {
  channel: "email" | "sms";
  delayDays: number;
  subject?: string;
  body: string;
};

const DEFAULT_STEPS: Step[] = [
  { channel: "email", delayDays: 0, subject: "Quick intro", body: "" },
  { channel: "sms", delayDays: 2, body: "Hey — sent you a note earlier. Worth a quick chat? Reply STOP to opt out." },
  { channel: "email", delayDays: 5, subject: "Following up", body: "" },
];

export function MultiChannelSequencer() {
  const { user } = useUser();
  const saveSequence = useMutation(api.outreachSequences.saveSequence);
  const deleteSequence = useMutation(api.outreachSequences.deleteSequence);
  const sequences = useQuery(
    api.outreachSequences.listSequences,
    user?.id ? { clerkUserId: user.id } : "skip",
  );
  const [name, setName] = useState("New drip — 7 days");
  const [steps, setSteps] = useState<Step[]>(DEFAULT_STEPS);
  const [saving, setSaving] = useState(false);

  const update = (idx: number, patch: Partial<Step>) => {
    setSteps((s) => s.map((step, i) => (i === idx ? { ...step, ...patch } : step)));
  };

  const add = (channel: "email" | "sms") => {
    setSteps((s) => [
      ...s,
      {
        channel,
        delayDays: (s.at(-1)?.delayDays ?? 0) + 3,
        subject: channel === "email" ? "" : undefined,
        body: "",
      },
    ]);
  };

  const remove = (idx: number) => setSteps((s) => s.filter((_, i) => i !== idx));

  const save = async () => {
    if (!user?.id) return;
    if (steps.some((s) => !s.body.trim() || (s.channel === "email" && !s.subject?.trim()))) {
      toast.error("Fill in every step before saving");
      return;
    }
    setSaving(true);
    try {
      await saveSequence({
        clerkUserId: user.id,
        name,
        steps,
        status: "draft",
      });
      toast.success("Sequence saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const removeSaved = async (id: string) => {
    if (!user?.id) return;
    if (!confirm("Delete this saved sequence?")) return;
    try {
      await deleteSequence({ clerkUserId: user.id, sequenceId: id as Id<"outreachSequences"> });
      toast.success("Deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card border-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-white/5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Layers className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-black">Multi-Channel Sequence Builder</CardTitle>
                <CardDescription>Email + SMS drip in one orchestrated timeline.</CardDescription>
              </div>
            </div>
            <Button onClick={save} disabled={saving} className="amber-glow">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving…" : "Save Sequence"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sequence name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/5 border-white/10 h-11"
            />
          </div>

          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div key={idx}>
                <div className="flex items-stretch gap-3">
                  <div className="flex flex-col items-center pt-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                        step.channel === "email"
                          ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      }`}
                    >
                      {step.channel === "email" ? <Mail className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                    </div>
                    {idx < steps.length - 1 && (
                      <div className="flex-1 w-px bg-white/10 my-2 min-h-[20px]" />
                    )}
                  </div>
                  <div className="flex-1 p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-bold uppercase">Step {idx + 1}</Badge>
                      <Select
                        value={step.channel}
                        onValueChange={(v) =>
                          update(idx, {
                            channel: v as "email" | "sms",
                            subject: v === "email" ? step.subject ?? "" : undefined,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-28 bg-white/5 border-white/10 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-md px-2 h-8">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <Input
                          type="number"
                          min={0}
                          max={90}
                          value={step.delayDays}
                          onChange={(e) =>
                            update(idx, { delayDays: Math.max(0, Number(e.target.value) || 0) })
                          }
                          className="bg-transparent border-0 h-6 w-12 p-0 text-xs"
                        />
                        <span className="text-[10px] text-muted-foreground">days</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 ml-auto text-rose-400 hover:text-rose-300 hover:bg-rose-400/10"
                        onClick={() => remove(idx)}
                        disabled={steps.length <= 1}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {step.channel === "email" && (
                      <Input
                        placeholder="Subject line…"
                        value={step.subject ?? ""}
                        onChange={(e) => update(idx, { subject: e.target.value })}
                        className="bg-white/5 border-white/10 h-9 text-sm"
                      />
                    )}
                    <Textarea
                      placeholder={step.channel === "email" ? "Email body…" : "SMS body (keep under 320 chars)…"}
                      value={step.body}
                      onChange={(e) => update(idx, { body: e.target.value })}
                      className="bg-white/5 border-white/10 min-h-[80px] text-sm"
                    />
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <div className="ml-5 my-1">
                    <ArrowDown className="w-3 h-3 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => add("email")} className="border-white/10">
              <Plus className="w-3.5 h-3.5 mr-2" /> Add Email Step
            </Button>
            <Button variant="outline" onClick={() => add("sms")} className="border-white/10">
              <Plus className="w-3.5 h-3.5 mr-2" /> Add SMS Step
            </Button>
          </div>
        </CardContent>
      </Card>

      {sequences && sequences.length > 0 && (
        <Card className="glass-card border-white/5">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="text-sm font-bold uppercase tracking-widest">Saved Sequences</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {sequences.map((s) => (
              <div key={s._id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
                  <span className="text-sm font-medium truncate">{s.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {Array.isArray(s.steps) ? s.steps.length : 0} steps
                  </span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-rose-400 hover:bg-rose-400/10"
                  onClick={() => removeSaved(s._id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
