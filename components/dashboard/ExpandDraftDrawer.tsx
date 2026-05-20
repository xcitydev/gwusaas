"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Copy, Check, FileText, Hash, Eye, Clock, Film, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type ExpandedDraft = {
  caption: string;
  hashtags: string[];
  callToAction: string;
  visualDirection: string;
  bestTimeToPost: string;
  estimatedReach: string;
  scriptOutline?: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  ideaTitle: string;
  platform: string;
  niche: string;
  brandName: string;
};

export function ExpandDraftDrawer({
  open,
  onClose,
  ideaTitle,
  platform,
  niche,
  brandName,
}: Props) {
  const [draft, setDraft] = useState<ExpandedDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const generateDraft = async () => {
    setLoading(true);
    setDraft(null);
    try {
      const res = await fetch("/api/viral-ideas/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: ideaTitle, platform, niche, brandName }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { draft?: ExpandedDraft; error?: string }
        | null;
      if (!res.ok) throw new Error(payload?.error || "Failed to generate draft");
      if (payload?.draft) setDraft(payload.draft);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate draft");
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate on open
  useEffect(() => {
    if (open && !draft && !loading) {
      void generateDraft();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const copyAll = async () => {
    if (!draft) return;
    const full = [
      draft.caption,
      "",
      draft.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" "),
    ].join("\n");
    await copyToClipboard(full, "all");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg z-50 bg-background border-l border-white/10 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur-xl border-b border-white/5 p-6 z-10">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                      AI Draft Generator
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white/90 truncate">
                    {ideaTitle}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {loading && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <p className="text-xs font-bold text-primary uppercase tracking-widest animate-pulse">
                      Crafting your draft...
                    </p>
                  </div>
                  <Skeleton className="h-40 w-full rounded-2xl bg-white/5" />
                  <Skeleton className="h-20 w-full rounded-2xl bg-white/5" />
                  <Skeleton className="h-16 w-full rounded-2xl bg-white/5" />
                </div>
              )}

              {draft && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-5"
                >
                  {/* Copy All */}
                  <Button
                    onClick={copyAll}
                    className="w-full h-11 amber-glow font-bold text-xs uppercase tracking-wider"
                  >
                    {copiedField === "all" ? (
                      <><Check className="mr-2 h-4 w-4" /> Copied!</>
                    ) : (
                      <><Copy className="mr-2 h-4 w-4" /> Copy Caption + Hashtags</>
                    )}
                  </Button>

                  {/* Caption */}
                  <DraftSection
                    icon={FileText}
                    label="Caption"
                    content={draft.caption}
                    onCopy={() => copyToClipboard(draft.caption, "caption")}
                    copied={copiedField === "caption"}
                    multiline
                  />

                  {/* Hashtags */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Hash className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Hashtags ({draft.hashtags.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      {draft.hashtags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-primary/10 text-primary border border-primary/20"
                        >
                          #{tag.replace(/^#/, "")}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <DraftSection
                    icon={Sparkles}
                    label="Call to Action"
                    content={draft.callToAction}
                    onCopy={() => copyToClipboard(draft.callToAction, "cta")}
                    copied={copiedField === "cta"}
                  />

                  {/* Visual Direction */}
                  <DraftSection
                    icon={Eye}
                    label="Visual Direction"
                    content={draft.visualDirection}
                  />

                  {/* Best Time */}
                  <DraftSection
                    icon={Clock}
                    label="Best Time to Post"
                    content={draft.bestTimeToPost}
                  />

                  {/* Estimated Reach */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border border-primary/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">
                      Estimated Reach
                    </p>
                    <p className="text-sm font-bold text-white/80">
                      {draft.estimatedReach}
                    </p>
                  </div>

                  {/* Script Outline */}
                  {draft.scriptOutline && draft.scriptOutline.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Film className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Video Script Outline
                        </span>
                      </div>
                      <div className="space-y-2">
                        {draft.scriptOutline.map((step, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5"
                          >
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-[10px] font-black text-primary">
                              {i + 1}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {step}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Regenerate */}
                  <Button
                    variant="outline"
                    onClick={generateDraft}
                    className="w-full h-10 font-bold text-xs border-white/10 hover:bg-white/5"
                  >
                    <Sparkles className="mr-2 h-3.5 w-3.5" />
                    Regenerate Draft
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DraftSection({
  icon: Icon,
  label,
  content,
  onCopy,
  copied,
  multiline,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  content: string;
  onCopy?: () => void;
  copied?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {label}
          </span>
        </div>
        {onCopy && (
          <button
            onClick={onCopy}
            className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
      <div className={cn("p-3 rounded-xl bg-white/[0.03] border border-white/5")}>
        <p
          className={cn(
            "text-xs text-muted-foreground leading-relaxed",
            multiline && "whitespace-pre-line",
          )}
        >
          {content}
        </p>
      </div>
    </div>
  );
}
