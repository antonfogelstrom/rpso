import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { PlayPage } from "./pages/PlayPage";
import { PageLayout } from "./components/layout/PageLayout";
import type { View } from "./types";
import type { Tab } from "./components/layout/BottomNav";

function AppContent() {
  const { playerId } = useAuth();
  const [view, setView] = useState<View>("login");
  const [gameActive, setGameActive] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const privateCode = params.get("private");
    if (privateCode) {
      sessionStorage.setItem("pendingPrivateMatch", privateCode);
      window.history.replaceState({}, "", window.location.pathname);
      if (playerId) {
        setView("play");
      }
    }
  }, [playerId]);

  useEffect(() => {
    if (playerId) {
      const pendingCode = sessionStorage.getItem("pendingPrivateMatch");
      setView(pendingCode ? "play" : "dash");
    }
  }, [playerId]);

  const isLoggedIn = !!playerId;

  const mainTabs: Tab[] = [
    { id: "dash", label: "Dashboard" },
    { id: "play", label: "Play" },
    { id: "lb", label: "Leaderboard" },
  ];

  return (
    <PageLayout
      view={view}
      onNavigate={setView}
      navHidden={gameActive}
      tabs={isLoggedIn ? mainTabs : []}
    >
      {isLoggedIn ? (
        <>
          <div className="flex align-middle items-center mb-6 gap-1">
            <span className="font-semibold text-2xl">RPSO</span>
            <span className="text-sm"> | rock paper scissors online</span>
          </div>

          {view === "dash" && <DashboardPage />}
          {view === "lb" && <LeaderboardPage />}
          {view === "play" && <PlayPage onGameActiveChange={setGameActive} />}
        </>
      ) : (
        <AuthPage />
      )}
    </PageLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
