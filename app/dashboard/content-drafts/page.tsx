"use client"
import { useState } from "react"
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
import { ContentCreationDialog } from "@/components/content-creation-dialog"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useUser } from "@clerk/nextjs"

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
  const { user, isLoaded } = useUser()
  const [dialogOpen, setDialogOpen] = useState(false)

  // Get content drafts for current user
  const contentDrafts = useQuery(
    api.contentDrafts.list,
    {}
  )

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case "social_media_design":
        return "Social Media Design"
      case "blog_post":
        return "Blog Post"
      case "newsletter":
        return "Newsletter"
      default:
        return type
    }
  }

  const getContentTitle = (draft: any) => {
    if (draft.topic) return draft.topic
    if (draft.mainTopic) return draft.mainTopic
    if (draft.designTexts && draft.designTexts.length > 0) {
      return `Social Media Design (${draft.designTexts.length} designs)`
    }
    return `${getContentTypeLabel(draft.contentType)} Draft`
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    return "Just now"
  }

  const handleSuccess = () => {
    // Drafts will automatically refresh via Convex realtime query
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c79b09]"></div>
      </div>
    )
  }

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
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Content
          </Button>
        </div>

        <ContentCreationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={handleSuccess}
        />

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
                      {contentDrafts && contentDrafts.length > 0 ? (
                        contentDrafts.map((draft) => (
                          <TableRow key={draft._id}>
                            <TableCell>
                              <div className="font-medium">{getContentTitle(draft)}</div>
                              <div className="text-sm text-muted-foreground">
                                {draft._id}
                              </div>
                            </TableCell>
                            <TableCell>{getContentTypeLabel(draft.contentType)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {draft.contentType === "social_media_design" ? "Social Media" :
                                 draft.contentType === "blog_post" ? "Website" : "Email"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  draft.status === "approved" || draft.status === "published"
                                    ? "default"
                                    : draft.status === "in_review"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {draft.status.charAt(0).toUpperCase() + draft.status.slice(1).replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>{user?.fullName || "You"}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(draft.createdAt)}
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
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No content drafts yet. Click "New Content" to get started.
                          </TableCell>
                        </TableRow>
                      )}
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
