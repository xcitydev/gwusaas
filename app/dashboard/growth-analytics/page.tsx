"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Users, Heart, TrendingUp, Eye } from 'lucide-react'
import SideBar from "@/components/SideBar"

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Skeleton } from "@/components/ui/skeleton";

export default function GrowthAnalyticsPage() {
  const followerGrowthData = useQuery(api.analytics.getFollowerGrowth) || [];
  
  if (!followerGrowthData.length) {
    return (
      <SideBar>
        <div className="p-8 space-y-4">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      </SideBar>
    );
  }
  return (
    <SideBar>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Growth Analytics
            </h2>
            <p className="text-muted-foreground">
              Track your social media growth and engagement metrics
            </p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Followers
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12,847</div>
              <p className="text-xs text-muted-foreground">+2,340 this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Engagement Rate
              </CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4.8%</div>
              <p className="text-xs text-muted-foreground">
                +0.3% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Monthly Growth
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">18.2%</div>
              <p className="text-xs text-muted-foreground">growth rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Monthly Reach
              </CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156K</div>
              <p className="text-xs text-muted-foreground">
                +23% monthly reach
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="follower-growth" className="space-y-4">
          <TabsList>
            <TabsTrigger value="follower-growth">Follower Growth</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="platform-breakdown">
              Platform Breakdown
            </TabsTrigger>
          </TabsList>

          <TabsContent value="follower-growth" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Follower Growth Tracking</CardTitle>
                <CardDescription>
                  Real-time follower count across all platforms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    followers: {
                      label: "Followers",
                      color: "hsl(var(--chart-1))",
                    },
                    engagement: {
                      label: "Engagement",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-[400px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={followerGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="followers"
                        stroke="var(--color-followers)"
                        strokeWidth={3}
                        dot={{
                          fill: "var(--color-followers)",
                          strokeWidth: 2,
                          r: 4,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="engagement"
                        stroke="var(--color-engagement)"
                        strokeWidth={3}
                        dot={{
                          fill: "var(--color-engagement)",
                          strokeWidth: 2,
                          r: 4,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SideBar>
  );
}
