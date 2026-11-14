import * as React from "react"
import { cn } from "../../lib/utils"

export interface AuroraBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "talent" | "custom"
}

function AuroraBackground({
  className,
  variant = "talent",
  children,
  ...props
}: AuroraBackgroundProps) {
  if (variant === "talent") {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-ev-line/30 dark:border-white/[0.06]",
          "bg-gradient-talent-bg dark:bg-[#0E1813]",
          "shadow-lg shadow-ev-cta/10",
          className
        )}
        {...props}
      >
        {/* Aurora orbs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-ev-cta/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-ev-green/10 rounded-full blur-3xl pointer-events-none" />
        {/* Top fade overlay */}
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-ev-card/60 dark:from-[#16241C]/60 to-transparent pointer-events-none" />
        {/* Content */}
        <div className="relative z-10">{children}</div>
      </div>
    )
  }

  return (
    <div
      className={cn("relative overflow-hidden rounded-2xl", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { AuroraBackground }
