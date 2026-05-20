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
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, MessageCircle, Copy, RefreshCw, Save } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

type SmsMessage = { body: string };
type SmsSequence = { initial: SmsMessage; followUp: SmsMessage; breakup: SmsMessage };

const SMS_SEGMENT = 160;

function segmentInfo(body: string) {
  const len = body.length;
  const segments = len === 0 ? 0 : Math.ceil(len / SMS_SEGMENT);
  return { len, segments };
}

export function SmsSequenceGenerator() {
  const { user } = useUser();
  const saveTemplate = useMutation(api.outreachTemplates.saveTemplate);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    targetIndustry: "",
    offer: "",
    tone: "friendly" as "friendly" | "direct" | "urgent",
    maxChars: 160,
  });
  const [sequence, setSequence] = useState<SmsSequence | null>(null);

  const generate = async () => {
    if (!formData.targetIndustry || !formData.offer) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/sms-sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSequence(data.sequence);
      toast.success("SMS sequence generated");
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

  const save = async () => {
    if (!user?.id || !sequence) return;
    setSaving(true);
    try {
      await saveTemplate({
        clerkUserId: user.id,
        channel: "sms",
        name: `SMS · ${formData.targetIndustry} · ${formData.offer}`.slice(0, 80),
        tags: [formData.tone, formData.targetIndustry.toLowerCase()],
        steps: [sequence.initial, sequence.followUp, sequence.breakup],
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
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-black">SMS Sequence Generator</CardTitle>
              <CardDescription>Character-count aware, opt-out compliant texts.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target Industry</Label>
              <Input
                placeholder="e.g. Real Estate"
                value={formData.targetIndustry}
                onChange={(e) => setFormData({ ...formData, targetIndustry: e.target.value })}
                className="bg-white/5 border-white/10 h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Your Offer</Label>
              <Input
                placeholder="e.g. Lead Gen"
                value={formData.offer}
                onChange={(e) => setFormData({ ...formData, offer: e.target.value })}
                className="bg-white/5 border-white/10 h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tone</Label>
              <Select
                value={formData.tone}
                onValueChange={(val) => setFormData({ ...formData, tone: val as typeof formData.tone })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Max chars per message
              </Label>
              <span className="text-xs font-bold text-primary">{formData.maxChars}</span>
            </div>
            <Slider
              value={[formData.maxChars]}
              min={80}
              max={480}
              step={10}
              onValueChange={([val]) => setFormData({ ...formData, maxChars: val })}
            />
            <p className="text-[10px] text-muted-foreground">
              160 = 1 segment · 320 = 2 segments · longer = more cost per send
            </p>
          </div>

          <Button
            onClick={generate}
            disabled={loading}
            className="w-full mt-8 h-12 amber-glow font-black uppercase tracking-widest"
          >
            {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {loading ? "Generating…" : "Generate SMS Sequence"}
          </Button>
        </CardContent>
      </Card>

      {sequence && (
        <>
          <div className="flex justify-end">
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
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { id: "initial", label: "Initial", data: sequence.initial },
              { id: "followUp", label: "Follow-Up", data: sequence.followUp },
              { id: "breakup", label: "Breakup", data: sequence.breakup },
            ].map((step, idx) => {
              const info = segmentInfo(step.data.body);
              const overLimit = info.len > formData.maxChars;
              return (
                <Card key={step.id} className="glass-card border-white/5 group hover:border-primary/20 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                        STEP {idx + 1}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => copy(step.data.body)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardTitle className="text-sm font-bold mt-3">{step.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 min-h-[140px]">
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {step.data.body}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className={`text-[10px] font-bold ${overLimit ? "text-destructive" : "text-muted-foreground"}`}>
                        {info.len} / {formData.maxChars} chars
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {info.segments} seg
                      </Badge>
                    </div>
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
