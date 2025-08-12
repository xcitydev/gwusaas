"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Plus, MessageCircle, Phone, Mail, Clock, CheckCircle, AlertCircle } from 'lucide-react'

const supportTickets = [
  {
    id: "TICK-001",
    subject: "Instagram campaign not showing results",
    priority: "High",
    status: "Open",
    created: "2024-01-08",
    lastUpdate: "2 hours ago",
    assignedTo: "Support Team A"
  },
  {
    id: "TICK-002",
    subject: "Request for additional video revisions",
    priority: "Medium",
    status: "In Progress",
    created: "2024-01-07",
    lastUpdate: "1 day ago",
    assignedTo: "Video Team"
  },
  {
    id: "TICK-003",
    subject: "Website loading speed optimization",
    priority: "Low",
    status: "Resolved",
    created: "2024-01-05",
    lastUpdate: "3 days ago",
    assignedTo: "Tech Team"
  }
]

const faqItems = [
  {
    question: "How do I track my campaign performance?",
    answer: "You can track your campaign performance through the Dashboard and Growth Analytics sections. These provide real-time metrics on outreach, engagement, and conversions."
  },
  {
    question: "What's included in my service package?",
    answer: "Each service package includes dedicated account management, regular reporting, content creation, and ongoing optimization. Specific deliverables vary by service type."
  },
  {
    question: "How can I request revisions to my content?",
    answer: "You can request revisions through the Approvals section or by creating a support ticket. Most revisions are completed within 24-48 hours."
  },
  {
    question: "When will I see results from my campaigns?",
    answer: "Results typically begin showing within 2-4 weeks of campaign launch. However, this can vary based on your industry, target audience, and campaign objectives."
  }
]

export default function SupportPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Support</h2>
              <p className="text-muted-foreground">
                Get help with your campaigns and services
              </p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting response
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">28</div>
                <p className="text-xs text-muted-foreground">
                  This month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Response</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4.2h</div>
                <p className="text-xs text-muted-foreground">
                  Response time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">4.8/5</div>
                <p className="text-xs text-muted-foreground">
                  Customer rating
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="tickets" className="space-y-4">
            <TabsList>
              <TabsTrigger value="tickets">My Tickets</TabsTrigger>
              <TabsTrigger value="new-ticket">New Ticket</TabsTrigger>
              <TabsTrigger value="faq">FAQ</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
            </TabsList>

            <TabsContent value="tickets" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Support Tickets</CardTitle>
                  <CardDescription>
                    Track your support requests and their status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search tickets..." className="pl-8" />
                    </div>
                  </div>

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ticket ID</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Last Update</TableHead>
                          <TableHead>Assigned To</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {supportTickets.map((ticket) => (
                          <TableRow key={ticket.id}>
                            <TableCell className="font-medium">{ticket.id}</TableCell>
                            <TableCell>{ticket.subject}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  ticket.priority === "High" ? "destructive" : 
                                  ticket.priority === "Medium" ? "default" : "secondary"
                                }
                              >
                                {ticket.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  ticket.status === "Resolved" ? "default" : 
                                  ticket.status === "In Progress" ? "secondary" : "outline"
                                }
                              >
                                {ticket.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {ticket.created}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {ticket.lastUpdate}
                            </TableCell>
                            <TableCell>{ticket.assignedTo}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="new-ticket" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Create New Support Ticket</CardTitle>
                  <CardDescription>
                    Describe your issue and we'll get back to you as soon as possible
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Subject</label>
                      <Input placeholder="Brief description of your issue" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Priority</label>
                      <select className="w-full p-2 border rounded-md">
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                        <option>Urgent</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <select className="w-full p-2 border rounded-md">
                      <option>General Support</option>
                      <option>Campaign Issues</option>
                      <option>Technical Problems</option>
                      <option>Billing Questions</option>
                      <option>Feature Requests</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea 
                      placeholder="Please provide detailed information about your issue..."
                      className="min-h-[120px]"
                    />
                  </div>
                  <Button>Submit Ticket</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="faq" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                  <CardDescription>
                    Find answers to common questions about our services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {faqItems.map((item, index) => (
                      <div key={index} className="border-b pb-4">
                        <h4 className="font-medium mb-2">{item.question}</h4>
                        <p className="text-sm text-muted-foreground">{item.answer}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MessageCircle className="h-5 w-5" />
                      <span>Live Chat</span>
                    </CardTitle>
                    <CardDescription>
                      Chat with our support team in real-time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">Start Chat</Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Available 9 AM - 6 PM EST
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Mail className="h-5 w-5" />
                      <span>Email Support</span>
                    </CardTitle>
                    <CardDescription>
                      Send us an email for detailed assistance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      support@agency.com
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Response within 4 hours
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Phone className="h-5 w-5" />
                      <span>Phone Support</span>
                    </CardTitle>
                    <CardDescription>
                      Call us for urgent issues
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      +1 (555) 123-4567
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Available 24/7 for urgent issues
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
