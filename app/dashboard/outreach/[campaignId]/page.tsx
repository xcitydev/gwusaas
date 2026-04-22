"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import SideBar from "@/components/SideBar";
import { useSelectedClient } from "@/context/ClientContext";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function CampaignDetailPage() {
  const params = useParams<{ campaignId: string }>();
  const { selectedClientId } = useSelectedClient();
  const [filter, setFilter] = useState("all");

  const updateStatus = useMutation(api.outreachWorkspace.updateContactStatus);
  const moveToDeals = useMutation(api.outreachWorkspace.createDealFromContact);

  const detail = useQuery(
    api.outreachWorkspace.getCampaignDetail,
    selectedClientId
      ? { campaignId: params.campaignId as never, clientId: selectedClientId }
      : "skip",
  ) as
    | {
        campaign: { campaignName: string };
        contacts: Array<{
          _id: string;
          instagramUsername: string;
          qualificationStatus: string;
          dmStatus: string;
          lastFollowUpAt?: number;
          notes?: string;
        }>;
      }
    | null
    | undefined;

  const rows = useMemo(() => {
    const contacts = detail?.contacts || [];
    if (filter === "all") return contacts;
    if (filter === "need_follow_up") {
      const now = Date.now();
      return contacts.filter((c) => {
        if (c.dmStatus !== "sent") return false;
        const last = c.lastFollowUpAt || 0;
        return now - last > 1000 * 60 * 60 * 48;
      });
    }
    return contacts.filter((c) => c.dmStatus === filter);
  }, [detail?.contacts, filter]);

  const quickStatuses = ["all", "replied", "booked", "need_follow_up", "closed"];

  // Loading state
  if (detail === undefined) {
    return (
      <SideBar>
        <div className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </SideBar>
    );
  }

  // Not found / no client selected
  if (!detail || !selectedClientId) {
    return (
      <SideBar>
        <div className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
          <h1 className="text-3xl font-bold">Campaign Not Found</h1>
          <p className="text-muted-foreground">
            {!selectedClientId
              ? "Select a client from the sidebar to view this campaign."
              : "This campaign does not exist or you don't have access to it."}
          </p>
        </div>
      </SideBar>
    );
  }

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
        <div>
          <h1 className="text-3xl font-bold">{detail.campaign.campaignName}</h1>
          <p className="text-muted-foreground">Track messages, replies, and next steps.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
            <CardDescription>Update status in plain steps so nothing gets missed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {quickStatuses.map((pill) => (
                <Button
                  key={pill}
                  variant={filter === pill ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(pill)}
                >
                  {pill === "need_follow_up" ? "Need follow-up" : pill.replace(/_/g, " ")}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              {rows.map((contact) => (
                <div
                  key={contact._id}
                  className="rounded-lg border border-border/80 p-3 md:flex md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-medium">@{contact.instagramUsername}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{contact.qualificationStatus}</Badge>
                      <Badge>{contact.dmStatus}</Badge>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 md:mt-0">
                    {["pending", "sent", "replied", "booked", "closed", "not_interested"].map(
                      (status) => (
                        <Button
                          key={status}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            void updateStatus({
                              contactId: contact._id as never,
                              dmStatus: status,
                            });
                          }}
                        >
                          {status.replace(/_/g, " ")}
                        </Button>
                      ),
                    )}
                    <Button
                      size="sm"
                      onClick={() => {
                        void moveToDeals({
                          contactId: contact._id as never,
                          clientId: selectedClientId,
                        });
                      }}
                    >
                      Move to deals
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a
                        href={`https://instagram.com/${contact.instagramUsername}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View profile
                      </a>
                    </Button>
                  </div>
                  <Input
                    className="mt-3 md:mt-2"
                    placeholder="Add a quick note"
                    defaultValue={contact.notes || ""}
                    onBlur={(e) => {
                      void updateStatus({
                        contactId: contact._id as never,
                        dmStatus: contact.dmStatus,
                        note: e.target.value,
                      });
                    }}
                  />
                </div>
              ))}
              {rows.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No contacts in this view yet.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </SideBar>
  );
}
