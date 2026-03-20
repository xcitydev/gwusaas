"use client";

import { Badge } from "@/components/ui/badge";

const classes: Record<string, string> = {
  top_lead: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40",
  qualified: "bg-blue-500/10 text-blue-300 border-blue-500/40",
  maybe: "bg-amber-500/10 text-amber-300 border-amber-500/40",
  unqualified: "bg-zinc-500/10 text-zinc-300 border-zinc-500/40",
};

export function QualificationBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={classes[status] || classes.maybe}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
