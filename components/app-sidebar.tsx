"use client";

import * as React from "react";
import {
  BarChart3,
  Bot,
  Building2,
  CalendarDays,
  ChartNoAxesColumn,
  Clapperboard,
  ClipboardList,
  Contact,
  Files,
  Handshake,
  LifeBuoy,
  Lightbulb,
  Lock,
  LogOut,
  Megaphone,
  MessageSquare,
  Mic,
  PhoneCall,
  Search,
  Settings,
  Sparkles,
  Users,
  UserRoundCog,
  WalletCards,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@clerk/nextjs";
import { hasAccess, normalizePlan, PLAN_LABELS, type Plan } from "@/lib/plans";
import { useWhitelabel } from "@/context/WhitelabelContext";
import { useClientContext } from "@/context/ClientContext";
import { ClientSwitcher } from "@/components/layout/ClientSwitcher";
import { ThemeToggle } from "./theme-toggle";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredPlan: Plan;
  soon?: boolean;
};

type AppSidebarProps = {
  className?: string;
  onNavigate?: () => void;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const agencyNav: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: BarChart3, requiredPlan: "free" },
      { label: "My Clients", href: "/dashboard/clients", icon: Users, requiredPlan: "growth" },
      { label: "Outreach & DMs", href: "/dashboard/outreach", icon: MessageSquare, requiredPlan: "growth" },
      { label: "Deal Pipeline", href: "/dashboard/deals", icon: WalletCards, requiredPlan: "growth" },
      { label: "Follower Scraper", href: "/dashboard/scraper", icon: Search, requiredPlan: "growth" },
    ],
  },
  {
    title: "AI Tools",
    items: [
      { label: "AI Services", href: "/dashboard/ai-services", icon: Bot, requiredPlan: "growth" },
      { label: "AI Studio", href: "/dashboard/ai-studio", icon: Bot, requiredPlan: "free", soon: true },
      { label: "Media Studio", href: "/dashboard/media-studio", icon: Clapperboard, requiredPlan: "growth" },
      { label: "Content Pipeline (7 Days)", href: "/dashboard/content-pipeline", icon: CalendarDays, requiredPlan: "growth" },
      { label: "SEO Hub", href: "/dashboard/seo", icon: Sparkles, requiredPlan: "starter" },
      { label: "Lead Gen", href: "/dashboard/lead-gen", icon: Search, requiredPlan: "growth" },
      { label: "Transcriber", href: "/dashboard/transcriber", icon: Mic, requiredPlan: "starter" },
      { label: "AI Voice Qualifier", href: "/dashboard/voice-caller", icon: PhoneCall, requiredPlan: "growth" },
      { label: "AI Scripts", href: "/dashboard/outreach/script-generator", icon: UserRoundCog, requiredPlan: "starter" },
      { label: "Viral Ideas", href: "/dashboard/viral-ideas", icon: Lightbulb, requiredPlan: "free" },
    ],
  },
  {
    title: "Services",
    items: [
      { label: "Social Growth", href: "/dashboard/social", icon: Users, requiredPlan: "starter" },
      { label: "Advertising", href: "/dashboard/ads", icon: Megaphone, requiredPlan: "growth" },
      { label: "Content & Drafts", href: "/dashboard/content", icon: Files, requiredPlan: "starter" },
      { label: "Email & SMS", href: "/dashboard/email", icon: MessageSquare, requiredPlan: "starter" },
      { label: "CRM", href: "/dashboard/crm", icon: Contact, requiredPlan: "growth" },
      { label: "Community", href: "/dashboard/community", icon: Building2, requiredPlan: "starter" },
      { label: "Website Projects", href: "/dashboard/website-projects", icon: ClipboardList, requiredPlan: "starter" },
      { label: "Growth Analytics", href: "/dashboard/viral-ideas", icon: ChartNoAxesColumn, requiredPlan: "starter" },
      { label: "Approvals", href: "/dashboard/approvals", icon: ClipboardList, requiredPlan: "free" },
      { label: "Referral Program", href: "/dashboard/referral-program", icon: Handshake, requiredPlan: "free" },
      { label: "Support", href: "/dashboard/support", icon: LifeBuoy, requiredPlan: "free" },
      { label: "Settings", href: "/dashboard/settings", icon: Settings, requiredPlan: "free" },
    ],
  },
];

const directClientNav: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: BarChart3, requiredPlan: "free" },
      { label: "My Outreach", href: "/dashboard/outreach", icon: MessageSquare, requiredPlan: "starter" },
      { label: "My Deals", href: "/dashboard/deals", icon: WalletCards, requiredPlan: "starter" },
    ],
  },
  {
    title: "AI Tools",
    items: [
      { label: "AI Services", href: "/dashboard/ai-services", icon: Bot, requiredPlan: "growth" },
      { label: "AI Studio", href: "/dashboard/ai-studio", icon: Bot, requiredPlan: "free", soon: true },
      { label: "Media Studio", href: "/dashboard/media-studio", icon: Clapperboard, requiredPlan: "growth" },
      { label: "Content Pipeline (7 Days)", href: "/dashboard/content-pipeline", icon: CalendarDays, requiredPlan: "growth" },
      { label: "SEO Hub", href: "/dashboard/seo", icon: Sparkles, requiredPlan: "starter" },
      { label: "Lead Gen", href: "/dashboard/lead-gen", icon: Search, requiredPlan: "growth" },
      { label: "Transcriber", href: "/dashboard/transcriber", icon: Mic, requiredPlan: "starter" },
      { label: "AI Voice Qualifier", href: "/dashboard/voice-caller", icon: PhoneCall, requiredPlan: "growth" },
      { label: "AI Scripts", href: "/dashboard/outreach/script-generator", icon: UserRoundCog, requiredPlan: "starter" },
      { label: "Viral Ideas", href: "/dashboard/viral-ideas", icon: Lightbulb, requiredPlan: "free" },
    ],
  },
  {
    title: "Services",
    items: [
      { label: "Content & Drafts", href: "/dashboard/content", icon: Files, requiredPlan: "starter" },
      { label: "Email & SMS", href: "/dashboard/email", icon: MessageSquare, requiredPlan: "starter" },
      { label: "Approvals", href: "/dashboard/approvals", icon: ClipboardList, requiredPlan: "free" },
      { label: "Referral Program", href: "/dashboard/referral-program", icon: Handshake, requiredPlan: "free" },
      { label: "Support", href: "/dashboard/support", icon: LifeBuoy, requiredPlan: "free" },
      { label: "Settings", href: "/dashboard/settings", icon: Settings, requiredPlan: "free" },
    ],
  },
];

function isRouteActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({ className, onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const { platformName, logoUrl } = useWhitelabel();
  const { isAgency, loading } = useClientContext();
  const userPlan = normalizePlan(user?.publicMetadata?.plan);
  const navItems = isAgency ? agencyNav : directClientNav;

  return (
    <nav
      className={cn(
        "bg-card/80 backdrop-blur-sm border-r border-border h-screen sticky top-0 w-72 p-5 flex flex-col shrink-0",
        className,
      )}
    >
      <div className="flex items-center space-x-3 mb-8 px-1">
        {logoUrl ? (
          <img src={logoUrl} alt={platformName} className="h-9 w-9 rounded-xl object-cover shadow-lg border border-white/5" />
        ) : (
          <div className="w-9 h-9 bg-gradient-to-br from-primary to-orange-500 rounded-xl flex items-center justify-center amber-glow shadow-lg border border-white/10">
            <span className="text-primary-foreground font-black text-lg">{platformName?.charAt(0) || "G"}</span>
          </div>
        )}
        <span className="text-foreground font-bold text-xl tracking-tight text-gradient">{platformName}</span>
      </div>

      <div className="mb-6 rounded-2xl border border-white/5 bg-white/5 p-4 shadow-sm backdrop-blur-md">
        <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Active Workspace</p>
        <p className="text-sm font-bold truncate text-foreground pr-2">
          {user?.fullName || user?.primaryEmailAddress?.emailAddress || "Workspace User"}
        </p>
        <Link href="/pricing">
          <Badge className="mt-2 bg-primary/20 text-primary border-primary/20 hover:bg-primary/25 font-bold text-[10px] uppercase cursor-pointer transition-colors">
            {PLAN_LABELS[userPlan]} — Upgrade
          </Badge>
        </Link>
      </div>

      {!loading ? <ClientSwitcher /> : null}

      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {navItems.map((section) => (
          <div key={section.title} className="space-y-1.5">
            <p className="px-3 text-xs uppercase tracking-wide text-muted-foreground/80">
              {section.title}
            </p>
            {section.items.map((item) => {
              const Icon = item.icon;
              const locked = !hasAccess(userPlan, item.requiredPlan);
              const targetHref = locked ? "/pricing" : item.href;
              const isActive = isRouteActive(pathname, item.href);

              return (
                <Link key={`${section.title}-${item.href}-${item.label}`} href={targetHref} onClick={onNavigate}>
                  <div
                    className={cn(
                      "flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border transition-all duration-300",
                      isActive
                        ? "border-primary/20 bg-primary/10 text-primary shadow-sm glass-card font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5 hover:border-white/5",
                      locked && !isActive ? "opacity-50 grayscale-[0.5]" : "",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{item.label}</span>
                    </span>
                    {item.soon ? (
                      <Badge className="h-5 bg-indigo-500/10 px-1.5 text-[10px] text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/15">
                        SOON
                      </Badge>
                    ) : null}
                    {locked ? <Lock className="w-4 h-4 opacity-80" /> : null}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-border/80 space-y-2">
        <div className="flex items-center justify-between px-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground">Appearance</span>
          <ThemeToggle />
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground h-10"
          asChild
        >
          <Link href="/pricing" onClick={onNavigate}>
            <CreditCard className="w-5 h-5 mr-3" />
            Pricing & Plans
          </Link>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground h-10"
          asChild
        >
          <Link href="/" onClick={onNavigate}>
            <LogOut className="w-5 h-5 mr-3" />
            Back to Home
          </Link>
        </Button>
      </div>
    </nav>
  );
}
