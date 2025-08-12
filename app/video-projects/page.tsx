"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Filter, Plus, Play, Download, Upload, Clock, User } from 'lucide-react'

const videoProjects = [
  {
    id: "VID-001",
    title: "Product Demo Video",
    client: "TechCorp",
    duration: "2:45",
    status: "In Production",
    progress: 75,
    deadline: "2024-01-15",
    editor: "Sarah Johnson",
    thumbnail: "/placeholder.svg?height=60&width=100"
  },
  {
    id: "VID-002",
    title: "Brand Story Documentary",
    client: "StartupXYZ",
    duration: "5:30",
    status: "Review",
    progress: 90,
    deadline: "2024-01-20",
    editor: "Mike Chen",
    thumbnail: "/placeholder.svg?height=60&width=100"
  },
  {
    id: "VID-003",
    title: "Social Media Campaign",
    client: "FashionBrand",
    duration: "0:30",
    status: "Completed",
    progress: 100,
    deadline: "2024-01-10",
    editor: "Emma Davis",
    thumbnail: "/placeholder.svg?height=60&width=100"
  },
  {
    id: "VID-004",
    title: "Training Module Series",
    client: "EduTech",
    duration: "12:15",
    status: "Planning",
    progress: 25,
    deadline: "2024-02-01",
    editor: "Alex Wilson",
    thumbnail: "/placeholder.svg?height=60&width=100"
  }
]

export default function VideoProjectsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Video Projects</h2>
              <p className="text-muted-foreground">
                Manage your video production projects and track progress
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload Assets
              </Button>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <Play className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">
                  +2 from last month
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <Download className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">28</div>
                <p className="text-xs text-muted-foreground">
                  This quarter
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4:32</div>
                <p className="text-xs text-muted-foreground">
                  Per video
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">6</div>
                <p className="text-xs text-muted-foreground">
                  Active editors
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Video Projects</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track progress and manage your video production pipeline
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
                      <TableHead>Client</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Editor</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {videoProjects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <img 
                              src={project.thumbnail || "/placeholder.svg"} 
                              alt={project.title}
                              className="w-16 h-10 object-cover rounded"
                            />
                            <div>
                              <div className="font-medium">{project.title}</div>
                              <div className="text-sm text-muted-foreground">{project.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{project.client}</TableCell>
                        <TableCell>{project.duration}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              project.status === "Completed" ? "default" : 
                              project.status === "Review" ? "secondary" : "outline"
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
                        <TableCell>{project.editor}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {project.deadline}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Play className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
