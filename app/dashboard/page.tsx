"use client";

import Link from "next/link";
import SideBar from "@/components/SideBar";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { SERVICES } from "@/lib/services";
import { PLAN_LABELS, normalizePlan } from "@/lib/plans";
import { useSelectedClient } from "@/context/ClientContext";
import { api } from "@/convex/_generated/api";
import { TodayActivity } from "@/components/dashboard/TodayActivity";
import { NeedsAttention } from "@/components/dashboard/NeedsAttention";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ViralIdeasWidget } from "@/components/dashboard/ViralIdeasWidget";

const CATEGORY_HREF: Record<string, string> = {
  Advertising: "/dashboard/ads",
  "Email & SMS": "/dashboard/email",
  SEO: "/dashboard/seo",
  Content: "/dashboard/content",
  "Social Growth": "/dashboard/social",
  Other: "/dashboard/community",
};

export default function DashboardPage() {
  const { isLoaded, user } = useUser();
  const { selectedClientId, selectedClient } = useSelectedClient();
  const stats = useQuery(
    api.clientWorkspace.getClientStats,
    user?.id && selectedClientId
      ? { clerkUserId: user.id, clientId: selectedClientId }
      : "skip",
  ) as
    | { dmsSent: number; replies: number; callsBooked: number; dealsClosed: number }
    | null
    | undefined;

  if (!isLoaded) {
    return (
      <SideBar>
        <div className="mx-auto w-full max-w-7xl p-6 md:p-8 grid gap-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-36 w-full" />
            ))}
          </div>
        </div>
      </SideBar>
    );
  }

  const plan = normalizePlan(user?.publicMetadata?.plan);

  const categoryCounts = SERVICES.reduce<Record<string, number>>((acc, service) => {
    acc[service.category] = (acc[service.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-7xl p-6 md:p-8 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Explore every service hub and AI-enabled workflow in one place.
            </p>
          </div>
          <Badge className="w-fit">{PLAN_LABELS[plan]} Plan</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(categoryCounts).map(([category, count]) => (
            <Link key={category} href={CATEGORY_HREF[category] ?? "/dashboard"}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>{category}</CardTitle>
                  <CardDescription>{count} services available</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Open the {category} hub to manage tools and workflows.
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Placeholder panel for upcoming analytics.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Active Services</p>
              <p className="text-2xl font-semibold">{SERVICES.length}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">AI-Enabled Services</p>
              <p className="text-2xl font-semibold">
                {SERVICES.filter((service) => service.aiEnabled).length}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <p className="text-2xl font-semibold">{PLAN_LABELS[plan]}</p>
            </div>
          </CardContent>
        </Card>

        <TodayActivity
          clientName={selectedClient?.clientName || "Your Account"}
          replies={stats?.replies || 0}
          callsBooked={stats?.callsBooked || 0}
          closedDeals={stats?.dealsClosed || 0}
        />

        <NeedsAttention
          items={[
            "People who replied but have not gotten a follow-up in 48+ hours will show up here.",
            "Deals stuck in one stage for 7+ days will show up here.",
            "Campaigns with 0% replies after 50+ sends will show up here.",
          ]}
        />

        <ViralIdeasWidget />
      </div>
    </SideBar>
  );
}
