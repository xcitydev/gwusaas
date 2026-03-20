"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "When is this launching?",
    a: "We're targeting Q2 2026 for early access. Waitlist members get priority.",
  },
  {
    q: "Is this the same as the AI Studio?",
    a: "The AI Chief of Staff is a major upgrade to AI Studio - it's a fully autonomous agent, not just a tool.",
  },
  {
    q: "Will it work with my existing GHL setup?",
    a: "Yes. It connects directly to your GHL sub-account, your campaigns, your content calendar, and your client portal.",
  },
  {
    q: "Is OpenClaw separate from GWU Agency?",
    a: "OpenClaw is the AI engine that powers the Chief of Staff feature inside the GWU platform. You don't need a separate account.",
  },
  {
    q: "What data does it use?",
    a: "It reads from your GWU dashboard - campaigns, deals, content, client profiles. It never accesses anything outside your account.",
  },
];

export function FaqAccordion() {
  const [openIdx, setOpenIdx] = useState<number>(0);

  return (
    <section className="space-y-4 ai-reveal" style={{ animationDelay: "150ms" }}>
      <h2 className="font-syne text-3xl font-bold text-[#F0F0F5] md:text-4xl">Questions</h2>
      <div className="space-y-2">
        {faqs.map((item, idx) => {
          const open = openIdx === idx;
          return (
            <Card key={item.q} className="border-[#2B2B30] bg-[#17171C] px-4 py-3">
              <button
                className="flex w-full items-center justify-between gap-3 text-left"
                onClick={() => setOpenIdx(open ? -1 : idx)}
              >
                <span className="text-sm font-medium text-[#F0F0F5]">{item.q}</span>
                <ChevronDown className={cn("h-4 w-4 text-[#A7A7B2] transition-transform", open ? "rotate-180" : "rotate-0")} />
              </button>
              <div className={cn("overflow-hidden transition-all duration-300", open ? "max-h-40 pt-3" : "max-h-0")}>
                <p className="text-sm text-[#B4B4BE]">{item.a}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
