import type { ReactNode } from "react"
import { BottomNav } from "./BottomNav"
import type { View } from "../../types"

interface PageLayoutProps {
  children: ReactNode
  view: View
  onNavigate: (view: View) => void
  navHidden?: boolean
}

export function PageLayout({ children, view, onNavigate, navHidden }: PageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100">
      <main className="flex-1 max-w-xl mx-auto w-full p-4 pb-24">
        {children}
      </main>
      <BottomNav view={view} onNavigate={onNavigate} hidden={navHidden} />
    </div>
  )
}
