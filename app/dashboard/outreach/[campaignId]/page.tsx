"use client";

import { useEffect, useMemo, useState } from "react";
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
import { toast } from "sonner";

const sampleCampaignDetails: Record<
  string,
  {
    campaignName: string;
    contacts: Array<{
      _id: string;
      instagramUsername: string;
      qualificationStatus: string;
      dmStatus: string;
      lastFollowUpAt?: number;
      notes?: string;
    }>;
  }
> = {
  "demo-campaign-1": {
    campaignName: "Founder outreach sprint",
    contacts: [
      {
        _id: "sample-contact-1",
        instagramUsername: "scalewithsam",
        qualificationStatus: "top_lead",
        dmStatus: "replied",
        lastFollowUpAt: Date.now() - 1000 * 60 * 60 * 24,
        notes: "Asked for pricing deck.",
      },
      {
        _id: "sample-contact-2",
        instagramUsername: "growthjamie",
        qualificationStatus: "qualified",
        dmStatus: "booked",
        lastFollowUpAt: Date.now() - 1000 * 60 * 60 * 6,
        notes: "Booked call for Friday 2pm.",
      },
      {
        _id: "sample-contact-3",
        instagramUsername: "operatormike",
        qualificationStatus: "maybe",
        dmStatus: "sent",
        lastFollowUpAt: Date.now() - 1000 * 60 * 60 * 72,
        notes: "Needs shorter follow-up.",
      },
    ],
  },
  "demo-campaign-2": {
    campaignName: "Follow-up recovery wave",
    contacts: [
      {
        _id: "sample-contact-4",
        instagramUsername: "brandbuilderash",
        qualificationStatus: "qualified",
        dmStatus: "replied",
        lastFollowUpAt: Date.now() - 1000 * 60 * 60 * 20,
        notes: "Wants monthly retainer option.",
      },
      {
        _id: "sample-contact-5",
        instagramUsername: "adswithmaria",
        qualificationStatus: "top_lead",
        dmStatus: "closed",
        lastFollowUpAt: Date.now() - 1000 * 60 * 60 * 36,
        notes: "Converted on starter package.",
      },
    ],
  },
};

export default function CampaignDetailPage() {
  const params = useParams<{ campaignId: string }>();
  const { selectedClientId } = useSelectedClient();
  const [filter, setFilter] = useState("all");
  const sampleDetail = sampleCampaignDetails[params.campaignId];
  const [sampleContacts, setSampleContacts] = useState(sampleDetail?.contacts || []);
  const updateStatus = useMutation(api.outreachWorkspace.updateContactStatus);
  const moveToDeals = useMutation(api.outreachWorkspace.createDealFromContact);

  const detail = useQuery(
    api.outreachWorkspace.getCampaignDetail,
    selectedClientId && !sampleDetail
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

  const effectiveDetail = sampleDetail
    ? {
        campaign: { campaignName: sampleDetail.campaignName },
        contacts: sampleContacts,
      }
    : detail;

  useEffect(() => {
    setSampleContacts(sampleDetail?.contacts || []);
  }, [params.campaignId, sampleDetail]);

  const rows = useMemo(() => {
    const contacts = effectiveDetail?.contacts || [];
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
  }, [effectiveDetail?.contacts, filter]);

  const quickStatuses = ["all", "replied", "booked", "need_follow_up", "closed"];

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
        <div>
          <h1 className="text-3xl font-bold">{effectiveDetail?.campaign.campaignName || "Campaign"}</h1>
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
                            if (sampleDetail) {
                              setSampleContacts((prev) =>
                                prev.map((item) =>
                                  item._id === contact._id ? { ...item, dmStatus: status } : item,
                                ),
                              );
                              return;
                            }
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
                        if (sampleDetail) {
                          toast.success("Sample contact moved to sample deals pipeline");
                          return;
                        }
                        void moveToDeals({
                          contactId: contact._id as never,
                          clientId: selectedClientId!,
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
                      if (sampleDetail) {
                        setSampleContacts((prev) =>
                          prev.map((item) =>
                            item._id === contact._id ? { ...item, notes: e.target.value } : item,
                          ),
                        );
                        return;
                      }
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
