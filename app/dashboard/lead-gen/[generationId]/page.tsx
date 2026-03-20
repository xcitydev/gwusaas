"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import SideBar from "@/components/SideBar";
import { PlanGate } from "@/components/PlanGate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LeadGenRunPage() {
  const params = useParams<{ generationId: string }>();
  const { user } = useUser();
  const generationId = params.generationId as Id<"aiGenerations">;

  const run = useQuery(
    api.aiHistory.getAiGenerationById,
    user?.id ? { userId: user.id, generationId } : "skip",
  );

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-7xl p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Lead Gen Run</h1>
            <p className="text-muted-foreground">Inspect a saved lead generation run.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/lead-gen">Back to Lead Gen</Link>
          </Button>
        </div>

        <PlanGate requiredPlan="growth">
          {run === undefined ? (
            <Skeleton className="h-48 w-full" />
          ) : run === null ? (
            <Card>
              <CardHeader>
                <CardTitle>Run not found</CardTitle>
                <CardDescription>
                  This lead gen run does not exist or access is restricted.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Run Metadata</CardTitle>
                  <CardDescription>
                    {run.type} · {new Date(run.createdAt).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs whitespace-pre-wrap rounded-lg border p-4 overflow-auto">
                    {JSON.stringify(run.input, null, 2)}
                  </pre>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Run Output</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs whitespace-pre-wrap rounded-lg border p-4 overflow-auto">
                    {JSON.stringify(run.output, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </>
          )}
        </PlanGate>
      </div>
    </SideBar>
  );
}
