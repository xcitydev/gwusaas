"use client";

import * as React from "react";
import {
  Home,
  BarChart3,
  Users,
  Settings,
  FileText,
  Video,
  Globe,
  CheckCircle,
  Tag,
  Gift,
  HelpCircle,
  TrendingUp,
  MessageSquare,
  LogOut,
  Bot,
  Brain,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: BarChart3,
  },
  {
    label: "Outreach Results",
    href: "/dashboard/outreach-results",
    icon: MessageSquare,
  },
  {
    label: "Growth Analytics",
    href: "/dashboard/growth-analytics",
    icon: TrendingUp,
  },
  {
    label: "Active Services",
    href: "/dashboard/active-services",
    icon: CheckCircle,
  },
  {
    label: "AI Studio",
    href: "/dashboard/ai",
    icon: Brain,
  },
  {
    label: "Content & Drafts",
    href: "/dashboard/content-drafts",
    icon: FileText,
  },
  {
    label: "Video Projects",
    href: "/dashboard/video-projects",
    icon: Video,
  },
  {
    label: "Website Projects",
    href: "/dashboard/website-projects",
    icon: Globe,
  },
  {
    label: "Approvals",
    href: "/dashboard/approvals",
    icon: CheckCircle,
  },
  {
    label: "Referral Program",
    href: "/dashboard/referral-program",
    icon: Gift,
  },
  {
    label: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
  },
  {
    label: "Support",
    href: "/dashboard/support",
    icon: HelpCircle,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <motion.nav
      className="bg-card/80 backdrop-blur-sm border-r border-border h-full w-64 p-6 flex flex-col "
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Logo */}
      <motion.div
        className="flex items-center space-x-2 mb-8"
        whileHover={{ scale: 1.05 }}
      >
        <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">G</span>
        </div>
        <span className="text-foreground font-bold text-xl">GWU AGENCY</span>
      </motion.div>

      {/* Navigation Items */}
      <div className="flex-1 space-y-4">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <Link href={item.href}>
                <motion.div
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                  whileHover={{ x: 4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-sm text-sm">{item.label}</span>
                </motion.div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Logout Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href="/">
            <LogOut className="w-5 h-5 mr-3" />
            Back to Home
          </Link>
        </Button>
      </motion.div>
    </motion.nav>
  );
}
