"use client";

import { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import SideBar from "@/components/SideBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AddViralIdeaDialog } from "@/components/dashboard/AddViralIdeaDialog";
import { ViralIdeasWidget } from "@/components/dashboard/ViralIdeasWidget";
import { Sparkles, Trash2, ArrowUpRight, Filter, Grid, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

const platforms = ["all", "youtube", "instagram", "tiktok", "substack", "reddit", "any"] as const;
const categories = ["all", "client attraction", "education", "social proof", "controversy", "trend"] as const;

export default function ViralIdeasPage() {
  const { user } = useUser();
  const [platformFilter, setPlatformFilter] = useState<(typeof platforms)[number]>("all");
  const [categoryFilter, setCategoryFilter] = useState<(typeof categories)[number]>("all");

  const ideas = useQuery(api.viralWorkspace.listSavedIdeas, {
    userId: user?.id || "",
  });

  const markAdded = useMutation(api.viralWorkspace.markIdeaAdded);
  const deleteIdea = useMutation(api.viralWorkspace.deleteSavedIdea);

  const filtered = useMemo(() => {
    const rows = ideas || [];
    return rows.filter((item) => {
      if (platformFilter !== "all" && item.platform !== platformFilter) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      return true;
    });
  }, [ideas, platformFilter, categoryFilter]);

  const addAll = async () => {
    if (!user?.id || !ideas) return;
    try {
      await Promise.all(
        ideas.map((item) =>
          markAdded({
            userId: user.id,
            ideaId: item._id as Id<"savedViralIdeas">,
            added: true,
          }),
        ),
      );
      toast.success("All saved ideas added to pipeline");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed");
    }
  };

  const clearAll = async () => {
    if (!user?.id || !ideas) return;
    try {
      await Promise.all(
        ideas.map((item) =>
          deleteIdea({
            userId: user.id,
            ideaId: item._id as Id<"savedViralIdeas">,
          }),
        ),
      );
      toast.success("Saved ideas cleared");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed");
    }
  };

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Lightbulb className="w-8 h-8 text-primary" />
              Saved Viral Ideas
            </h1>
            <p className="text-muted-foreground font-medium">Manage and pipeline your best content backlog.</p>
          </div>
          <div className="flex gap-2">
            {user?.id && <AddViralIdeaDialog userId={user.id} />}
            <Button variant="outline" onClick={() => void addAll()}>
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Add all to pipeline
            </Button>
            <Button variant="outline" className="text-red-500 hover:text-red-600 border-red-500/10" onClick={() => void clearAll()}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear all
            </Button>
          </div>
        </div>

        <div className="pt-4 space-y-6">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 w-fit">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-2">Platforms</span>
            <div className="flex gap-1">
              {platforms.map((item) => (
                <button
                  key={item}
                  onClick={() => setPlatformFilter(item)}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all",
                    platformFilter === item
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                  )}
                >
                  {item.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 w-fit">
            <Grid className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-2">Categories</span>
            <div className="flex gap-1">
              {categories.map((item) => (
                <button
                  key={item}
                  onClick={() => setCategoryFilter(item)}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all",
                    categoryFilter === item
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                  )}
                >
                  {item.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!ideas ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Loading...</CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No saved viral ideas yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <Card key={item._id} className="group border-white/5 hover:border-primary/20 transition-all duration-300 glass-card">
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base font-bold leading-tight">{item.idea}</CardTitle>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-white/5 text-[10px] font-bold">{item.platform.toUpperCase()}</Badge>
                    <Badge variant="outline" className="text-[10px] font-bold opacity-70">{item.category.toUpperCase()}</Badge>
                    {item.addedToPipeline ? (
                      <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] font-bold">PIPELINED</Badge>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {item.hook ? (
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Hook</p>
                        <p className="text-sm italic text-muted-foreground">"{item.hook}"</p>
                      </div>
                    ) : null}
                    {item.whyItWorks ? (
                      <div className="px-1">
                        <p className="text-xs font-bold text-muted-foreground/50 uppercase tracking-widest mb-1">Strategy</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.whyItWorks}</p>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex gap-2 pt-2">
                    {!item.addedToPipeline ? (
                      <Button
                        size="sm"
                        className="flex-1 amber-glow font-bold"
                        disabled={"isDemo" in item && item.isDemo}
                        onClick={() =>
                          void markAdded({
                            userId: user?.id || "",
                            ideaId: item._id as Id<"savedViralIdeas">,
                            added: true,
                          })
                        }
                      >
                        Add to pipeline
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 font-bold"
                      disabled={"isDemo" in item && item.isDemo}
                      onClick={() =>
                        void deleteIdea({
                          userId: user?.id || "",
                          ideaId: item._id as Id<"savedViralIdeas">,
                        })
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </div>
      </div>
    </SideBar>
  );
}
