import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { RefreshCw, Sparkles, Filter, Bookmark, Grid } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { normalizePlan, hasAccess } from "@/lib/plans";
import { ViralIdeaCard, type ViralIdea } from "@/components/dashboard/ViralIdeaCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const platforms = ["all", "youtube", "instagram", "tiktok", "substack", "reddit"] as const;
const categories = ["all", "client attraction", "education", "social proof", "controversy", "trend"] as const;

const loadingMessages = [
  "Scouring the social graph...",
  "Synthesizing high-intent angles...",
  "Architecting your content strategy...",
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
    <div className="flex flex-col h-full">
      <div className="p-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white/90">Viral Insights</h3>
              <p className="text-xs font-medium text-muted-foreground">AI-Engineered Content Strategy</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <Bookmark className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase">{savedIdeas?.length || 0} Saved</span>
            </div>
            <Button onClick={() => void generate()} disabled={loading || !config} className="h-9 px-4 text-xs font-bold amber-glow transition-all">
              <RefreshCw className={cn("mr-2 h-3.5 w-3.5", loading && "animate-spin")} />
              Sync Engine
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 bg-white/5 p-1.5 rounded-xl border border-white/5 w-fit">
            <div className="flex items-center gap-2 px-3 mr-2">
              <Filter className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Platforms</span>
            </div>
            {platforms.map((item) => (
              <button
                key={item}
                onClick={() => setPlatformFilter(item)}
                className={cn(
                  "px-3 py-1 text-[10px] font-bold rounded-lg transition-all",
                  platformFilter === item 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white/5 p-1.5 rounded-xl border border-white/5 w-fit">
            <div className="flex items-center gap-2 px-3 mr-2">
              <Grid className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Categories</span>
            </div>
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setCategoryFilter(item)}
                className={cn(
                  "px-3 py-1 text-[10px] font-bold rounded-lg transition-all",
                  categoryFilter === item 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="relative min-h-[400px]">
          {!config ? (
            <div className="flex flex-col items-center justify-center p-12 text-center glass-card rounded-3xl border-dashed">
              <Sparkles className="w-8 h-8 text-muted-foreground opacity-20 mb-4" />
              <p className="text-sm font-medium text-muted-foreground">Configure your Content Pipeline seeds to activate Viral Insights.</p>
            </div>
          ) : loading ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <p className="text-xs font-bold text-primary uppercase tracking-widest animate-pulse">{loadingMessages[loadingIndex]}</p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-48 w-full rounded-2xl bg-white/5" />
                ))}
              </div>
            </div>
          ) : visibleIdeas.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center glass-card rounded-3xl">
              <Button onClick={() => void generate()} className="amber-glow h-11 px-8 font-black uppercase tracking-wider">Initialize Generation</Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                  <p className="text-sm font-bold text-primary/80">Upgrade to unlock 25+ more tactical ideas.</p>
                  <Button variant="outline" className="h-8 text-[10px] font-black border-primary/20 text-primary uppercase tracking-widest">Upgrade Now</Button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
