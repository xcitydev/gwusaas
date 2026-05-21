"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Bot, CheckCircle2, Send, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Renders a thin banner above a conversation thread when an automation is
 * currently handling it. Shows:
 * - which rule is running, in what mode
 * - pending approval drafts (with one-tap Send / Discard)
 * - a Take Over button that stops the automation for this thread
 *
 * Returns null when there's no active run, so it can sit unconditionally
 * inside the conversation view.
 */
export function AutomationStatusBanner({
  conversationId,
}: {
  conversationId: string | null | undefined;
}) {
  const run = useQuery(
    api.automations.getRunForConversation,
    conversationId ? { conversationId } : "skip",
  );
  const drafts = useQuery(
    api.automations.listPendingDrafts,
    conversationId ? { conversationId } : "skip",
  );
  const allRules = useQuery(api.automations.list, run ? {} : "skip");
  const takeOver = useMutation(api.automations.takeOverRun);
  const discardDraft = useMutation(api.automations.discardDraft);
  const [sending, setSending] = useState<string | null>(null);

  const rule = useMemo(() => {
    if (!run || !allRules) return null;
    return allRules.find((r) => r._id === run.automationId) ?? null;
  }, [run, allRules]);

  if (!conversationId || !run) return null;
  if (run.status === "stopped" || run.status === "completed") return null;

  const pending = drafts ?? [];

  const handleTakeOver = async () => {
    try {
      await takeOver({ runId: run._id });
      toast.success("Automation stopped for this thread");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to take over");
    }
  };

  const handleSendDraft = async (draftId: Id<"automationDrafts">) => {
    setSending(draftId);
    try {
      const res = await fetch("/api/automations/send-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Send failed");
      }
      toast.success("Reply sent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(null);
    }
  };

  const handleDiscard = async (draftId: Id<"automationDrafts">) => {
    try {
      await discardDraft({ draftId });
      toast.success("Draft discarded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Discard failed");
    }
  };

  return (
    <div className="border-b border-white/5 bg-primary/5">
      <div className="px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
            <Bot className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white/90 truncate">
              Auto-replying via{" "}
              <span className="text-primary">
                {rule?.name ?? "automation"}
              </span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              {rule?.mode === "autonomous"
                ? "Autonomous — AI sends without asking"
                : "Approval mode — drafts wait for you"}
              {" · "}
              {run.replyCount} repl{run.replyCount === 1 ? "y" : "ies"} sent
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleTakeOver}
          className="gap-1.5 text-xs font-bold uppercase tracking-widest"
        >
          <X className="w-3 h-3" />
          Take over
        </Button>
      </div>

      {pending.length > 0 && (
        <div className="px-4 pb-3 space-y-2">
          {pending.map((draft) => (
            <div
              key={draft._id}
              className="rounded-lg border border-primary/30 bg-primary/10 p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                  AI draft ready
                </p>
                {draft.intent && (
                  <span className="text-[10px] text-muted-foreground">
                    · {draft.intent}
                  </span>
                )}
              </div>
              <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">
                {draft.body}
              </p>
              {draft.reasoning && (
                <p className="text-[10px] text-muted-foreground italic">
                  Why: {draft.reasoning}
                </p>
              )}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleSendDraft(draft._id)}
                  disabled={sending === draft._id}
                  className={cn(
                    "h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-widest text-[10px]",
                  )}
                >
                  <Send className="w-3 h-3" />
                  {sending === draft._id ? "Sending…" : "Send"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDiscard(draft._id)}
                  disabled={sending === draft._id}
                  className="h-8 text-xs text-muted-foreground hover:text-red-400"
                >
                  Discard
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
