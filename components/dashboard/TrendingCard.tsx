"use client";

import { useState } from "react";
import { TrendingUp, Clock, Zap, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export type TrendingItem = {
  title: string;
  platform: string;
  format: string;
  hook: string;
  whyTrending: string;
  engagementTip: string;
  exampleAngle: string;
  difficulty: "easy" | "medium" | "hard";
  timeSensitive: boolean;
};

type Props = {
  item: TrendingItem;
  onExpand: (item: TrendingItem) => void;
};

const difficultyConfig = {
  easy: { label: "Quick Win", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  medium: { label: "Moderate", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  hard: { label: "Advanced", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
};

const formatEmojis: Record<string, string> = {
  reel: "🎬",
  carousel: "📸",
  story: "📱",
  short: "⚡",
  thread: "🧵",
  post: "📝",
  live: "🔴",
};

export function TrendingCard({ item, onExpand }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const diff = difficultyConfig[item.difficulty] || difficultyConfig.medium;

  const copyHook = async () => {
    await navigator.clipboard.writeText(item.hook);
    setCopied(true);
    toast.success("Hook copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      layout
      className="group rounded-2xl border border-white/5 bg-white/5 p-5 space-y-3 relative transition-all duration-300 hover:border-primary/20 hover:bg-white/[0.08]"
    >
      {/* Header badges */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 text-[10px] font-bold uppercase tracking-wider">
            {item.platform}
          </Badge>
          <Badge variant="outline" className="text-[10px] border-white/10 text-muted-foreground uppercase tracking-wider">
            {formatEmojis[item.format] || "📝"} {item.format}
          </Badge>
          <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider", diff.className)}>
            {diff.label}
          </Badge>
          {item.timeSensitive && (
            <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px] font-bold uppercase tracking-wider animate-pulse">
              <Clock className="w-2.5 h-2.5 mr-1" />
              Time Sensitive
            </Badge>
          )}
        </div>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
      </div>

      {/* Title */}
      <p className="font-bold text-sm text-white/90 leading-snug">{item.title}</p>

      {/* Hook */}
      <div className="relative p-3 rounded-xl bg-primary/5 border-l-2 border-primary/50">
        <span className="absolute -top-2 left-2 text-[10px] font-black text-primary px-1 bg-background rounded uppercase tracking-tighter">Hook</span>
        <p className="text-xs text-muted-foreground italic leading-relaxed pr-8">"{item.hook}"</p>
        <button
          onClick={copyHook}
          className="absolute top-2 right-2 w-6 h-6 rounded-md bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
        </button>
      </div>

      {/* Why trending (always visible) */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-white/[0.03]">
        <Zap className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">{item.whyTrending}</p>
      </div>

      {/* Expandable details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Your Angle</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.exampleAngle}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Engagement Tip</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.engagementTip}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="pt-1 flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setExpanded(!expanded)}
          className="h-8 text-[11px] font-bold rounded-lg border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
        >
          {expanded ? <ChevronUp className="mr-1.5 h-3.5 w-3.5" /> : <ChevronDown className="mr-1.5 h-3.5 w-3.5" />}
          {expanded ? "Less" : "Details"}
        </Button>
        <Button
          size="sm"
          onClick={() => onExpand(item)}
          className="h-8 text-[11px] font-bold rounded-lg amber-glow"
        >
          <Zap className="mr-1.5 h-3.5 w-3.5" />
          Draft It
        </Button>
      </div>
    </motion.div>
  );
}
