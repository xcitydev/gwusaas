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
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Sparkles, 
  Zap, 
  ArrowUpRight, 
  Activity,
  Layers
} from "lucide-react";

const CATEGORY_HREF: Record<string, string> = {
  Advertising: "/dashboard/ads",
  "Email & SMS": "/dashboard/email",
  SEO: "/dashboard/seo",
  Content: "/dashboard/content",
  "Social Growth": "/dashboard/social",
  Other: "/dashboard/community",
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
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
        <div className="mx-auto w-full max-w-7xl p-6 md:p-8 space-y-8 animate-pulse text-background">
          <div className="h-10 w-64 bg-white/5 rounded-lg" />
          <div className="grid gap-6 md:grid-cols-4 md:grid-rows-2 h-[600px]">
            <div className="col-span-2 row-span-2 bg-white/5 rounded-3xl" />
            <div className="col-span-2 bg-white/5 rounded-3xl" />
            <div className="bg-white/5 rounded-3xl" />
            <div className="bg-white/5 rounded-3xl" />
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
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-7xl p-6 md:p-8 space-y-8"
      >
        <motion.div variants={item} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest">
              <LayoutDashboard className="w-4 h-4" />
              <span>Workspace Overview</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white/90">
              Commander Dashboard
            </h1>
            <p className="text-muted-foreground font-medium">
              Ready for takeoff. All systems operational.
            </p>
          </div>
          <Badge className="w-fit h-9 px-4 text-xs font-bold bg-primary/10 text-primary border-primary/20 amber-glow">
            <Zap className="w-4 h-4 mr-2 fill-primary" />
            {PLAN_LABELS[plan]} Edition
          </Badge>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid gap-6 md:grid-cols-12 grid-rows-none">
          
          {/* Main Activity - Large Span */}
          <motion.div variants={item} className="md:col-span-8 group">
            <div className="glass-card rounded-[2rem] overflow-hidden h-full">
              <TodayActivity
                clientName={selectedClient?.clientName || "Your Account"}
                replies={stats?.replies || 0}
                callsBooked={stats?.callsBooked || 0}
                closedDeals={stats?.dealsClosed || 0}
              />
            </div>
          </motion.div>

          {/* Plan/Stats - Smaller Span */}
          <motion.div variants={item} className="md:col-span-4">
            <div className="glass-card rounded-[2rem] p-8 h-full flex flex-col justify-between bg-gradient-to-br from-primary/5 to-transparent">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    Growth Engine
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Live</Badge>
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Operational status: Ultra-optimized</p>
                </div>
              </div>
              <div className="mt-8 space-y-4">
                {[
                  { label: "Active Nodes", val: SERVICES.length, icon: Layers },
                  { label: "AI Co-pilots", val: SERVICES.filter(s => s.aiEnabled).length, icon: Sparkles },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3">
                      <stat.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                    </div>
                    <span className="text-lg font-bold">{stat.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Categories Grid - Mid Span */}
          <motion.div variants={item} className="md:col-span-12">
            <div className="p-1">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/50 mb-4 px-2">Service Hubs</h3>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                {Object.entries(categoryCounts).map(([category, count]) => (
                  <Link key={category} href={CATEGORY_HREF[category] ?? "/dashboard"} className="group">
                    <Card className="h-full glass-card rounded-2xl border-white/5 transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-white/10">
                      <CardHeader className="p-5 pb-2">
                        <div className="flex justify-between items-start mb-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center transition-colors group-hover:bg-primary/20">
                            <ArrowUpRight className="w-4 h-4 text-primary" />
                          </div>
                          <Badge variant="secondary" className="text-[10px] font-bold py-0">{count}</Badge>
                        </div>
                        <CardTitle className="text-sm font-bold tracking-tight">{category}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 pt-0">
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mt-3">
                          <div className="h-full bg-primary/40 w-1/3" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Side Panels */}
          <motion.div variants={item} className="md:col-span-6 lg:col-span-7">
            <div className="glass-card rounded-[2rem] h-full">
              <ViralIdeasWidget />
            </div>
          </motion.div>

          <motion.div variants={item} className="md:col-span-6 lg:col-span-5">
            <div className="glass-card rounded-[2rem] h-full p-2">
              <NeedsAttention
                items={[
                  "Unanswered high-intent replies (Action Required)",
                  "Deals stuck in 'Negotiation' stage for 3+ days",
                  "Campaign '@LuxuryLeads' hitting rate limits",
                ]}
              />
            </div>
          </motion.div>

        </div>
      </motion.div>
    </SideBar>
  );
}
