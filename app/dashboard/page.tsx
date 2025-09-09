"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { MessageSquare, TrendingUp, Users, Target } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/hooks/tools/firebase";
import Spinner from "@/components/spinner";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import SideBar from "@/components/SideBar";

const performanceData = [
  { month: "Jan", outreach: 2000, growth: 1200 },
  { month: "Feb", outreach: 2500, growth: 1800 },
  { month: "Mar", outreach: 3200, growth: 2400 },
  { month: "Apr", outreach: 3800, growth: 2800 },
  { month: "May", outreach: 4200, growth: 3200 },
  { month: "Jun", outreach: 4800, growth: 3600 },
  { month: "Jul", outreach: 5200, growth: 4000 },
  { month: "Aug", outreach: 5800, growth: 4400 },
  { month: "Sep", outreach: 6200, growth: 4800 },
  { month: "Oct", outreach: 6800, growth: 5200 },
  { month: "Nov", outreach: 7200, growth: 5600 },
  { month: "Dec", outreach: 8000, growth: 6000 },
];

const recentResponses = [
  {
    name: "Sarah Johnson",
    handle: "@sarah_realtor",
    platform: "Instagram",
    type: "DM Response",
    time: "2 hours ago",
    status: "Interested",
  },
  {
    name: "Mike Chen",
    handle: "@mikec_business",
    platform: "LinkedIn",
    type: "Connection",
    time: "4 hours ago",
    status: "Connected",
  },
  {
    name: "Emma Davis",
    handle: "@emma_marketing",
    platform: "Instagram",
    type: "Story Reply",
    time: "6 hours ago",
    status: "Qualified",
  },
];

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();
   const router = useRouter();
   const [goodToGo, setGoodToGo] = useState(false);
   // Check if user exists in Convex
   const convexUser = useQuery(
     api.users.getUser,
     isSignedIn ? { clerkUserId: user.id } : "skip"
   );

   useEffect(() => {
     if (!isLoaded) return;

     if (isSignedIn) {
       if (convexUser === null) {
         // User authenticated but doesn't exist in Convex - redirect to onboarding
         router.push("/onboarding");
       } else if (convexUser && !convexUser.user.onboardingCompleted) {
         // User exists but onboarding not completed
         router.push("/onboarding");
       } else {
        setGoodToGo(true);
       }
     }
   }, [isLoaded, isSignedIn, convexUser, router]);

  if (!isLoaded || !isSignedIn || !goodToGo) {
    // Show a loading state while syncing
     return (
       <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c79b09]"></div>
       </div>
     );
  }
  return (
    <SideBar>
      <div className="flex-1 space-y-4 p-8 pt-6 max-w-7xl mx-auto">
          <div className=" space-y-4 md:mt-4 py-6">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              {
                "Welcome back! Here's an overview of your outreach performance and social growth."
              }
            </p>
          </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Daily Outreach
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">87</div>
              <p className="text-xs text-muted-foreground">
                Target: 50-100 • messages sent today
              </p>
              <Badge variant="secondary" className="mt-1 text-green-600">
                +12% ↗
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Response Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">18.5%</div>
              <p className="text-xs text-muted-foreground">from last week</p>
              <Badge variant="secondary" className="mt-1 text-green-600">
                +1.2% ↗
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                New Followers
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+342</div>
              <p className="text-xs text-muted-foreground">this week</p>
              <Badge variant="secondary" className="mt-1 text-green-600">
                +12% ↗
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Qualified Leads
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23</div>
              <p className="text-xs text-muted-foreground">
                from outreach this week
              </p>
              <Badge variant="secondary" className="mt-1 text-green-600">
                +8 ↗
              </Badge>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="outreach">Outreach</TabsTrigger>
            <TabsTrigger value="growth">Growth</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Performance Overview</CardTitle>
                  <CardDescription>
                    Your outreach and growth performance over the last 12 months
                  </CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <ChartContainer
                    config={{
                      outreach: {
                        label: "Outreach",
                        color: "hsl(var(--chart-1))",
                      },
                      growth: {
                        label: "Growth",
                        color: "hsl(var(--chart-2))",
                      },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={performanceData}>
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
                          dataKey="growth"
                          stroke="var(--color-growth)"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Recent Responses</CardTitle>
                  <CardDescription>
                    Latest responses from your outreach campaigns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentResponses.map((response, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {response.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </span>
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {response.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {response.handle}
                          </p>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {response.platform}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {response.type}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={
                              response.status === "Interested"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {response.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {response.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </SideBar>
  );
}
