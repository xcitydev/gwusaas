"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Copy, Share2, Gift, Users, DollarSign, TrendingUp, Mail, Link } from 'lucide-react'
import SideBar from "@/components/SideBar"

const referralStats = [
  {
    title: "Total Referrals",
    value: "24",
    change: "+6 this month",
    icon: Users
  },
  {
    title: "Successful Conversions",
    value: "18",
    change: "75% conversion rate",
    icon: TrendingUp
  },
  {
    title: "Earnings",
    value: "$2,400",
    change: "+$600 this month",
    icon: DollarSign
  },
  {
    title: "Pending Rewards",
    value: "$450",
    change: "3 pending payouts",
    icon: Gift
  }
]

const referralHistory = [
  {
    id: "REF-001",
    referredName: "John Smith",
    referredEmail: "john@example.com",
    status: "Converted",
    signupDate: "2024-01-05",
    conversionDate: "2024-01-08",
    reward: "$150",
    service: "Social Media Management"
  },
  {
    id: "REF-002",
    referredName: "Sarah Johnson",
    referredEmail: "sarah@company.com",
    status: "Pending",
    signupDate: "2024-01-07",
    conversionDate: "-",
    reward: "$0",
    service: "Website Development"
  },
  {
    id: "REF-003",
    referredName: "Mike Chen",
    referredEmail: "mike@startup.io",
    status: "Converted",
    signupDate: "2024-01-03",
    conversionDate: "2024-01-06",
    reward: "$200",
    service: "Video Production"
  }
]

export default function ReferralProgramPage() {
  const referralLink = "https://agency.com/ref/client123"

  return (
    <SideBar>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Referral Program
            </h2>
            <p className="text-muted-foreground">
              Earn rewards by referring new clients to our services
            </p>
          </div>
          <Button>
            <Share2 className="h-4 w-4 mr-2" />
            Share Link
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {referralStats.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Your Referral Link</CardTitle>
              <CardDescription>
                Share this link with potential clients to earn rewards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input value={referralLink} readOnly />
                <Button
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(referralLink)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button variant="outline" size="sm">
                  <Link className="h-4 w-4 mr-2" />
                  Social Media
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reward Structure</CardTitle>
              <CardDescription>
                Earn commissions based on the services your referrals purchase
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Social Media Management</span>
                  <Badge variant="secondary">15% commission</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Website Development</span>
                  <Badge variant="secondary">10% commission</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Video Production</span>
                  <Badge variant="secondary">12% commission</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Content Creation</span>
                  <Badge variant="secondary">20% commission</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Referral History</CardTitle>
            <CardDescription>
              Track your referrals and their conversion status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referred Client</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Signup Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reward</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {referralHistory.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell className="font-medium">
                        {referral.referredName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {referral.referredEmail}
                      </TableCell>
                      <TableCell>{referral.service}</TableCell>
                      <TableCell>{referral.signupDate}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            referral.status === "Converted"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {referral.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {referral.reward}
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
