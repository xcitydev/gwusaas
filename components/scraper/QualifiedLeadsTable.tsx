"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function QualifiedLeadsTable({
  rows,
  onAddToCampaign,
}: {
  rows: Array<{
    _id: string;
    instagramUsername: string;
    bio?: string;
    followerCount?: number;
    qualificationScore: number;
    qualificationStatus: string;
  }>;
  onAddToCampaign: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row._id} className="rounded-lg border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">@{row.instagramUsername}</p>
            <div className="flex gap-2">
              <Badge variant="outline">Score {row.qualificationScore}</Badge>
              <Badge>{row.qualificationStatus.replace("_", " ")}</Badge>
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{row.bio || "No bio"}</p>
          <Button className="mt-2" size="sm" onClick={() => onAddToCampaign(row._id)}>
            Add to campaign
          </Button>
        </div>
      ))}
    </div>
  );
}
