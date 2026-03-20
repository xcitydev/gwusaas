"use client";

import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClientContext } from "@/context/ClientContext";

function statusClass(status: string) {
  if (status === "active") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/40";
  if (status === "paused") return "bg-amber-500/10 text-amber-400 border-amber-500/40";
  return "bg-zinc-500/10 text-zinc-300 border-zinc-500/40";
}

export function ClientSwitcher() {
  const { isAgency, orgClients, selectedClient, setSelectedClientId, loading } =
    useClientContext();

  if (loading || !selectedClient) {
    return (
      <div className="mb-4 rounded-xl border border-border/80 p-3 text-sm text-muted-foreground">
        Loading account...
      </div>
    );
  }

  if (!isAgency) {
    return (
      <div className="mb-4 rounded-xl border border-border/80 bg-background/30 p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Account</p>
        <p className="mt-1 font-medium truncate">{selectedClient.clientName}</p>
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Client</p>
      <Select
        value={String((selectedClient as { _id: string })._id)}
        onValueChange={setSelectedClientId}
      >
        <SelectTrigger className="w-full rounded-xl border-border/80 bg-background/30">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {orgClients.map((client) => (
            <SelectItem key={client._id} value={String(client._id)}>
              <span className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5" />
                <span>{client.clientName}</span>
                <Badge variant="outline" className={statusClass(client.status)}>
                  {client.status}
                </Badge>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button asChild variant="outline" className="w-full rounded-xl border-border/80">
        <Link href="/dashboard/clients" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add new client
        </Link>
      </Button>
    </div>
  );
}
