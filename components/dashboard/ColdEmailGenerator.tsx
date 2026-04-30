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
import { Sparkles, Mail, Copy, RefreshCw, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Email = {
  subject: string;
  body: string;
};

type EmailSequence = {
  initial: Email;
  followUp: Email;
  breakup: Email;
};

export function ColdEmailGenerator() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    targetIndustry: "",
    offer: "",
    tone: "professional" as "professional" | "casual" | "bold",
  });
  const [sequence, setSequence] = useState<EmailSequence | null>(null);

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
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { id: "initial", label: "Initial Outreach", data: sequence.initial },
            { id: "followUp", label: "Follow-Up #1", data: sequence.followUp },
            { id: "breakup", label: "The Breakup", data: sequence.breakup },
          ].map((step, idx) => (
            <Card key={step.id} className="glass-card border-white/5 group hover:border-primary/20 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">STEP {idx + 1}</Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => copyToClipboard(`${step.data.subject}\n\n${step.data.body}`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle className="text-sm font-bold mt-3 leading-tight">{step.data.subject}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5 min-h-[200px] max-h-[300px] overflow-y-auto">
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {step.data.body}
                  </p>
                </div>
                <Button variant="ghost" className="w-full mt-4 h-9 text-[10px] font-bold uppercase tracking-widest group-hover:text-primary transition-colors" onClick={() => copyToClipboard(step.data.body)}>
                  Copy Body
                  <ChevronRight className="ml-2 h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
