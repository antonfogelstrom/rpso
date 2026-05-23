import { useState } from "react"
import { apiClient } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"

export function AuthPage() {
  const { login } = useAuth()
  const [tab, setTab] = useState<"login" | "register">("login")
  const [username, setUsername] = useState("")
  const [token, setToken] = useState("")
  const [err, setErr] = useState("")
  const [loading, setLoading] = useState(false)

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr("")
    setLoading(true)
    try {
      if (tab === "register") {
        const res = await apiClient.register({ username })
        login(res.token, res.player_id, res.username)
      } else {
        const res = await apiClient.login({ username, token })
        login(token, res.player_id, res.username)
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-24 p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">rpso</h1>

      <div className="flex gap-2">
        <Button
          variant={tab === "login" ? "primary" : "ghost"}
          className="flex-1"
          onClick={() => setTab("login")}
        >
          Login
        </Button>
        <Button
          variant={tab === "register" ? "primary" : "ghost"}
          className="flex-1"
          onClick={() => setTab("register")}
        >
          Register
        </Button>
      </div>

      <form onSubmit={handle} className="space-y-4">
        <Input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={3}
          maxLength={20}
        />

        {tab === "login" && (
          <Input
            placeholder="Token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
        )}

        {err && <p className="text-red-400 text-sm">{err}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "..." : tab === "register" ? "Register" : "Login"}
        </Button>
      </form>
    </div>
  )
}
