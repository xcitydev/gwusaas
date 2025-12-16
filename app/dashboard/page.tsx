"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { MessageSquare, TrendingUp, Users, Target, ArrowRight } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import SideBar from "@/components/SideBar";
import Link from "next/link";

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Get user profile
  const profile = useQuery(
    api.profile.getByClerkId,
    isSignedIn && user ? { clerkUserId: user.id } : "skip"
  );

  // Get projects for the current user
  const projects = useQuery(
    api.projects.list,
    {}
  );

  // Set first active project as selected
  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProjectId) {
      const activeProject = projects.find((p) => p.status === "active") || projects[0];
      setSelectedProjectId(activeProject._id);
    }
  }, [projects, selectedProjectId]);

  // Get KPIs for selected project
  const kpis = useQuery(
    api.metrics.kpis,
    selectedProjectId ? { projectId: selectedProjectId as any } : "skip"
  );

  // Get metrics range for chart
  const metricsData = useQuery(
    api.metrics.range,
    selectedProjectId ? { projectId: selectedProjectId as any, days: 30 } : "skip"
  );

  // Get recent leads
  const leadsData = useQuery(
    api.leads.list,
    selectedProjectId ? { projectId: selectedProjectId as any, limit: 5 } : "skip"
  );

  // Get onboarding status
  const onboarding = useQuery(
    api.onboarding.get,
    selectedProjectId ? { projectId: selectedProjectId as any } : "skip"
  );

  // Format chart data
  const chartData = metricsData?.map((m) => ({
    date: new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    followers: m.followers,
    reach: m.reach || 0,
    dmLeads: m.dmLeads || 0,
  })) || [];

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c79b09]"></div>
      </div>
    );
  }

  const selectedProject = projects?.find((p) => p._id === selectedProjectId);

  return (
    <SideBar>
      <div className="flex-1 space-y-4 p-8 pt-6 max-w-7xl mx-auto">
        <div className="space-y-4 md:mt-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
              <p className="text-muted-foreground">
                Welcome back! Here's an overview of your Instagram performance and leads.
              </p>
            </div>
            {projects && projects.length > 0 && (
              <select
                value={selectedProjectId || ""}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="px-4 py-2 bg-background border rounded-md"
              >
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} (@{p.instagramHandle})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Onboarding Banner */}
        {onboarding && !onboarding.completed && (
          <Card className="border-yellow-500/50 bg-yellow-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Complete Your Onboarding</h3>
                  <p className="text-sm text-muted-foreground">
                    Finish setting up your project to unlock AI features
                  </p>
                </div>
                <Link href="/onboarding">
                  <Button>Continue Onboarding</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leads (7d)</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.leads7d || 0}</div>
              <p className="text-xs text-muted-foreground">
                DM leads from last 7 days
              </p>
              <div className="mt-2">
                <Link href="/dashboard/outreach-results">
                  <Button variant="ghost" size="sm" className="text-xs">
                    View all <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reach (7d)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.reach7d.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">
                Total reach from last 7 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.totalFollowers.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">
                Current follower count
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Growth Score</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis?.growthScore || 0}</div>
              <p className="text-xs text-muted-foreground">
                Overall performance score (0-100)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Chart and Recent Leads */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>30-Day Performance</CardTitle>
              <CardDescription>
                Followers, reach, and DM leads over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              {chartData.length > 0 ? (
                <ChartContainer
                  config={{
                    followers: {
                      label: "Followers",
                      color: "hsl(var(--chart-1))",
                    },
                    reach: {
                      label: "Reach",
                      color: "hsl(var(--chart-2))",
                    },
                    dmLeads: {
                      label: "DM Leads",
                      color: "hsl(var(--chart-3))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="followers"
                        stroke="var(--color-followers)"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="reach"
                        stroke="var(--color-reach)"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="dmLeads"
                        stroke="var(--color-dmLeads)"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <p>No metrics data yet</p>
                    <p className="text-sm">Metrics will appear after data ingestion</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Recent Leads</CardTitle>
              <CardDescription>
                Latest leads from your campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {leadsData?.leads && leadsData.leads.length > 0 ? (
                <div className="space-y-4">
                  {leadsData.leads.map((lead) => (
                    <div key={lead._id} className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium">
                          {lead.handleOrEmail[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {lead.handleOrEmail}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {lead.source}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            lead.status === "qualified" || lead.status === "won"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {lead.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Link href="/dashboard/outreach-results">
                    <Button variant="outline" size="sm" className="w-full">
                      View all leads
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No leads yet</p>
                  <p className="text-sm">Leads will appear here as they come in</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {onboarding && !onboarding.completed ? (
                <Link href="/onboarding">
                  <Button className="w-full" variant="outline">
                    Continue Onboarding
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/dashboard/ai">
                    <Button className="w-full" variant="outline">
                      Generate Captions
                    </Button>
                  </Link>
                  <Link href="/dashboard/ai">
                    <Button className="w-full" variant="outline">
                      View Weekly Report
                    </Button>
                  </Link>
                  <Link href="/dashboard/crm">
                    <Button className="w-full" variant="outline">
                      Manage Leads
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </SideBar>
  );
}
