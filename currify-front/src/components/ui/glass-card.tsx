import * as React from "react"
import { cn } from "../../lib/utils"

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "candidate"
}

function GlassCard({
  className,
  variant = "default",
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        variant === "candidate"
          ? "bg-ev-card/80 dark:bg-[#16241C]/80 backdrop-blur-md rounded-2xl border border-ev-line/30 dark:border-white/[0.06] shadow-sm"
          : "backdrop-blur-md rounded-2xl border border-ev-line/30 dark:border-white/[0.06] bg-ev-card/60 dark:bg-[#16241C]/60",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { GlassCard }
