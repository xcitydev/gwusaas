"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Alert = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  href?: string;
  cta?: string;
};

const severityDot: Record<Alert["severity"], string> = {
  info: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]",
  warning: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]",
  critical: "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]",
};

const severityHoverBorder: Record<Alert["severity"], string> = {
  info: "hover:border-sky-500/30",
  warning: "hover:border-amber-500/30",
  critical: "hover:border-red-500/30",
};

export function NeedsAttention({
  alerts,
  loading,
}: {
  alerts: Alert[] | undefined;
  loading?: boolean;
}) {
  const items = alerts ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/70">
            Needs Attention
          </h3>
        </div>
        <Badge
          variant="outline"
          className="text-[10px] border-white/10 text-muted-foreground"
        >
          {loading ? "…" : items.length === 0 ? "All clear" : `${items.length} ${items.length === 1 ? "alert" : "alerts"}`}
        </Badge>
      </div>

      <div className="space-y-3">
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-14 rounded-2xl bg-white/5 border border-white/5 animate-pulse"
              />
            ))}
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-500/80">
              Everything looks good. Nothing needs your attention right now.
            </p>
          </div>
        )}
        {!loading &&
          items.map((alert) => {
            const inner = (
              <>
                <div
                  className={cn(
                    "mt-1 w-1.5 h-1.5 rounded-full shrink-0",
                    severityDot[alert.severity],
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 group-hover:text-white transition-colors leading-relaxed">
                    {alert.title}
                  </p>
                  {alert.cta && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary mt-1">
                      {alert.cta} →
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30 ml-auto group-hover:text-amber-500 transition-colors shrink-0" />
              </>
            );

            const className = cn(
              "group flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 transition-all",
              severityHoverBorder[alert.severity],
              alert.href ? "hover:bg-white/10 cursor-pointer" : "",
            );

            return alert.href ? (
              <Link key={alert.id} href={alert.href} className={className}>
                {inner}
              </Link>
            ) : (
              <div key={alert.id} className={className}>
                {inner}
              </div>
            );
          })}
      </div>
    </div>
  );
}
