"use client";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Copy,
  Share2,
  Gift,
  Users,
  DollarSign,
  TrendingUp,
  Mail,
} from "lucide-react";
import SideBar from "@/components/SideBar";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { PLAN_LABELS, type Plan } from "@/lib/plans";

type ReferralRow = {
  _id: string;
  referredClerkUserId: string;
  referredEmail?: string;
  referredName?: string;
  plan?: string;
  status: string;
  commissionCents: number;
  commissionPaid: boolean;
  signedUpAt: number;
  convertedAt?: number;
};

function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusBadge(status: string): { label: string; tone: string } {
  switch (status) {
    case "paid":
      return {
        label: "Paid",
        tone: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      };
    case "trialing":
      return {
        label: "Trialing",
        tone: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      };
    case "cancelled":
    case "refunded":
      return {
        label: status === "refunded" ? "Refunded" : "Cancelled",
        tone: "bg-red-500/15 text-red-400 border-red-500/30",
      };
    default:
      return {
        label: "Signed up",
        tone: "bg-white/5 text-muted-foreground border-white/10",
      };
  }
}

export default function ReferralProgramPage() {
  const { user, isLoaded } = useUser();
  const referralData = useQuery(api.referrals.get);
  const myReferrals = useQuery(api.referrals.listMyReferrals) as
    | ReferralRow[]
    | undefined;
  const initReferral = useMutation(api.referrals.init);

  // Bootstrap the user's referral row on first visit.
  useEffect(() => {
    if (isLoaded && user && referralData === null) {
      initReferral().catch((err) => {
        console.error("Failed to init referral program:", err);
      });
    }
  }, [isLoaded, user, referralData, initReferral]);

  // Build the referral link off the *real* origin so it works on whatever
  // domain (custom white-label, localhost, prod) the user is currently on.
  const referralLink = useMemo(() => {
    if (!referralData?.referralCode) return "";
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    return origin
      ? `${origin}/sign-up?ref=${referralData.referralCode}`
      : `/sign-up?ref=${referralData.referralCode}`;
  }, [referralData?.referralCode]);

  const commissionPct = Math.round(
    (referralData?.commissionRate ?? 0.3) * 100,
  );

  // Total earned = paid out so far. Pending = earned but not yet disbursed.
  const totalEarnedCents = referralData?.totalEarned ?? 0;
  const pendingCents = referralData?.pendingEarnings ?? 0;
  const lifetimeCents = totalEarnedCents + pendingCents;

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c79b09]"></div>
      </div>
    );
  }

  return (
    <SideBar>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Referral Program
            </h2>
            <p className="text-muted-foreground">
              Earn {commissionPct}% of every plan paid by people you refer —
              for as long as they stay subscribed.
            </p>
          </div>
          <Button
            disabled={!referralLink}
            onClick={() => {
              if (!referralLink) return;
              navigator.clipboard.writeText(referralLink);
              toast.success("Referral link copied!");
            }}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Link
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Referrals
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {referralData?.totalReferrals ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Across all time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold overflow-hidden text-ellipsis">
                {formatUsd(lifetimeCents)}
              </div>
              <p className="text-xs text-muted-foreground">
                {pendingCents > 0
                  ? `${formatUsd(pendingCents)} pending payout`
                  : "Lifetime"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {referralData?.status ?? "Loading..."}
              </div>
              <p className="text-xs text-muted-foreground">Program status</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Code</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate font-mono">
                {referralData?.referralCode ?? "---"}
              </div>
              <p className="text-xs text-muted-foreground">Your unique ID</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Your Referral Link</CardTitle>
              <CardDescription>
                Share this link — anyone who signs up through it earns you{" "}
                {commissionPct}% of every paid plan they buy, for the
                lifetime of their subscription.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input
                  value={referralLink || "Loading..."}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  size="sm"
                  disabled={!referralLink}
                  onClick={() => {
                    navigator.clipboard.writeText(referralLink);
                    toast.success("Link copied!");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!referralLink}
                  onClick={() => {
                    const subject = encodeURIComponent(
                      "Check out this growth platform",
                    );
                    const body = encodeURIComponent(
                      `Hey! I've been using this platform to grow my business and thought you might like it: ${referralLink}`,
                    );
                    window.location.href = `mailto:?subject=${subject}&body=${body}`;
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!referralLink}
                  onClick={() => {
                    const text = encodeURIComponent(
                      `Growing my business with this platform. Check it out: ${referralLink}`,
                    );
                    window.open(
                      `https://twitter.com/intent/tweet?text=${text}`,
                      "_blank",
                    );
                  }}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Social Media
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How commission works</CardTitle>
              <CardDescription>
                Flat {commissionPct}% on every paid plan, every month, for as
                long as your referrals stay subscribed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Starter — $39/mo</span>
                  <Badge variant="secondary">
                    {formatUsd(Math.round(3900 * (commissionPct / 100)))}/mo
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Growth — $149/mo</span>
                  <Badge variant="secondary">
                    {formatUsd(Math.round(14900 * (commissionPct / 100)))}/mo
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Elite — $399/mo</span>
                  <Badge variant="secondary">
                    {formatUsd(Math.round(39900 * (commissionPct / 100)))}/mo
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">White Label — $999/mo</span>
                  <Badge variant="secondary">
                    {formatUsd(Math.round(99900 * (commissionPct / 100)))}/mo
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Commissions accrue on the day each referral renews. Refunds
                claw back the matching commission.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Referral History</CardTitle>
            <CardDescription>
              Track your referrals and their conversion status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referred Client</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Signup Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Reward</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!myReferrals && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        Loading referrals…
                      </TableCell>
                    </TableRow>
                  )}
                  {myReferrals && myReferrals.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No referrals found yet. Share your link to get
                        started!
                      </TableCell>
                    </TableRow>
                  )}
                  {myReferrals?.map((r) => {
                    const badge = statusBadge(r.status);
                    return (
                      <TableRow key={r._id}>
                        <TableCell className="font-medium">
                          {r.referredName || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.referredEmail || "—"}
                        </TableCell>
                        <TableCell>
                          {r.plan
                            ? PLAN_LABELS[r.plan as Plan] ?? r.plan
                            : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(r.signedUpAt)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={badge.tone}
                          >
                            {badge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {r.commissionCents > 0
                            ? formatUsd(r.commissionCents)
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </SideBar>
  );
}
