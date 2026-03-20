"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PLAN_FEATURES, PLAN_LABELS, PLAN_ORDER, normalizePlan, type Plan } from "@/lib/plans";
import { SERVICES } from "@/lib/services";

const serviceNamesById = Object.fromEntries(SERVICES.map((service) => [service.id, service.name]));
const planDescriptions: Record<Plan, string> = {
  free: "Best for exploring the platform",
  starter: "Best for early growth systems",
  growth: "Best for scaling lead generation",
  elite: "Best for advanced execution teams",
  white_label: "Best for agency-level white label ops",
};

export default function PricingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);
  const [expandedPlans, setExpandedPlans] = useState<Record<Plan, boolean>>({
    free: true,
    starter: false,
    growth: false,
    elite: false,
    white_label: false,
  });
  const [error, setError] = useState<string | null>(null);
  const currentPlan = normalizePlan(user?.publicMetadata?.plan);

  const upgrade = async (plan: Plan) => {
    setLoadingPlan(plan);
    setError(null);
    try {
      const res = await fetch("/api/billing/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        throw new Error("Upgrade request failed");
      }
      await user?.reload();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoadingPlan(null);
    }
  };

  if (!isLoaded) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-6 py-10 md:px-10">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-[420px] w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-10 md:px-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Pricing</h1>
          <p className="text-muted-foreground mt-2">Choose a plan and unlock additional GWU services.</p>
        </div>
        <Badge className="text-sm px-3 py-1.5">Current: {PLAN_LABELS[currentPlan]}</Badge>
      </div>

      {error ? (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {PLAN_ORDER.map((plan) => {
          const features = PLAN_FEATURES[plan]
            .map((serviceId) => serviceNamesById[serviceId])
            .filter(Boolean);
          const isExpanded = expandedPlans[plan];
          const visibleFeatures = isExpanded ? features : features.slice(0, 8);
          const hasMore = features.length > 8;

          const isCurrent = currentPlan === plan;

          return (
            <Card
              key={plan}
              className="flex min-h-[400px] flex-col rounded-2xl border-border/70 bg-card/70 backdrop-blur"
            >
              <CardHeader className="space-y-2 p-6">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-2xl">{PLAN_LABELS[plan]}</CardTitle>
                  {isCurrent ? <Badge variant="secondary">Current</Badge> : null}
                </div>
                <CardDescription className="text-sm">{planDescriptions[plan]}</CardDescription>
                <p className="text-sm text-muted-foreground">{features.length} unlocked services</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-5 p-6 pt-0">
                <div className="flex-1 rounded-lg border border-border/60 bg-background/40 p-4 space-y-3">
                  {visibleFeatures.length > 0 ? (
                    <>
                      {visibleFeatures.map((feature) => (
                        <p key={feature} className="text-sm flex items-start gap-2 leading-5">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </p>
                      ))}
                      {hasMore ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-0 h-8 text-sm text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            setExpandedPlans((prev) => ({ ...prev, [plan]: !prev[plan] }))
                          }
                        >
                          {isExpanded ? (
                            <>
                              Show less <ChevronUp className="h-4 w-4" />
                            </>
                          ) : (
                            <>
                              Show {features.length - visibleFeatures.length} more <ChevronDown className="h-4 w-4" />
                            </>
                          )}
                        </Button>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Core dashboard access included.</p>
                  )}
                </div>
                <Button
                  className="w-full h-11"
                  variant={isCurrent ? "secondary" : "default"}
                  disabled={Boolean(loadingPlan) || isCurrent}
                  onClick={() => upgrade(plan)}
                >
                  {isCurrent
                    ? "Current Plan"
                    : loadingPlan === plan
                      ? "Updating..."
                      : "Upgrade Plan"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
