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
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useEffect } from "react"
import { toast } from "sonner"

export default function ReferralProgramPage() {
  const { user, isLoaded } = useUser()
  const referralData = useQuery(api.referrals.get)
  const initReferral = useMutation(api.referrals.init)

  useEffect(() => {
    if (isLoaded && user && !referralData) {
      initReferral().catch(err => {
        console.error("Failed to init referral program:", err)
      })
    }
  }, [isLoaded, user, referralData, initReferral])

  const referralLink = referralData 
    ? `https://agency.com/ref/${referralData.referralCode}`
    : "Loading..."

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
              Referral Program
            </h2>
            <p className="text-muted-foreground">
              Earn rewards by referring new clients to our services
            </p>
          </div>
          <Button onClick={() => {
            navigator.clipboard.writeText(referralLink)
            toast.success("Referral link copied!")
          }}>
            <Share2 className="h-4 w-4 mr-2" />
            Share Link
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Referrals
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{referralData?.totalReferrals || 0}</div>
              <p className="text-xs text-muted-foreground">Across all time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold overflow-hidden text-ellipsis">
                ${referralData?.totalEarned.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">Total paid out</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{referralData?.status || "Loading..."}</div>
              <p className="text-xs text-muted-foreground">Program status</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Code</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">{referralData?.referralCode || "---"}</div>
              <p className="text-xs text-muted-foreground">Your unique ID</p>
            </CardContent>
          </Card>
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
                  onClick={() => {
                    navigator.clipboard.writeText(referralLink)
                    toast.success("Link copied!")
                  }}
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
                  <Share2 className="h-4 w-4 mr-2" />
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
                  {/* History table would be populated from a separate join table in the future */}
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No referrals found yet. Share your link to get started!
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </SideBar>
  );
}
