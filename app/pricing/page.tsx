"use client";

import { useMemo, useState } from "react";
import { PricingTable, useAuth } from "@clerk/nextjs";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Gem,
  ShieldCheck,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PLAN_FEATURES, type Plan } from "@/lib/plans";
import { SERVICES } from "@/lib/services";
import { cn } from "@/lib/utils";

const serviceNamesById = Object.fromEntries(
  SERVICES.map((service) => [service.id, service.name]),
);

type DisplayPlan = {
  clerkKey: string;
  internalKey: Plan;
  label: string;
  tag: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  recommended?: boolean;
};

const DISPLAY_PLANS: DisplayPlan[] = [
  {
    clerkKey: "free_user",
    internalKey: "free",
    label: "Free",
    tag: "Explorer",
    description: "Architect the foundation of your content empire.",
    icon: Sparkles,
  },
  {
    clerkKey: "operative_starter",
    internalKey: "starter",
    label: "Starter",
    tag: "Operative",
    description: "Launch targeted lead acquisition protocols.",
    icon: Zap,
    recommended: true,
  },
  {
    clerkKey: "commander_growth",
    internalKey: "growth",
    label: "Growth",
    tag: "Commander",
    description: "Scale communication bandwidth across all nodes.",
    icon: Trophy,
  },
  {
    clerkKey: "director_elite",
    internalKey: "elite",
    label: "Elite",
    tag: "Director",
    description: "Advanced execution for high-clearance operations.",
    icon: ShieldCheck,
  },
  {
    clerkKey: "white_label",
    internalKey: "white_label",
    label: "White Label",
    tag: "Partner",
    description: "Full-spectrum agency white-label dominance.",
    icon: Gem,
  },
];

const FEATURES_VISIBLE_DEFAULT = 8;

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function PricingPage() {
  const { isLoaded, has } = useAuth();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>(
    {},
  );

  const currentClerkKey = useMemo<string | null>(() => {
    if (!has) return null;
    for (const plan of [...DISPLAY_PLANS].reverse()) {
      if (has({ plan: plan.clerkKey })) return plan.clerkKey;
    }
    return null;
  }, [has]);

  const openCheckout = () => setCheckoutOpen(true);

  if (!isLoaded) {
    return (
      <div className="mx-auto w-full max-w-7xl px-6 py-20 animate-pulse">
        <Skeleton className="h-12 w-64 mb-12 bg-white/5 rounded-2xl mx-auto" />
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-[600px] w-full rounded-[2.5rem] bg-white/5"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-12 sm:py-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 sm:mb-16 text-center space-y-4"
      >
        <div className="flex items-center justify-center gap-2 text-primary font-bold text-xs sm:text-sm uppercase tracking-widest mb-2">
          <ShieldCheck className="w-4 h-4" />
          <span>Clearance Levels</span>
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white/90">
          Elevate Your Protocols
        </h1>
        <p className="text-muted-foreground text-base sm:text-xl max-w-2xl mx-auto font-medium">
          Choose your operational bandwidth and unlock advanced AI co-pilots.
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-3"
      >
        {DISPLAY_PLANS.map((plan) => {
          const features = (PLAN_FEATURES[plan.internalKey] ?? [])
            .map((serviceId) => serviceNamesById[serviceId])
            .filter(Boolean);
          const isExpanded = expandedPlans[plan.clerkKey] ?? false;
          const visibleFeatures = isExpanded
            ? features
            : features.slice(0, FEATURES_VISIBLE_DEFAULT);
          const hasMore = features.length > FEATURES_VISIBLE_DEFAULT;
          const isCurrent = currentClerkKey === plan.clerkKey;
          const Icon = plan.icon;

          return (
            <motion.div variants={item} key={plan.clerkKey} className="h-full">
              <div
                className={cn(
                  "group relative flex flex-col h-full rounded-[2.5rem] border transition-all duration-500 p-1 bg-white/5 backdrop-blur-xl",
                  plan.recommended
                    ? "border-primary/50 amber-glow lg:scale-105 lg:z-10"
                    : "border-white/5 hover:border-white/10",
                )}
              >
                {plan.recommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                    Recommended
                  </div>
                )}

                <div className="p-6 sm:p-8 space-y-6 flex-1">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-primary uppercase tracking-widest">
                        {plan.tag}
                      </p>
                      <h3 className="text-2xl sm:text-3xl font-black text-white/90 tracking-tight">
                        {plan.label}
                      </h3>
                    </div>
                    <div
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center border border-white/10 shrink-0",
                        plan.recommended
                          ? "bg-primary/20 text-primary"
                          : "bg-white/5 text-muted-foreground",
                      )}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>

                  <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                    {plan.description}
                  </p>

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                      Protocol Capabilities
                    </p>
                    <div className="space-y-3">
                      {visibleFeatures.length > 0 ? (
                        <>
                          {visibleFeatures.map((feature) => (
                            <div
                              key={feature}
                              className="flex items-start gap-3 group/feat"
                            >
                              <div className="mt-1 w-4 h-4 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="w-2.5 h-2.5 text-primary" />
                              </div>
                              <span className="text-sm font-bold text-white/70 group-hover/feat:text-white transition-colors">
                                {feature}
                              </span>
                            </div>
                          ))}
                          {hasMore && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedPlans((prev) => ({
                                  ...prev,
                                  [plan.clerkKey]: !prev[plan.clerkKey],
                                }))
                              }
                              className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2 pt-2 hover:opacity-80 transition-opacity"
                            >
                              {isExpanded ? (
                                <>
                                  Contract Features{" "}
                                  <ChevronUp className="w-3 h-3" />
                                </>
                              ) : (
                                <>
                                  {features.length - visibleFeatures.length}{" "}
                                  More Modules{" "}
                                  <ChevronDown className="w-3 h-3" />
                                </>
                              )}
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="flex items-start gap-3">
                          <div className="mt-1 w-4 h-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5 text-muted-foreground" />
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">
                            Standardized Dashboard Interface
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <button
                    type="button"
                    onClick={openCheckout}
                    disabled={isCurrent}
                    className={cn(
                      "w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm transition-all duration-300",
                      isCurrent
                        ? "bg-white/10 text-white/40 cursor-default"
                        : plan.recommended
                          ? "amber-glow bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-white/10 text-white hover:bg-white/20",
                    )}
                  >
                    {isCurrent
                      ? "Active Deployment"
                      : `Assimilate ${plan.label}`}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <p className="mt-12 text-center text-xs text-muted-foreground">
        Subscriptions are processed securely by Clerk Billing. Cancel anytime.
      </p>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-card border-white/10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">
              Complete your subscription
            </DialogTitle>
            <DialogDescription>
              Pick a plan and finish checkout. Your access unlocks immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <PricingTable
              for="user"
              newSubscriptionRedirectUrl="/dashboard"
              appearance={{
                variables: {
                  colorPrimary: "#c79b09",
                  colorBackground: "transparent",
                  colorText: "rgba(255,255,255,0.9)",
                  colorTextSecondary: "rgba(255,255,255,0.55)",
                  colorInputBackground: "rgba(255,255,255,0.05)",
                  colorInputText: "white",
                  borderRadius: "1rem",
                },
                elements: {
                  rootBox: "w-full",
                  pricingTable: "gap-4",
                  pricingTableCard:
                    "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-none",
                  pricingTableCardActionButton:
                    "bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-widest text-xs h-11 rounded-xl w-full",
                  pricingTableCardActionButton__secondary:
                    "bg-white/10 text-white hover:bg-white/20 font-black uppercase tracking-widest text-xs h-11 rounded-xl w-full",
                  badge:
                    "bg-primary/15 text-primary border border-primary/30 text-[10px] font-black uppercase tracking-widest",
                },
              }}
              checkoutProps={{
                appearance: {
                  variables: {
                    colorPrimary: "#c79b09",
                    colorBackground: "#0a0a0a",
                    colorText: "white",
                    colorInputBackground: "rgba(255,255,255,0.05)",
                    colorInputText: "white",
                    borderRadius: "0.75rem",
                  },
                },
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
