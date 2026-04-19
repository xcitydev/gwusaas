"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { RefreshCw } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { normalizePlan, hasAccess } from "@/lib/plans";
import { ViralIdeaCard, type ViralIdea } from "@/components/dashboard/ViralIdeaCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const platforms = ["all", "youtube", "instagram", "tiktok", "substack", "reddit"] as const;
const categories = ["all", "client attraction", "education", "social proof", "controversy", "trend"] as const;

const loadingMessages = [
  "Searching what's trending...",
  "Analyzing your niche...",
  "Generating ideas...",
];

export function ViralIdeasWidget() {
  const { user } = useUser();
  const [ideas, setIdeas] = useState<ViralIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<(typeof platforms)[number]>("all");
  const [categoryFilter, setCategoryFilter] = useState<(typeof categories)[number]>("all");
  const [loadingIndex, setLoadingIndex] = useState(0);
  const saveIdea = useMutation(api.viralWorkspace.saveIdea);
  const markAdded = useMutation(api.viralWorkspace.markIdeaAdded);
  const config = useQuery(
    api.contentPipeline.getConfig,
    user?.id ? { userId: user.id } : "skip",
  );
  const savedIdeas = useQuery(
    api.viralWorkspace.listSavedIdeas,
    user?.id ? { userId: user.id } : "skip",
  );

  const userPlan = normalizePlan(user?.publicMetadata?.plan);
  const freeLocked = !hasAccess(userPlan, "starter");

  const generate = async () => {
    if (!config) return;
    setLoading(true);
    try {
      const res = await fetch("/api/viral-ideas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: config.niche,
          brandName: config.brandName,
          targetPlatforms: config.targetPlatforms,
          goal: "get more clients",
        }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { ideas?: ViralIdea[]; error?: string }
        | null;
      if (!res.ok) throw new Error(payload?.error || "Failed to generate ideas");
      setIdeas(Array.isArray(payload?.ideas) ? payload.ideas : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate ideas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!config) return;
    if (ideas.length > 0) return;
    void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => {
      setLoadingIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 1300);
    return () => clearInterval(timer);
  }, [loading]);

  const filtered = useMemo(() => {
    return ideas.filter((item) => {
      if (platformFilter !== "all" && item.platform !== platformFilter) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      return true;
    });
  }, [ideas, platformFilter, categoryFilter]);

  const visibleIdeas = freeLocked ? filtered.slice(0, 5) : filtered;

  const save = async (item: ViralIdea, addToPipeline: boolean) => {
    if (!user?.id) return;
    try {
      const id = await saveIdea({
        userId: user.id,
        idea: item.idea,
        platform: item.platform,
        category: item.category,
        hook: item.hook,
        whyItWorks: item.whyItWorks,
      });
      if (addToPipeline) {
        await markAdded({
          userId: user.id,
          ideaId: id as Id<"savedViralIdeas">,
          added: true,
        });
      }
      toast.success(addToPipeline ? "Added to pipeline seeds" : "Idea saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed");
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Viral content ideas</CardTitle>
            <CardDescription>AI-generated ideas to attract more clients</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Saved: {savedIdeas?.length || 0}</Badge>
            <Button onClick={() => void generate()} disabled={loading || !config}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh ideas
            </Button>
          </div>
        </div>
        <div className="rounded-md border border-border/70 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
          It searches for: your niche, your target platforms, and patterns from high-performing
          posts (hooks, angles, and formats that get replies/clients), then turns that into 30
          ideas you can post this week.
        </div>
        <div className="flex flex-wrap gap-2">
          {platforms.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={platformFilter === item ? "default" : "outline"}
              onClick={() => setPlatformFilter(item)}
            >
              {item}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((item) => (
            <Button
              key={item}
              size="sm"
              variant={categoryFilter === item ? "default" : "outline"}
              onClick={() => setCategoryFilter(item)}
            >
              {item}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!config ? (
          <div className="rounded-lg border border-dashed p-5 text-sm">
            Set up your content pipeline niche first to generate viral ideas.
          </div>
        ) : loading ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{loadingMessages[loadingIndex]}</p>
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, idx) => (
                <Skeleton key={idx} className="h-52 w-full" />
              ))}
            </div>
          </div>
        ) : visibleIdeas.length === 0 ? (
          <Button onClick={() => void generate()}>Generate your first batch</Button>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {visibleIdeas.map((item, idx) => (
                <ViralIdeaCard
                  key={`${item.idea}-${idx}`}
                  item={item}
                  onSave={() => void save(item, false)}
                  onAddToPipeline={() => void save(item, true)}
                />
              ))}
            </div>
            {freeLocked && filtered.length > 5 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm">
                Upgrade to Starter+ to unlock all 30 ideas and unlimited refreshes.
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
