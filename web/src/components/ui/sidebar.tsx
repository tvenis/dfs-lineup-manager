"use client";

import * as React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Inline cn utility to avoid module resolution issues
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const Sidebar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex h-full w-full flex-col gap-4", className)}
      {...props}
    >
      {children}
    </div>
  )
)
Sidebar.displayName = "Sidebar"

const SidebarHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex h-[60px] items-center px-2", className)}
      {...props}
    >
      {children}
    </div>
  )
)
SidebarHeader.displayName = "SidebarHeader"

const SidebarNav = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, children, ...props }, ref) => (
    <nav
      ref={ref}
      className={cn("flex flex-1 flex-col gap-2 px-2", className)}
      {...props}
    >
      {children}
    </nav>
  )
)
SidebarNav.displayName = "SidebarNav"

const SidebarNavItem = React.forwardRef<HTMLLIElement, React.HTMLAttributes<HTMLLIElement>>(
  ({ className, children, ...props }, ref) => (
    <li
      ref={ref}
      className={cn("flex items-center gap-2 rounded-md px-3 py-2", className)}
      {...props}
    >
      {children}
    </li>
  )
)
SidebarNavItem.displayName = "SidebarNavItem"

const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex h-[60px] items-center px-2", className)}
      {...props}
    >
      {children}
    </div>
  )
)
SidebarFooter.displayName = "SidebarFooter"

// Add missing components that App.tsx needs
interface SidebarProviderProps {
  children: React.ReactNode;
}

const SidebarProvider = ({ children }: SidebarProviderProps) => (
  <div className="flex h-screen">
    {children}
  </div>
)

const SidebarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex h-full w-64 flex-col border-r bg-background", className)}
      {...props}
    >
      {children}
    </div>
  )
)
SidebarContent.displayName = "SidebarContent"

const SidebarGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col gap-2", className)}
      {...props}
    >
      {children}
    </div>
  )
)
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("px-2 py-1 text-xs font-semibold text-muted-foreground", className)}
      {...props}
    >
      {children}
    </div>
  )
)
SidebarGroupLabel.displayName = "SidebarGroupLabel"

const SidebarGroupContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col gap-1", className)}
      {...props}
    >
      {children}
    </div>
  )
)
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarMenu = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col gap-1", className)}
      {...props}
    >
      {children}
    </div>
  )
)
SidebarMenu.displayName = "SidebarMenu"

interface SidebarMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  href?: string;
  active?: boolean;
}

const SidebarMenuItem = React.forwardRef<HTMLDivElement, SidebarMenuItemProps>(
  ({ className, children, href, active, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
        active && "bg-accent text-accent-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
SidebarMenuItem.displayName = "SidebarMenuItem"

const SidebarTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground", className)}
      {...props}
    >
      {children}
    </button>
  )
)
SidebarTrigger.displayName = "SidebarTrigger"

interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
}

const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({ className, children, isActive, ...props }, ref) => (
    <button
      ref={ref}
      className={cn("flex w-full items-center justify-start rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground", isActive && "bg-accent text-accent-foreground", className)}
      {...props}
    >
      {children}
    </button>
  )
)
SidebarMenuButton.displayName = "SidebarMenuButton"

export { 
  Sidebar, 
  SidebarHeader, 
  SidebarNav, 
  SidebarNavItem, 
  SidebarFooter,
  SidebarProvider,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarMenuButton
}
