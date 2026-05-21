"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, MailOpen, Reply, CalendarCheck, Send } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export function OutreachAnalytics() {
  const { user } = useUser();
  const summary = useQuery(
    api.outreachMetrics.summary,
    user?.id ? { clerkUserId: user.id } : "skip",
  );
  const metrics = useQuery(
    api.outreachMetrics.listMetrics,
    user?.id ? { clerkUserId: user.id } : "skip",
  );

  const tiles = [
    { label: "Sent", value: summary?.sent ?? 0, Icon: Send },
    { label: "Open Rate", value: summary ? pct(summary.openRate) : "—", Icon: MailOpen },
    { label: "Reply Rate", value: summary ? pct(summary.replyRate) : "—", Icon: Reply },
    { label: "Booking Rate", value: summary ? pct(summary.bookRate) : "—", Icon: CalendarCheck },
  ];

  return (
    <Card className="glass-card border-white/5 overflow-hidden">
      <CardHeader className="border-b border-white/5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-black">Outreach Performance</CardTitle>
              <CardDescription>Per-template open / reply / book rates.</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {summary?.templates ?? 0} tracked
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tiles.map(({ label, value, Icon }) => (
            <div key={label} className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-4 h-4 text-primary" />
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                  {label}
                </span>
              </div>
              <p className="text-2xl font-black">{value}</p>
            </div>
          ))}
        </div>

        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
            Top templates by reply rate
          </h4>
          {!metrics || metrics.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl bg-white/[0.03] border border-dashed border-white/10">
              <p className="text-xs text-muted-foreground">
                No template metrics yet. Sends will start logging once Resend / Twilio are wired up.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {metrics.slice(0, 5).map((m) => {
                const replyRate = m.sent > 0 ? m.replied / m.sent : 0;
                return (
                  <div
                    key={m._id}
                    className="p-3 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] uppercase">
                          {m.channel}
                        </Badge>
                        <p className="text-sm font-medium truncate">{m.templateName}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {m.sent} sent · {m.replied} replies · {m.booked} booked
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-primary">{pct(replyRate)}</p>
                      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">reply rate</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
