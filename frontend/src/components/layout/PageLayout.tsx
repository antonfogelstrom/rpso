import type { ReactNode } from "react"
import { BottomNav, type Tab } from "./BottomNav"
import type { View } from "../../types"

interface PageLayoutProps {
  children: ReactNode
  view: View
  onNavigate: (view: View) => void
  navHidden?: boolean
  tabs: Tab[]
}

export function PageLayout({ children, view, onNavigate, navHidden, tabs }: PageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100">
      <main className="flex-1 max-w-xl mx-auto w-full p-4 pb-24">
        {children}
      </main>
      <BottomNav view={view} onNavigate={onNavigate} hidden={navHidden} tabs={tabs} />
    </div>
  )
}
