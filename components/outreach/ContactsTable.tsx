"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DmStatusBadge } from "./DmStatusBadge";
import { QualificationBadge } from "./QualificationBadge";

export function ContactsTable({
  contacts,
  onUpdateStatus,
  onMoveToDeals,
}: {
  contacts: Array<{
    _id: string;
    instagramUsername: string;
    qualificationStatus: string;
    dmStatus: string;
    notes?: string;
  }>;
  onUpdateStatus: (contactId: string, status: string, note?: string) => void;
  onMoveToDeals: (contactId: string) => void;
}) {
  return (
    <div className="space-y-2">
      {contacts.map((contact) => (
        <div key={contact._id} className="rounded-lg border border-border/80 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">@{contact.instagramUsername}</p>
            <div className="flex items-center gap-2">
              <QualificationBadge status={contact.qualificationStatus} />
              <DmStatusBadge status={contact.dmStatus} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {["pending", "sent", "replied", "booked", "closed"].map((status) => (
              <Button
                key={status}
                size="sm"
                variant="outline"
                onClick={() => onUpdateStatus(contact._id, status)}
              >
                {status.replace(/_/g, " ")}
              </Button>
            ))}
            <Button size="sm" onClick={() => onMoveToDeals(contact._id)}>
              Move to deals
            </Button>
          </div>
          <Input
            className="mt-2"
            placeholder="Add note"
            defaultValue={contact.notes || ""}
            onBlur={(e) => onUpdateStatus(contact._id, contact.dmStatus, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}
