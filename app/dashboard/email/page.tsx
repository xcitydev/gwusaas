"use client";

import SideBar from "@/components/SideBar";
import { PlanGate } from "@/components/PlanGate";
import { ColdEmailGenerator } from "@/components/dashboard/ColdEmailGenerator";
import { MessageSquare } from "lucide-react";

export default function EmailHubPage() {
  return (
    <SideBar>
      <div className="mx-auto w-full max-w-7xl p-6 md:p-8 space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest">
              <MessageSquare className="w-4 h-4" />
              <span>Communication Hub</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white/90">
              Email & SMS Hub
            </h1>
            <p className="text-muted-foreground font-medium">
              Automation workflows, outreach engineering, and template systems.
            </p>
          </div>
        </div>

        <PlanGate requiredPlan="starter">
          <ColdEmailGenerator />
        </PlanGate>
      </div>
    </SideBar>
  );
}
