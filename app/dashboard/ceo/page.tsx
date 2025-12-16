"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import SideBar from "@/components/SideBar";
import { useUser } from "@clerk/nextjs";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CEOPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const userKpis = useQuery(
    api.ceo.userKpis,
    {}
  );

  const topGrowth = useQuery(
    api.ceo.topGrowth,
    { limit: 10 }
  );

  const monthlyReport = useAction(api.ceo.monthlyReport);

  const handleExportReport = async () => {
    try {
      const result = await monthlyReport({});
      toast.success("Monthly report generated! Check your email.");
    } catch (error: any) {
      toast.error(`Failed to generate report: ${error.message}`);
    }
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
      <div className="flex-1 space-y-4 p-8 pt-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">CEO Dashboard</h2>
            <p className="text-muted-foreground">
              Global overview across all clients and projects
            </p>
          </div>
          <Button onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Monthly Report
          </Button>
        </div>

        {/* Global KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userKpis?.totalClients || 0}</div>
              <p className="text-xs text-muted-foreground">Active projects</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userKpis?.totalLeads || 0}</div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Followers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userKpis?.totalFollowers.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">Across all projects</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userKpis?.avgGrowth || 0}%</div>
              <p className="text-xs text-muted-foreground">Average growth rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Top Growth Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Top Growth Projects</CardTitle>
            <CardDescription>
              Projects with the highest growth scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topGrowth && topGrowth.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Instagram Handle</TableHead>
                    <TableHead>Growth Score</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topGrowth.map((project) => (
                    <TableRow key={project.projectId}>
                      <TableCell className="font-medium">{project.projectName}</TableCell>
                      <TableCell>@{project.instagramHandle}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            project.growthScore >= 70
                              ? "default"
                              : project.growthScore >= 40
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {project.growthScore}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Active</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No projects with growth data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SideBar>
  );
}

