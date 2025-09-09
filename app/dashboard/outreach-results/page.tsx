"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Filter, Upload, Plus, Download } from 'lucide-react'
import SideBar from "@/components/SideBar"

const outreachData = [
  {
    id: "OUT-1001",
    platform: "Instagram",
    messageType: "Cold DM",
    messagesSent: 87,
    followUps: 12,
    responses: 16,
    responseRate: "17.2%",
    date: "2023-06-15"
  },
  {
    id: "OUT-1002",
    platform: "LinkedIn",
    messageType: "Connection + Message",
    messagesSent: 65,
    followUps: 8,
    responses: 14,
    responseRate: "21.5%",
    date: "2023-06-14"
  },
  {
    id: "OUT-1003",
    platform: "Instagram",
    messageType: "Story Reply",
    messagesSent: 45,
    followUps: 0,
    responses: 9,
    responseRate: "20.0%",
    date: "2023-06-14"
  }
]

export default function OutreachResultsPage() {
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
           
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outreachData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <input type="checkbox" className="rounded" />
                      </TableCell>
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.platform}</Badge>
                      </TableCell>
                      <TableCell>{item.messageType}</TableCell>
                      <TableCell>{item.messagesSent}</TableCell>
                      <TableCell>{item.followUps}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-800"
                        >
                          {item.responses}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{item.responseRate}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.date}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </SideBar>
  );
}
