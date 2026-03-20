"use client";

import SideBar from "@/components/SideBar";
import { PlanGate } from "@/components/PlanGate";
import { ServiceIcon } from "@/components/dashboard/service-icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SERVICES } from "@/lib/services";

const communityServiceIds = new Set([
  "community-dfy-buildout",
  "dfy-podcast-launch",
  "dfy-white-label-agency",
  "targeted-data-scraping",
  "web-app-development",
  "consulting",
  "gwu-agency-full-course",
]);

export default function CommunityHubPage() {
  const services = SERVICES.filter((service) => communityServiceIds.has(service.id));

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-7xl p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Community & Other</h1>
          <p className="text-muted-foreground">
            Premium and specialist services with per-offer plan access.
          </p>
        </div>

        {services.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No services available</CardTitle>
              <CardDescription>Empty state: services are not configured yet.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {services.map((service) => (
              <PlanGate key={service.id} requiredPlan={service.requiredPlan}>
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
                      Required plan: {service.requiredPlan.replace("_", " ")}
                    </p>
                  </CardContent>
                </Card>
              </PlanGate>
            ))}
          </div>
        )}
      </div>
    </SideBar>
  );
}
