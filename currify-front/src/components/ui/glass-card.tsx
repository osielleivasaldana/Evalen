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
          ? "bg-white/80 backdrop-blur-md rounded-2xl border border-white shadow-sm"
          : "backdrop-blur-md rounded-2xl border border-white/50 bg-white/60",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { GlassCard }
