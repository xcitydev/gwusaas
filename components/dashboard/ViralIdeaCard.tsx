import { Bookmark, Sparkles, Send, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type ViralIdea = {
  idea: string;
  platform: "youtube" | "instagram" | "tiktok" | "substack" | "reddit" | "any";
  category: "client attraction" | "education" | "social proof" | "controversy" | "trend";
  hook: string;
  whyItWorks: string;
};

type Props = {
  item: ViralIdea;
  locked?: boolean;
  onSave: () => void;
  onAddToPipeline: () => void;
};

export function ViralIdeaCard({ item, locked, onSave, onAddToPipeline }: Props) {
  return (
    <div className={`group rounded-2xl border border-white/5 bg-white/5 p-5 space-y-4 relative transition-all duration-300 hover:border-primary/20 hover:bg-white/10 ${locked ? "opacity-55 blur-[1px]" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 text-[10px] font-bold uppercase tracking-wider">{item.platform}</Badge>
          <Badge variant="outline" className="text-[10px] border-white/10 text-muted-foreground uppercase tracking-wider">{item.category}</Badge>
        </div>
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Lightbulb className="w-4 h-4 text-primary" />
        </div>
      </div>
      
      <div className="space-y-2">
        <p className="font-bold text-sm text-white/90 leading-snug">{item.idea}</p>
        <div className="relative p-3 rounded-xl bg-primary/5 border-l-2 border-primary/50">
          <span className="absolute -top-2 left-2 text-[10px] font-black text-primary px-1 bg-background rounded uppercase tracking-tighter">Hook</span>
          <p className="text-xs text-muted-foreground italic leading-relaxed">"{item.hook}"</p>
        </div>
      </div>

      <div className="pt-2 flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onSave} disabled={Boolean(locked)} className="h-8 text-[11px] font-bold rounded-lg border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
          <Bookmark className="mr-1.5 h-3.5 w-3.5" />
          Save Idea
        </Button>
        <Button size="sm" onClick={onAddToPipeline} disabled={Boolean(locked)} className="h-8 text-[11px] font-bold rounded-lg amber-glow">
          <Send className="mr-1.5 h-3.5 w-3.5" />
          Pipeline
        </Button>
      </div>
    </div>
  );
}
