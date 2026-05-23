import { useState, useEffect } from "react"
import { AuthProvider, useAuth } from "./context/AuthContext"
import { AuthPage } from "./pages/AuthPage"
import { DashboardPage } from "./pages/DashboardPage"
import { LeaderboardPage } from "./pages/LeaderboardPage"
import { PlayPage } from "./pages/PlayPage"
import { PageLayout } from "./components/layout/PageLayout"
import { Button } from "./components/ui/Button"
import type { View } from "./types"
import type { Tab } from "./components/layout/BottomNav"

function AppContent() {
  const { token, username, logout } = useAuth()
  const [view, setView] = useState<View>("login")
  const [gameActive, setGameActive] = useState(false)

  useEffect(() => {
    if (token) setView("dash")
  }, [token])

  const isLoggedIn = !!token

  const authTabs: Tab[] = [
    { id: "login", label: "Login" },
    { id: "register", label: "Register" },
  ]

  const mainTabs: Tab[] = [
    { id: "dash", label: "Dashboard" },
    { id: "play", label: "Play" },
    { id: "lb", label: "Leaderboard" },
  ]

  return (
    <PageLayout view={view} onNavigate={setView} navHidden={gameActive} tabs={isLoggedIn ? mainTabs : authTabs}>
      {isLoggedIn ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <span className="font-semibold text-emerald-400">{username}</span>
            <Button variant="ghost" onClick={logout}>Logout</Button>
          </div>

          {view === "dash" && <DashboardPage />}
          {view === "lb" && <LeaderboardPage />}
          {view === "play" && <PlayPage onGameActiveChange={setGameActive} />}
        </>
      ) : (
        <AuthPage tab={view as "login" | "register"} />
      )}
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
