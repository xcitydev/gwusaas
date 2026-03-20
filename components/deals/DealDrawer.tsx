"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function DealDrawer({
  open,
  onOpenChange,
  dealValue,
  notes,
  setDealValue,
  setNotes,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealValue: string;
  notes: string;
  setDealValue: (value: string) => void;
  setNotes: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Deal details</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          <Input
            placeholder="Deal value"
            value={dealValue}
            onChange={(e) => setDealValue(e.target.value)}
          />
          <Textarea rows={6} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button className="w-full" onClick={onSave}>
            Save changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
