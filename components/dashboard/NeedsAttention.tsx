"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function NeedsAttention({ items }: { items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Needs attention</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Everything looks good right now.</p>
        ) : (
          items.map((item, idx) => (
            <p key={idx} className="text-sm text-muted-foreground">
              {item}
            </p>
          ))
        )}
      </CardContent>
    </Card>
  );
}
