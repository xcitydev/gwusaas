"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { CalendarDays, Rocket, Trash2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import SideBar from "@/components/SideBar";
import { PlanGate } from "@/components/PlanGate";
import { ContentPipelineConfigModal } from "@/components/content-pipeline/ContentPipelineConfigModal";
import { PipelineRunStatus } from "@/components/content-pipeline/PipelineRunStatus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type PipelineConfig = {
  _id: string;
  niche: string;
  brandName: string;
  brandVoice: string;
  contentPillars: string[];
  targetPlatforms: string[];
};

type PipelineRun = {
  _id: string;
  status: string;
  weekStartDate: string;
  createdAt: number;
};

function statusClass(status: string) {
  if (status === "complete") return "bg-emerald-500/20 text-emerald-300";
  if (status === "error") return "bg-red-500/20 text-red-300";
  return "bg-amber-500/20 text-amber-200";
}

export default function ContentPipelinePage() {
  const { user } = useUser();
  const router = useRouter();
  const [configOpen, setConfigOpen] = useState(false);
  const [isStartingRun, setIsStartingRun] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [pendingDeleteRunId, setPendingDeleteRunId] = useState<string | null>(null);
  const [isDeletingRun, setIsDeletingRun] = useState(false);
  const deleteRun = useMutation(api.contentPipeline.deleteRun);

  const config = useQuery(
    api.contentPipeline.getConfig,
    user?.id ? { userId: user.id } : "skip",
  ) as PipelineConfig | null | undefined;
  const runs = useQuery(
    api.contentPipeline.getRuns,
    user?.id ? { userId: user.id } : "skip",
  ) as PipelineRun[] | undefined;

  const latestCompleted = useMemo(
    () => runs?.find((run) => run.status === "complete") || null,
    [runs],
  );

  const currentRunId = useMemo(() => {
    if (activeRunId) return activeRunId;
    const inFlight = runs?.find(
      (run) => run.status !== "complete" && run.status !== "error",
    );
    return inFlight?._id ? String(inFlight._id) : null;
  }, [activeRunId, runs]);

  const startRun = async () => {
    setIsStartingRun(true);
    try {
      const response = await fetch("/api/content-pipeline/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStartDate: new Date().toISOString().slice(0, 10),
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { runId?: string; error?: string }
        | null;
      if (!response.ok || !payload?.runId) {
        throw new Error(payload?.error || "Failed to start content pipeline run");
      }
      setActiveRunId(payload.runId);
      toast.success("Content pipeline started");
      router.refresh();
    } catch (error) {
      console.error("Failed to start pipeline run", error);
      toast.error(error instanceof Error ? error.message : "Failed to start run");
    } finally {
      setIsStartingRun(false);
    }
  };

  const confirmDeleteRun = async () => {
    if (!user?.id || !pendingDeleteRunId) return;
    setIsDeletingRun(true);
    try {
      await deleteRun({
        userId: user.id,
        runId: pendingDeleteRunId as Id<"contentPipelineRuns">,
      });
      toast.success("Pipeline run deleted");
      if (activeRunId === pendingDeleteRunId) {
        setActiveRunId(null);
      }
      setPendingDeleteRunId(null);
    } catch (error) {
      console.error("Failed to delete pipeline run", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete run");
    } finally {
      setIsDeletingRun(false);
    }
  };

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Content Pipeline</h1>
            <p className="text-muted-foreground">
              Generate a full 7-day, multi-platform AI calendar from one workflow.
            </p>
          </div>
          <Button variant="outline" onClick={() => setConfigOpen(true)}>
            Edit Config
          </Button>
        </div>

        <PlanGate requiredPlan="growth">
          {config === undefined || runs === undefined ? (
            <div className="space-y-3">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : !config ? (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Set up your content pipeline
                </CardTitle>
                <CardDescription>
                  Add your niche, voice, pillars, and platforms once to unlock weekly
                  automated calendar generation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setConfigOpen(true)}>Set Up Pipeline</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configuration Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>
                    <strong>Brand:</strong> {config.brandName}
                  </p>
                  <p>
                    <strong>Niche:</strong> {config.niche}
                  </p>
                  <p>
                    <strong>Voice:</strong> {config.brandVoice}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {config.targetPlatforms.map((platform) => (
                      <Badge key={platform} variant="secondary">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                  <Button onClick={() => void startRun()} disabled={isStartingRun}>
                    <Rocket className="mr-2 h-4 w-4" />
                    {isStartingRun ? "Starting..." : "Generate this week's content"}
                  </Button>
                </CardContent>
              </Card>

              {currentRunId ? (
                <PipelineRunStatus
                  runId={currentRunId}
                  onRetry={() => {
                    void startRun();
                  }}
                />
              ) : null}

              <Card>
                <CardHeader>
                  <CardTitle>Past Runs</CardTitle>
                  <CardDescription>
                    Open any run to review, approve, regenerate, or export content.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {runs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No runs yet. Generate your first weekly calendar above.
                    </p>
                  ) : (
                    runs.map((run) => (
                      <div
                        key={run._id}
                        className="rounded-lg border border-border/80 p-4 transition-colors hover:bg-accent/40"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <Link
                            href={`/dashboard/content-pipeline/${run._id}`}
                            className="flex-1 min-w-0"
                          >
                            <p className="font-medium">Week of {run.weekStartDate}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {new Date(run.createdAt).toLocaleString()}
                            </p>
                          </Link>
                          <div className="flex items-center gap-2">
                            <Badge className={statusClass(run.status)}>{run.status}</Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-300"
                              onClick={() => setPendingDeleteRunId(String(run._id))}
                              aria-label="Delete run"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {latestCompleted ? (
                <Button asChild variant="outline">
                  <Link href={`/dashboard/content-pipeline/${latestCompleted._id}`}>
                    Open latest completed calendar
                  </Link>
                </Button>
              ) : null}
            </div>
          )}
        </PlanGate>

        <ContentPipelineConfigModal
          open={configOpen}
          onOpenChange={setConfigOpen}
          initialConfig={
            config
              ? {
                  niche: config.niche,
                  brandName: config.brandName,
                  brandVoice: config.brandVoice,
                  contentPillars: config.contentPillars,
                  targetPlatforms: config.targetPlatforms,
                }
              : null
          }
          onSaved={() => router.refresh()}
        />
        <Dialog
          open={Boolean(pendingDeleteRunId)}
          onOpenChange={(open) => {
            if (!open) setPendingDeleteRunId(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete pipeline run?</DialogTitle>
              <DialogDescription>
                This will permanently remove the run and all associated viral topics,
                refined topics, and generated content.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPendingDeleteRunId(null)}
                disabled={isDeletingRun}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => void confirmDeleteRun()}
                disabled={isDeletingRun}
              >
                {isDeletingRun ? "Deleting..." : "Delete run"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SideBar>
  );
}
