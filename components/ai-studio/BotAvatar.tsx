"use client";

import { cn } from "@/lib/utils";

export function BotAvatar({
  variant,
  className,
}: {
  variant: "agency" | "client";
  className?: string;
}) {
  const isAgency = variant === "agency";
  const primary = isAgency ? "#F5A623" : "#4FD1C5";
  const secondary = isAgency ? "#FFD166" : "#7FDFF5";
  const glow = isAgency ? "bot-avatar-glow-agency" : "bot-avatar-glow-client";

  return (
    <div className={cn("relative inline-flex items-center justify-center", glow, className)}>
      <svg viewBox="0 0 220 220" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={`face-gradient-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={primary} stopOpacity="0.9" />
            <stop offset="100%" stopColor={secondary} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <circle cx="110" cy="110" r="102" fill="rgba(255,255,255,0.03)" />
        <polygon
          points="110,22 180,60 180,140 110,198 40,140 40,60"
          fill="rgba(255,255,255,0.04)"
          stroke={`url(#face-gradient-${variant})`}
          strokeWidth="3"
        />
        <path
          d="M60 74 L110 48 L160 74 L160 132 L110 166 L60 132 Z"
          fill="rgba(10,10,11,0.6)"
          stroke={primary}
          strokeOpacity="0.55"
          strokeWidth="2"
        />
        <circle cx="88" cy="104" r="10" fill={secondary} />
        <circle cx="132" cy="104" r="10" fill={secondary} />
        <rect x="86" y="136" width="48" height="8" rx="4" fill={primary} />
        <path d="M66 58 L110 34 L154 58" stroke={secondary} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M74 154 L110 176 L146 154" stroke={primary} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}
