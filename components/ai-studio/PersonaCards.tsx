"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BotAvatar } from "./BotAvatar";

const agencyPoints = [
  "Morning briefings for your team",
  "Flags clients at risk of churning",
  "Summarizes weekly performance",
  "Tells you where revenue is leaking",
  "Recommends your next move",
];

const clientPoints = [
  "Answers client questions instantly",
  "Sends weekly performance summaries",
  "Alerts them when deals close",
  "Suggests content ideas on demand",
  "Available in their portal 24/7",
];

export function PersonaCards() {
  return (
    <section className="space-y-6">
      <div className="ai-reveal" style={{ animationDelay: "200ms" }}>
        <p className="text-xs uppercase tracking-[0.2em] text-[#7E7E8C]">Two modes. One intelligence.</p>
        <h2 className="mt-2 font-syne text-3xl font-bold text-[#F0F0F5] md:text-4xl">
          Built for how you actually work
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="ai-card-lift border-[#2B2B30] bg-[#17171C] ai-reveal" style={{ animationDelay: "350ms" }}>
          <CardHeader className="space-y-4">
            <BotAvatar variant="agency" className="h-24 w-24" />
            <CardTitle className="font-syne text-2xl text-[#F0F0F5]">Agency Chief of Staff</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-[#B4B4BE]">
            <p>
              Runs your entire agency. Knows every client, every campaign, every deal in your
              pipeline.
            </p>
            <ul className="space-y-2 text-sm">
              {agencyPoints.map((item) => (
                <li key={item}>● {item}</li>
              ))}
            </ul>
            <Badge className="bg-[#2E2312] text-[#FFD166] hover:bg-[#2E2312]">FOR AGENCIES</Badge>
          </CardContent>
        </Card>

        <Card className="ai-card-lift border-[#2B2B30] bg-[#17171C] ai-reveal" style={{ animationDelay: "500ms" }}>
          <CardHeader className="space-y-4">
            <BotAvatar variant="client" className="h-24 w-24" />
            <CardTitle className="font-syne text-2xl text-[#F0F0F5]">Client Chief of Staff</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-[#B4B4BE]">
            <p>
              Your client&apos;s personal AI. Always up to date on their campaigns, their content,
              and their goals.
            </p>
            <ul className="space-y-2 text-sm">
              {clientPoints.map((item) => (
                <li key={item}>● {item}</li>
              ))}
            </ul>
            <Badge className="bg-[#15242A] text-[#7FDFF5] hover:bg-[#15242A]">FOR CLIENTS</Badge>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
