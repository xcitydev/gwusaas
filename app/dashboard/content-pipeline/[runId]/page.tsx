"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import SideBar from "@/components/SideBar";
import { PlanGate } from "@/components/PlanGate";
import { ContentCalendar } from "@/components/content-pipeline/ContentCalendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type RefinedTopic = {
  _id: string;
  platform: string;
  dayNumber: number;
  topicTitle: string;
  topicAngle: string;
};

type GeneratedItem = {
  _id: string;
  refinedTopicId: string;
  platform: string;
  dayNumber: number;
  contentType: string;
  content: string;
  imageUrl?: string;
  status: "draft" | "approved" | "exported" | "error";
};

type RunDetail = {
  run: {
    _id: string;
    status: string;
    errorMessage?: string;
  };
  config: {
    niche: string;
    brandName: string;
    brandVoice: string;
  } | null;
  refinedTopics: RefinedTopic[];
  generatedContent: GeneratedItem[];
};

function toLabel(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ContentPipelineRunDetailPage() {
  const params = useParams<{ runId: string }>();
  const { user } = useUser();
  const updateContentStatus = useMutation(api.contentPipeline.updateContentStatus);
  const runId = params.runId as Id<"contentPipelineRuns">;
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [dayFilter, setDayFilter] = useState<number | "all">("all");

  const detail = useQuery(
    api.contentPipeline.getRunDetail,
    user?.id ? { userId: user.id, runId } : "skip",
  ) as RunDetail | null | undefined;

  const platforms = useMemo(() => {
    if (!detail) return [];
    return Array.from(new Set(detail.refinedTopics.map((item) => item.platform))).sort();
  }, [detail]);

  const approvedPayload = useMemo(() => {
    if (!detail) return [];
    const topicById = new Map(detail.refinedTopics.map((topic) => [topic._id, topic]));
    return detail.generatedContent
      .filter((item) => item.status === "approved")
      .map((item) => ({
        platform: item.platform,
        dayNumber: item.dayNumber,
        contentType: item.contentType,
        content: item.content,
        imageUrl: item.imageUrl,
        topic: topicById.get(item.refinedTopicId)?.topicTitle || "",
        angle: topicById.get(item.refinedTopicId)?.topicAngle || "",
      }));
  }, [detail]);

  const approvedGroupedPayload = useMemo(() => {
    const grouped: Record<string, Record<string, typeof approvedPayload>> = {};
    for (const item of approvedPayload) {
      const platformKey = item.platform;
      const dayKey = `day_${item.dayNumber}`;
      if (!grouped[platformKey]) grouped[platformKey] = {};
      if (!grouped[platformKey][dayKey]) grouped[platformKey][dayKey] = [];
      grouped[platformKey][dayKey].push(item);
    }
    return grouped;
  }, [approvedPayload]);

  const handleApprove = async (contentId: string) => {
    if (!user?.id) return;
    try {
      await updateContentStatus({
        userId: user.id,
        contentId: contentId as Id<"generatedContent">,
        status: "approved",
      });
      toast.success("Content approved");
    } catch (error) {
      console.error("Approve failed", error);
      toast.error("Failed to approve content");
    }
  };

  const handleRegenerate = async (topic: RefinedTopic) => {
    if (!detail) return;
    if (!detail.config) {
      toast.error("Run config not found; cannot regenerate.");
      return;
    }
    try {
      const response = await fetch("/api/content-pipeline/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: detail.run._id,
          brandName: detail.config.brandName,
          brandVoice: detail.config.brandVoice,
          niche: detail.config.niche,
          refinedTopics: [
            {
              id: topic._id,
              platform: topic.platform,
              dayNumber: topic.dayNumber,
              topicTitle: topic.topicTitle,
              topicAngle: topic.topicAngle,
            },
          ],
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Regeneration failed");
      }
      toast.success("Content regeneration queued");
    } catch (error) {
      console.error("Regenerate failed", error);
      toast.error(error instanceof Error ? error.message : "Regeneration failed");
    }
  };

  const exportApproved = () => {
    if (approvedPayload.length === 0) {
      toast.error("No approved items to export");
      return;
    }
    const blob = new Blob([JSON.stringify(approvedGroupedPayload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `content-pipeline-${params.runId}-approved.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Content Calendar Run</h1>
            <p className="text-muted-foreground">
              Review and manage generated content by day and platform.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/content-pipeline">Back to Pipeline</Link>
          </Button>
        </div>

        <PlanGate requiredPlan="growth">
          {detail === undefined ? (
            <Skeleton className="h-44 w-full" />
          ) : detail === null ? (
            <Card>
              <CardHeader>
                <CardTitle>Run not found</CardTitle>
                <CardDescription>
                  This run does not exist or you do not have access.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Platform
                    </p>
                    <Button
                      size="sm"
                      variant={platformFilter === "all" ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setPlatformFilter("all")}
                    >
                      All
                    </Button>
                    {platforms.map((platform) => (
                      <Button
                        key={platform}
                        size="sm"
                        variant={platformFilter === platform ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setPlatformFilter(platform)}
                      >
                        {toLabel(platform)}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      Day
                    </p>
                    <Button
                      size="sm"
                      variant={dayFilter === "all" ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setDayFilter("all")}
                    >
                      All days
                    </Button>
                    {Array.from({ length: 7 }).map((_, index) => (
                      <Button
                        key={index}
                        size="sm"
                        variant={dayFilter === index + 1 ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setDayFilter(index + 1)}
                      >
                        Day {index + 1}
                      </Button>
                    ))}
                  </div>

                  <div className="rounded-md border border-border/70 p-3 text-xs">
                    <p className="font-medium">Run status</p>
                    <Badge className="mt-2">{detail.run.status}</Badge>
                    {detail.run.errorMessage ? (
                      <p className="mt-2 text-red-300">{detail.run.errorMessage}</p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <ContentCalendar
                  refinedTopics={detail.refinedTopics}
                  generatedContent={detail.generatedContent}
                  platformFilter={platformFilter}
                  dayFilter={dayFilter}
                  onApprove={handleApprove}
                  onRegenerate={handleRegenerate}
                />

                <Card>
                  <CardHeader>
                    <CardTitle>Export</CardTitle>
                    <CardDescription>
                      Download all approved content grouped by platform and day.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={exportApproved}>Export all approved (JSON)</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </PlanGate>
      </div>
    </SideBar>
  );
}
