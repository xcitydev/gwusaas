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
import { Palette, Users, Trophy, Eye, RefreshCw, CheckCircle } from "lucide-react";

export function BrandOnboardingSettings({ clerkUserId }: { clerkUserId: string }) {
  const projects = useQuery(api.projects.list, {});
  const project = projects && projects.length > 0 ? projects[0] : null;
  
  const onboarding = useQuery(api.onboarding.get, project ? { projectId: project._id } : "skip");
  const saveStep = useMutation(api.onboarding.saveStep);
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    brandTone: "",
    colorPalette: "",
    goals: "",
    targetAudience: "",
    competitors: "",
    designStyle: "",
  });

  useEffect(() => {
    if (onboarding) {
      setFormData({
        brandTone: onboarding.brandTone || "",
        colorPalette: onboarding.colorPalette || "",
        goals: onboarding.goals || "",
        targetAudience: onboarding.targetAudience || "",
        competitors: onboarding.competitors || "",
        designStyle: onboarding.designStyle || "",
      });
    }
  }, [onboarding]);

  const handleSave = async () => {
    if (!project) return;

    setLoading(true);
    try {
      await saveStep({
        projectId: project._id,
        stepData: formData,
      });
      toast.success("Brand profile updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update brand profile");
    } finally {
      setLoading(false);
    }
  };

  if (projects === undefined) return <div className="p-8 text-center text-muted-foreground">Loading brand profile...</div>;
  if (!project) return <div className="p-8 text-center text-muted-foreground">No active project found. Complete onboarding first.</div>;

  return (
    <Card className="glass-card border-white/5 overflow-hidden">
      <CardHeader className="border-b border-white/5 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Palette className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <CardTitle className="text-xl font-black text-white">Brand Profile</CardTitle>
            <CardDescription>Update the brand details you provided during onboarding.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8 space-y-8">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Section 1: Identity */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Identity & Style</h3>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="brandTone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Brand Tone & Voice</Label>
              <Textarea
                id="brandTone"
                value={formData.brandTone}
                onChange={(e) => setFormData({ ...formData, brandTone: e.target.value })}
                placeholder="How does your brand sound? (e.g. Bold, minimal, professional)"
                className="bg-white/5 border-white/10 min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="colorPalette" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Color Palette / Preferences</Label>
              <Input
                id="colorPalette"
                value={formData.colorPalette}
                onChange={(e) => setFormData({ ...formData, colorPalette: e.target.value })}
                placeholder="e.g. Deep blues and gold, or hex codes #000..."
                className="bg-white/5 border-white/10 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="designStyle" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Design Aesthetic</Label>
              <Input
                id="designStyle"
                value={formData.designStyle}
                onChange={(e) => setFormData({ ...formData, designStyle: e.target.value })}
                placeholder="e.g. Modern, Vintage, Corporate"
                className="bg-white/5 border-white/10 h-11"
              />
            </div>
          </div>

          {/* Section 2: Market */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Market & Goals</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAudience" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target Audience</Label>
              <Textarea
                id="targetAudience"
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                placeholder="Who are you trying to reach?"
                className="bg-white/5 border-white/10 min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="competitors" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Key Competitors</Label>
              <Input
                id="competitors"
                value={formData.competitors}
                onChange={(e) => setFormData({ ...formData, competitors: e.target.value })}
                placeholder="List a few brands you admire or compete with"
                className="bg-white/5 border-white/10 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goals" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Primary Goals</Label>
              <Input
                id="goals"
                value={formData.goals}
                onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                placeholder="e.g. Growth, Awareness, Lead Gen"
                className="bg-white/5 border-white/10 h-11"
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/5">
          <Button
            onClick={handleSave}
            disabled={loading}
            className="w-full h-12 amber-glow font-black uppercase tracking-widest transition-all"
          >
            {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            {loading ? "Updating Brand Profile..." : "Save Brand Profile"}
          </Button>
          <p className="text-center text-[10px] text-muted-foreground mt-4 uppercase tracking-widest">
            Updates will be applied to all future AI generations and reports.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
