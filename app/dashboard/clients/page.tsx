"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import SideBar from "@/components/SideBar";
import { useClientContext } from "@/context/ClientContext";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users } from "lucide-react";
import { toast } from "sonner";

export default function ClientsPage() {
  const { user } = useUser();
  const { isAgency, orgClients, setSelectedClientId } = useClientContext();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    instagramUsername: "",
    niche: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const addClient = useMutation(api.clientWorkspace.addOrgClient);
  const removeClient = useMutation(api.clientWorkspace.removeOrgClient);

  const clientIds = useMemo(() => orgClients.map((c) => String(c._id)), [orgClients]);

  const onAddClient = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      const id = await addClient({
        clerkUserId: user.id,
        clientName: form.clientName.trim(),
        clientEmail: form.clientEmail.trim(),
        instagramUsername: form.instagramUsername.trim(),
        niche: form.niche.trim(),
        notes: form.notes.trim() || undefined,
      });
      setOpen(false);
      setForm({
        clientName: "",
        clientEmail: "",
        instagramUsername: "",
        niche: "",
        notes: "",
      });
      setSelectedClientId(String(id));
      toast.success("Client added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add client");
    } finally {
      setSubmitting(false);
    }
  };

  const onRemoveClient = async (clientId: string) => {
    if (!user?.id) return;
    try {
      await removeClient({
        clerkUserId: user.id,
        clientId: clientId as never,
      });
      toast.success("Client removed");
      const remaining = clientIds.filter((id) => id !== clientId);
      if (remaining.length > 0) setSelectedClientId(remaining[0]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove client");
    }
  };

  if (!isAgency) {
    return (
      <SideBar>
        <div className="mx-auto w-full max-w-4xl p-6 md:p-8">
          <Card>
            <CardHeader>
              <CardTitle>Client management is for agency accounts</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              You are on a direct client account, so this page is not needed.
            </CardContent>
          </Card>
        </div>
      </SideBar>
    );
  }

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-7xl space-y-6 p-6 md:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Your Clients</h1>
            <p className="text-muted-foreground">
              Manage all the clients in your organization.
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>Add client</Button>
        </div>

        {orgClients.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground" />
              <h3 className="mt-3 text-lg font-semibold">No clients added yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first client to start managing their outreach and results.
              </p>
              <Button className="mt-4" onClick={() => setOpen(true)}>
                Add your first client
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {orgClients.map((client) => (
              <Card key={client._id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span className="truncate">{client.clientName}</span>
                    <Badge variant="outline">{client.status}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>
                    <span className="text-muted-foreground">Instagram:</span>{" "}
                    @{client.instagramUsername}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Niche:</span> {client.niche}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setSelectedClientId(String(client._id))}
                    >
                      Switch to client
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void onRemoveClient(String(client._id))}
                    >
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add client</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Client name</Label>
                <Input
                  value={form.clientName}
                  onChange={(e) => setForm((p) => ({ ...p, clientName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Client email</Label>
                <Input
                  value={form.clientEmail}
                  onChange={(e) => setForm((p) => ({ ...p, clientEmail: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Instagram username</Label>
                <Input
                  value={form.instagramUsername}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, instagramUsername: e.target.value }))
                  }
                  placeholder="@username"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Niche</Label>
                <Input
                  value={form.niche}
                  onChange={(e) => setForm((p) => ({ ...p, niche: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>
              <Button
                className="w-full"
                disabled={
                  submitting ||
                  !form.clientName.trim() ||
                  !form.clientEmail.trim() ||
                  !form.instagramUsername.trim() ||
                  !form.niche.trim()
                }
                onClick={() => void onAddClient()}
              >
                {submitting ? "Saving..." : "Save client"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SideBar>
  );
}
