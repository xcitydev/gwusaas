"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import SideBar from "@/components/SideBar";
import { PlanGate } from "@/components/PlanGate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandingTab } from "@/components/whitelabel/BrandingTab";
import { CustomDomainTab } from "@/components/whitelabel/CustomDomainTab";
import { ClientManagementTab } from "@/components/whitelabel/ClientManagementTab";

export default function WhiteLabelPage() {
  const { user } = useUser();
  const config = useQuery(
    api.whitelabel.getConfig,
    user?.id ? { userId: user.id } : "skip",
  );
  const verification = useQuery(
    api.whitelabel.getDomainVerification,
    user?.id ? { userId: user.id } : "skip",
  );

  if (!user?.id) {
    return (
      <SideBar>
        <div className="mx-auto w-full max-w-6xl p-6 md:p-8">
          <Card>
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </SideBar>
    );
  }

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-6xl space-y-6 p-6 md:p-8">
        <div>
          <h1 className="text-3xl font-bold">White Label Control Panel</h1>
          <p className="text-muted-foreground">
            Configure branding, domains, and reseller client management.
          </p>
        </div>

        <PlanGate requiredPlan="white_label">
          <Tabs defaultValue="branding" className="space-y-4">
            <TabsList>
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="domain">Custom Domain</TabsTrigger>
              <TabsTrigger value="clients">Client Management</TabsTrigger>
            </TabsList>

            <TabsContent value="branding">
              <BrandingTab
                initial={
                  config
                    ? {
                        agencyName: config.agencyName,
                        platformName: config.platformName,
                        logoUrl: config.logoUrl,
                        faviconUrl: config.faviconUrl,
                        primaryColor: config.primaryColor,
                        secondaryColor: config.secondaryColor,
                        supportEmail: config.supportEmail,
                      }
                    : null
                }
                userId={user.id}
                onSaved={() => {}}
              />
            </TabsContent>

            <TabsContent value="domain">
              <CustomDomainTab
                userId={user.id}
                currentDomain={config?.customDomain}
                domainVerified={config?.domainVerified || verification?.verified}
                onSaved={() => {}}
              />
            </TabsContent>

            <TabsContent value="clients">
              <ClientManagementTab agencyUserId={user.id} />
            </TabsContent>
          </Tabs>
        </PlanGate>
      </div>
    </SideBar>
  );
}
