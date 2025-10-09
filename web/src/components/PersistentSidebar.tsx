"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Home,
  Users,
  PlusCircle,
  Trophy,
  Upload,
  Download,
  Settings,
  User,
} from "lucide-react";

const navigationItems = [
  {
    id: "lineups",
    label: "Weekly Lineup Manager",
    icon: Home,
    href: "/lineups",
  },
  {
    id: "builder",
    label: "Lineup Builder",
    icon: PlusCircle,
    href: "/builder",
  },
  {
    id: "players",
    label: "Player Pool",
    icon: Users,
    href: "/players",
  },
  {
    id: "profile",
    label: "Player Profile",
    icon: User,
    href: "/profile",
  },
  {
    id: "scoreboard",
    label: "Scoreboard",
    icon: Trophy,
    href: "/scoreboard",
  },
  {
    id: "import",
    label: "Import",
    icon: Upload,
    href: "/import",
  },
  {
    id: "export",
    label: "Export",
    icon: Download,
    href: "/export",
  },
];

export function PersistentSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">DK</span>
          </div>
          <span className="text-lg font-semibold text-[var(--color-text-primary)]">Lineup Manager</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <Link href={item.href} className="block">
                    <SidebarMenuButton
                      isActive={pathname === item.href}
                      className="w-full"
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/settings" className="block">
              <SidebarMenuButton className="w-full">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
