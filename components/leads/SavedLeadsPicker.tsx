"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  Building2,
  Check,
  Database,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  Users,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type SavedLead = Doc<"prospectLeads">;

type RequiredField = "email" | "phone";

export type SavedLeadsPickerProps = {
  /** Button label that opens the picker. */
  triggerLabel?: string;
  /** Description shown above the list. */
  description?: string;
  /** Filter to leads that have at least one of these fields populated. */
  requireFields?: RequiredField[];
  /** "single" or "multi" select mode. Defaults to "multi". */
  mode?: "single" | "multi";
  /** Called with the selected lead(s) when the user confirms. */
  onConfirm: (leads: SavedLead[]) => void;
  /** Optional custom trigger node; replaces the default button if provided. */
  children?: React.ReactNode;
  /** Optional className passed to the default trigger button. */
  className?: string;
};

/**
 * Drop-in picker that lets a user pull from their saved prospect-leads
 * library. Use it inside any feature that needs lead inputs (voice caller
 * campaigns, email/SMS sequences, etc.).
 *
 *   <SavedLeadsPicker
 *     requireFields={["phone"]}
 *     onConfirm={(leads) => addPhoneTargets(leads)}
 *   />
 */
export function SavedLeadsPicker({
  triggerLabel = "Import from saved leads",
  description = "Pick leads from your prospect library to use in this campaign.",
  requireFields,
  mode = "multi",
  onConfirm,
  children,
  className,
}: SavedLeadsPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const all = useQuery(
    api.prospectLeads.list,
    open ? { limit: 200, search: search.trim() || undefined } : "skip",
  );

  const filtered = useMemo<SavedLead[] | undefined>(() => {
    if (!all) return all;
    if (!requireFields || requireFields.length === 0) return all;
    return all.filter((lead) =>
      requireFields.every((field) => Boolean(lead[field]?.trim())),
    );
  }, [all, requireFields]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (mode === "single") {
        next.clear();
        next.add(id);
        return next;
      }
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!filtered) return;
    if (mode === "single") return;
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((l) => l._id)));
    }
  };

  const handleConfirm = () => {
    if (!filtered) return;
    const chosen = filtered.filter((l) => selected.has(l._id));
    if (chosen.length === 0) return;
    onConfirm(chosen);
    setSelected(new Set());
    setOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setSelected(new Set());
      setSearch("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children ?? (
          <Button
            type="button"
            variant="outline"
            className={cn(
              "border-white/10 bg-white/5 hover:bg-white/10 font-bold uppercase tracking-widest text-xs gap-2",
              className,
            )}
          >
            <Database className="w-3.5 h-3.5" />
            {triggerLabel}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col glass-card border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Saved leads
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 flex-1 min-h-0 flex flex-col">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, company, role…"
              className="pl-9 bg-white/5 border-white/10 h-10"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <p className="text-muted-foreground">
              {filtered === undefined
                ? "Loading…"
                : `${filtered.length} lead${filtered.length === 1 ? "" : "s"} ` +
                  (selected.size > 0 ? `· ${selected.size} selected` : "")}
            </p>
            {mode === "multi" && filtered && filtered.length > 0 && (
              <button
                type="button"
                onClick={selectAll}
                className="text-primary font-bold uppercase tracking-widest hover:opacity-80"
              >
                {selected.size === filtered.length ? "Clear" : "Select all"}
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-white/5 bg-white/2">
            {filtered === undefined && (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading saved leads…
              </div>
            )}
            {filtered && filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground space-y-1">
                <p className="font-medium">No matching saved leads.</p>
                <p className="text-xs">
                  Run a search in{" "}
                  <span className="text-primary font-bold">Find Customers</span>{" "}
                  to populate your library.
                </p>
              </div>
            )}
            {filtered && filtered.length > 0 && (
              <ul className="divide-y divide-white/5">
                {filtered.map((lead) => {
                  const isSelected = selected.has(lead._id);
                  return (
                    <li key={lead._id}>
                      <button
                        type="button"
                        onClick={() => toggle(lead._id)}
                        className={cn(
                          "w-full text-left px-3 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors",
                          isSelected && "bg-primary/10 hover:bg-primary/15",
                        )}
                      >
                        <div
                          className={cn(
                            "mt-1 w-4 h-4 rounded border flex items-center justify-center shrink-0",
                            isSelected
                              ? "bg-primary border-primary"
                              : "border-white/20",
                          )}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 text-primary-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-white/90 text-sm">
                              {lead.name || "(no name)"}
                            </p>
                            {lead.jobTitle && (
                              <span className="text-[10px] text-muted-foreground">
                                · {lead.jobTitle}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                            {lead.company && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {lead.company}
                              </span>
                            )}
                            {lead.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {lead.email}
                              </span>
                            )}
                            {lead.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {lead.phone}
                              </span>
                            )}
                            {lead.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {lead.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={selected.size === 0}
            className="amber-glow font-bold uppercase tracking-widest text-xs"
          >
            Add {selected.size > 0 ? `${selected.size} ` : ""}
            {mode === "single" ? "lead" : "lead" + (selected.size === 1 ? "" : "s")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
