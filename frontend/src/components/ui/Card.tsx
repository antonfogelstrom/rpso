import type { ReactNode } from "react"

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-neutral-900 rounded p-4 ${className}`}>
      {children}
    </div>
  )
}
