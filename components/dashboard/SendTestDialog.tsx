"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send, RefreshCw } from "lucide-react";

type EmailStep = { subject: string; body: string };
type SmsStep = { body: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: {
    _id: string;
    channel: string;
    name: string;
    steps: unknown;
  } | null;
};

export function SendTestDialog({ open, onOpenChange, template }: Props) {
  const [to, setTo] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [sending, setSending] = useState(false);

  if (!template) return null;
  const steps = Array.isArray(template.steps) ? template.steps : [];
  const step = steps[stepIndex] as EmailStep | SmsStep | undefined;
  const isEmail = template.channel === "email";

  const send = async () => {
    if (!to || !step) return;
    setSending(true);
    try {
      const url = isEmail ? "/api/send/email" : "/api/send/sms";
      const payload = isEmail
        ? {
            to,
            subject: (step as EmailStep).subject,
            body: step.body,
            templateId: template._id,
          }
        : {
            to,
            body: step.body,
            templateId: template._id,
          };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Send failed");
      toast.success(`Sent to ${to}`);
      onOpenChange(false);
      setTo("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Send Test {isEmail ? "Email" : "SMS"}
          </DialogTitle>
          <DialogDescription>
            <Badge variant="outline" className="mr-2">{template.channel}</Badge>
            {template.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Step to send
            </Label>
            <Select value={String(stepIndex)} onValueChange={(v) => setStepIndex(Number(v))}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {steps.map((s, idx) => {
                  const label = isEmail
                    ? (s as EmailStep).subject?.slice(0, 60) || `Step ${idx + 1}`
                    : (s as SmsStep).body?.slice(0, 60) + "…";
                  return (
                    <SelectItem key={idx} value={String(idx)}>
                      Step {idx + 1} · {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {isEmail ? "Recipient email" : "Recipient phone (E.164)"}
            </Label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder={isEmail ? "you@example.com" : "+15551234567"}
              className="bg-white/5 border-white/10"
            />
          </div>

          {step && (
            <div className="p-3 rounded-lg bg-black/30 border border-white/5 max-h-[200px] overflow-y-auto">
              {isEmail && (
                <p className="text-xs font-bold text-primary mb-1.5">
                  {(step as EmailStep).subject}
                </p>
              )}
              <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {step.body}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={send} disabled={!to || sending} className="amber-glow">
            {sending ? <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-2" />}
            {sending ? "Sending…" : "Send Test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
