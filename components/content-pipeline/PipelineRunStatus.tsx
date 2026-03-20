"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const steps = ["researching", "refining", "generating", "complete"] as const;

function getProgress(status: string) {
  switch (status) {
    case "pending":
      return 5;
    case "researching":
      return 25;
    case "refining":
      return 50;
    case "generating":
      return 80;
    case "complete":
      return 100;
    default:
      return 0;
  }
}

function labelForStatus(status: string) {
  switch (status) {
    case "pending":
      return "Queued";
    case "researching":
      return "Research";
    case "refining":
      return "Refine";
    case "generating":
      return "Generate";
    case "complete":
      return "Complete";
    case "error":
      return "Error";
    default:
      return status;
  }
}

type Props = {
  runId: string;
  onRetry: () => void;
};

export function PipelineRunStatus({ runId, onRetry }: Props) {
  const { user } = useUser();
  const router = useRouter();
  const detail = useQuery(
    api.contentPipeline.getRunDetail,
    user?.id
      ? { userId: user.id, runId: runId as Id<"contentPipelineRuns"> }
      : "skip",
  );
  const status = detail?.run.status || "pending";
  const progress = getProgress(status);
  const isTerminal = status === "complete" || status === "error";

  useEffect(() => {
    if (isTerminal) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 3000);
    return () => clearInterval(interval);
  }, [isTerminal, router]);

  if (!detail) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading run status...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle>Pipeline Run Status: {labelForStatus(status)}</CardTitle>
        <Progress value={progress} />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-4">
          {steps.map((step, index) => {
            const active = steps.indexOf(status as (typeof steps)[number]) >= index;
            return (
              <div
                key={step}
                className={`rounded-md border px-3 py-2 text-xs ${
                  active
                    ? "border-primary/70 bg-primary/10 text-foreground"
                    : "border-border/70 text-muted-foreground"
                }`}
              >
                {labelForStatus(step)}
              </div>
            );
          })}
        </div>
        {status === "error" ? (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            <p>{detail.run.errorMessage || "Pipeline run failed."}</p>
            <Button variant="outline" className="mt-3" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
