"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import SideBar from "@/components/SideBar";
import { useSelectedClient } from "@/context/ClientContext";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";

const demoCampaigns = [
  {
    _id: "demo-campaign-1",
    campaignName: "Founder outreach sprint",
    messageType: "account_outreach",
    status: "active",
    totalSent: 124,
    totalReplies: 18,
    totalBooked: 5,
    totalClosed: 1,
    startedAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    isDemo: true,
  },
  {
    _id: "demo-campaign-2",
    campaignName: "Follow-up recovery wave",
    messageType: "follow_up",
    status: "paused",
    totalSent: 72,
    totalReplies: 9,
    totalBooked: 2,
    totalClosed: 0,
    startedAt: Date.now() - 1000 * 60 * 60 * 24 * 8,
    isDemo: true,
  },
] as const;

export default function OutreachPage() {
  const { user } = useUser();
  const { selectedClientId, selectedClient, loading } = useSelectedClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [messageType, setMessageType] = useState<
    "account_outreach" | "mass_dm" | "follow_up"
  >("account_outreach");
  const [script, setScript] = useState("");
  const [targets, setTargets] = useState("");
  const createCampaign = useMutation(api.outreachWorkspace.createCampaign);

  const campaigns = useQuery(
    api.outreachWorkspace.listCampaigns,
    user?.id && selectedClientId
      ? { clerkUserId: user.id, clientId: selectedClientId }
      : "skip",
  ) as Array<{
    _id: string;
    campaignName: string;
    messageType: string;
    status: string;
    totalSent: number;
    totalReplies: number;
    totalBooked: number;
    totalClosed: number;
    startedAt?: number;
    isDemo?: boolean;
  }> | undefined;

  const mergedCampaigns = useMemo(() => {
    const real = campaigns || [];
    return [...real, ...demoCampaigns];
  }, [campaigns]);

  const stats = useMemo(() => {
    const rows = mergedCampaigns;
    return {
      sent: rows.reduce((sum, c) => sum + c.totalSent, 0),
      replies: rows.reduce((sum, c) => sum + c.totalReplies, 0),
      booked: rows.reduce((sum, c) => sum + c.totalBooked, 0),
      closed: rows.reduce((sum, c) => sum + c.totalClosed, 0),
    };
  }, [mergedCampaigns]);

  const onLaunch = async () => {
    if (!user?.id || !selectedClientId) return;
    try {
      const parsedTargets = targets
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((instagramUsername) => ({ instagramUsername }));
      await createCampaign({
        clerkUserId: user.id,
        clientId: selectedClientId,
        campaignName: name.trim(),
        platform: "instagram",
        messageType,
        script: script.trim(),
        targets: parsedTargets,
      });
      setOpen(false);
      setName("");
      setScript("");
      setTargets("");
      toast.success("Campaign launched");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to launch campaign");
    }
  };

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Outreach & DMs</h1>
            <p className="text-muted-foreground">
              {loading
                ? "Loading client..."
                : `You are tracking outreach for ${selectedClient?.clientName || "this client"}.`}
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>New campaign</Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardHeader><CardTitle className="text-sm">DMs Sent</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{stats.sent}</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Replies</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{stats.replies}</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Calls Booked</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{stats.booked}</p></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Deals Closed</CardTitle></CardHeader><CardContent><p className="text-3xl font-semibold">{stats.closed}</p></CardContent></Card>
        </div>

        {mergedCampaigns.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
              <h3 className="mt-3 text-lg font-semibold">You haven&apos;t sent any DMs yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first campaign to start reaching out to potential clients.
              </p>
              <Button className="mt-4" onClick={() => setOpen(true)}>
                Create first campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {mergedCampaigns.map((campaign) => (
              <Card key={campaign._id}>
                <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold">{campaign.campaignName}</p>
                    <p className="text-sm text-muted-foreground">
                      {campaign.totalSent} sent · {campaign.totalReplies} replied ·{" "}
                      {campaign.totalBooked} booked
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
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New outreach campaign</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Campaign name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Message type</Label>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  {[
                    ["account_outreach", "Account outreach"],
                    ["mass_dm", "Mass DM"],
                    ["follow_up", "Follow-up"],
                  ].map(([value, label]) => (
                    <Button
                      key={value}
                      variant={messageType === value ? "default" : "outline"}
                      onClick={() =>
                        setMessageType(value as "account_outreach" | "mass_dm" | "follow_up")
                      }
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>DM script</Label>
                <Textarea
                  rows={4}
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Write the message you want to send"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Targets (one @username per line)</Label>
                <Textarea
                  rows={5}
                  value={targets}
                  onChange={(e) => setTargets(e.target.value)}
                  placeholder="@username1&#10;@username2"
                />
              </div>
              <Button
                className="w-full"
                disabled={!name.trim() || !script.trim() || !targets.trim()}
                onClick={() => void onLaunch()}
              >
                Launch campaign
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SideBar>
  );
}
