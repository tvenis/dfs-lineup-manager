"use client";

import * as React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Inline cn utility to avoid module resolution issues
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
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

interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const SidebarHeader = React.forwardRef<HTMLDivElement, SidebarHeaderProps>(
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

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {}

const SidebarNav = React.forwardRef<HTMLElement, SidebarNavProps>(
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

interface SidebarNavItemProps extends React.HTMLAttributes<HTMLLIElement> {}

const SidebarNavItem = React.forwardRef<HTMLLIElement, SidebarNavItemProps>(
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

interface SidebarFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const SidebarFooter = React.forwardRef<HTMLDivElement, SidebarFooterProps>(
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

export { Sidebar, SidebarHeader, SidebarNav, SidebarNavItem, SidebarFooter }
