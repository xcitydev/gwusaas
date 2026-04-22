"use client";

import { TrendingUp, MessageCircle, Calendar, Users, ArrowUpRight, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function TodayActivity({
  clientName,
  replies,
  callsBooked,
  closedDeals,
}: {
  clientName: string;
  replies: number;
  callsBooked: number;
  closedDeals: number;
}) {
  return (
    <div className="p-8 h-full flex flex-col justify-between">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Client Campaign</p>
              <h3 className="text-xl font-black text-white/90">{clientName}</h3>
            </div>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-black uppercase">Active Now</Badge>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {[
            { label: "Replies", val: replies, icon: MessageCircle, color: "text-amber-500" },
            { label: "Booked", val: callsBooked, icon: Calendar, color: "text-primary" },
            { label: "Closed", val: closedDeals, icon: Users, color: "text-emerald-500" },
          ].map((stat, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <stat.icon className="w-3 h-3" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className={cn("text-2xl font-black", stat.color)}>{stat.val}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <Button asChild className="rounded-xl h-10 px-6 font-bold amber-glow">
          <Link href="/dashboard/outreach">
            Launch Outreach <ArrowUpRight className="ml-2 w-4 h-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl h-10 px-6 font-bold border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
          <Link href="/dashboard/deals">View Pipeline</Link>
        </Button>
      </div>
    </div>
  );
}

// Helper for class names
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
