"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, MoreHorizontal } from 'lucide-react'
import SideBar from "@/components/SideBar"

const activeServices = [
  {
    id: "SRV-1001",
    service: "Instagram Outreach",
    platform: "Instagram",
    type: "Lead Generation",
    dailyProgress: { current: 68, target: 75, percentage: 91 },
    monthlyResults: { value: 142, unit: "leads" },
    performance: "18.5% response",
    status: "Active"
  },
  {
    id: "SRV-1002",
    service: "LinkedIn Outreach",
    platform: "LinkedIn",
    type: "Lead Generation",
    dailyProgress: { current: 52, target: 50, percentage: 104 },
    monthlyResults: { value: 89, unit: "leads" },
    performance: "24.2% response",
    status: "Active"
  },
  {
    id: "SRV-1003",
    service: "Instagram Growth",
    platform: "Instagram",
    type: "Follower Growth",
    dailyProgress: { current: 1350, target: 1200, percentage: 113 },
    monthlyResults: { value: "+8.2K", unit: "" },
    performance: "4.8% engagement",
    status: "Active"
  }
]

export default function ActiveServicesPage() {
  return (
    <SideBar>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Active Services
            </h2>
            <p className="text-muted-foreground">
              View and manage your active outreach and social growth services
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current Services</CardTitle>
            <p className="text-sm text-muted-foreground">
              Breakdown of all active services and their performance
            </p>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Daily Progress</TableHead>
                    <TableHead>Monthly Results</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeServices.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="font-medium">
                        {service.id}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{service.service}</div>
                          <div className="text-sm text-muted-foreground">
                            {service.platform}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{service.type}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>
                              {service.dailyProgress.current}/
                              {service.dailyProgress.target}
                            </span>
                            <span>{service.dailyProgress.percentage}%</span>
                          </div>
                          <Progress
                            value={service.dailyProgress.percentage}
                            className="h-2"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {service.monthlyResults.value}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {service.monthlyResults.unit}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-green-600">
                          {service.performance}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-800"
                        >
                          {service.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
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
    </SideBar>
  );
}
