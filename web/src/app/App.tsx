"use client";

import { useState } from "react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Home,
  Users,
  PlusCircle,
  Trophy,
  Upload,
  Settings,
  User,
  ChevronDown,
  ChevronRight,
  Gamepad2,
  Shield,
  Calendar,
  Lightbulb,
  FileText,
  Database,
  Globe,
  BarChart3,
  Target,
} from "lucide-react";
import { Toaster } from "sonner";

// Simple layout component - let Next.js handle routing
export default function App({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  
  console.log('🎯 App component rendering, pathname:', pathname);
  console.log('🎯 App children:', children);

  const navigationItems = [
    {
      id: "scoreboard",
      label: "Scoreboard",
      icon: Trophy,
      href: "/scoreboard",
    },
    {
      id: "home",
      label: "Lineup Manager",
      icon: Home,
      href: "/",
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
      id: "leaderboard",
      label: "Leaderboard",
      icon: BarChart3,
      href: "/leaderboard",
    },
    {
      id: "import",
      label: "Import",
      icon: Upload,
      href: "/import",
    },
  ];

  const leaderboardSubItems = [
    {
      id: "player-actuals",
      label: "Player Actuals",
      description: "Player actual performance data and statistics",
      icon: Target,
      href: "/leaderboard/player-actuals",
    },
    {
      id: "player-props",
      label: "Player Props",
      description: "Player prop betting results and analytics",
      icon: Trophy,
      href: "/leaderboard/player-props",
    },
    {
      id: "team-defense",
      label: "Team Defense",
      description: "Team defense statistics and scoring",
      icon: Shield,
      href: "/team-stats",
    },
    // Future leaderboard items can be added here
    // {
    //   id: "player-performance",
    //   label: "Player Performance",
    //   description: "Player prop bet performance metrics",
    //   icon: BarChart3,
    //   href: "/leaderboard/player-performance",
    // },
  ];

  const settingsSubItems = [
    {
      id: "draftkings",
      label: "DraftKings",
      description: "Game styles and configurations",
      icon: Gamepad2,
      href: "/settings?section=draftkings",
    },
    {
      id: "players-settings",
      label: "Players",
      description: "Manage player database",
      icon: Users,
      href: "/settings?section=players",
    },
    {
      id: "teams",
      label: "Teams",
      description: "NFL teams and divisions",
      icon: Shield,
      href: "/settings?section=teams",
    },
    {
      id: "weeks",
      label: "Weeks",
      description: "Schedule and week data",
      icon: Calendar,
      href: "/settings?section=weeks",
    },
    {
      id: "tips",
      label: "Player Pool Tips",
      description: "Customize strategy guidance",
      icon: Lightbulb,
      href: "/settings?section=tips",
    },
  ];

  const importSubItems = [
    {
      id: "games",
      label: "Games",
      description: "Import game results from NFLVerse",
      icon: Trophy,
      href: "/import/games",
    },
    {
      id: "player-pool",
      label: "Player Pool",
      description: "Import player pool data from DraftKings API",
      icon: Database,
      href: "/import/player-pool",
    },
    {
      id: "player-projections",
      label: "Player Projections",
      description: "Import weekly player projections",
      icon: FileText,
      href: "/import?section=projections",
    },
    {
      id: "ownership-projections",
      label: "Ownership Projections",
      description: "Import ownership percentage data",
      icon: FileText,
      href: "/import?section=ownership",
    },
    {
      id: "odds",
      label: "Odds",
      description: "Import odds data from Odds-API",
      icon: Globe,
      href: "/import/odds",
    },
    {
      id: "contests",
      label: "Contests",
      description: "Import contest results and opponent rosters",
      icon: Trophy,
      href: "/import/contests",
    },
    {
      id: "player-actuals",
      label: "Player Actuals",
      description: "Import actual player stats from NFLVerse",
      icon: Database,
      href: "/import/player-actuals",
    },
    {
      id: "team-stats",
      label: "Team Stats",
      description: "Import team statistics from NFLVerse",
      icon: Shield,
      href: "/import/team-stats",
    },
    {
      id: "historical-data",
      label: "Historical Data",
      description: "Bulk processing and historical data management",
      icon: Database,
      href: "/historical-data",
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
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => {
                    // Skip import, settings, and leaderboard as they have special handling
                    if (item.id === 'import' || item.id === 'settings' || item.id === 'leaderboard') {
                      return null;
                    }
                    
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
                  
                  {/* Leaderboard with submenu */}
                  <SidebarMenuItem>
                    <button
                      onClick={() => setIsLeaderboardOpen(!isLeaderboardOpen)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] ${
                        pathname?.startsWith('/team-stats') || pathname?.startsWith('/leaderboard')
                          ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]" 
                          : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      <BarChart3 className="h-4 w-4" />
                      Leaderboard
                      {isLeaderboardOpen ? (
                        <ChevronDown className="h-4 w-4 ml-auto" />
                      ) : (
                        <ChevronRight className="h-4 w-4 ml-auto" />
                      )}
                    </button>
                  </SidebarMenuItem>
                  
                  {/* Leaderboard submenu */}
                  {isLeaderboardOpen && (
                    <div className="ml-4 space-y-1">
                      {leaderboardSubItems.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = pathname === subItem.href || 
                          (pathname?.startsWith('/leaderboard') && new URLSearchParams(window.location.search).get('section') === subItem.id);
                        
                        console.log(`🎯 Leaderboard sub-item ${subItem.label}: isSubActive=${isSubActive}, pathname=${pathname}, href=${subItem.href}`);
                        
                        return (
                          <SidebarMenuItem key={subItem.id}>
                            <Link 
                              href={subItem.href} 
                              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 ${
                                isSubActive 
                                  ? "bg-gray-200 text-gray-900 font-semibold" 
                                  : "text-gray-600"
                              }`}
                              onClick={() => console.log(`🎯 Clicked leaderboard sub-item: ${subItem.label} -> ${subItem.href}`)}
                            >
                              <SubIcon className="h-4 w-4" />
                              <div className="flex flex-col">
                                <span>{subItem.label}</span>
                                <span className="text-xs opacity-75">{subItem.description}</span>
                              </div>
                            </Link>
                          </SidebarMenuItem>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Import with submenu */}
                  <SidebarMenuItem>
                    <button
                      onClick={() => setIsImportOpen(!isImportOpen)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] ${
                        pathname?.startsWith('/import')
                          ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]" 
                          : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      <Upload className="h-4 w-4" />
                      Import
                      {isImportOpen ? (
                        <ChevronDown className="h-4 w-4 ml-auto" />
                      ) : (
                        <ChevronRight className="h-4 w-4 ml-auto" />
                      )}
                    </button>
                  </SidebarMenuItem>
                  
                  {/* Import submenu */}
                  {isImportOpen && (
                    <div className="ml-4 space-y-1">
                      {importSubItems.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = pathname === subItem.href || 
                          (pathname?.startsWith('/import') && new URLSearchParams(window.location.search).get('section') === subItem.id);
                        
                        console.log(`🎯 Import sub-item ${subItem.label}: isSubActive=${isSubActive}, pathname=${pathname}, href=${subItem.href}`);
                        
                        return (
                          <SidebarMenuItem key={subItem.id}>
                            <Link 
                              href={subItem.href} 
                              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 ${
                                isSubActive 
                                  ? "bg-gray-200 text-gray-900 font-semibold" 
                                  : "text-gray-600"
                              }`}
                              onClick={() => console.log(`🎯 Clicked import sub-item: ${subItem.label} -> ${subItem.href}`)}
                            >
                              <SubIcon className="h-4 w-4" />
                              <div className="flex flex-col">
                                <span>{subItem.label}</span>
                                <span className="text-xs opacity-75">{subItem.description}</span>
                              </div>
                            </Link>
                          </SidebarMenuItem>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Settings with submenu */}
                  <SidebarMenuItem>
                    <button
                      onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)] ${
                        pathname?.startsWith('/settings')
                          ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]" 
                          : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                      {isSettingsOpen ? (
                        <ChevronDown className="h-4 w-4 ml-auto" />
                      ) : (
                        <ChevronRight className="h-4 w-4 ml-auto" />
                      )}
                    </button>
                  </SidebarMenuItem>
                  
                  {/* Settings submenu */}
                  {isSettingsOpen && (
                    <div className="ml-4 space-y-1">
                      {settingsSubItems.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = pathname === subItem.href || 
                          (pathname?.startsWith('/settings') && new URLSearchParams(window.location.search).get('section') === subItem.id);
                        
                        console.log(`🎯 Settings sub-item ${subItem.label}: isSubActive=${isSubActive}, pathname=${pathname}, href=${subItem.href}`);
                        
                        return (
                          <SidebarMenuItem key={subItem.id}>
                            <Link 
                              href={subItem.href} 
                              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-gray-100 hover:text-gray-900 ${
                                isSubActive 
                                  ? "bg-gray-200 text-gray-900 font-semibold" 
                                  : "text-gray-600"
                              }`}
                              onClick={() => console.log(`🎯 Clicked settings sub-item: ${subItem.label} -> ${subItem.href}`)}
                            >
                              <SubIcon className="h-4 w-4" />
                              <div className="flex flex-col">
                                <span>{subItem.label}</span>
                                <span className="text-xs opacity-75">{subItem.description}</span>
                              </div>
                            </Link>
                          </SidebarMenuItem>
                        );
                      })}
                    </div>
                  )}
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
        
        <main className="flex-1 min-w-0 bg-white min-h-screen relative z-10 w-full max-w-none px-4 py-4 sm:px-6 lg:px-8 xl:px-12">
          {/* Mobile header with trigger */}
          <div className="flex items-center justify-between mb-4 lg:hidden">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">DK Lineup Manager</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
          
          {children}
        </main>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
