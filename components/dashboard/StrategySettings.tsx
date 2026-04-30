"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Target, Sparkles, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function StrategySettings({ userId }: { userId: string }) {
  const config = useQuery(api.contentPipeline.getConfig, { userId });
  const saveConfig = useMutation(api.contentPipeline.saveConfig);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    niche: "",
    brandName: "",
    brandVoice: "",
    contentPillars: "",
    targetPlatforms: "instagram, tiktok",
  });

  useEffect(() => {
    if (config) {
      setFormData({
        niche: config.niche,
        brandName: config.brandName,
        brandVoice: config.brandVoice,
        contentPillars: config.contentPillars.join(", "),
        targetPlatforms: config.targetPlatforms.join(", "),
      });
    }
  }, [config]);

  const handleSave = async () => {
    if (!formData.niche || !formData.brandName) {
      toast.error("Niche and Brand Name are required");
      return;
    }

    setLoading(true);
    try {
      await saveConfig({
        userId,
        niche: formData.niche,
        brandName: formData.brandName,
        brandVoice: formData.brandVoice,
        contentPillars: formData.contentPillars.split(",").map(s => s.trim()).filter(Boolean),
        targetPlatforms: formData.targetPlatforms.split(",").map(s => s.trim()).filter(Boolean),
      });
      toast.success("Strategy updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save strategy");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card border-white/5 overflow-hidden">
      <CardHeader className="border-b border-white/5 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl font-black text-white">Strategy & Goals</CardTitle>
            <CardDescription>Define your niche, brand voice, and content goals.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8 space-y-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="brandName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Brand Name</Label>
            <Input
              id="brandName"
              value={formData.brandName}
              onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
              placeholder="e.g. Acme Agency"
              className="bg-white/5 border-white/10 h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="niche" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Your Niche / Industry</Label>
            <Input
              id="niche"
              value={formData.niche}
              onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
              placeholder="e.g. Real Estate in Miami"
              className="bg-white/5 border-white/10 h-11"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="brandVoice" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Brand Voice / Tone</Label>
          <Textarea
            id="brandVoice"
            value={formData.brandVoice}
            onChange={(e) => setFormData({ ...formData, brandVoice: e.target.value })}
            placeholder="e.g. Professional, authoritative yet approachable. Focus on high-value insights."
            className="bg-white/5 border-white/10 min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pillars" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Content Pillars (Comma separated)</Label>
          <Input
            id="pillars"
            value={formData.contentPillars}
            onChange={(e) => setFormData({ ...formData, contentPillars: e.target.value })}
            placeholder="e.g. Educational, Market Trends, Client Success"
            className="bg-white/5 border-white/10 h-11"
          />
          <p className="text-[10px] text-muted-foreground">These help our AI stay focused on your core value propositions.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="platforms" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target Platforms</Label>
          <Input
            id="platforms"
            value={formData.targetPlatforms}
            onChange={(e) => setFormData({ ...formData, targetPlatforms: e.target.value })}
            placeholder="e.g. instagram, tiktok, youtube"
            className="bg-white/5 border-white/10 h-11"
          />
        </div>

        <div className="pt-4">
          <Button
            onClick={handleSave}
            disabled={loading}
            className="w-full h-12 amber-glow font-black uppercase tracking-widest transition-all"
          >
            {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {loading ? "Saving Strategy..." : "Update Engine Configuration"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
