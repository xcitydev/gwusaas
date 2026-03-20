"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function InviteClientModal({ open, onOpenChange, onSuccess }: Props) {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientBusinessName, setClientBusinessName] = useState("");
  const [plan, setPlan] = useState<"starter" | "growth" | "elite">("starter");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whitelabel/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientEmail,
          clientBusinessName: clientBusinessName || undefined,
          plan,
        }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to invite client");
      }
      toast.success("Client invited");
      onOpenChange(false);
      onSuccess();
      setClientName("");
      setClientEmail("");
      setClientBusinessName("");
      setPlan("starter");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invite failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite client</DialogTitle>
          <DialogDescription>
            Send a branded invite link to your new sub-client.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Client name</Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Client email</Label>
            <Input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Business name (optional)</Label>
            <Input
              value={clientBusinessName}
              onChange={(e) => setClientBusinessName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Assign plan</Label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as "starter" | "growth" | "elite")}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="elite">Elite</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={!clientName || !clientEmail || loading}
          >
            {loading ? "Sending..." : "Send invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
