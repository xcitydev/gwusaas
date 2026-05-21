"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Library, Trash2, Copy, Mail, MessageCircle, Search, Send } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { SendTestDialog } from "@/components/dashboard/SendTestDialog";

type EmailStep = { subject: string; body: string };
type SmsStep = { body: string };

export function SavedTemplatesLibrary() {
  const { user } = useUser();
  const templates = useQuery(
    api.outreachTemplates.listTemplates,
    user?.id ? { clerkUserId: user.id } : "skip",
  );
  const deleteTemplate = useMutation(api.outreachTemplates.deleteTemplate);
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState<"all" | "email" | "sms">("all");
  const [sendOpen, setSendOpen] = useState(false);
  const [sendTarget, setSendTarget] = useState<
    | { _id: string; channel: string; name: string; steps: unknown }
    | null
  >(null);

  const filtered = useMemo(() => {
    if (!templates) return [];
    const q = search.toLowerCase().trim();
    return templates.filter((t) => {
      if (channel !== "all" && t.channel !== channel) return false;
      if (!q) return true;
      const haystack = `${t.name} ${t.tags.join(" ")}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [templates, search, channel]);

  const onDelete = async (id: string) => {
    if (!user?.id) return;
    if (!confirm("Delete this template?")) return;
    try {
      await deleteTemplate({ clerkUserId: user.id, templateId: id as Id<"outreachTemplates"> });
      toast.success("Template deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const onCopy = (template: NonNullable<typeof templates>[number]) => {
    const steps = Array.isArray(template.steps) ? template.steps : [];
    const text = steps
      .map((s: EmailStep | SmsStep, i: number) => {
        if (template.channel === "email") {
          const e = s as EmailStep;
          return `Step ${i + 1} — ${e.subject}\n\n${e.body}`;
        }
        return `Step ${i + 1}\n\n${(s as SmsStep).body}`;
      })
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Sequence copied");
  };

  return (
    <Card className="glass-card border-white/5 overflow-hidden">
      <CardHeader className="border-b border-white/5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Library className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-black">Saved Templates</CardTitle>
              <CardDescription>Email & SMS sequences saved from previous runs.</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {templates?.length ?? 0} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or tag…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/5 border-white/10 h-10 pl-9"
            />
          </div>
          <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
            <SelectTrigger className="bg-white/5 border-white/10 h-10 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {templates === undefined ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-xl bg-white/[0.03] border border-dashed border-white/10">
            <Library className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {templates.length === 0
                ? "Save a generated email or SMS sequence to start your library."
                : "No templates match your filters."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => {
              const steps = Array.isArray(t.steps) ? t.steps : [];
              return (
                <details
                  key={t._id}
                  className="rounded-xl border border-white/5 bg-white/[0.03] p-4 group"
                >
                  <summary className="cursor-pointer flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          t.channel === "email"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-emerald-500/10 text-emerald-400"
                        }`}
                      >
                        {t.channel === "email" ? (
                          <Mail className="w-4 h-4" />
                        ) : (
                          <MessageCircle className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{t.name}</p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {t.tags.slice(0, 4).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[9px] bg-white/5">
                              {tag}
                            </Badge>
                          ))}
                          <span className="text-[10px] text-muted-foreground self-center">
                            {steps.length} steps
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-primary hover:bg-primary/10"
                        title="Send test"
                        onClick={(e) => {
                          e.preventDefault();
                          setSendTarget({
                            _id: t._id,
                            channel: t.channel,
                            name: t.name,
                            steps: t.steps,
                          });
                          setSendOpen(true);
                        }}
                      >
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.preventDefault();
                          onCopy(t);
                        }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-rose-400 hover:bg-rose-400/10"
                        onClick={(e) => {
                          e.preventDefault();
                          onDelete(t._id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </summary>
                  <div className="mt-3 space-y-2 pl-11">
                    {steps.map((s: EmailStep | SmsStep, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg bg-black/30 border border-white/5">
                        {t.channel === "email" && (
                          <p className="text-[11px] font-bold text-primary mb-1.5">
                            {(s as EmailStep).subject}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {s.body}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </CardContent>
      <SendTestDialog open={sendOpen} onOpenChange={setSendOpen} template={sendTarget} />
    </Card>
  );
}
