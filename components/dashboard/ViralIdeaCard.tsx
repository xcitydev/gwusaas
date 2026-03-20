"use client";

import { Bookmark, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type ViralIdea = {
  idea: string;
  platform: "youtube" | "instagram" | "tiktok" | "substack" | "reddit" | "any";
  category: "client attraction" | "education" | "social proof" | "controversy" | "trend";
  hook: string;
  whyItWorks: string;
};

type Props = {
  item: ViralIdea;
  locked?: boolean;
  onSave: () => void;
  onAddToPipeline: () => void;
};

export function ViralIdeaCard({ item, locked, onSave, onAddToPipeline }: Props) {
  return (
    <div className={`rounded-lg border p-4 space-y-3 relative ${locked ? "opacity-55 blur-[1px]" : ""}`}>
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{item.platform}</Badge>
        <Badge variant="outline">{item.category}</Badge>
      </div>
      <p className="font-medium text-sm">{item.idea}</p>
      <blockquote className="border-l-2 pl-3 text-sm text-muted-foreground">
        {item.hook}
      </blockquote>
      <p className="text-xs text-muted-foreground">{item.whyItWorks}</p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onSave} disabled={Boolean(locked)}>
          <Bookmark className="mr-2 h-4 w-4" />
          Save
        </Button>
        <Button size="sm" onClick={onAddToPipeline} disabled={Boolean(locked)}>
          <Plus className="mr-2 h-4 w-4" />
          Add to pipeline
        </Button>
      </div>
    </div>
  );
}
