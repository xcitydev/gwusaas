"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { SUPPORTED_PIPELINE_PLATFORMS } from "@/lib/content-pipeline.constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type ConfigValue = {
  niche: string;
  brandName: string;
  brandVoice: string;
  contentPillars: string[];
  targetPlatforms: string[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialConfig?: ConfigValue | null;
  onSaved?: () => void;
};

function toLabel(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ContentPipelineConfigModal({
  open,
  onOpenChange,
  initialConfig,
  onSaved,
}: Props) {
  const { user } = useUser();
  const saveConfig = useMutation(api.contentPipeline.saveConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [pillarInput, setPillarInput] = useState("");
  const [form, setForm] = useState<ConfigValue>({
    niche: "",
    brandName: "",
    brandVoice: "",
    contentPillars: [],
    targetPlatforms: ["youtube", "instagram", "tiktok"],
  });

  useEffect(() => {
    if (!open) return;
    if (initialConfig) {
      setForm({
        niche: initialConfig.niche,
        brandName: initialConfig.brandName,
        brandVoice: initialConfig.brandVoice,
        contentPillars: initialConfig.contentPillars,
        targetPlatforms: initialConfig.targetPlatforms,
      });
    }
  }, [initialConfig, open]);

  const canSave = useMemo(
    () =>
      Boolean(
        user?.id &&
          form.brandName.trim() &&
          form.niche.trim() &&
          form.brandVoice.trim() &&
          form.contentPillars.length > 0 &&
          form.targetPlatforms.length > 0,
      ),
    [form, user?.id],
  );

  const addPillar = () => {
    const value = pillarInput.trim();
    if (!value) return;
    if (form.contentPillars.includes(value)) {
      setPillarInput("");
      return;
    }
    if (form.contentPillars.length >= 6) {
      toast.error("You can add up to 6 content pillars.");
      return;
    }
    setForm((prev) => ({ ...prev, contentPillars: [...prev.contentPillars, value] }));
    setPillarInput("");
  };

  const togglePlatform = (platform: string) => {
    setForm((prev) => {
      const exists = prev.targetPlatforms.includes(platform);
      return {
        ...prev,
        targetPlatforms: exists
          ? prev.targetPlatforms.filter((item) => item !== platform)
          : [...prev.targetPlatforms, platform],
      };
    });
  };

  const handleSave = async () => {
    if (!canSave || !user?.id) return;

    setIsSaving(true);
    try {
      await saveConfig({
        userId: user.id,
        niche: form.niche.trim(),
        brandName: form.brandName.trim(),
        brandVoice: form.brandVoice.trim(),
        contentPillars: form.contentPillars,
        targetPlatforms: form.targetPlatforms,
      });
      toast.success("Content pipeline configuration saved");
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      console.error("Failed to save content pipeline config", error);
      toast.error("Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border/80 bg-background">
        <DialogHeader>
          <DialogTitle>Content Pipeline Setup</DialogTitle>
          <DialogDescription>
            Configure your weekly AI pipeline once, then generate a full calendar anytime.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brandName">Brand Name</Label>
              <Input
                id="brandName"
                value={form.brandName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, brandName: event.target.value }))
                }
                placeholder="Bishop AI"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="niche">Niche</Label>
              <Input
                id="niche"
                value={form.niche}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, niche: event.target.value }))
                }
                placeholder="AI automation education"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brandVoice">Brand Voice</Label>
            <Textarea
              id="brandVoice"
              value={form.brandVoice}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, brandVoice: event.target.value }))
              }
              rows={3}
              placeholder="Educational, conversational, beginner-friendly"
            />
          </div>

          <div className="space-y-2">
            <Label>Content Pillars (max 6)</Label>
            <div className="flex gap-2">
              <Input
                value={pillarInput}
                onChange={(event) => setPillarInput(event.target.value)}
                placeholder="prompt engineering"
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addPillar();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addPillar}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.contentPillars.map((pillar) => (
                <Badge
                  key={pillar}
                  className="cursor-pointer"
                  variant="secondary"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      contentPillars: prev.contentPillars.filter((item) => item !== pillar),
                    }))
                  }
                >
                  {pillar} ×
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Target Platforms</Label>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {SUPPORTED_PIPELINE_PLATFORMS.map((platform) => {
                const selected = form.targetPlatforms.includes(platform);
                return (
                  <Button
                    key={platform}
                    type="button"
                    variant={selected ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => togglePlatform(platform)}
                  >
                    {toLabel(platform)}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={!canSave || isSaving}>
            {isSaving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
