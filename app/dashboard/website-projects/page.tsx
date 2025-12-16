"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Filter,
  Plus,
  Globe,
  ExternalLink,
  Code,
  Smartphone,
} from "lucide-react";
import SideBar from "@/components/SideBar";
import { WebsiteOnboardingDialog } from "@/components/website-onboarding-dialog";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";


export default function WebsiteProjectsPage() {
  const { user, isLoaded } = useUser();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Get website projects for current user
  const websiteProjects = useQuery(
    api.websiteProjects.list,
    {}
  );

  const handleSuccess = () => {
    // Projects will automatically refresh via Convex realtime query
  };

  // Calculate real stats from websiteProjects
  const stats = websiteProjects ? {
    activeProjects: websiteProjects.filter(p => 
      p.status !== "live" && p.status !== "archived"
    ).length,
    liveSites: websiteProjects.filter(p => p.status === "live").length,
    mobileReady: websiteProjects.length > 0 
      ? Math.round((websiteProjects.filter(p => p.status === "live").length / websiteProjects.length) * 100)
      : 0,
    avgProgress: websiteProjects.length > 0
      ? Math.round(websiteProjects.reduce((sum, p) => sum + p.progress, 0) / websiteProjects.length)
      : 0,
  } : {
    activeProjects: 0,
    liveSites: 0,
    mobileReady: 0,
    avgProgress: 0,
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c79b09]"></div>
      </div>
    );
  }

  return (
    <SideBar>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Website Projects
            </h2>
            <p className="text-muted-foreground">
              Manage your web development projects and track deployment status
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <Code className="h-4 w-4 mr-2" />
              View Code
            </Button>
            <Button onClick={() => {setDialogOpen(true); console.log("hello")}}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </div>

        {true&& (
          <WebsiteOnboardingDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onSuccess={handleSuccess}
          />
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Projects
              </CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeProjects}</div>
              <p className="text-xs text-muted-foreground">In development</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Live Sites</CardTitle>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.liveSites}</div>
              <p className="text-xs text-muted-foreground">
                Successfully deployed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Mobile Ready
              </CardTitle>
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.mobileReady}%</div>
              <p className="text-xs text-muted-foreground">Live sites percentage</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg. Progress
              </CardTitle>
              <Code className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgProgress}%</div>
              <p className="text-xs text-muted-foreground">Average completion</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Website Projects</CardTitle>
            <p className="text-sm text-muted-foreground">
              Track development progress and manage your web projects
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search projects..." className="pl-8" />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Developer</TableHead>
                    <TableHead>Technologies</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {websiteProjects && websiteProjects.length > 0 ? (
                    websiteProjects.map((project) => (
                      <TableRow key={project._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{project.title}</div>
                            {project.url && (
                              <div className="text-xs text-blue-600">
                                {project.url}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              project.status === "live"
                                ? "default"
                                : project.status === "development"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {project.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>{project.progress}%</span>
                            </div>
                            <Progress value={project.progress} className="h-2" />
                          </div>
                        </TableCell>
                        <TableCell>
                          {project.assignedDeveloper || "Unassigned"}
                        </TableCell>
                        <TableCell>
                          {project.technologies && project.technologies.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {project.technologies.slice(0, 2).map((tech, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tech}
                                </Badge>
                              ))}
                              {project.technologies.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{project.technologies.length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {project.deadline || "-"}
                        </TableCell>
                        <TableCell>
                          {project.url && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={project.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No website projects yet. Click "New Project" to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </SideBar>
  );
}
