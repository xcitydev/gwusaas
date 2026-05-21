"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { Inbox, Sparkles, RefreshCw, Copy } from "lucide-react";

type ClassifyResult = {
  category: string;
  confidence: number;
  sentiment: "positive" | "neutral" | "negative";
  summary: string;
  suggestedAction: string;
  draftReply: { subject?: string; body: string };
};

const CATEGORY_LABEL: Record<string, string> = {
  interested: "Interested",
  objection_price: "Objection · Price",
  objection_timing: "Objection · Timing",
  objection_authority: "Objection · Authority",
  ooo: "Out of Office",
  unsubscribe: "Unsubscribe",
  not_now: "Not Now",
  wrong_person: "Wrong Person",
  neutral: "Neutral",
};

const CATEGORY_COLOR: Record<string, string> = {
  interested: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  objection_price: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  objection_timing: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  objection_authority: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  ooo: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  unsubscribe: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  not_now: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  wrong_person: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  neutral: "bg-white/5 text-muted-foreground border-white/10",
};

export function ReplyClassifier() {
  const [reply, setReply] = useState("");
  const [originalSubject, setOriginalSubject] = useState("");
  const [originalBody, setOriginalBody] = useState("");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassifyResult | null>(null);

  const classify = async () => {
    if (!reply.trim()) {
      toast.error("Paste the reply first");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/reply-classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply, originalSubject, originalBody, channel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setResult(data);
      toast.success(`Classified: ${CATEGORY_LABEL[data.category] ?? data.category}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  return (
    <Card className="glass-card border-white/5 overflow-hidden">
      <CardHeader className="border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Inbox className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl font-black">Reply Classifier + Auto-Draft</CardTitle>
            <CardDescription>Triage inbound replies and get a ready-to-send response.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-1">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Channel</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as "email" | "sms")}>
              <SelectTrigger className="bg-white/5 border-white/10 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Original subject (optional)</Label>
            <Input
              value={originalSubject}
              onChange={(e) => setOriginalSubject(e.target.value)}
              placeholder="What you sent them"
              className="bg-white/5 border-white/10 h-11"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Original message body (optional, helps context)
          </Label>
          <Textarea
            value={originalBody}
            onChange={(e) => setOriginalBody(e.target.value)}
            placeholder="Paste the original outreach…"
            className="bg-white/5 border-white/10 min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Inbound reply
          </Label>
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Paste what they wrote back…"
            className="bg-white/5 border-white/10 min-h-[140px]"
          />
        </div>

        <Button
          onClick={classify}
          disabled={loading}
          className="w-full h-12 amber-glow font-black uppercase tracking-widest"
        >
          {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {loading ? "Classifying…" : "Classify & Draft Reply"}
        </Button>

        {result && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={CATEGORY_COLOR[result.category] ?? CATEGORY_COLOR.neutral}>
                {CATEGORY_LABEL[result.category] ?? result.category}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                Confidence: {Math.round(result.confidence * 100)}%
              </Badge>
              <Badge variant="outline" className="text-[10px] capitalize">
                Sentiment: {result.sentiment}
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Summary</div>
                <p className="text-sm">{result.summary}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Suggested Action</div>
                <p className="text-sm">{result.suggestedAction}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Drafted Reply</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    copy(
                      result.draftReply.subject
                        ? `${result.draftReply.subject}\n\n${result.draftReply.body}`
                        : result.draftReply.body,
                    )
                  }
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
                </Button>
              </div>
              {result.draftReply.subject && (
                <p className="text-sm font-bold">{result.draftReply.subject}</p>
              )}
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {result.draftReply.body}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
