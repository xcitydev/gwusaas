"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Users, Heart, TrendingUp, Eye } from 'lucide-react'
import SideBar from "@/components/SideBar"

const followerGrowthData = [
  { month: "Jan", followers: 8500, engagement: 12000 },
  { month: "Feb", followers: 9200, engagement: 13500 },
  { month: "Mar", followers: 10100, engagement: 15200 },
  { month: "Apr", followers: 11300, engagement: 17800 },
  { month: "May", followers: 12100, engagement: 19500 },
  { month: "Jun", followers: 12847, engagement: 21200 },
]

export default function GrowthAnalyticsPage() {
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
