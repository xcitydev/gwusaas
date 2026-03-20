"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InviteClientModal } from "@/components/whitelabel/InviteClientModal";
import { toast } from "sonner";

type Props = {
  agencyUserId: string;
};

function statusClass(status: string) {
  if (status === "active") return "bg-emerald-500/20 text-emerald-300";
  if (status === "invited") return "bg-amber-500/20 text-amber-200";
  return "bg-red-500/20 text-red-300";
}

export function ClientManagementTab({ agencyUserId }: Props) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const updateClientStatus = useMutation(api.whitelabel.updateClientStatus);
  const clients = useQuery(api.whitelabel.getClients, { agencyUserId });

  const updateStatus = async (clientId: string, status: "active" | "suspended") => {
    try {
      await updateClientStatus({
        agencyUserId,
        clientId: clientId as Id<"whitelabelClients">,
        status,
      });
      toast.success("Client status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Client management</CardTitle>
          <Button onClick={() => setInviteOpen(true)}>Invite client</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {!clients || clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sub-clients yet.</p>
          ) : (
            clients.map((client) => (
              <div key={client._id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium">{client.clientName}</p>
                    <p className="text-sm text-muted-foreground">{client.clientEmail}</p>
                    <p className="text-xs text-muted-foreground">
                      {client.clientBusinessName || "No business name"} · {client.plan}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusClass(client.status)}>{client.status}</Badge>
                    {client.status === "suspended" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void updateStatus(String(client._id), "active")}
                      >
                        Reactivate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void updateStatus(String(client._id), "suspended")}
                      >
                        Suspend
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setInviteOpen(true)}
                    >
                      Resend invite
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <InviteClientModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSuccess={() => setInviteOpen(false)}
      />
    </>
  );
}
