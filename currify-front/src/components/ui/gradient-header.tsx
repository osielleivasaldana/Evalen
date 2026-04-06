import * as React from "react"
import { cn } from "../../lib/utils"

export interface GradientHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "brand" | "warning"
}

const variantMap = {
  brand: "bg-gradient-header text-white",
  warning: "bg-gradient-modal-warning text-white",
}

function GradientHeader({
  className,
  variant = "brand",
  children,
  ...props
}: GradientHeaderProps) {
  return (
    <div
      className={cn(
        "p-6 rounded-t-2xl flex justify-between items-center",
        variantMap[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { GradientHeader }
