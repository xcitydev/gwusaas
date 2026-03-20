"use client";

import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="ai-hero relative overflow-hidden rounded-3xl border border-[#2B2B30] bg-[#111114] px-6 py-20 text-center md:px-12 md:py-28">
      <div className="hero-orb pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full" />
      <div className="relative mx-auto max-w-4xl ai-reveal" style={{ animationDelay: "120ms" }}>
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[#4A3A1B] bg-[#1A1712] px-3 py-1 text-xs font-semibold tracking-wide text-[#FFD166]">
          <span className="inline-block h-2 w-2 rounded-full bg-[#F5A623] animate-pulse" />
          COMING SOON
        </div>

        <h1 className="font-syne text-5xl font-extrabold leading-tight text-[#F0F0F5] md:text-7xl">
          Meet your AI
          <br />
          <span className="text-[#F5A623]">Chief of Staff</span>
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-base text-[#B1B1BC] md:text-lg">
          Powered by OpenClaw — an AI that knows your agency inside out. Briefs your team, tracks
          your clients, closes more deals. Available 24/7. Never misses a thing.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild className="bg-[#F5A623] text-black hover:bg-[#FFD166]">
            <a href="#waitlist">Join the waitlist</a>
          </Button>
          <Button asChild variant="outline" className="border-[#7A622B] text-[#F0F0F5]">
            <a href="#demo">See how it works</a>
          </Button>
        </div>

        <div className="mt-7 inline-flex items-center gap-2 text-sm text-[#8D8D98]">
          <Bot className="h-4 w-4" />
          Built on OpenClaw AI
        </div>
      </div>
    </section>
  );
}
