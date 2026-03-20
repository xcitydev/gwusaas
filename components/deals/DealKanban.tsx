"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DealCard } from "./DealCard";

export function DealKanban({
  stages,
  groupedDeals,
  onMove,
}: {
  stages: string[];
  groupedDeals: Record<string, Array<{ _id: string; dealValue?: number; updatedAt: number }>>;
  onMove: (dealId: string, stage: string) => void;
}) {
  return (
    <div className="grid gap-3 overflow-x-auto xl:grid-cols-7">
      {stages.map((stage) => (
        <Card key={stage} className="min-w-[260px]">
          <CardHeader>
            <CardTitle className="text-base">{stage.replace(/_/g, " ")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(groupedDeals[stage] || []).map((deal) => (
              <DealCard key={deal._id} deal={deal} onMove={() => onMove(deal._id, stage)} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
