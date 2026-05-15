"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  ArrowLeft,
  Copy,
  CalendarDays,
  Hash,
  Clock,
  Film,
} from "lucide-react";
import { toast } from "sonner";

import SideBar from "@/components/SideBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type DayEntry = {
  day: number;
  dayLabel: string;
  uploadId: string;
  platform: string;
  format: string;
  hook: string;
  caption: string;
  cta?: string;
  bestTime?: string;
  hashtags?: string[];
};

type PlanData = {
  _id: Id<"contentPlans">;
  weekStartDate: string;
  brandName?: string;
  niche?: string;
  brandVoice?: string;
  status: string;
  createdAt: number;
  plan: {
    summary: string;
    days: DayEntry[];
  };
  uploads: Array<{
    _id: Id<"contentPlanUploads">;
    filename: string;
    mimeType: string;
    note?: string;
    url: string | null;
  }>;
};

const platformTone = (p: string) => {
  const k = p.toLowerCase();
  if (k.includes("instagram")) return "bg-pink-500/10 text-pink-300 border-pink-500/20";
  if (k.includes("tiktok")) return "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20";
  if (k.includes("linkedin")) return "bg-sky-500/10 text-sky-300 border-sky-500/20";
  if (k.includes("youtube")) return "bg-red-500/10 text-red-300 border-red-500/20";
  if (k.includes("twitter") || k.includes("x")) return "bg-zinc-400/10 text-zinc-300 border-zinc-400/20";
  return "bg-white/5 text-muted-foreground border-white/10";
};

export default function ContentPlanViewPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = use(params);
  const data = useQuery(api.contentPlans.getPlan, {
    planId: runId as Id<"contentPlans">,
  }) as PlanData | null | undefined;

  if (data === undefined) {
    return (
      <SideBar>
        <div className="mx-auto max-w-5xl p-6 md:p-8">
          <p className="text-sm text-muted-foreground animate-pulse">
            Loading plan...
          </p>
        </div>
      </SideBar>
    );
  }

  if (data === null) {
    return (
      <SideBar>
        <div className="mx-auto max-w-5xl p-6 md:p-8 space-y-4">
          <p className="text-lg font-bold">Plan not found.</p>
          <Link
            href="/dashboard/content-pipeline"
            className="text-primary hover:underline text-sm font-bold"
          >
            ← Back to 7-Day Content Plan
          </Link>
        </div>
      </SideBar>
    );
  }

  const uploadById = new Map(data.uploads.map((u) => [u._id, u]));

  const copyAll = () => {
    const text = data.plan.days
      .map((d) => {
        const upload = uploadById.get(d.uploadId as Id<"contentPlanUploads">);
        return `--- DAY ${d.day}: ${d.dayLabel} ---
Platform: ${d.platform}  ·  Format: ${d.format}
Media: ${upload?.filename ?? d.uploadId}
Hook: ${d.hook}

${d.caption}

CTA: ${d.cta ?? ""}
Best time: ${d.bestTime ?? ""}
Hashtags: ${(d.hashtags ?? []).map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}
`;
      })
      .join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Full week copied to clipboard");
  };

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-5xl p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <Link
              href="/dashboard/content-pipeline"
              className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Back to 7-Day Content Plan
            </Link>
            <h1 className="text-3xl font-black tracking-tight text-white/90">
              {data.brandName || "Content plan"}
            </h1>
            <p className="text-xs text-muted-foreground">
              <CalendarDays className="w-3 h-3 inline-block mr-1 -mt-0.5" />
              Week of {data.weekStartDate} · {new Date(data.createdAt).toLocaleString()}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={copyAll}
            className="h-10 rounded-xl border-white/10 hover:bg-white/5 font-bold"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Full Week
          </Button>
        </div>

        {/* Strategy summary */}
        <Card className="glass-card border-primary/20 bg-primary/3 overflow-hidden">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="text-base">This week&apos;s angle</CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-sm text-white/85 leading-relaxed">
            {data.plan.summary}
          </CardContent>
        </Card>

        {/* Days */}
        <div className="space-y-4">
          {data.plan.days
            .slice()
            .sort((a, b) => a.day - b.day)
            .map((d) => {
              const upload = uploadById.get(d.uploadId as Id<"contentPlanUploads">);
              const isImage = upload?.mimeType.startsWith("image/");
              return (
                <Card
                  key={d.day}
                  className="glass-card border-white/5 overflow-hidden"
                >
                  <CardHeader className="border-b border-white/5 bg-white/5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <CardTitle className="text-lg flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary font-black flex items-center justify-center">
                          {d.day}
                        </span>
                        {d.dayLabel}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-[10px] font-black uppercase tracking-widest border", platformTone(d.platform))}>
                          {d.platform}
                        </Badge>
                        <Badge className="text-[10px] font-bold uppercase tracking-widest bg-white/5 text-muted-foreground border-white/10">
                          {d.format}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 grid gap-4 md:grid-cols-[140px_1fr]">
                    {/* Media preview */}
                    <div className="rounded-xl overflow-hidden border border-white/10 bg-white/5 aspect-square flex items-center justify-center">
                      {upload && isImage && upload.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={upload.url}
                          alt={upload.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <Film className="w-6 h-6" />
                          <span className="text-[10px] truncate max-w-full px-2">
                            {upload?.filename ?? "missing"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Hook</p>
                        <p className="font-bold text-white/90">{d.hook}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Caption</p>
                        <p className="text-sm text-white/85 whitespace-pre-wrap leading-relaxed">
                          {d.caption}
                        </p>
                      </div>
                      {d.cta && (
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">CTA</p>
                          <p className="text-sm text-white/85">{d.cta}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-3 items-center pt-1 text-xs text-muted-foreground">
                        {d.bestTime && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {d.bestTime}
                          </span>
                        )}
                        {d.hashtags && d.hashtags.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            {d.hashtags
                              .map((h) => (h.startsWith("#") ? h : `#${h}`))
                              .join(" ")}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const block = `${d.hook}\n\n${d.caption}${
                            d.cta ? `\n\n${d.cta}` : ""
                          }${
                            d.hashtags?.length
                              ? `\n\n${d.hashtags
                                  .map((h) =>
                                    h.startsWith("#") ? h : `#${h}`
                                  )
                                  .join(" ")}`
                              : ""
                          }`;
                          navigator.clipboard.writeText(block);
                          toast.success(`Day ${d.day} copied`);
                        }}
                        className="h-8 rounded-lg border-white/10 hover:bg-white/5 text-xs font-bold"
                      >
                        <Copy className="w-3 h-3 mr-1.5" />
                        Copy this day
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </div>
    </SideBar>
  );
}
