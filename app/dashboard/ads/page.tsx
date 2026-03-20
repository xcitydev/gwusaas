"use client";

import SideBar from "@/components/SideBar";
import { PlanGate } from "@/components/PlanGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SERVICES } from "@/lib/services";
import { ServiceIcon } from "@/components/dashboard/service-icon";

export default function AdvertisingHubPage() {
  const services = SERVICES.filter((service) => service.category === "Advertising");

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-7xl p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Advertising Hub</h1>
          <p className="text-muted-foreground">
            Manage outbound and paid acquisition services.
          </p>
        </div>

        <PlanGate requiredPlan="growth">
          {services.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No services found</CardTitle>
                <CardDescription>Advertising services will appear here.</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {services.map((service) => (
                <Card key={service.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ServiceIcon name={service.icon} />
                      {service.name}
                    </CardTitle>
                    <CardDescription>{service.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {service.aiEnabled ? (
                      <p className="text-sm text-muted-foreground">AI-enhanced delivery included.</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Manual + strategy execution service.</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </PlanGate>
      </div>
    </SideBar>
  );
}
