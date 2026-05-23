import { useState, useEffect } from "react"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { AuthPage } from "./pages/AuthPage"
import { DashboardPage } from "./pages/DashboardPage"
import { LeaderboardPage } from "./pages/LeaderboardPage"
import { PlayPage } from "./pages/PlayPage"
import { PageLayout } from "./components/layout/PageLayout"
import { Button } from "./components/ui/Button"
import type { View } from "./types"

function AppContent() {
  const { token, username, logout } = useAuth()
  const [view, setView] = useState<View>("auth")
  const [gameActive, setGameActive] = useState(false)

  useEffect(() => {
    if (token) setView("dash")
  }, [token])

  if (!token) return <AuthPage />

  return (
    <PageLayout view={view} onNavigate={setView} navHidden={gameActive}>
      <div className="flex items-center justify-between mb-6">
        <span className="font-semibold text-emerald-400">{username}</span>
        <Button variant="ghost" onClick={logout}>Logout</Button>
      </div>

      {view === "dash" && <DashboardPage />}
      {view === "lb" && <LeaderboardPage />}
      {view === "play" && <PlayPage onGameActiveChange={setGameActive} />}
    </PageLayout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
