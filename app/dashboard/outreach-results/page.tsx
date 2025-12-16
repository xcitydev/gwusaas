"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Filter, Upload, Plus, Download, Sparkles } from 'lucide-react'
import SideBar from "@/components/SideBar"
import { OutreachOnboardingDialog } from "@/components/outreach-onboarding-dialog"
import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { toast } from "sonner"
import type { Id } from "@/convex/_generated/dataModel"

interface TestLead {
  id: string
  handle: string
  platform: string
  messageType: string
  messagesSent: number
  followUps: number
  responses: number
  responseRate: number
  date: string
  status: string
}

export default function OutreachResultsPage() {
  const { user, isLoaded } = useUser()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [testLeadsModalOpen, setTestLeadsModalOpen] = useState(false)
  const [testLeads, setTestLeads] = useState<TestLead[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<Id<"outreachCampaign"> | null>(null)

  // Get outreach campaigns for current user
  const outreachCampaigns = useQuery(
    api.outreachCampaigns.list,
    {}
  )

  const handleSuccess = () => {
    // Campaigns will automatically refresh via Convex realtime query
  }

  const generateTestLeads = (campaignId: Id<"outreachCampaign">) => {
    const campaign = outreachCampaigns?.find(c => c._id === campaignId)
    
    // Generate test leads based on campaign's target accounts or create generic ones
    const baseLeads: TestLead[] = [
      {
        id: "@techstartup",
        handle: "@techstartup",
        platform: "Instagram",
        messageType: "",
        messagesSent: 0,
        followUps: 0,
        responses: 0,
        responseRate: 0,
        date: "",
        status: ""
      },
      {
        id: "@designstudio",
        handle: "@designstudio",
        platform: "Instagram",
        messageType: "",
        messagesSent: 0,
        followUps: 0,
        responses: 0,
        responseRate: 0,
        date: "",
        status: ""
      },
      {
        id: "@marketingpro",
        handle: "@marketingpro",
        platform: "Instagram",
        messageType: "",
        messagesSent: 0,
        followUps: 0,
        responses: 0,
        responseRate: 0,
        date: "",
        status: ""
      },
      {
        id: "@businesscoach",
        handle: "@businesscoach",
        platform: "Instagram",
        messageType: "",
        messagesSent: 0,
        followUps: 0,
        responses: 0,
        responseRate: 0,
        date: "",
        status: ""
      },
      {
        id: "@entrepreneur",
        handle: "@entrepreneur",
        platform: "Instagram",
        messageType: "",
        messagesSent: 0,
        followUps: 0,
        responses: 0,
        responseRate: 0,
        date: "",
        status: ""
      },
    ]

    // If campaign has target accounts, use them as leads
    let leads: TestLead[] = baseLeads
    if (campaign?.targetAccounts && campaign.targetAccounts.length > 0) {
      leads = campaign.targetAccounts.slice(0, 5).map((account) => ({
        id: account,
        handle: account,
        platform: "Instagram",
        messageType: "",
        messagesSent: 0,
        followUps: 0,
        responses: 0,
        responseRate: 0,
        date: "",
        status: ""
      }))
    }

    setTestLeads(leads)
    setSelectedCampaign(campaignId)
    setTestLeadsModalOpen(true)
    toast.success(`Generated ${leads.length} test leads for this campaign`)
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
              Outreach Results
            </h2>
            <p className="text-muted-foreground">
              View responses and results from your targeted outreach campaigns
            </p>
          </div>
          <div className="flex items-center space-x-2">
          <Button 
              variant="outline"
              size="sm"
              className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-amber-500/20 text-amber-400 hover:from-amber-500/20 hover:to-amber-600/20 hover:border-amber-500/30 hover:text-amber-300 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Talk to AI
            </Button>
            <Button onClick={() => setDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <OutreachOnboardingDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={handleSuccess}
        />

        <Dialog open={testLeadsModalOpen} onOpenChange={setTestLeadsModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Test Leads</DialogTitle>
              <DialogDescription>
                Generated test leads for this outreach campaign
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {testLeads.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Platform</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {testLeads.map((lead) => (
                        <TableRow key={lead.id} className="hover:bg-accent/50 transition-colors">
                          <TableCell className="font-medium">
                            {lead.handle}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{lead.platform}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No test leads generated yet.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>All Responses</CardTitle>
            <p className="text-sm text-muted-foreground">
              Responses and interactions from your outreach efforts
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search contacts..." className="pl-8" />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                Newest
              </Button>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input type="checkbox" className="rounded" />
                    </TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Message Type</TableHead>
                    <TableHead>Messages Sent</TableHead>
                    <TableHead>Follow-ups</TableHead>
                    <TableHead>Responses</TableHead>
                    <TableHead>Response Rate</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[180px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outreachCampaigns && outreachCampaigns.length > 0 ? (
                    outreachCampaigns.map((campaign) => (
                      <TableRow key={campaign._id} className="hover:bg-accent/10 transition-colors">
                        <TableCell>
                          <input type="checkbox" className="rounded" />
                        </TableCell>
                        <TableCell className="font-medium">
                          @{campaign.instagramUsername}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Instagram</Badge>
                        </TableCell>
                        <TableCell>DM Outreach</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              campaign.status === "active"
                                ? "default"
                                : campaign.status === "setup"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {campaign.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">-</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(campaign.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => generateTestLeads(campaign._id)}
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-amber-400 hover:text-amber-300 hover:bg-black"
                          >
                            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                            Generate Test Leads
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No outreach campaigns yet. Click "New Campaign" to get started.
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
