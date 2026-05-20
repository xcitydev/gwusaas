"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles, Mail, Copy, RefreshCw, ChevronRight, Save, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SpamScoreCard } from "@/components/dashboard/SpamScoreCard";

type Email = {
  subject: string;
  body: string;
  subjectVariants?: string[];
};

type EmailSequence = {
  initial: Email;
  followUp: Email;
  breakup: Email;
};

export function ColdEmailGenerator() {
  const { user } = useUser();
  const saveTemplate = useMutation(api.outreachTemplates.saveTemplate);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSpamCheck, setShowSpamCheck] = useState(false);
  const [formData, setFormData] = useState({
    targetIndustry: "",
    offer: "",
    tone: "professional" as "professional" | "casual" | "bold",
  });
  const [sequence, setSequence] = useState<EmailSequence | null>(null);
  const [activeSubject, setActiveSubject] = useState<Record<string, number>>({
    initial: 0,
    followUp: 0,
    breakup: 0,
  });

  const generate = async () => {
    if (!formData.targetIndustry || !formData.offer) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ai/cold-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate sequence");
      setSequence(data.sequence);
      toast.success("Outreach sequence generated!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const save = async () => {
    if (!user?.id || !sequence) return;
    setSaving(true);
    try {
      const stepsWithChosenSubject = (["initial", "followUp", "breakup"] as const).map((k) => {
        const step = sequence[k];
        const idx = activeSubject[k] ?? 0;
        const subject = step.subjectVariants?.[idx] ?? step.subject;
        return { subject, body: step.body, subjectVariants: step.subjectVariants };
      });
      await saveTemplate({
        clerkUserId: user.id,
        channel: "email",
        name: `Email · ${formData.targetIndustry} · ${formData.offer}`.slice(0, 80),
        tags: [formData.tone, formData.targetIndustry.toLowerCase()],
        steps: stepsWithChosenSubject,
        sourceInput: formData,
      });
      toast.success("Saved to templates");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-card border-white/5 overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-black">Cold Outreach Generator</CardTitle>
              <CardDescription>AI-engineered email sequences that convert.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="industry" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target Industry</Label>
              <Input
                id="industry"
                placeholder="e.g. Real Estate, SaaS"
                value={formData.targetIndustry}
                onChange={(e) => setFormData({ ...formData, targetIndustry: e.target.value })}
                className="bg-white/5 border-white/10 h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Your Offer</Label>
              <Input
                id="offer"
                placeholder="e.g. Lead Gen, SEO Audit"
                value={formData.offer}
                onChange={(e) => setFormData({ ...formData, offer: e.target.value })}
                className="bg-white/5 border-white/10 h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tone</Label>
              <Select
                value={formData.tone}
                onValueChange={(val: any) => setFormData({ ...formData, tone: val })}
              >
                <SelectTrigger id="tone" className="bg-white/5 border-white/10 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="bold">Bold & Direct</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={generate}
            disabled={loading}
            className="w-full mt-8 h-12 amber-glow font-black uppercase tracking-widest transition-all"
          >
            {loading ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {loading ? "Generating Sequence..." : "Generate 3-Step Sequence"}
          </Button>
        </CardContent>
      </Card>

      {sequence && (
        <>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSpamCheck((v) => !v)}
              className="border-white/10"
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              {showSpamCheck ? "Hide Spam Check" : "Check Deliverability"}
            </Button>
            <Button
              variant="outline"
              onClick={save}
              disabled={saving}
              className="border-primary/30 text-primary hover:bg-primary/10"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving…" : "Save as Template"}
            </Button>
          </div>

          {showSpamCheck && (
            <SpamScoreCard
              emails={[sequence.initial, sequence.followUp, sequence.breakup]}
            />
          )}

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { id: "initial" as const, label: "Initial Outreach", data: sequence.initial },
              { id: "followUp" as const, label: "Follow-Up #1", data: sequence.followUp },
              { id: "breakup" as const, label: "The Breakup", data: sequence.breakup },
            ].map((step, idx) => {
              const variants = step.data.subjectVariants ?? [step.data.subject];
              const activeIdx = activeSubject[step.id] ?? 0;
              const activeSubj = variants[activeIdx] ?? step.data.subject;
              return (
                <Card key={step.id} className="glass-card border-white/5 group hover:border-primary/20 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">STEP {idx + 1}</Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => copyToClipboard(`${activeSubj}\n\n${step.data.body}`)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardTitle className="text-sm font-bold mt-3 leading-tight">{activeSubj}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {variants.length > 1 && (
                      <div className="space-y-1.5">
                        <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">A/B Subjects</div>
                        <div className="flex flex-wrap gap-1">
                          {variants.map((v, vi) => (
                            <button
                              key={vi}
                              onClick={() => setActiveSubject({ ...activeSubject, [step.id]: vi })}
                              className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-colors text-left max-w-full truncate ${
                                vi === activeIdx
                                  ? "bg-primary/20 border-primary/40 text-primary"
                                  : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                              }`}
                              title={v}
                            >
                              {String.fromCharCode(65 + vi)} · {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 min-h-[200px] max-h-[300px] overflow-y-auto">
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {step.data.body}
                      </p>
                    </div>
                    <Button variant="ghost" className="w-full h-9 text-[10px] font-bold uppercase tracking-widest group-hover:text-primary transition-colors" onClick={() => copyToClipboard(step.data.body)}>
                      Copy Body
                      <ChevronRight className="ml-2 h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
