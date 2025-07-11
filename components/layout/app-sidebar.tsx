"use client"

import { Home, User, Bell, MessageCircle, Users, Calendar, Settings, Trophy } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar"

const menuItems = [
  {
    title: "Home",
    url: "/feed",
    icon: Home,
    iconClass: "nav-icon-home",
  },
  {
    title: "Profile",
    url: "/profile",
    icon: User,
    iconClass: "nav-icon-profile",
  },
  {
    title: "Most Liked",
    url: "/most-liked",
    icon: Trophy,
    iconClass: "nav-icon-trophy",
  },
  {
    title: "Notifications",
    url: "/notifications",
    icon: Bell,
    iconClass: "nav-icon-bell",
  },
  {
    title: "Messages",
    url: "/messages",
    icon: MessageCircle,
    iconClass: "nav-icon-message",
  },
  {
    title: "Study Groups",
    url: "/study-groups",
    icon: Users,
    iconClass: "nav-icon-users",
  },
  {
    title: "Events",
    url: "/events",
    icon: Calendar,
    iconClass: "nav-icon-calendar",
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    iconClass: "nav-icon-settings",
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar className="border-r bg-card/50 sidebar-spacing">
      <SidebarHeader className="p-6 border-b">
        <Link href="/feed" className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold gradient-text">GistHub</h1>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-4 py-6">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link
                      href={item.url}
                      className="flex items-center space-x-4 px-4 py-3 rounded-xl hover:bg-accent/50 transition-colors"
                    >
                      <item.icon className={`w-6 h-6 ${item.iconClass}`} />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
