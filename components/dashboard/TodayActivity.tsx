"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function TodayActivity({
  clientName,
  replies,
  callsBooked,
  closedDeals,
}: {
  clientName: string;
  replies: number;
  callsBooked: number;
  closedDeals: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s activity — {clientName}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {replies} new replies · {callsBooked} call booked · {closedDeals} closed clients
        </p>
        <div className="mt-4 flex gap-2">
          <Button asChild><Link href="/dashboard/outreach">View outreach</Link></Button>
          <Button asChild variant="outline"><Link href="/dashboard/deals">View pipeline</Link></Button>
        </div>
      </CardContent>
    </Card>
  );
}
