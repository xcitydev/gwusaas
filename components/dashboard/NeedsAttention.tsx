import { AlertCircle, CheckCircle2, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function NeedsAttention({ items }: { items: string[] }) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/70">Needs Attention</h3>
        </div>
        <Badge variant="outline" className="text-[10px] border-white/10 text-muted-foreground">{items.length} Alerts</Badge>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 transition-all">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-500/80">Everything looks solid right now.</p>
          </div>
        ) : (
          items.map((item, idx) => (
            <div key={idx} className="group flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-amber-500/20 hover:bg-white/10 transition-all cursor-pointer">
              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 amber-glow flex-shrink-0" />
              <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">
                {item}
              </p>
              <ChevronRight className="w-4 h-4 text-muted-foreground/30 ml-auto group-hover:text-amber-500 transition-colors" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
