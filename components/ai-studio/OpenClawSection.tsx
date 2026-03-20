"use client";

import { Card, CardContent } from "@/components/ui/card";

export function OpenClawSection() {
  return (
    <section className="ai-reveal" style={{ animationDelay: "140ms" }}>
      <Card className="border-[#2B2B30] bg-[#111114]">
        <CardContent className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-2 lg:gap-8 lg:p-10">
          <div className="space-y-4">
            <p className="text-xs tracking-[0.2em] uppercase text-[#7E7E8C]">Powered by</p>
            <h2 className="font-syne text-4xl font-extrabold text-[#F5A623] sm:text-5xl">OpenClaw</h2>
            <p className="text-[#B4B4BE]">
              OpenClaw is a specialized AI agent built for agencies and growth teams. It knows your
              tools, your workflows, and your clients — and gets smarter every week.
            </p>
            <a href="#" className="text-sm text-[#CFCFD8] underline underline-offset-4 hover:text-[#FFD166]">
              Learn more about OpenClaw →
            </a>
          </div>
          <div className="w-full overflow-hidden rounded-xl border border-[#2B2B30] bg-[#17171C] p-2 sm:p-3">
            <div className="sm:hidden">
              <div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#F5A623] bg-[#16161C] text-sm font-medium text-[#F0F0F5] shadow-[0_0_40px_rgba(245,166,35,0.25)]">
                OpenClaw
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "GHL CRM",
                  "Instagram DMs",
                  "Content Pipeline",
                  "Deal Tracker",
                  "Client Portal",
                  "Follower Scraper",
                ].map((node) => (
                  <div
                    key={node}
                    className="rounded-md border border-[#3A3A40] bg-[#202028] px-2 py-1.5 text-center text-[11px] text-[#D8D8E2]"
                  >
                    {node}
                  </div>
                ))}
              </div>
            </div>
            <svg
              viewBox="0 0 520 360"
              preserveAspectRatio="xMidYMid meet"
              className="hidden h-auto w-full max-w-full sm:block"
            >
              <defs>
                <radialGradient id="centerGlow" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="#F5A623" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#F5A623" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="260" cy="180" r="120" fill="url(#centerGlow)" />
              {[
                [260, 180, 85, 60],
                [260, 180, 430, 72],
                [260, 180, 470, 178],
                [260, 180, 414, 294],
                [260, 180, 120, 300],
                [260, 180, 52, 182],
              ].map((line, idx) => (
                <line
                  key={idx}
                  x1={line[0]}
                  y1={line[1]}
                  x2={line[2]}
                  y2={line[3]}
                  className="flow-line"
                  stroke="#F5A623"
                  strokeOpacity="0.8"
                  strokeWidth="2"
                />
              ))}
              <g>
                <circle cx="260" cy="180" r="52" fill="#16161C" stroke="#F5A623" strokeWidth="3" />
                <text x="260" y="184" textAnchor="middle" fill="#F0F0F5" fontSize="16" fontFamily="JetBrains Mono">
                  OpenClaw
                </text>
              </g>
              {[
                ["GHL CRM", 85, 60],
                ["Instagram DMs", 430, 72],
                ["Content Pipeline", 470, 178],
                ["Deal Tracker", 414, 294],
                ["Client Portal", 120, 300],
                ["Follower Scraper", 52, 182],
              ].map((node, idx) => (
                <g key={idx}>
                  <rect x={Number(node[1]) - 48} y={Number(node[2]) - 16} width="96" height="32" rx="8" fill="#202028" stroke="#3A3A40" />
                  <text x={Number(node[1])} y={Number(node[2]) + 4} textAnchor="middle" fill="#D8D8E2" fontSize="11">
                    {node[0]}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
