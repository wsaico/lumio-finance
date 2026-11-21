"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"
import { useSettingsStore } from "@/hooks/useSettingsStore"

function Progress({
  className,
  value,
  indicatorColor,
  indicatorClassName,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorColor?: string
  indicatorClassName?: string
}) {
  const { progressBarStyle } = useSettingsStore()

  const indicatorStyle: React.CSSProperties = {
    transform: `translateX(-${100 - (value || 0)}%)`,
    ...(indicatorColor
      ? progressBarStyle === "gradient"
        ? {
            backgroundImage: `linear-gradient(90deg, ${indicatorColor}, color-mix(in oklab, ${indicatorColor} 70%, white))`,
          }
        : { backgroundColor: indicatorColor }
      : {}),
  }

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        progressBarStyle === "segmented" && "h-2.5",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "bg-primary h-full w-full flex-1 transition-all",
          progressBarStyle === "gradient" &&
            !indicatorColor &&
            "bg-gradient-to-r from-primary via-primary to-primary/70",
          indicatorClassName
        )}
        style={indicatorStyle}
      />
      {progressBarStyle === "segmented" && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 grid grid-cols-5 gap-1 px-0.5"
        >
          {[0, 1, 2, 3, 4].map((seg) => (
            <div key={seg} className="border-r border-background/60 last:border-r-0 h-full" />
          ))}
        </div>
      )}
    </ProgressPrimitive.Root>
  )
}

export { Progress }
