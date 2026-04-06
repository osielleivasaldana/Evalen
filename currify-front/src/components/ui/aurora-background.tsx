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
          "relative overflow-hidden rounded-2xl border border-indigo-100",
          "bg-gradient-to-r from-violet-50 via-indigo-50 to-blue-50",
          "shadow-lg shadow-indigo-100/50",
          className
        )}
        {...props}
      >
        {/* Aurora orbs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
        {/* Top fade overlay */}
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
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
