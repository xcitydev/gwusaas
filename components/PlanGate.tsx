"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasAccess, normalizePlan, PLAN_LABELS, type Plan } from "@/lib/plans";

type PlanGateProps = {
  requiredPlan: Plan;
  children: React.ReactNode;
};

export function PlanGate({ requiredPlan, children }: PlanGateProps) {
  const { isLoaded, user } = useUser();

  if (!isLoaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Checking plan access...</CardTitle>
          <CardDescription>
            Loading your subscription details.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const userPlan = normalizePlan(user?.publicMetadata?.plan);
  const canAccess = hasAccess(userPlan, requiredPlan);

  if (canAccess) {
    return <>{children}</>;
  }

  return (
    <Card className="border-dashed border-border/80 bg-card/70">
      <CardHeader className="p-6 pb-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Lock className="h-4 w-4" />
          Upgrade Required
        </CardTitle>
        <CardDescription className="text-sm mt-1">
          This section requires the {PLAN_LABELS[requiredPlan]} plan.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 pt-3 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          You are currently on the {PLAN_LABELS[userPlan]} plan.
        </p>
        <Button asChild className="h-10 px-5">
          <Link href="/pricing">Upgrade Now</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
