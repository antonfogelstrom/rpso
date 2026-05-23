import type { ReactNode } from "react"

interface BadgeProps {
  children: ReactNode
  variant?: "win" | "loss" | "draw" | "neutral"
}

const colors = {
  win: "text-emerald-400",
  loss: "text-red-400",
  draw: "text-neutral-400",
  neutral: "text-neutral-500",
}

export function Badge({ children, variant = "neutral" }: BadgeProps) {
  return (
    <span className={`text-sm font-medium ${colors[variant]}`}>
      {children}
    </span>
  )
}
