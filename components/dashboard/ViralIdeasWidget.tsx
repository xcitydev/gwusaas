import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { RefreshCw, Sparkles, Filter, Bookmark, Grid, TrendingUp, Lightbulb, Zap } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { normalizePlan, hasAccess } from "@/lib/plans";
import { ViralIdeaCard, type ViralIdea } from "@/components/dashboard/ViralIdeaCard";
import { TrendingCard, type TrendingItem } from "@/components/dashboard/TrendingCard";
import { ExpandDraftDrawer } from "@/components/dashboard/ExpandDraftDrawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const platforms = ["all", "youtube", "instagram", "tiktok", "substack", "reddit"] as const;
const categories = ["all", "client attraction", "education", "social proof", "controversy", "trend"] as const;

const loadingMessages = [
  "Looking at what's trending...",
  "Finding ideas your audience will love...",
  "Putting it all together...",
];

const trendingLoadingMessages = [
  "Scanning what's going viral right now...",
  "Analyzing trending formats and hooks...",
  "Finding trends your niche can ride...",
];

type ActiveTab = "ideas" | "trending";

export function ViralIdeasWidget() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<ActiveTab>("ideas");
  const [ideas, setIdeas] = useState<ViralIdea[]>([]);
  const [trends, setTrends] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<(typeof platforms)[number]>("all");
  const [categoryFilter, setCategoryFilter] = useState<(typeof categories)[number]>("all");
  const [loadingIndex, setLoadingIndex] = useState(0);

  // Expand drawer state
  const [expandOpen, setExpandOpen] = useState(false);
  const [expandIdea, setExpandIdea] = useState<{ title: string; platform: string } | null>(null);

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

  const fetchTrending = async () => {
    if (!config) return;
    setTrendingLoading(true);
    try {
      const res = await fetch("/api/viral-ideas/trending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: config.niche,
          platforms: config.targetPlatforms,
        }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { trends?: TrendingItem[]; error?: string }
        | null;
      if (!res.ok) throw new Error(payload?.error || "Failed to fetch trends");
      setTrends(Array.isArray(payload?.trends) ? payload.trends : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch trends");
    } finally {
      setTrendingLoading(false);
    }
  };

  useEffect(() => {
    const isActiveLoading = activeTab === "ideas" ? loading : trendingLoading;
    if (!isActiveLoading) return;
    const timer = setInterval(() => {
      setLoadingIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 1300);
    return () => clearInterval(timer);
  }, [loading, trendingLoading, activeTab]);

  const filtered = useMemo(() => {
    return ideas.filter((item) => {
      if (platformFilter !== "all" && item.platform !== platformFilter) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      return true;
    });
  }, [ideas, platformFilter, categoryFilter]);

  const filteredTrends = useMemo(() => {
    return trends.filter((item) => {
      if (platformFilter !== "all" && item.platform !== platformFilter) return false;
      return true;
    });
  }, [trends, platformFilter]);

  const visibleIdeas = freeLocked ? filtered.slice(0, 5) : filtered;
  const visibleTrends = freeLocked ? filteredTrends.slice(0, 4) : filteredTrends;

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

  const handleExpandIdea = (item: ViralIdea) => {
    setExpandIdea({ title: item.idea, platform: item.platform });
    setExpandOpen(true);
  };

  const handleExpandTrend = (item: TrendingItem) => {
    setExpandIdea({ title: `${item.title} — ${item.exampleAngle}`, platform: item.platform });
    setExpandOpen(true);
  };

  const currentLoadingMessages = activeTab === "trending" ? trendingLoadingMessages : loadingMessages;
  const isCurrentLoading = activeTab === "ideas" ? loading : trendingLoading;

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="p-8 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white/90">Viral Ideas</h3>
                <p className="text-xs font-medium text-muted-foreground">Content ideas built to grow your business</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                <Bookmark className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{savedIdeas?.length || 0} Saved</span>
              </div>
              {activeTab === "ideas" && (
                <Button onClick={() => void generate()} disabled={loading || !config} className="h-9 px-4 text-xs font-bold amber-glow transition-all">
                  <RefreshCw className={cn("mr-2 h-3.5 w-3.5", loading && "animate-spin")} />
                  Get New Ideas
                </Button>
              )}
              {activeTab === "trending" && (
                <Button onClick={() => void fetchTrending()} disabled={trendingLoading || !config} className="h-9 px-4 text-xs font-bold amber-glow transition-all">
                  <RefreshCw className={cn("mr-2 h-3.5 w-3.5", trendingLoading && "animate-spin")} />
                  Refresh Trends
                </Button>
              )}
            </div>
          </div>

          {/* Tab Switch */}
          <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/5 w-fit">
            <button
              onClick={() => setActiveTab("ideas")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                activeTab === "ideas"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              AI Ideas
            </button>
            <button
              onClick={() => setActiveTab("trending")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                activeTab === "trending"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Trending Now
              {trends.some((t) => t.timeSensitive) && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>
          </div>

          {/* Filters */}
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

            {activeTab === "ideas" && (
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
            )}
          </div>

          {/* Content Area */}
          <div className="relative min-h-[400px]">
            {!config ? (
              <div className="flex flex-col items-center justify-center p-12 text-center glass-card rounded-3xl border-dashed">
                <Sparkles className="w-8 h-8 text-muted-foreground opacity-20 mb-4" />
                <p className="text-sm font-medium text-muted-foreground">Set up your 7-Day Content Plan first to unlock viral ideas.</p>
              </div>
            ) : isCurrentLoading ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <p className="text-xs font-bold text-primary uppercase tracking-widest animate-pulse">{currentLoadingMessages[loadingIndex]}</p>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-48 w-full rounded-2xl bg-white/5" />
                  ))}
                </div>
              </div>
            ) : activeTab === "ideas" ? (
              // AI Ideas Tab
              visibleIdeas.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center glass-card rounded-3xl">
                  <Lightbulb className="w-10 h-10 text-muted-foreground opacity-20 mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">Generate AI-powered content ideas tailored to your niche.</p>
                  <Button onClick={() => void generate()} className="amber-glow h-11 px-8 font-black uppercase tracking-wider">Get Ideas</Button>
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
                        onExpand={() => handleExpandIdea(item)}
                      />
                    ))}
                  </div>
                  {freeLocked && filtered.length > 5 ? (
                    <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                      <p className="text-sm font-bold text-primary/80">Upgrade to unlock 25+ more ideas.</p>
                      <Button variant="outline" className="h-8 text-[10px] font-black border-primary/20 text-primary uppercase tracking-widest">Upgrade Now</Button>
                    </div>
                  ) : null}
                </div>
              )
            ) : (
              // Trending Now Tab
              visibleTrends.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center glass-card rounded-3xl">
                  <TrendingUp className="w-10 h-10 text-muted-foreground opacity-20 mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">Discover what's trending right now and ride the wave.</p>
                  <Button onClick={() => void fetchTrending()} className="amber-glow h-11 px-8 font-black uppercase tracking-wider">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Find Trends
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Quick stats */}
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                      <TrendingUp className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{visibleTrends.length} Trends Found</span>
                    </div>
                    {visibleTrends.filter((t) => t.timeSensitive).length > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/5 border border-rose-500/10">
                        <Zap className="w-3 h-3 text-rose-400" />
                        <span className="text-[10px] font-bold text-rose-400 uppercase">
                          {visibleTrends.filter((t) => t.timeSensitive).length} Time-Sensitive
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {visibleTrends.map((item, idx) => (
                      <TrendingCard
                        key={`${item.title}-${idx}`}
                        item={item}
                        onExpand={handleExpandTrend}
                      />
                    ))}
                  </div>
                  {freeLocked && filteredTrends.length > 4 ? (
                    <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                      <p className="text-sm font-bold text-primary/80">Upgrade to see all trending content.</p>
                      <Button variant="outline" className="h-8 text-[10px] font-black border-primary/20 text-primary uppercase tracking-widest">Upgrade Now</Button>
                    </div>
                  ) : null}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Expand Draft Drawer */}
      {expandIdea && (
        <ExpandDraftDrawer
          open={expandOpen}
          onClose={() => {
            setExpandOpen(false);
            setExpandIdea(null);
          }}
          ideaTitle={expandIdea.title}
          platform={expandIdea.platform}
          niche={config?.niche || ""}
          brandName={config?.brandName || ""}
        />
      )}
    </>
  );
}
