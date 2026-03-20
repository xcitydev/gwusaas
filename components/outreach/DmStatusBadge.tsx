"use client";

import { Badge } from "@/components/ui/badge";

const classes: Record<string, string> = {
  pending: "bg-zinc-500/10 text-zinc-300 border-zinc-500/40",
  sent: "bg-blue-500/10 text-blue-300 border-blue-500/40",
  replied: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40",
  no_reply: "bg-amber-500/10 text-amber-300 border-amber-500/40",
  booked: "bg-violet-500/10 text-violet-300 border-violet-500/40",
  closed: "bg-yellow-500/10 text-yellow-300 border-yellow-500/40",
  not_interested: "bg-rose-500/10 text-rose-300 border-rose-500/40",
};

export function DmStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={classes[status] || classes.pending}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
