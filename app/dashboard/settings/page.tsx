"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import SideBar from "@/components/SideBar";
import { useUser, useOrganization, OrganizationProfile } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, Shield } from "lucide-react";

import { BrandOnboardingSettings } from "@/components/dashboard/BrandOnboardingSettings";
import { StrategySettings } from "@/components/dashboard/StrategySettings";
import { GHLIntegrationSettings } from "@/components/dashboard/GHLIntegrationSettings";
import { VoiceReplySettings } from "@/components/dashboard/VoiceReplySettings";
import { ServiceFormsSettings } from "@/components/dashboard/ServiceFormsSettings";

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const [instagramHandle, setInstagramHandle] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const { organization } = useOrganization();
  const convexOrg = useQuery(
    api.organization.getByClerkId,
    organization?.id ? { clerkOrgId: organization.id } : "skip"
  );
  
  const orgSettings = useQuery(
    api.settings.get,
    convexOrg?._id ? { organizationId: convexOrg._id } : "skip"
  );

  const setIgCreds = useMutation(api.settings.setIgCreds);

  useEffect(() => {
    if (orgSettings?.settings?.ig) {
      setInstagramHandle(orgSettings.settings.ig.instagramHandle || "");
      setAccessToken(orgSettings.settings.ig.accessToken || "");
    }
  }, [orgSettings]);

  const handleSaveIg = async () => {
    if (!convexOrg?._id) {
      toast.error("Organization not found");
      return;
    }

    try {
      await setIgCreds({
        organizationId: convexOrg._id,
        instagramHandle,
        accessToken,
      });
      toast.success("Instagram credentials updated");
    } catch (error: any) {
      toast.error(`Failed to update: ${error.message}`);
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
      <div className="flex-1 min-w-0 space-y-4 p-4 sm:p-6 md:p-8 pt-6 max-w-5xl mx-auto">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your organization settings and integrations
          </p>
        </div>

        <Tabs defaultValue="instagram" className="space-y-6">
          <div className="w-full overflow-x-auto pb-1 no-scrollbar">
            <TabsList className="bg-white/5 border border-white/5 p-1 h-12 inline-flex w-max min-w-full justify-start">
              <TabsTrigger value="instagram" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold shrink-0">Instagram</TabsTrigger>
              <TabsTrigger value="ghl" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold shrink-0">GoHighLevel</TabsTrigger>
              <TabsTrigger value="voice" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold shrink-0">Voice</TabsTrigger>
              <TabsTrigger value="strategy" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold shrink-0">Brand & Strategy</TabsTrigger>
              <TabsTrigger value="services" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold shrink-0">Service Requests</TabsTrigger>
              <TabsTrigger value="team" className="px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold shrink-0">Team</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="instagram">
            <Card className="glass-card border-white/5 overflow-hidden">
              <CardHeader className="border-b border-white/5">
                <CardTitle>Instagram Connection</CardTitle>
                <CardDescription>
                  Connect your Instagram account for official metrics via Meta Graph API
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 md:p-8 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="handle" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Instagram Handle</Label>
                  <Input
                    id="handle"
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value)}
                    placeholder="@yourhandle"
                    className="bg-white/5 border-white/10 h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Access Token (Optional)</Label>
                  <Input
                    id="token"
                    type="password"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="Meta Graph API access token"
                    className="bg-white/5 border-white/10 h-11"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Get this from Meta Developer Console
                  </p>
                </div>
                <div className="pt-4">
                  <Button onClick={handleSaveIg} className="w-full md:w-auto px-8 h-11 amber-glow font-bold uppercase tracking-widest text-xs">Save Credentials</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ghl">
            <GHLIntegrationSettings />
          </TabsContent>

          <TabsContent value="voice">
            <VoiceReplySettings />
          </TabsContent>

          <TabsContent value="strategy" className="space-y-6">
            {user?.id && <BrandOnboardingSettings clerkUserId={user.id} />}
            {user?.id && <StrategySettings userId={user.id} />}
          </TabsContent>

          <TabsContent value="services">
            <ServiceFormsSettings />
          </TabsContent>

          <TabsContent value="team">
            <div className="glass-card rounded-[2rem] overflow-hidden border-white/5 bg-zinc-950/50 p-0">
              <OrganizationProfile 
                appearance={{
                  variables: {
                    colorPrimary: "#c79b09",
                    colorText: "white",
                    colorBackground: "transparent",
                    colorTextSecondary: "#a1a1aa",
                    colorInputBackground: "rgba(255, 255, 255, 0.05)",
                    colorInputText: "white",
                  },
                  elements: {
                    rootBox: "w-full",
                    card: "bg-transparent shadow-none w-full border-none",
                    navbar: "hidden",
                    scrollBox: "bg-transparent",
                    pageScrollBox: "bg-transparent",
                    organizationProfile: {
                      mobile: {
                        navbar: "hidden"
                      }
                    },
                    headerTitle: "text-white font-black",
                    headerSubtitle: "text-muted-foreground",
                    organizationSwitcherTrigger: "text-white",
                    userPreviewMainIdentifier: "text-white",
                    userPreviewSecondaryIdentifier: "text-muted-foreground",
                    profileSectionTitleText: "text-primary uppercase tracking-widest font-black text-xs",
                    formButtonPrimary: "amber-glow bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-widest text-xs h-10",
                    formButtonReset: "text-muted-foreground hover:text-white",
                    formFieldLabel: "text-muted-foreground font-bold text-xs uppercase tracking-widest",
                    formFieldInput: "bg-white/5 border-white/10 text-white focus:ring-primary focus:border-primary",
                    tabButton: "text-muted-foreground hover:text-white data-[active]:text-primary",
                    dividerLine: "bg-white/5",
                    breadcrumbsItem: "text-muted-foreground",
                    breadcrumbsSeparator: "text-muted-foreground",
                    badge: "bg-primary/10 text-primary border-primary/20",
                  }
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </SideBar>
  );
}
