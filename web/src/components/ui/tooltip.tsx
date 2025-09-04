import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>>(
  ({ className = "z-50 overflow-hidden rounded-md bg-popover px-2 py-1.5 text-xs text-popover-foreground shadow-md border", sideOffset = 6, ...props }, ref) => (
    <TooltipPrimitive.Content ref={ref} sideOffset={sideOffset} className={className} {...props} />
  )
);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
