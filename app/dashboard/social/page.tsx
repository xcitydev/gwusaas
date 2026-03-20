"use client";

import { useMemo, useState } from "react";
import SideBar from "@/components/SideBar";
import { PlanGate } from "@/components/PlanGate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { SERVICES } from "@/lib/services";

export default function SocialHubPage() {
  const platformServices = useMemo(
    () => SERVICES.filter((service) => service.category === "Social Growth"),
    [],
  );

  const [activePlatforms, setActivePlatforms] = useState<Record<string, boolean>>({});

  const togglePlatform = (id: string, checked: boolean) => {
    setActivePlatforms((prev) => ({ ...prev, [id]: checked }));
  };

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-7xl p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Social Growth Hub</h1>
          <p className="text-muted-foreground">
            Manage platform-by-platform growth activation and status.
          </p>
        </div>

        <PlanGate requiredPlan="starter">
          {platformServices.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No social platforms configured</CardTitle>
                <CardDescription>Social services will appear once configured.</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {platformServices.map((service) => (
                <Card key={service.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <CardDescription>{service.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {activePlatforms[service.id] ? "Active" : "Paused"}
                    </span>
                    <Switch
                      checked={Boolean(activePlatforms[service.id])}
                      onCheckedChange={(checked) => togglePlatform(service.id, checked)}
                      aria-label={`Toggle ${service.name}`}
                    />
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
