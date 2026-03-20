"use client";

import SideBar from "@/components/SideBar";
import { PlanGate } from "@/components/PlanGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SERVICES } from "@/lib/services";
import { ServiceIcon } from "@/components/dashboard/service-icon";

export default function EmailHubPage() {
  const service = SERVICES.find((item) => item.id === "email-sms-flows");

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-7xl p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Email & SMS Hub</h1>
          <p className="text-muted-foreground">Automation workflows, templates, and integrations.</p>
        </div>

        <PlanGate requiredPlan="starter">
          {!service ? (
            <Card>
              <CardHeader>
                <CardTitle>Empty state</CardTitle>
                <CardDescription>No email services configured yet.</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ServiceIcon name={service.icon} />
                  {service.name}
                </CardTitle>
                <CardDescription>{service.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Build and deploy lifecycle messaging with platform-level integrations.
                </p>
              </CardContent>
            </Card>
          )}
        </PlanGate>
      </div>
    </SideBar>
  );
}
