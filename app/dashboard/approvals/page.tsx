"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Filter, Check, X, Clock, Eye, MessageSquare } from 'lucide-react'
import SideBar from "@/components/SideBar"
import { useOrganization, useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"
import { Id } from "@/convex/_generated/dataModel"

export default function ApprovalsPage() {
  const { organization, isLoaded: isOrgLoaded } = useOrganization()
  const { user, isLoaded: isUserLoaded } = useUser()

  const convexOrg = useQuery(
    api.organizations.getByClerkId,
    organization?.id ? { clerkOrgId: organization.id } : "skip"
  )

  const approvals = useQuery(
    api.approvals.list,
    convexOrg?._id ? { organizationId: convexOrg._id } : "skip"
  )

  const updateStatus = useMutation(api.approvals.updateStatus)

  const handleUpdateStatus = async (id: Id<"approvals">, status: string) => {
    try {
      await updateStatus({ id, status })
      toast.success(`Item ${status.toLowerCase()} successfully`)
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    }
  }

  if (!isOrgLoaded || !isUserLoaded || (organization && !convexOrg)) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c79b09]"></div>
      </div>
    )
  }

  const pendingApprovals = approvals?.filter(a => a.status === "Pending Review")
  const filteredHistory = approvals?.filter(a => a.status !== "Pending Review")

  return (
    <SideBar>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Approvals</h2>
            <p className="text-muted-foreground">
              Review and approve content, campaign designs, and website updates
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Review
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingApprovals?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting your approval
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <Check className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredHistory?.filter(a => a.status === "Approved").length || 0}
              </div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revisions</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredHistory?.filter(a => a.status === "Rejected").length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Requested changes</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                History Total
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredHistory?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Total items reviewed</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">Pending Approval</TabsTrigger>
            <TabsTrigger value="history">Approval History</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Items Awaiting Approval</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Review and approve the following submissions
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search approvals..." className="pl-8" />
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
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Submitted By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingApprovals && pendingApprovals.length > 0 ? (
                        pendingApprovals.map((item) => (
                          <TableRow key={item._id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.title}</div>
                                <div className="text-sm text-muted-foreground">
                                  {item.description}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.type}</Badge>
                            </TableCell>
                            <TableCell>{item.submittedBy}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  item.priority === "High"
                                    ? "destructive"
                                    : item.priority === "Medium"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {item.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.status}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleUpdateStatus(item._id, "Approved")}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleUpdateStatus(item._id, "Rejected")}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No pending approvals found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Approval History</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Previously reviewed and approved items
                </p>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Approved By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Feedback</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredHistory && filteredHistory.length > 0 ? (
                        filteredHistory.map((item) => (
                          <TableRow key={item._id}>
                            <TableCell className="font-medium">
                              {item.title}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.type}</Badge>
                            </TableCell>
                            <TableCell>{item.approvedBy || "-"}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.approvedAt ? new Date(item.approvedAt).toLocaleDateString() : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  item.status === "Approved"
                                    ? "default"
                                    : "destructive"
                                }
                              >
                                {item.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {item.feedback || "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No approval history found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SideBar>
  );
}
