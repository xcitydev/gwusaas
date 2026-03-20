"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function CampaignCard({
  campaign,
}: {
  campaign: {
    _id: string;
    campaignName: string;
    messageType: string;
    status: string;
    totalSent: number;
    totalReplies: number;
    totalBooked: number;
  };
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="font-semibold">{campaign.campaignName}</p>
          <p className="text-sm text-muted-foreground">
            {campaign.totalSent} sent · {campaign.totalReplies} replied · {campaign.totalBooked}{" "}
            booked
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{campaign.messageType.replace(/_/g, " ")}</Badge>
            <Badge>{campaign.status}</Badge>
          </div>
        </div>
        <Button asChild>
          <Link href={`/dashboard/outreach/${campaign._id}`}>View campaign</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
