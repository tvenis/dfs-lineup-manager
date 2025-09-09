"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
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

// Simple layout component - let Next.js handle routing
export default function App({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  console.log('🎯 App component rendering, pathname:', pathname);
  console.log('🎯 App children:', children);

  const navigationItems = [
    {
      id: "home",
      label: "Lineup Manager",
      icon: Home,
      href: "/",
    },
    {
      id: "players",
      label: "Player Pool",
      icon: Users,
      href: "/players",
    },
    {
      id: "builder",
      label: "Lineup Builder",
      icon: PlusCircle,
      href: "/builder",
    },
    {
      id: "scoreboard",
      label: "Scoreboard",
      icon: Trophy,
      href: "/scoreboard",
    },
    {
      id: "profile",
      label: "Player Profile",
      icon: User,
      href: "/profile",
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
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      href: "/settings",
    },
  ];

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2 px-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                DK
              </div>
              <div className="font-semibold">Lineup Manager</div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    
                    console.log(`🎯 Navigation item ${item.label}: href=${item.href}, isActive=${isActive}, pathname=${pathname}`);
                    
                    return (
                      <SidebarMenuItem key={item.id}>
                        <Link 
                          href={item.href} 
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] ${
                            isActive 
                              ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]" 
                              : "text-[var(--color-text-secondary)]"
                          }`}
                          onClick={() => console.log(`🎯 Clicked navigation item: ${item.label} -> ${item.href}`)}
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <User className="h-4 w-4" />
              </div>
              <div className="text-sm">User Profile</div>
            </div>
          </SidebarFooter>
        </Sidebar>
        
        <main className="flex-1 min-w-0" style={{
          backgroundColor: '#ffffff',
          minHeight: '100vh',
          position: 'relative',
          zIndex: 1,
          padding: '20px',
          width: '100%',
          maxWidth: 'none'
        }}>
          {children}
        </main>
        
        <SidebarTrigger className="fixed left-4 top-4 z-50" />
      </div>
    </SidebarProvider>
  );
}
