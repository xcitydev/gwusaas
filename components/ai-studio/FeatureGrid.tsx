"use client";

import {
  Calendar,
  Clock,
  FileText,
  Heart,
  Sunrise,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "Morning Briefings",
    description:
      "Start every day knowing exactly where your agency stands — automatically delivered at 8am.",
    icon: Sunrise,
  },
  {
    title: "Client Health Scoring",
    description:
      "AI monitors every client and flags anyone at risk before they churn.",
    icon: Heart,
  },
  {
    title: "Deal Intelligence",
    description:
      "Tracks every conversation and tells you which deals are most likely to close.",
    icon: TrendingUp,
  },
  {
    title: "Auto Summaries",
    description:
      "Weekly performance summaries sent to you and your clients automatically.",
    icon: FileText,
  },
  {
    title: "Content Scheduling",
    description:
      "Knows your content calendar and reminds you when posts are overdue.",
    icon: Calendar,
  },
  {
    title: "24/7 Availability",
    description:
      "Your clients can ask questions any time — the AI answers instantly using your agency data.",
    icon: Clock,
  },
];

export function FeatureGrid() {
  return (
    <section className="space-y-5">
      <div className="ai-reveal" style={{ animationDelay: "120ms" }}>
        <h2 className="font-syne text-3xl font-bold text-[#F0F0F5] md:text-4xl">
          Everything your agency needs to run itself
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <Card
              key={feature.title}
              className="ai-card-lift border-[#2B2B30] bg-[#17171C] border-l-4 border-l-[#F5A623] ai-reveal"
              style={{ animationDelay: `${220 + idx * 100}ms` }}
            >
              <CardHeader>
                <CardTitle className="font-syne text-xl text-[#F0F0F5] flex items-center gap-2">
                  <Icon className="h-5 w-5 text-[#F5A623]" />
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[#B4B4BE]">{feature.description}</CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
