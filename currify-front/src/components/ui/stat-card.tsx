import * as React from "react"
import { cn } from "../../lib/utils"

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ReactNode
  value: string | number
  label: string
  gradient?: "stat-1" | "stat-2" | "stat-3" | "stat-4"
  decoration?: boolean
}

const gradientMap = {
  "stat-1": "bg-gradient-stat-1",
  "stat-2": "bg-gradient-stat-2",
  "stat-3": "bg-gradient-stat-3",
  "stat-4": "bg-gradient-stat-4",
}

function StatCard({
  className,
  icon,
  value,
  label,
  gradient = "stat-1",
  decoration = true,
  ...props
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl text-white",
        gradientMap[gradient],
        "shadow-stat",
        className
      )}
      {...props}
    >
      {/* Decorative circle */}
      {decoration && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16" />
      )}
      <div className="relative p-6">
        {/* Icon */}
        <div className="bg-white/20 backdrop-blur-md w-12 h-12 rounded-xl flex items-center justify-center mb-4">
          {icon}
        </div>
        {/* Value */}
        <p className="text-3xl font-extrabold mb-1">{value}</p>
        {/* Label */}
        <p className="text-sm font-medium opacity-90">{label}</p>
      </div>
    </div>
  )
}

export { StatCard }
