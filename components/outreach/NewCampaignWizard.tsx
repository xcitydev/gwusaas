"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NewCampaignWizard({
  onLaunch,
}: {
  onLaunch: (payload: {
    campaignName: string;
    messageType: "account_outreach" | "mass_dm" | "follow_up";
    script: string;
    targets: string[];
  }) => void;
}) {
  const [campaignName, setCampaignName] = useState("");
  const [messageType, setMessageType] = useState<"account_outreach" | "mass_dm" | "follow_up">(
    "account_outreach",
  );
  const [script, setScript] = useState("");
  const [targets, setTargets] = useState("");

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Campaign name</Label>
        <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Message type</Label>
        <div className="grid gap-2 md:grid-cols-3">
          {[
            ["account_outreach", "Account Outreach"],
            ["mass_dm", "Mass DM"],
            ["follow_up", "Follow-up"],
          ].map(([value, label]) => (
            <Button
              key={value}
              variant={messageType === value ? "default" : "outline"}
              onClick={() =>
                setMessageType(value as "account_outreach" | "mass_dm" | "follow_up")
              }
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>DM script</Label>
        <Textarea rows={4} value={script} onChange={(e) => setScript(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Targets (one username per line)</Label>
        <Textarea rows={5} value={targets} onChange={(e) => setTargets(e.target.value)} />
      </div>
      <Button
        className="w-full"
        disabled={!campaignName.trim() || !script.trim() || !targets.trim()}
        onClick={() =>
          onLaunch({
            campaignName: campaignName.trim(),
            messageType,
            script: script.trim(),
            targets: targets
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
          })
        }
      >
        Launch campaign
      </Button>
    </div>
  );
}
