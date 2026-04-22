"use client";

import React from "react";
import { useOrganization, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AlertCircle, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function TrialBanner() {
  const { isLoaded, isSignedIn } = useUser();
  const { organization } = useOrganization();

  const convexOrg = useQuery(
    api.organization.getByClerkId,
    organization?.id ? { clerkOrgId: organization.id } : "skip"
  );

  if (!isLoaded || !isSignedIn || convexOrg === undefined) {
    return null;
  }

  const trialEndsAt = convexOrg?.trialEndsAt;
  const plan = convexOrg?.plan;

  // Don't show banner for users who have upgraded
  if (!trialEndsAt || plan !== "growth") {
    return null;
  }

  const now = Date.now();
  const isExpired = now > trialEndsAt;
  const daysRemaining = Math.max(0, Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)));

  return (
    <div className={`w-full text-center px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium ${isExpired ? 'bg-destructive text-destructive-foreground' : 'bg-primary/10 text-primary border-b border-primary/20'}`}>
      {isExpired ? (
        <>
          <AlertCircle className="w-4 h-4" />
          <span>Your Growth plan trial has expired. You are now on the Free tier.</span>
          <Link href="/pricing" className="ml-2 underline hover:text-destructive-foreground/80 font-bold">
            Upgrade now
          </Link>
        </>
      ) : (
        <>
          <Clock className="w-4 h-4" />
          <span>You have {daysRemaining} days left in your Growth plan trial.</span>
          <Link href="/pricing" className="ml-2 underline hover:text-primary/80 font-bold">
            View plans
          </Link>
        </>
      )}
    </div>
  );
}
