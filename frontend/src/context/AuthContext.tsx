import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { setOnUnauthorized } from "../lib/api"
import { apiClient } from "../lib/api"

interface AuthContextValue {
  playerId: string | null
  username: string | null
  login: (playerId: string, username: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [playerId, setPlayerId] = useState<string | null>(() => localStorage.getItem("playerId"))
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem("username"))

  const login = (pid: string, u: string) => {
    localStorage.setItem("playerId", pid)
    localStorage.setItem("username", u)
    setPlayerId(pid)
    setUsername(u)
  }

  const logout = () => {
    apiClient.logout().catch(() => {})
    localStorage.removeItem("playerId")
    localStorage.removeItem("username")
    setPlayerId(null)
    setUsername(null)
  }

  useEffect(() => {
    setOnUnauthorized(logout)
    return () => setOnUnauthorized(null)
  }, [])

  return (
    <AuthContext.Provider value={{ playerId, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
