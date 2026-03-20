"use client";

import SideBar from "@/components/SideBar";
import { useSelectedClient } from "@/context/ClientContext";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const stages = [
  "contacted",
  "replied",
  "call_booked",
  "call_done",
  "proposal_sent",
  "closed_won",
  "closed_lost",
];

const stageLabel: Record<string, string> = {
  contacted: "Contacted",
  replied: "Replied",
  call_booked: "Call Booked",
  call_done: "Call Done",
  proposal_sent: "Proposal Sent",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

const demoDeals = [
  {
    _id: "demo-deal-1",
    stage: "replied",
    dealValue: 1200,
    notes: "Interested in weekly DM management.",
    updatedAt: Date.now() - 1000 * 60 * 60 * 20,
    isDemo: true,
  },
  {
    _id: "demo-deal-2",
    stage: "call_booked",
    dealValue: 1800,
    notes: "Call booked for Thursday.",
    updatedAt: Date.now() - 1000 * 60 * 60 * 12,
    isDemo: true,
  },
  {
    _id: "demo-deal-3",
    stage: "proposal_sent",
    dealValue: 2500,
    notes: "Proposal sent, waiting for approval.",
    updatedAt: Date.now() - 1000 * 60 * 60 * 48,
    isDemo: true,
  },
] as const;

export default function DealsPage() {
  const { selectedClientId } = useSelectedClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const updateDeal = useMutation(api.outreachWorkspace.updateDeal);
  const deals = useQuery(
    api.outreachWorkspace.listDeals,
    selectedClientId ? { clientId: selectedClientId } : "skip",
  ) as Array<{
    _id: string;
    stage: string;
    dealValue?: number;
    notes?: string;
    updatedAt: number;
    isDemo?: boolean;
  }> | undefined;

  const mergedDeals = useMemo(() => {
    const real = deals || [];
    return [...real, ...demoDeals];
  }, [deals]);

  const grouped = useMemo(() => {
    const map: Record<
      string,
      Array<{
        _id: string;
        stage: string;
        dealValue?: number;
        notes?: string;
        updatedAt: number;
        isDemo?: boolean;
      }>
    > = {};
    for (const stage of stages) map[stage] = [];
    for (const deal of mergedDeals) {
      if (!map[deal.stage]) map[deal.stage] = [];
      map[deal.stage].push(deal);
    }
    return map;
  }, [mergedDeals]);

  const totalValue = mergedDeals.reduce((sum, deal) => sum + (deal.dealValue || 0), 0);
  const closedWon = mergedDeals.filter((d) => d.stage === "closed_won").length;
  const closedLost = mergedDeals.filter((d) => d.stage === "closed_lost").length;
  const winRate = closedWon + closedLost === 0 ? 0 : Math.round((closedWon / (closedWon + closedLost)) * 100);
  const openDeals = mergedDeals.filter((d) => !["closed_won", "closed_lost"].includes(d.stage)).length;

  const dealLabel = (dealId: string) => {
    if (dealId.startsWith("demo-deal-")) {
      return `Sample deal ${dealId.replace("demo-deal-", "")}`;
    }
    return `Deal #${dealId.slice(-5)}`;
  };

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-[1500px] space-y-6 p-6 md:p-8">
        <div>
          <h1 className="text-3xl font-bold">Deal Pipeline</h1>
          <p className="text-muted-foreground">Track each lead from first reply to closed client.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-sm">Total pipeline value</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">${totalValue.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Win rate this month</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{winRate}%</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Open deals</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-semibold">{openDeals}</p></CardContent>
          </Card>
        </div>

        <div className="grid grid-flow-col auto-cols-[minmax(260px,280px)] gap-3 overflow-x-auto pb-2 xl:grid-flow-row xl:auto-cols-auto xl:grid-cols-7">
          {stages.map((stage) => (
            <Card key={stage} className="border-border/80 bg-card/70">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{stageLabel[stage]}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {grouped[stage]?.length ? (
                  grouped[stage].map((deal) => (
                    <div key={deal._id} className="rounded-lg border border-border/70 bg-background/50 p-3 space-y-3">
                      <p className="text-sm font-medium">{dealLabel(String(deal._id))}</p>
                      <p className="text-xs text-muted-foreground">
                        Updated {new Date(deal.updatedAt).toLocaleDateString()}
                      </p>

                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">Deal value</p>
                        <Input
                          placeholder="e.g. 1500"
                          value={values[deal._id] ?? String(deal.dealValue || "")}
                          disabled={deal.isDemo}
                          onChange={(e) =>
                            setValues((prev) => ({ ...prev, [deal._id]: e.target.value }))
                          }
                          onBlur={() => {
                            if (deal.isDemo) return;
                            const value = Number(values[deal._id]);
                            if (!Number.isFinite(value)) return;
                            void updateDeal({ dealId: deal._id as never, dealValue: value });
                          }}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">Stage</p>
                        <Select
                          value={deal.stage}
                          disabled={deal.isDemo}
                          onValueChange={(nextStage) => {
                            if (deal.isDemo) return;
                            void updateDeal({ dealId: deal._id as never, stage: nextStage });
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {stages.map((nextStage) => (
                              <SelectItem key={nextStage} value={nextStage}>
                                {stageLabel[nextStage]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
                    No deals here yet. When people reply to DMs, move them here.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SideBar>
  );
}
