import { createContext, useContext, useState, type ReactNode } from "react"

interface AuthContextValue {
  token: string | null
  playerId: string | null
  username: string | null
  login: (token: string, playerId: string, username: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"))
  const [playerId, setPlayerId] = useState<string | null>(() => localStorage.getItem("playerId"))
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem("username"))

  const login = (t: string, pid: string, u: string) => {
    localStorage.setItem("token", t)
    localStorage.setItem("playerId", pid)
    localStorage.setItem("username", u)
    setToken(t)
    setPlayerId(pid)
    setUsername(u)
  }

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("playerId")
    localStorage.removeItem("username")
    setToken(null)
    setPlayerId(null)
    setUsername(null)
  }

  return (
    <AuthContext.Provider value={{ token, playerId, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
