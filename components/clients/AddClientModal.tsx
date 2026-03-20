"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function AddClientModal({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: {
    clientName: string;
    clientEmail: string;
    instagramUsername: string;
    niche: string;
    notes?: string;
  }) => void;
}) {
  const [form, setForm] = useState({
    clientName: "",
    clientEmail: "",
    instagramUsername: "",
    niche: "",
    notes: "",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onChange={(e) => setForm((p) => ({ ...p, instagramUsername: e.target.value }))}
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
            <Label>Notes</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>
          <Button
            className="w-full"
            onClick={() =>
              onSave({
                clientName: form.clientName.trim(),
                clientEmail: form.clientEmail.trim(),
                instagramUsername: form.instagramUsername.trim(),
                niche: form.niche.trim(),
                notes: form.notes.trim() || undefined,
              })
            }
            disabled={
              !form.clientName.trim() ||
              !form.clientEmail.trim() ||
              !form.instagramUsername.trim() ||
              !form.niche.trim()
            }
          >
            Save client
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
