"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { History } from "lucide-react";
import { api } from "@/convex/_generated/api";
import SideBar from "@/components/SideBar";
import { PlanGate } from "@/components/PlanGate";
import { ServiceIcon } from "@/components/dashboard/service-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { SERVICES } from "@/lib/services";

type ContentIdea = {
  title: string;
  hook: string;
  formatSuggestion: string;
  cta: string;
};

export default function ContentHubPage() {
  const services = useMemo(
    () => SERVICES.filter((service) => service.category === "Content"),
    [],
  );
  const [niche, setNiche] = useState("");
  const [platform, setPlatform] = useState("");
  const [goal, setGoal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [lastGenerationId, setLastGenerationId] = useState<string | null>(null);
  const { user } = useUser();
  const history = useQuery(
    api.aiHistory.listAiGenerations,
    user?.id ? { userId: user.id, type: "content-ideas" } : "skip",
  );

  const generateIdeas = async () => {
    setError(null);
    setIdeas([]);
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/content-ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, platform, goal }),
      });
      if (!res.ok) {
        throw new Error("Unable to generate content ideas");
      }
      const data = (await res.json()) as {
        ideas: ContentIdea[];
        generationId?: string;
      };
      setIdeas(Array.isArray(data.ideas) ? data.ideas : []);
      setLastGenerationId(data.generationId ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-7xl p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Content Hub</h1>
          <p className="text-muted-foreground">
            Manage distribution and creative production with AI ideation.
          </p>
        </div>

        <PlanGate requiredPlan="growth">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Card key={service.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ServiceIcon name={service.icon} />
                    {service.name}
                  </CardTitle>
                  <CardDescription>{service.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>AI Content Idea Generator</CardTitle>
              <CardDescription>
                Generate ten platform-ready content ideas with hooks and CTAs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="niche">Niche</Label>
                  <Input id="niche" value={niche} onChange={(e) => setNiche(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Input id="platform" value={platform} onChange={(e) => setPlatform(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal">Goal</Label>
                  <Input id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} />
                </div>
              </div>
              <Button
                onClick={generateIdeas}
                disabled={isLoading || !niche || !platform || !goal}
              >
                Generate Ideas
              </Button>

              {isLoading ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-28 w-full" />
                  ))}
                </div>
              ) : null}

              {error ? <p className="text-sm text-red-500">{error}</p> : null}

              {!isLoading && !error && ideas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Empty state: run the generator to see ideas.
                </p>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                {ideas.map((idea, idx) => (
                  <Card key={`${idea.title}-${idx}`}>
                    <CardHeader>
                      <CardTitle className="text-base">{idea.title || `Idea ${idx + 1}`}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p><strong>Hook:</strong> {idea.hook}</p>
                      <p><strong>Format:</strong> {idea.formatSuggestion}</p>
                      <p><strong>CTA:</strong> {idea.cta}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {lastGenerationId ? (
                <div className="pt-2">
                  <Button asChild variant="outline">
                    <Link href={`/dashboard/content/${lastGenerationId}`}>
                      Open latest run details
                    </Link>
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Content Idea Run History
              </CardTitle>
              <CardDescription>
                Every generation is saved. Open any run to view the full output.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!history ? (
                <Skeleton className="h-16 w-full" />
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No content idea runs yet. Generate your first run above.
                </p>
              ) : (
                history.map((item) => (
                  <Link
                    key={item._id}
                    href={`/dashboard/content/${item._id}`}
                    className="block rounded-lg border p-4 hover:bg-accent/40 transition-colors"
                  >
                    <p className="font-medium text-sm">
                      {typeof item.input === "object" && item.input && "niche" in item.input
                        ? String((item.input as Record<string, unknown>).niche ?? "Content Ideas")
                        : "Content Ideas"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </PlanGate>
      </div>
    </SideBar>
  );
}
