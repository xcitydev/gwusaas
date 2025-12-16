"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Download, Plus } from "lucide-react";
import SideBar from "@/components/SideBar";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { useAction } from "convex/react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  qualified: "bg-green-100 text-green-800",
  won: "bg-purple-100 text-purple-800",
  lost: "bg-red-100 text-red-800",
};

export default function CRMPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Get projects for current user
  const projects = useQuery(
    api.projects.list,
    {}
  );

  // Set first project as selected
  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProjectId) {
      const activeProject = projects.find((p) => p.status === "active") || projects[0];
      setSelectedProjectId(activeProject._id);
    }
  }, [projects, selectedProjectId]);

  // Get leads
  const leadsData = useQuery(
    api.leads.list,
    selectedProjectId
      ? {
          projectId: selectedProjectId as any,
          status: statusFilter !== "all" ? statusFilter : undefined,
        }
      : "skip"
  );

  const updateLead = useMutation(api.leads.update);
  const exportCsv = useAction(api.leads.exportCsv);

  // Filter leads by search query
  const filteredLeads =
    leadsData?.leads.filter((lead) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        lead.handleOrEmail.toLowerCase().includes(query) ||
        lead.message?.toLowerCase().includes(query) ||
        lead.notes?.toLowerCase().includes(query)
      );
    }) || [];

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      await updateLead({
        leadId: leadId as any,
        status: newStatus,
      });
      toast.success("Lead status updated");
    } catch (error: any) {
      toast.error(`Failed to update: ${error.message}`);
    }
  };

  const handleExport = async () => {
    if (!selectedProjectId) {
      toast.error("Please select a project");
      return;
    }

    try {
      const result = await exportCsv({
        projectId: selectedProjectId as any,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });

      // Download CSV
      const csvContent = atob(result.csv);
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("CSV exported successfully");
    } catch (error: any) {
      toast.error(`Export failed: ${error.message}`);
    }
  };

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c79b09]"></div>
      </div>
    );
  }

  // Calculate KPIs
  const totalLeads = filteredLeads.length;
  const newLeads = filteredLeads.filter((l) => l.status === "new").length;
  const qualifiedLeads = filteredLeads.filter((l) => l.status === "qualified").length;
  const wonLeads = filteredLeads.filter((l) => l.status === "won").length;

  return (
    <SideBar>
      <div className="flex-1 space-y-4 p-8 pt-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">CRM - Leads</h2>
            <p className="text-muted-foreground">
              Manage and track all your leads in one place
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {projects && projects.length > 0 && (
              <Select
                value={selectedProjectId || ""}
                onValueChange={setSelectedProjectId}
              >
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
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLeads}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">New</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{newLeads}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Qualified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{qualifiedLeads}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Won</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{wonLeads}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Leads</CardTitle>
            <p className="text-sm text-muted-foreground">
              View and manage all leads for the selected project
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredLeads.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Handle/Email</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => (
                      <TableRow key={lead._id}>
                        <TableCell className="font-medium">
                          {lead.handleOrEmail}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{lead.source}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {lead.message || "-"}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={lead.status}
                            onValueChange={(newStatus) =>
                              handleStatusChange(lead._id, newStatus)
                            }
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="contacted">Contacted</SelectItem>
                              <SelectItem value="qualified">Qualified</SelectItem>
                              <SelectItem value="won">Won</SelectItem>
                              <SelectItem value="lost">Lost</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // TODO: Open notes dialog
                              toast.info("Notes feature coming soon");
                            }}
                          >
                            Notes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No leads found</p>
                <p className="text-sm">
                  {selectedProjectId
                    ? "Leads will appear here as they come in"
                    : "Please select a project"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SideBar>
  );
}

