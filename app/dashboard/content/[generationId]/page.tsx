"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import SideBar from "@/components/SideBar";
import { PlanGate } from "@/components/PlanGate";
import { GenerateGraphicModal } from "@/components/content/GenerateGraphicModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

type ContentIdea = {
  title?: string;
  hook?: string;
  formatSuggestion?: string;
  cta?: string;
};

function normalizeIdeas(output: unknown): ContentIdea[] {
  if (Array.isArray(output)) return output as ContentIdea[];
  if (output && typeof output === "object") {
    const record = output as Record<string, unknown>;
    if (Array.isArray(record.ideas)) return record.ideas as ContentIdea[];
  }
  return [];
}

export default function ContentRunDetailPage() {
  const params = useParams<{ generationId: string }>();
  const { user } = useUser();
  const generationId = params.generationId as Id<"aiGenerations">;

  const run = useQuery(
    api.aiHistory.getAiGenerationById,
    user?.id ? { userId: user.id, generationId } : "skip",
  );
  const [selectedIdea, setSelectedIdea] = useState<ContentIdea | null>(null);

  const ideas = normalizeIdeas(run?.output);

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-7xl p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Content Ideas Run</h1>
            <p className="text-muted-foreground">
              Review a saved generation and reuse ideas anytime.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/content">Back to Content Hub</Link>
          </Button>
        </div>

        <PlanGate requiredPlan="growth">
          {run === undefined ? (
            <Skeleton className="h-40 w-full" />
          ) : run === null ? (
            <Card>
              <CardHeader>
                <CardTitle>Run not found</CardTitle>
                <CardDescription>
                  This saved content run does not exist or you no longer have access.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Run Metadata</CardTitle>
                  <CardDescription>
                    Created at {new Date(run.createdAt).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p>
                    <strong>Niche:</strong>{" "}
                    {typeof run.input === "object" && run.input && "niche" in run.input
                      ? String((run.input as Record<string, unknown>).niche ?? "N/A")
                      : "N/A"}
                  </p>
                  <p>
                    <strong>Platform:</strong>{" "}
                    {typeof run.input === "object" && run.input && "platform" in run.input
                      ? String((run.input as Record<string, unknown>).platform ?? "N/A")
                      : "N/A"}
                  </p>
                  <p>
                    <strong>Goal:</strong>{" "}
                    {typeof run.input === "object" && run.input && "goal" in run.input
                      ? String((run.input as Record<string, unknown>).goal ?? "N/A")
                      : "N/A"}
                  </p>
                </CardContent>
              </Card>

              {ideas.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>No ideas in this run</CardTitle>
                    <CardDescription>
                      This run was saved but did not include a recognizable ideas array.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {ideas.map((idea, idx) => (
                    <div
                      key={`${idea.title ?? "idea"}-${idx}`}
                      className="cursor-pointer"
                      onClick={() => setSelectedIdea(idea)}
                    >
                    <Card className="hover:border-primary/40 hover:bg-accent/30 transition-colors">
                      <CardHeader>
                        <CardTitle className="text-base">
                          {idea.title || `Idea ${idx + 1}`}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p><strong>Hook:</strong> {idea.hook || "N/A"}</p>
                        <p><strong>Format:</strong> {idea.formatSuggestion || "N/A"}</p>
                        <p><strong>CTA:</strong> {idea.cta || "N/A"}</p>
                      </CardContent>
                    </Card>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </PlanGate>
        <GenerateGraphicModal
          open={Boolean(selectedIdea)}
          idea={selectedIdea}
          metadata={
            run && run !== undefined
              ? {
                  niche:
                    typeof run.input === "object" && run.input && "niche" in run.input
                      ? String((run.input as Record<string, unknown>).niche ?? "")
                      : "",
                  platform:
                    typeof run.input === "object" && run.input && "platform" in run.input
                      ? String((run.input as Record<string, unknown>).platform ?? "")
                      : "",
                  goal:
                    typeof run.input === "object" && run.input && "goal" in run.input
                      ? String((run.input as Record<string, unknown>).goal ?? "")
                      : "",
                  runId: generationId,
                }
              : null
          }
          onClose={() => setSelectedIdea(null)}
        />
      </div>
    </SideBar>
  );
}
