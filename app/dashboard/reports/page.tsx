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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Line,
  LineChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Download,
  Calendar,
  TrendingUp,
  Users,
  MessageSquare,
  Globe,
} from "lucide-react";
import SideBar from "@/components/SideBar";

const monthlyPerformance = [
  { month: "Jan", outreach: 2400, conversions: 240, revenue: 12000 },
  { month: "Feb", outreach: 2800, conversions: 320, revenue: 15000 },
  { month: "Mar", outreach: 3200, conversions: 380, revenue: 18000 },
  { month: "Apr", outreach: 3600, conversions: 420, revenue: 21000 },
  { month: "May", outreach: 4000, conversions: 480, revenue: 24000 },
  { month: "Jun", outreach: 4400, conversions: 520, revenue: 26000 },
];

const serviceBreakdown = [
  { name: "Social Media", value: 35, color: "#8884d8" },
  { name: "Website Dev", value: 25, color: "#82ca9d" },
  { name: "Video Production", value: 20, color: "#ffc658" },
  { name: "Content Creation", value: 15, color: "#ff7300" },
  { name: "Other", value: 5, color: "#00ff00" },
];

const platformMetrics = [
  { platform: "Instagram", followers: 12847, engagement: 4.8, growth: 18.2 },
  { platform: "LinkedIn", followers: 8432, engagement: 6.2, growth: 12.5 },
  { platform: "Facebook", followers: 15623, engagement: 3.1, growth: 8.7 },
  { platform: "Twitter", followers: 6789, engagement: 2.9, growth: 15.3 },
];

export default function ReportsPage() {
  return (
    <SideBar>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
            <p className="text-muted-foreground">
              Comprehensive analytics and performance reports for your campaigns
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Date Range
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Outreach
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">21,400</div>
              <p className="text-xs text-muted-foreground">
                +15% from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2,360</div>
              <p className="text-xs text-muted-foreground">
                11% conversion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Followers
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">43,691</div>
              <p className="text-xs text-muted-foreground">
                Across all platforms
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Revenue Generated
              </CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$116K</div>
              <p className="text-xs text-muted-foreground">+22% growth</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance Overview</CardTitle>
                <CardDescription>
                  Track your outreach, conversions, and revenue over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    outreach: {
                      label: "Outreach",
                      color: "hsl(var(--chart-1))",
                    },
                    conversions: {
                      label: "Conversions",
                      color: "hsl(var(--chart-2))",
                    },
                    revenue: {
                      label: "Revenue",
                      color: "hsl(var(--chart-3))",
                    },
                  }}
                  className="h-[400px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="outreach"
                        stroke="var(--color-outreach)"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="conversions"
                        stroke="var(--color-conversions)"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Service Distribution</CardTitle>
                  <CardDescription>
                    Breakdown of services by revenue contribution
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      value: {
                        label: "Percentage",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={serviceBreakdown}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}%`}
                        >
                          {serviceBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Service Performance</CardTitle>
                  <CardDescription>Revenue by service category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {serviceBreakdown.map((service, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: service.color }}
                          />
                          <span className="text-sm font-medium">
                            {service.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {service.value}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ${(service.value * 1160).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="platforms" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Platform Performance</CardTitle>
                <CardDescription>
                  Social media metrics across all platforms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {platformMetrics.map((platform, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="font-medium">{platform.platform}</div>
                      </div>
                      <div className="flex items-center space-x-8">
                        <div className="text-center">
                          <div className="text-sm font-medium">
                            {platform.followers.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Followers
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium">
                            {platform.engagement}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Engagement
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-green-600">
                            +{platform.growth}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Growth
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SideBar>
  );
}
