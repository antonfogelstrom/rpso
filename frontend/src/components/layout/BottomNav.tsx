import type { View } from "../../types"

export interface Tab {
  id: View
  label: string
}

interface BottomNavProps {
  view: View
  onNavigate: (view: View) => void
  hidden?: boolean
  tabs: Tab[]
}

export function BottomNav({ view, onNavigate, hidden, tabs }: BottomNavProps) {
  if (hidden) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800">
      <div className="max-w-xl mx-auto flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className={`flex-1 min-h-[56px] text-sm font-medium transition-colors ${
              view === tab.id
                ? "text-emerald-400 border-t-2 border-emerald-400"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
