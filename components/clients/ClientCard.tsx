"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ClientCard({
  client,
  onSwitch,
  onRemove,
}: {
  client: {
    _id: string;
    clientName: string;
    instagramUsername: string;
    niche: string;
    status: string;
  };
  onSwitch: () => void;
  onRemove: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{client.clientName}</span>
          <Badge variant="outline">{client.status}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          <span className="text-muted-foreground">Instagram:</span> @{client.instagramUsername}
        </p>
        <p>
          <span className="text-muted-foreground">Niche:</span> {client.niche}
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={onSwitch}>
            Switch to client
          </Button>
          <Button size="sm" variant="outline" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
