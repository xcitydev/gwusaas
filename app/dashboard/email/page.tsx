"use client";

import SideBar from "@/components/SideBar";
import { PlanGate } from "@/components/PlanGate";
import { ColdEmailGenerator } from "@/components/dashboard/ColdEmailGenerator";
import { SmsSequenceGenerator } from "@/components/dashboard/SmsSequenceGenerator";
import { MultiChannelSequencer } from "@/components/dashboard/MultiChannelSequencer";
import { MailMergeCsv } from "@/components/dashboard/MailMergeCsv";
import { ReplyClassifier } from "@/components/dashboard/ReplyClassifier";
import { SavedTemplatesLibrary } from "@/components/dashboard/SavedTemplatesLibrary";
import { OutreachAnalytics } from "@/components/dashboard/OutreachAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare,
  Mail,
  MessageCircle,
  Layers,
  FileSpreadsheet,
  Inbox,
  Library,
  BarChart3,
} from "lucide-react";

const TABS = [
  { value: "email", label: "Cold Email", Icon: Mail },
  { value: "sms", label: "SMS", Icon: MessageCircle },
  { value: "multi", label: "Multi-Channel", Icon: Layers },
  { value: "merge", label: "CSV Merge", Icon: FileSpreadsheet },
  { value: "replies", label: "Replies", Icon: Inbox },
  { value: "library", label: "Library", Icon: Library },
  { value: "analytics", label: "Analytics", Icon: BarChart3 },
] as const;

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
              Generate sequences, personalize at scale, triage replies, track what converts.
            </p>
          </div>
        </div>

        <PlanGate requiredPlan="starter">
          <Tabs defaultValue="email" className="space-y-6">
            <TabsList className="w-full h-auto p-1 bg-white/5 border border-white/10 rounded-xl flex-wrap justify-start">
              {TABS.map(({ value, label, Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-primary/15 data-[state=active]:text-primary"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="email">
              <ColdEmailGenerator />
            </TabsContent>
            <TabsContent value="sms">
              <SmsSequenceGenerator />
            </TabsContent>
            <TabsContent value="multi">
              <MultiChannelSequencer />
            </TabsContent>
            <TabsContent value="merge">
              <MailMergeCsv />
            </TabsContent>
            <TabsContent value="replies">
              <ReplyClassifier />
            </TabsContent>
            <TabsContent value="library">
              <SavedTemplatesLibrary />
            </TabsContent>
            <TabsContent value="analytics">
              <OutreachAnalytics />
            </TabsContent>
          </Tabs>
        </PlanGate>
      </div>
    </SideBar>
  );
}
