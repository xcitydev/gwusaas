"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, RefreshCw, Sparkles, Lightbulb, Hash, Users, Target } from "lucide-react";
import SideBar from "@/components/SideBar";
import { useUser, useOrganization } from "@clerk/nextjs";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const reportTypes = [
  { id: "weekly_insight", label: "Insights", icon: Lightbulb },
  { id: "caption_batch", label: "Captions", icon: Sparkles },
  { id: "hashtag_list", label: "Hashtags", icon: Hash },
  { id: "competitor_scan", label: "Competitors", icon: Users },
  { id: "action_plan", label: "Action Plan", icon: Target },
];

export default function AIPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { organization } = useOrganization();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("weekly_insight");
  const [generating, setGenerating] = useState<string | null>(null);

  // Get organization
  const convexOrg = useQuery(
    api.organization.getByClerkId,
    organization?.id ? { clerkOrgId: organization.id } : "skip"
  );

  // Get projects
  const projects = useQuery(
    api.projects.list,
    convexOrg?._id ? { organizationId: convexOrg._id } : "skip"
  );

  // Set first project as selected
  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProjectId) {
      const activeProject = projects.find((p) => p.status === "active") || projects[0];
      setSelectedProjectId(activeProject._id);
    }
  }, [projects, selectedProjectId]);

  // Get latest report for active tab
  const latestReport = useQuery(
    api.ai.latest,
    selectedProjectId
      ? { projectId: selectedProjectId as any, reportType: activeTab }
      : "skip"
  );

  const generateReport = useAction(api.ai.generate);

  const handleGenerate = async (reportType: string) => {
    if (!selectedProjectId) {
      toast.error("Please select a project");
      return;
    }

    setGenerating(reportType);
    try {
      await generateReport({
        projectId: selectedProjectId as any,
        reportType,
      });
      toast.success("Report generated successfully!");
    } catch (error: any) {
      toast.error(`Failed to generate: ${error.message}`);
    } finally {
      setGenerating(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const renderReportContent = () => {
    if (!latestReport?.content) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>No report generated yet</p>
          <p className="text-sm">Click "Generate" to create your first report</p>
        </div>
      );
    }

    const content = latestReport.content;

    switch (activeTab) {
      case "weekly_insight":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Summary</h3>
              <p className="text-muted-foreground">{content.summary}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Why</h3>
              <p className="text-muted-foreground">{content.why}</p>
            </div>
            {content.actions && (
              <div>
                <h3 className="font-semibold mb-2">Recommended Actions</h3>
                <div className="space-y-2">
                  {content.actions.map((action: any, idx: number) => (
                    <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <Badge
                          variant={
                            action.priority === "high"
                              ? "destructive"
                              : action.priority === "medium"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {action.priority}
                        </Badge>
                      </div>
                      <p className="font-medium">{action.action}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {action.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case "caption_batch":
        return (
          <div className="space-y-4">
            {content.captions?.map((caption: any, idx: number) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div>
                      <Badge variant="outline" className="mb-2">Hook</Badge>
                      <p className="font-medium">{caption.hook}</p>
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-2">Body</Badge>
                      <p>{caption.body}</p>
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-2">CTA</Badge>
                      <p className="text-muted-foreground">{caption.cta}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(`${caption.hook}\n\n${caption.body}\n\n${caption.cta}`)
                      }
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Caption
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case "hashtag_list":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Broad Hashtags</h3>
              <div className="flex flex-wrap gap-2">
                {content.broad?.map((tag: string, idx: number) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => copyToClipboard(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Mid-Tier Hashtags</h3>
              <div className="flex flex-wrap gap-2">
                {content.mid?.map((tag: string, idx: number) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => copyToClipboard(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Niche Hashtags</h3>
              <div className="flex flex-wrap gap-2">
                {content.niche?.map((tag: string, idx: number) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => copyToClipboard(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                copyToClipboard(
                  [
                    ...(content.broad || []),
                    ...(content.mid || []),
                    ...(content.niche || []),
                  ].join(" ")
                )
              }
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy All Hashtags
            </Button>
          </div>
        );

      case "competitor_scan":
        return (
          <div className="space-y-4">
            {content.competitors?.map((comp: any, idx: number) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <h3 className="font-semibold">@{comp.handle}</h3>
                    <p className="text-sm text-muted-foreground">
                      Posting Frequency: {comp.postingFrequency}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Avg Engagement: {comp.avgEngagement}
                    </p>
                    {comp.themes && (
                      <div>
                        <p className="text-sm font-medium mb-1">Themes:</p>
                        <div className="flex flex-wrap gap-1">
                          {comp.themes.map((theme: string, tIdx: number) => (
                            <Badge key={tIdx} variant="outline">
                              {theme}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case "action_plan":
        return (
          <div className="space-y-4">
            {content.tasks?.map((task: any, idx: number) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{task.task}</h3>
                    <div className="flex gap-2">
                      <Badge
                        variant={
                          task.priority === "high"
                            ? "destructive"
                            : task.priority === "medium"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {task.priority}
                      </Badge>
                      <Badge variant="outline">{task.effort}</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{task.reason}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      default:
        return <div>Unknown report type</div>;
    }
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c79b09]"></div>
      </div>
    );
  }

  return (
    <SideBar>
      <div className="flex-1 space-y-4 p-8 pt-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">AI Insights</h2>
            <p className="text-muted-foreground">
              Generate AI-powered insights, captions, hashtags, and more
            </p>
          </div>
          {projects && projects.length > 0 && (
            <Select value={selectedProjectId || ""} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            {reportTypes.map((type) => {
              const Icon = type.icon;
              return (
                <TabsTrigger key={type.id} value={type.id} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {type.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {reportTypes.map((type) => (
            <TabsContent key={type.id} value={type.id} className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{type.label}</CardTitle>
                      <CardDescription>
                        {latestReport
                          ? `Last generated: ${new Date(latestReport.createdAt).toLocaleString()}`
                          : "No report generated yet"}
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => handleGenerate(type.id)}
                      disabled={generating === type.id || !selectedProjectId}
                    >
                      {generating === type.id ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : latestReport ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Regenerate
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>{renderReportContent()}</CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </SideBar>
  );
}
