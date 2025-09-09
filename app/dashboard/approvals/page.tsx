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

const pendingApprovals = [
  {
    id: "APP-001",
    title: "Instagram Campaign Creative",
    type: "Social Media",
    submittedBy: "Design Team",
    submittedDate: "2024-01-08",
    priority: "High",
    description: "New product launch campaign visuals",
    status: "Pending Review"
  },
  {
    id: "APP-002",
    title: "Blog Post - Industry Insights",
    type: "Content",
    submittedBy: "Content Team",
    submittedDate: "2024-01-07",
    priority: "Medium",
    description: "Thought leadership article for website",
    status: "Pending Review"
  },
  {
    id: "APP-003",
    title: "Website Homepage Update",
    type: "Website",
    submittedBy: "Dev Team",
    submittedDate: "2024-01-06",
    priority: "High",
    description: "Updated hero section and CTA buttons",
    status: "Pending Review"
  },
  {
    id: "APP-004",
    title: "Email Newsletter Template",
    type: "Email",
    submittedBy: "Marketing Team",
    submittedDate: "2024-01-05",
    priority: "Low",
    description: "Monthly newsletter design template",
    status: "Pending Review"
  }
]

const approvalHistory = [
  {
    id: "APP-H001",
    title: "LinkedIn Ad Campaign",
    type: "Advertising",
    approvedBy: "Client",
    approvedDate: "2024-01-04",
    status: "Approved",
    feedback: "Looks great, proceed with launch"
  },
  {
    id: "APP-H002",
    title: "Product Demo Video",
    type: "Video",
    approvedBy: "Client",
    approvedDate: "2024-01-03",
    status: "Rejected",
    feedback: "Please adjust the color scheme and add more product details"
  }
]

export default function ApprovalsPage() {
  return (
    <SideBar>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Approvals</h2>
            <p className="text-muted-foreground">
              Review and approve content, designs, and project deliverables
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
              <div className="text-2xl font-bold">4</div>
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
              <div className="text-2xl font-bold">18</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revisions</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">Requested changes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg. Response
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2.4h</div>
              <p className="text-xs text-muted-foreground">Response time</p>
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
                      {pendingApprovals.map((item) => (
                        <TableRow key={item.id}>
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
                            {item.submittedDate}
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
                                className="text-green-600"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
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
                      {approvalHistory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.type}</Badge>
                          </TableCell>
                          <TableCell>{item.approvedBy}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.approvedDate}
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
                            {item.feedback}
                          </TableCell>
                        </TableRow>
                      ))}
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
