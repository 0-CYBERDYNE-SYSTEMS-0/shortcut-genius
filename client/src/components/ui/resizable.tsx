import { GripVertical } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"
import { useBreakpoint } from "@/hooks/use-mobile"

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    {...props}
  />
)

const ResizablePanel = ResizablePrimitive.Panel

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean
}) => {
  const { isTouch, isMobile } = useBreakpoint();

  return (
    <ResizablePrimitive.PanelResizeHandle
      className={cn(
        "relative flex items-center justify-center bg-border transition-colors",
        // Touch-friendly sizing for mobile devices
        isTouch ? "min-w-[44px] min-h-[44px] w-8" : "w-px",
        "after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
        // Enhanced touch target styling
        isTouch && "hover:bg-muted/50 active:bg-muted",
        // Vertical handle styles
        "data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:min-h-[44px] data-[panel-group-direction=vertical]:min-w-0",
        "data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0",
        "[&[data-panel-group-direction=vertical]>div]:rotate-90",
        className
      )}
      style={{
        // Ensure minimum touch target size for accessibility
        ...(isTouch && {
          minHeight: '44px',
          minWidth: '44px',
          touchAction: 'none', // Prevent browser interference with touch gestures
        })
      }}
      {...props}
    >
      {withHandle && (
        <div className={cn(
          "z-10 flex items-center justify-center rounded-sm border bg-border transition-all",
          // Touch-friendly handle sizing
          isTouch ? "h-8 w-8" : "h-4 w-3",
          // Enhanced visibility on touch devices
          isTouch && "border-2 bg-muted hover:bg-accent hover:border-accent-foreground active:scale-95"
        )}>
          <GripVertical className={cn(
            "transition-all",
            isTouch ? "h-4 w-4" : "h-2.5 w-2.5"
          )} />
        </div>
      )}
    </ResizablePrimitive.PanelResizeHandle>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
