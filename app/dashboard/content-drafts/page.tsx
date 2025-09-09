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
import { Search, Filter, Plus, Edit, Eye, MoreHorizontal, FileText, Image, Video } from 'lucide-react'
import SideBar from "@/components/SideBar"

const contentDrafts = [
  {
    id: "DRAFT-001",
    title: "Instagram Post - Product Launch",
    type: "Social Media Post",
    platform: "Instagram",
    status: "Draft",
    lastModified: "2 hours ago",
    wordCount: 150,
    author: "Content Team"
  },
  {
    id: "DRAFT-002", 
    title: "Blog Post - Industry Trends 2024",
    type: "Blog Article",
    platform: "Website",
    status: "In Review",
    lastModified: "1 day ago",
    wordCount: 2400,
    author: "Marketing Team"
  },
  {
    id: "DRAFT-003",
    title: "LinkedIn Campaign Copy",
    type: "Ad Copy",
    platform: "LinkedIn",
    status: "Approved",
    lastModified: "3 days ago",
    wordCount: 75,
    author: "Copy Team"
  },
  {
    id: "DRAFT-004",
    title: "Email Newsletter - Weekly Update",
    type: "Email Content",
    platform: "Email",
    status: "Draft",
    lastModified: "5 hours ago",
    wordCount: 320,
    author: "Content Team"
  }
]

const contentTemplates = [
  {
    title: "Social Media Post",
    description: "Instagram, Facebook, Twitter posts",
    icon: Image,
    count: 12
  },
  {
    title: "Blog Article",
    description: "Long-form content for website",
    icon: FileText,
    count: 8
  },
  {
    title: "Video Script",
    description: "Scripts for video content",
    icon: Video,
    count: 5
  }
]

export default function ContentDraftsPage() {
  return (
    <SideBar>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Content & Drafts
            </h2>
            <p className="text-muted-foreground">
              Manage your content drafts, templates, and collaborative writing
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Content
          </Button>
        </div>

        <Tabs defaultValue="drafts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="drafts">All Drafts</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
          </TabsList>

          <TabsContent value="drafts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Content Drafts</CardTitle>
                <p className="text-sm text-muted-foreground">
                  All your content drafts and work in progress
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search content..." className="pl-8" />
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
                        <TableHead>Platform</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Word Count</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead>Last Modified</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contentDrafts.map((draft) => (
                        <TableRow key={draft.id}>
                          <TableCell>
                            <div className="font-medium">{draft.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {draft.id}
                            </div>
                          </TableCell>
                          <TableCell>{draft.type}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{draft.platform}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                draft.status === "Approved"
                                  ? "default"
                                  : draft.status === "In Review"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {draft.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{draft.wordCount} words</TableCell>
                          <TableCell>{draft.author}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {draft.lastModified}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
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

          <TabsContent value="templates" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {contentTemplates.map((template, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <template.icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {template.title}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {template.count} templates
                      </span>
                      <Button size="sm">Use Template</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </SideBar>
  );
}
