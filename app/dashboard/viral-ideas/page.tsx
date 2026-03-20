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

const platforms = ["all", "youtube", "instagram", "tiktok", "substack", "reddit", "any"] as const;
const categories = ["all", "client attraction", "education", "social proof", "controversy", "trend"] as const;

const demoIdeas = [
  {
    _id: "demo-idea-1",
    idea: "3 DM hooks that booked calls this week",
    platform: "instagram",
    category: "education",
    hook: "We tested 17 DM intros. Only 3 worked.",
    whyItWorks: "Data-backed content builds trust fast and attracts decision makers.",
    addedToPipeline: false,
    isDemo: true,
  },
  {
    _id: "demo-idea-2",
    idea: "The follow-up script that revived cold leads",
    platform: "tiktok",
    category: "client attraction",
    hook: "Our 2nd follow-up got a 14% reply rate.",
    whyItWorks: "Specific outcomes show practical value and drive inbound interest.",
    addedToPipeline: true,
    isDemo: true,
  },
  {
    _id: "demo-idea-3",
    idea: "Why most outreach fails in under 10 words",
    platform: "youtube",
    category: "controversy",
    hook: "Your opening line is probably killing your deals.",
    whyItWorks: "Contrarian framing boosts watch time and comment engagement.",
    addedToPipeline: false,
    isDemo: true,
  },
] as const;

export default function ViralIdeasPage() {
  const { user } = useUser();
  const [platformFilter, setPlatformFilter] = useState<(typeof platforms)[number]>("all");
  const [categoryFilter, setCategoryFilter] = useState<(typeof categories)[number]>("all");
  const ideas = useQuery(
    api.viralIdeas.getSavedIdeas,
    user?.id ? { userId: user.id } : "skip",
  );
  const markAdded = useMutation(api.viralIdeas.markAddedToPipeline);
  const deleteIdea = useMutation(api.viralIdeas.deleteIdea);

  const filtered = useMemo(() => {
    const mergedIdeas = [...(ideas || []), ...demoIdeas];
    return mergedIdeas.filter((item) => {
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
            <h1 className="text-3xl font-bold">Saved Viral Ideas</h1>
            <p className="text-muted-foreground">Manage and pipeline your best idea backlog.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void addAll()}>
              Add all saved to pipeline
            </Button>
            <Button variant="destructive" onClick={() => void clearAll()}>
              Clear all saved
            </Button>
          </div>
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
              <Card key={item._id}>
                <CardHeader className="space-y-2">
                  <CardTitle className="text-base">{item.idea}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{item.platform}</Badge>
                    <Badge variant="outline">{item.category}</Badge>
                    {item.addedToPipeline ? <Badge>Added to pipeline</Badge> : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {item.hook ? <p className="text-muted-foreground">"{item.hook}"</p> : null}
                  {item.whyItWorks ? <p className="text-muted-foreground">{item.whyItWorks}</p> : null}
                  <div className="flex gap-2">
                    {!item.addedToPipeline ? (
                      <Button
                        size="sm"
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
    </SideBar>
  );
}
