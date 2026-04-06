import * as React from "react"
import { cn } from "../../lib/utils"

export interface ScoreCircleProps {
  score: number
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeMap = {
  sm: { container: "w-10 h-10", text: "text-[10px]", radius: 16, stroke: 3 },
  md: { container: "w-12 h-12", text: "text-xs", radius: 20, stroke: 4 },
  lg: { container: "w-16 h-16", text: "text-sm", radius: 28, stroke: 4 },
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#10b981" // green
  if (score >= 60) return "#f59e0b" // amber
  return "#f43f5e" // rose
}

function ScoreCircle({ score, size = "md", className }: ScoreCircleProps) {
  const { container, text, radius, stroke } = sizeMap[size]
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = getScoreColor(score)

  return (
    <div className={cn("relative flex items-center justify-center", container, className)}>
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx={radius + stroke}
          cy={radius + stroke}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="transparent"
          className="text-indigo-100"
        />
        <circle
          cx={radius + stroke}
          cy={radius + stroke}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className={cn("absolute font-bold text-slate-700", text)}>
        {Math.round(score)}%
      </span>
    </div>
  )
}

export { ScoreCircle }
