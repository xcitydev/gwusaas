"use client"

import * as React from "react"
import { Home, BarChart3, Users, Settings, FileText, Video, Globe, CheckCircle, Tag, Gift, HelpCircle, TrendingUp, MessageSquare } from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar"

const menuItems = [
  {
    title: "Client Portal",
    url: "/",
    icon: Home,
  },
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: BarChart3,
  },
  {
    title: "Outreach Results",
    url: "/outreach-results",
    icon: MessageSquare,
  },
  {
    title: "Active Services",
    url: "/active-services",
    icon: CheckCircle,
  },
  {
    title: "Growth Analytics",
    url: "/growth-analytics",
    icon: TrendingUp,
  },
  {
    title: "Service Requests",
    url: "/service-requests",
    icon: FileText,
  },
  {
    title: "Content & Drafts",
    url: "/content-drafts",
    icon: FileText,
  },
  {
    title: "Video Projects",
    url: "/video-projects",
    icon: Video,
  },
  {
    title: "Website Projects",
    url: "/website-projects",
    icon: Globe,
  },
  {
    title: "Approvals",
    url: "/approvals",
    icon: CheckCircle,
  },
  {
    title: "Referral Program",
    url: "/referral-program",
    icon: Gift,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart3,
  },
  {
    title: "Support",
    url: "/support",
    icon: HelpCircle,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <h2 className="text-lg font-semibold">Client Dashboard</h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="bg-black text-white px-3 py-2 rounded-md text-sm">
          read.ai meeting notes
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
