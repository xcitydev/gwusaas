"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { CheckCircle2, ChevronDown, ChevronUp, Zap, Sparkles, Trophy, ShieldCheck, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PLAN_FEATURES, PLAN_LABELS, PLAN_ORDER, normalizePlan, type Plan } from "@/lib/plans";
import { SERVICES } from "@/lib/services";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const serviceNamesById = Object.fromEntries(SERVICES.map((service) => [service.id, service.name]));

const planMetadata: Record<Plan, { description: string; icon: any; recommended?: boolean; tag: string }> = {
  free: { 
    description: "Architect the foundation of your content empire.", 
    icon: Sparkles, 
    tag: "Explorer" 
  },
  starter: { 
    description: "Launch targeted lead acquisition protocols.", 
    icon: Zap, 
    tag: "Operative",
    recommended: true 
  },
  growth: { 
    description: "Scale communication bandwidth across all nodes.", 
    icon: Trophy, 
    tag: "Commander" 
  },
  elite: { 
    description: "Advanced execution for high-clearance operations.", 
    icon: ShieldCheck, 
    tag: "Director" 
  },
  white_label: { 
    description: "Full-spectrum agency white-label dominance.", 
    icon: Gem, 
    tag: "Partner" 
  },
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function PricingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);
  const [expandedPlans, setExpandedPlans] = useState<Record<Plan, boolean>>({
    free: true,
    starter: false,
    growth: false,
    elite: false,
    white_label: false,
  });
  const [error, setError] = useState<string | null>(null);
  const currentPlan = normalizePlan(user?.publicMetadata?.plan);

  const upgrade = async (plan: Plan) => {
    setLoadingPlan(plan);
    setError(null);
    try {
      const res = await fetch("/api/billing/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error("Clearance update failed");
      await user?.reload();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Protocol Error");
    } finally {
      setLoadingPlan(null);
    }
  };

  if (!isLoaded) {
    return (
      <div className="mx-auto w-full max-w-7xl px-6 py-20 animate-pulse">
        <Skeleton className="h-12 w-64 mb-12 bg-white/5 rounded-2xl" />
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-[600px] w-full rounded-[2.5rem] bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-20">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-16 text-center space-y-4"
      >
        <div className="flex items-center justify-center gap-2 text-primary font-bold text-sm uppercase tracking-widest mb-2">
          <ShieldCheck className="w-4 h-4" />
          <span>Clearance Levels</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white/90">
          Elevate Your Protocols
        </h1>
        <p className="text-muted-foreground text-xl max-w-2xl mx-auto font-medium">
          Choose your operational bandwidth and unlock advanced AI co-pilots.
        </p>
      </motion.div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold text-center"
        >
          {error}
        </motion.div>
      )}

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
      >
        {PLAN_ORDER.map((plan) => {
          const features = PLAN_FEATURES[plan]
            .map((serviceId) => serviceNamesById[serviceId])
            .filter(Boolean);
          const meta = planMetadata[plan];
          const isExpanded = expandedPlans[plan];
          const visibleFeatures = isExpanded ? features : features.slice(0, 8);
          const hasMore = features.length > 8;
          const isCurrent = currentPlan === plan;

          return (
            <motion.div variants={item} key={plan} className="h-full">
              <div className={cn(
                "group relative flex flex-col h-full rounded-[2.5rem] border transition-all duration-500 p-1 bg-white/5 backdrop-blur-xl",
                meta.recommended ? "border-primary/50 amber-glow scale-105 z-10" : "border-white/5 hover:border-white/10"
              )}>
                {meta.recommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                    Recommended
                  </div>
                )}
                
                <div className="p-8 space-y-6 flex-1">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-primary uppercase tracking-widest">{meta.tag}</p>
                      <h3 className="text-3xl font-black text-white/90 tracking-tight">{PLAN_LABELS[plan]}</h3>
                    </div>
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center border border-white/10",
                      meta.recommended ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground"
                    )}>
                      <meta.icon className="w-6 h-6" />
                    </div>
                  </div>

                  <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                    {meta.description}
                  </p>

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Protocol Capabilities</p>
                    <div className="space-y-3">
                      {visibleFeatures.length > 0 ? (
                        <>
                          {visibleFeatures.map((feature) => (
                            <div key={feature} className="flex items-start gap-3 group/feat">
                              <div className="mt-1 w-4 h-4 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="w-2.5 h-2.5 text-primary" />
                              </div>
                              <span className="text-sm font-bold text-white/70 group-hover/feat:text-white transition-colors">{feature}</span>
                            </div>
                          ))}
                          {hasMore && (
                            <button
                              onClick={() => setExpandedPlans(prev => ({ ...prev, [plan]: !prev[plan] }))}
                              className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2 pt-2 hover:opacity-80 transition-opacity"
                            >
                              {isExpanded ? (
                                <>Contract Features <ChevronUp className="w-3 h-3" /></>
                              ) : (
                                <>{features.length - visibleFeatures.length} More Modules <ChevronDown className="w-3 h-3" /></>
                              )}
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="flex items-start gap-3">
                          <div className="mt-1 w-4 h-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">Standardized Dashboard Interface</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <Button
                    onClick={() => upgrade(plan)}
                    disabled={Boolean(loadingPlan) || isCurrent}
                    className={cn(
                      "w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm transition-all duration-300",
                      isCurrent 
                        ? "bg-white/10 text-white/40 cursor-default" 
                        : meta.recommended ? "amber-glow text-primary-foreground" : "bg-white/10 text-white hover:bg-white/20"
                    )}
                  >
                    {isCurrent ? "Active Deployment" : loadingPlan === plan ? "Updating clearance..." : `Assimilate ${PLAN_LABELS[plan]}`}
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
