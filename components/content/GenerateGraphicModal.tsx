"use client";

import { useState } from "react";
import { Download, Sparkles } from "lucide-react";
import { useMutation } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { buildImagePrompt } from "@/lib/grok-image-prompt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

type Idea = {
  title?: string;
  hook?: string;
  formatSuggestion?: string;
  cta?: string;
};

type Metadata = {
  niche?: string;
  platform?: string;
  goal?: string;
  runId?: string;
};

type Props = {
  open: boolean;
  idea: Idea | null;
  metadata: Metadata | null;
  onClose: () => void;
};

export function GenerateGraphicModal({ open, idea, metadata, onClose }: Props) {
  const saveGraphic = useMutation(api.graphics.saveGraphic);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const generateGraphic = async () => {
    if (!idea || !metadata) return;
    setSaved(false);
    setIsGenerating(true);
    try {
      const prompt = buildImagePrompt(idea, metadata);
      const response = await fetch("/api/generate-graphic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          platform: metadata.platform || "social media",
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "Failed to generate graphic");
      }

      const data = (await response.json()) as { imageUrl: string };
      setImageUrl(data.imageUrl);

      await saveGraphic({
        ideaTitle: idea.title || "Untitled idea",
        imageUrl: data.imageUrl,
        platform: metadata.platform || "unknown",
        niche: metadata.niche || "unknown",
        prompt,
        runId: metadata.runId as Id<"aiGenerations"> | undefined,
      });
      setSaved(true);
      toast.success("Graphic generated and saved");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(message, {
        action: {
          label: "Retry",
          onClick: () => {
            void generateGraphic();
          },
        },
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const triggerDownload = (href: string, fileName: string, newTab = false) => {
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = fileName;
    if (newTab) {
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
    }
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const downloadGraphic = async () => {
    if (!imageUrl) return;

    const safeFileName = (idea?.title || "graphic")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const fileName = `${safeFileName || "graphic"}-graphic.png`;

    try {
      if (imageUrl.startsWith("data:image")) {
        triggerDownload(imageUrl, fileName);
        return;
      }

      const imgResponse = await fetch(imageUrl);
      if (!imgResponse.ok) {
        throw new Error(`Download failed with status ${imgResponse.status}`);
      }

      const blob = await imgResponse.blob();
      const blobUrl = URL.createObjectURL(blob);
      triggerDownload(blobUrl, fileName);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Graphic download failed, falling back to direct URL", error);
      // Fallback for CORS-protected URLs: open image directly so user can save manually.
      triggerDownload(imageUrl, fileName, true);
      toast.message("Opened image in a new tab for manual save.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(state) => !state && onClose()}>
      <DialogContent className="max-w-3xl bg-background border-border/80">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generate Social Graphic
          </DialogTitle>
          <DialogDescription>
            Generate a high-quality visual using xAI Grok image generation.
          </DialogDescription>
        </DialogHeader>

        {!idea || !metadata ? (
          <p className="text-sm text-muted-foreground">No idea selected.</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/80 bg-card/60 p-4 space-y-2 text-sm">
              <p><strong>Title:</strong> {idea.title || "N/A"}</p>
              <p><strong>Hook:</strong> {idea.hook || "N/A"}</p>
              <p><strong>Format:</strong> {idea.formatSuggestion || "N/A"}</p>
              <p><strong>CTA:</strong> {idea.cta || "N/A"}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Niche: {metadata.niche || "N/A"}</Badge>
              <Badge variant="secondary">Platform: {metadata.platform || "N/A"}</Badge>
              <Badge variant="secondary">Goal: {metadata.goal || "N/A"}</Badge>
              {saved ? <Badge>Saved to library</Badge> : null}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => void generateGraphic()} disabled={isGenerating}>
                {isGenerating ? "Generating..." : "Generate Graphic"}
              </Button>
              {imageUrl ? (
                <>
                  <Button variant="outline" onClick={() => void generateGraphic()} disabled={isGenerating}>
                    Regenerate
                  </Button>
                  <Button variant="outline" onClick={() => void downloadGraphic()}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </>
              ) : null}
            </div>

            {isGenerating ? (
              <div className="space-y-3">
                <Skeleton className="aspect-square w-full max-w-md rounded-lg" />
                <p className="text-sm text-muted-foreground">Generating your graphic...</p>
              </div>
            ) : null}

            {imageUrl ? (
              <div className="rounded-lg border border-border/80 p-3 bg-card/50">
                <img
                  src={imageUrl}
                  alt={idea.title || "Generated graphic"}
                  className="w-full max-w-md rounded-md object-cover"
                />
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
