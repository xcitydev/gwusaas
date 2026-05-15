"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Upload,
  Image as ImageIcon,
  Film,
  Trash2,
  CalendarDays,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import SideBar from "@/components/SideBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Upload = {
  _id: Id<"contentPlanUploads">;
  filename: string;
  mimeType: string;
  size: number;
  note?: string;
  createdAt: number;
  url: string | null;
};

type PlanRow = {
  _id: Id<"contentPlans">;
  weekStartDate: string;
  brandName?: string;
  uploadIds: Id<"contentPlanUploads">[];
  status: string;
  createdAt: number;
};

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB per file

export default function ContentPlanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [brandName, setBrandName] = useState("");
  const [niche, setNiche] = useState("");
  const [brandVoice, setBrandVoice] = useState("");

  const uploads = useQuery(api.contentPlans.listMyUploads, {}) as Upload[] | undefined;
  const plans = useQuery(api.contentPlans.listMyPlans, { limit: 25 }) as PlanRow[] | undefined;

  const generateUploadUrl = useMutation(api.contentPlans.generateUploadUrl);
  const saveUpload = useMutation(api.contentPlans.saveUpload);
  const deleteUpload = useMutation(api.contentPlans.deleteUpload);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_BYTES) {
          toast.error(`${file.name} is too large (max 25MB)`);
          continue;
        }
        const url = await generateUploadUrl();
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
        await saveUpload({
          storageId,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
        });
      }
      toast.success("Upload complete");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: Id<"contentPlanUploads">) => {
    try {
      await deleteUpload({ uploadId: id });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success("Removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const generatePlan = async () => {
    if (selectedIds.size === 0) {
      toast.error("Select at least one piece of content first.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/content-plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadIds: Array.from(selectedIds),
          brandName: brandName.trim() || undefined,
          niche: niche.trim() || undefined,
          brandVoice: brandVoice.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || "Failed to build plan");
        return;
      }
      toast.success("Plan ready!");
      router.push(`/dashboard/content-pipeline/${json.planId}`);
    } catch (err) {
      console.error(err);
      toast.error("Network error");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SideBar>
      <div className="mx-auto w-full max-w-6xl p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest">
            <CalendarDays className="w-4 h-4" />
            <span>7-Day Content Plan</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white/90">
            Upload your content. We&apos;ll plan your week.
          </h1>
          <p className="text-muted-foreground font-medium max-w-2xl">
            Drop in photos and videos you already have. We&apos;ll map each one to a
            day, platform, hook, and caption — no AI-generated images, just smart
            scheduling around your real content.
          </p>
        </div>

        {/* Step 1: Brand context */}
        <Card className="glass-card border-white/5 overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/5">
            <CardTitle>Step 1 · Tell us about your brand</CardTitle>
            <CardDescription>Used to tune the caption tone. All optional.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8 grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Brand</Label>
              <Input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Grow With Us Agency"
                className="h-11 bg-white/5 border-white/5 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Niche</Label>
              <Input
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="Real estate lead gen"
                className="h-11 bg-white/5 border-white/5 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Voice</Label>
              <Input
                value={brandVoice}
                onChange={(e) => setBrandVoice(e.target.value)}
                placeholder="Friendly, direct, no fluff"
                className="h-11 bg-white/5 border-white/5 rounded-xl"
              />
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Upload */}
        <Card className="glass-card border-white/5 overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/5">
            <CardTitle>Step 2 · Upload your content</CardTitle>
            <CardDescription>Photos and videos. Up to 25MB each.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8 space-y-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "w-full rounded-2xl border-2 border-dashed border-white/10 bg-white/5 hover:border-primary/40 hover:bg-primary/5 transition py-12 flex flex-col items-center gap-3 cursor-pointer",
                uploading && "opacity-60 pointer-events-none"
              )}
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <p className="font-bold text-white/90">
                {uploading ? "Uploading..." : "Click to upload photos or videos"}
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, MP4, MOV — max 25MB each
              </p>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => void handleFiles(e.target.files)}
            />

            {uploads !== undefined && uploads.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-4">
                {uploads.map((u) => {
                  const isImage = u.mimeType.startsWith("image/");
                  const selected = selectedIds.has(u._id);
                  return (
                    <div
                      key={u._id}
                      className={cn(
                        "relative rounded-xl overflow-hidden border transition cursor-pointer group",
                        selected
                          ? "border-primary ring-2 ring-primary/40"
                          : "border-white/10 hover:border-primary/30"
                      )}
                      onClick={() => toggleSelected(u._id)}
                    >
                      <div className="aspect-square bg-white/5 flex items-center justify-center">
                        {isImage && u.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.url}
                            alt={u.filename}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Film className="w-10 h-10 text-muted-foreground" />
                        )}
                      </div>
                      <div className="p-2 text-[10px] truncate text-white/80 bg-black/40 absolute bottom-0 inset-x-0">
                        {u.filename}
                      </div>
                      {selected && (
                        <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-full p-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDelete(u._id);
                        }}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-red-500/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {uploads !== undefined && uploads.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-4">
                Nothing uploaded yet. Drop your first piece of content above.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Generate */}
        <Card className="glass-card border-primary/20 overflow-hidden bg-primary/3">
          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <p className="font-black text-lg text-white/90">
                  Step 3 · Build my plan
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedIds.size === 0
                  ? "Select the content you want included above."
                  : `${selectedIds.size} item${selectedIds.size === 1 ? "" : "s"} selected. We'll map each to a day, platform, and caption.`}
              </p>
            </div>
            <Button
              onClick={() => void generatePlan()}
              disabled={generating || selectedIds.size === 0}
              className="h-12 px-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest amber-glow"
            >
              {generating ? (
                "Building plan..."
              ) : (
                <span className="flex items-center gap-2">
                  Build my 7-day plan
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Past plans */}
        <Card className="glass-card border-white/5 overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/5">
            <CardTitle>Past plans</CardTitle>
            <CardDescription>Open any plan to view, copy, or schedule.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            {plans === undefined && (
              <p className="text-sm text-muted-foreground">Loading...</p>
            )}
            {plans !== undefined && plans.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No plans yet. Build your first above.
              </p>
            )}
            {plans !== undefined && plans.length > 0 && (
              <ul className="divide-y divide-white/5">
                {plans.map((p) => (
                  <li key={p._id} className="py-3">
                    <Link
                      href={`/dashboard/content-pipeline/${p._id}`}
                      className="flex items-center justify-between gap-4 group"
                    >
                      <div>
                        <p className="font-bold text-white/90 group-hover:text-primary transition">
                          {p.brandName || "Untitled brand"} — week of {p.weekStartDate}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.uploadIds.length} pieces · {new Date(p.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          className={cn(
                            "text-[9px] font-black uppercase tracking-widest border",
                            p.status === "ready"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          )}
                        >
                          {p.status}
                        </Badge>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </SideBar>
  );
}
