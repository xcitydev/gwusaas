"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DealCard({
  deal,
  onMove,
}: {
  deal: { _id: string; dealValue?: number; updatedAt: number };
  onMove: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-2 p-3">
        <p className="text-sm font-medium">Deal #{String(deal._id).slice(-5)}</p>
        <p className="text-xs text-muted-foreground">
          Updated {new Date(deal.updatedAt).toLocaleDateString()}
        </p>
        <p className="text-sm">${(deal.dealValue || 0).toLocaleString()}</p>
        <Button size="sm" onClick={onMove}>
          Move forward
        </Button>
      </CardContent>
    </Card>
  );
}
