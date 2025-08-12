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
import { Search, Filter, Plus, Globe, ExternalLink, Code, Smartphone } from 'lucide-react'

const websiteProjects = [
  {
    id: "WEB-001",
    title: "E-commerce Platform",
    client: "RetailCorp",
    type: "E-commerce",
    status: "Development",
    progress: 65,
    deadline: "2024-02-15",
    developer: "Tech Team A",
    url: "retailcorp-staging.com",
    technologies: ["React", "Node.js", "MongoDB"]
  },
  {
    id: "WEB-002",
    title: "Corporate Website",
    client: "BusinessInc",
    type: "Corporate",
    status: "Design",
    progress: 40,
    deadline: "2024-01-30",
    developer: "Design Team",
    url: "businessinc-preview.com",
    technologies: ["WordPress", "PHP", "MySQL"]
  },
  {
    id: "WEB-003",
    title: "Portfolio Site",
    client: "CreativeStudio",
    type: "Portfolio",
    status: "Live",
    progress: 100,
    deadline: "2024-01-05",
    developer: "Tech Team B",
    url: "creativestudio.com",
    technologies: ["Next.js", "Tailwind", "Vercel"]
  },
  {
    id: "WEB-004",
    title: "SaaS Dashboard",
    client: "StartupTech",
    type: "SaaS",
    status: "Planning",
    progress: 15,
    deadline: "2024-03-01",
    developer: "Full Stack Team",
    url: "startuptech-dev.com",
    technologies: ["React", "TypeScript", "PostgreSQL"]
  }
]

export default function WebsiteProjectsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Website Projects</h2>
              <p className="text-muted-foreground">
                Manage your web development projects and track deployment status
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline">
                <Code className="h-4 w-4 mr-2" />
                View Code
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
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">
                  In development
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Live Sites</CardTitle>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
                <p className="text-xs text-muted-foreground">
                  Successfully deployed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mobile Ready</CardTitle>
                <Smartphone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">100%</div>
                <p className="text-xs text-muted-foreground">
                  Responsive design
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Load Time</CardTitle>
                <Code className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1.2s</div>
                <p className="text-xs text-muted-foreground">
                  Page load speed
                </p>
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
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Developer</TableHead>
                      <TableHead>Technologies</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {websiteProjects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{project.title}</div>
                            <div className="text-sm text-muted-foreground">{project.id}</div>
                            <div className="text-xs text-blue-600">{project.url}</div>
                          </div>
                        </TableCell>
                        <TableCell>{project.client}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{project.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              project.status === "Live" ? "default" : 
                              project.status === "Development" ? "secondary" : "outline"
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
                        <TableCell>{project.developer}</TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {project.deadline}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
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
