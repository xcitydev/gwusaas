"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SideBar from "@/components/SideBar";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const [instagramHandle, setInstagramHandle] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const settings = useQuery(
    api.settings.get,
    {}
  );

  const setIgCreds = useMutation(api.settings.setIgCreds);

  const handleSaveIg = async () => {
    try {
      await setIgCreds({
        instagramHandle: instagramHandle || undefined,
        accessToken: accessToken || undefined,
      });
      toast.success("Instagram credentials saved!");
    } catch (error: any) {
      toast.error(`Failed to save: ${error.message}`);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c79b09]"></div>
      </div>
    );
  }

  return (
    <SideBar>
      <div className="flex-1 space-y-4 p-8 pt-6 max-w-4xl mx-auto">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage your account settings and integrations
          </p>
        </div>

        <Tabs defaultValue="instagram" className="space-y-4">
          <TabsList>
            <TabsTrigger value="instagram">Instagram</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="webhook">Webhooks</TabsTrigger>
          </TabsList>

          <TabsContent value="instagram">
            <Card>
              <CardHeader>
                <CardTitle>Instagram Connection</CardTitle>
                <CardDescription>
                  Connect your Instagram account for official metrics via Meta Graph API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="handle">Instagram Handle</Label>
                  <Input
                    id="handle"
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value)}
                    placeholder="@yourhandle"
                  />
                </div>
                <div>
                  <Label htmlFor="token">Access Token (Optional)</Label>
                  <Input
                    id="token"
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="Meta Graph API access token"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Get this from Meta Developer Console
                  </p>
                </div>
                <Button onClick={handleSaveIg}>Save Credentials</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Team Management</CardTitle>
                <CardDescription>
                  Manage team members and their roles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Team management is handled through Clerk Organizations.
                  Use the Clerk dashboard to invite members and assign roles.
                </p>
                <Button className="mt-4" variant="outline">
                  Open Clerk Dashboard
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhook">
            <Card>
              <CardHeader>
                <CardTitle>Webhook Configuration</CardTitle>
                <CardDescription>
                  Configure webhook secrets for Apify integration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label>Webhook Secret</Label>
                  <Input
                    value={process.env.NEXT_PUBLIC_WEBHOOK_SECRET || "Set in environment variables"}
                    disabled
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure WEBHOOK_APIFY_SECRET in your environment
                  </p>
                </div>
                <div className="mt-4">
                  <Label>Webhook URL</Label>
                  <Input
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/webhook/apify`}
                    disabled
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Use this URL in your Apify actor configuration
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SideBar>
  );
}
