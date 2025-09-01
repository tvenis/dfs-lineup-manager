"use client"

import * as React from "react"
// import { X } from "lucide-react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Inline cn utility to avoid module resolution issues
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface DialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface DialogContentProps {
  children: React.ReactNode
  className?: string
  onClose?: () => void
}

interface DialogDescriptionProps {
  children: React.ReactNode
  className?: string
}

interface DialogHeaderProps {
  children: React.ReactNode
  className?: string
}

interface DialogTitleProps {
  children: React.ReactNode
  className?: string
}

interface DialogTriggerProps {
  children: React.ReactNode
  asChild?: boolean
  onClick?: () => void
}

const Dialog = ({ children, open, onOpenChange: _onOpenChange }: DialogProps) => {
  // Only render children if open is true, or if there's no open prop (for uncontrolled dialogs)
  if (open === false) {
    return null
  }
  return <>{children}</>
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ children, className, onClose, ...props }, ref) => {
    // Add keyboard escape handler
    React.useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && onClose) {
          onClose()
        }
      }
      
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }, [onClose])

    return (
      <div
        ref={ref}
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center",
          "bg-background/80 backdrop-blur-sm",
          className
        )}
        onClick={onClose} // Close when clicking backdrop
        {...props}
      >
        <div 
          className="relative w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking content
        >
          {children}
        </div>
      </div>
    )
  }
)
DialogContent.displayName = "DialogContent"

const DialogDescription = React.forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ children, className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    >
      {children}
    </p>
  )
)
DialogDescription.displayName = "DialogDescription"

const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
      {...props}
    >
      {children}
    </div>
  )
)
DialogHeader.displayName = "DialogHeader"

const DialogTitle = React.forwardRef<HTMLParagraphElement, DialogTitleProps>(
  ({ children, className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    >
      {children}
    </h3>
  )
)
DialogTitle.displayName = "DialogTitle"

const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ children, asChild, onClick, ...props }, ref) => {
    if (asChild) {
      return <>{children}</>
    }
    
    return (
      <button
        ref={ref}
        onClick={onClick}
        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        {...props}
      >
        {children}
      </button>
    )
  }
)
DialogTrigger.displayName = "DialogTrigger"

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
}
