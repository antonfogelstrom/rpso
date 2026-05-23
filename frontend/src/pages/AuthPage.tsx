import { useState } from "react"
import { apiClient } from "../lib/api"
import { useAuth } from "../context/AuthContext"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"
import type { RegisterResponse } from "../types"

const OBFUSCATED_TOKEN = "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"

export function AuthPage() {
  const { login } = useAuth()
  const [tab, setTab] = useState<"login" | "register">("login")
  const [username, setUsername] = useState("")
  const [token, setToken] = useState("")
  const [err, setErr] = useState("")
  const [loading, setLoading] = useState(false)
  const [registeredData, setRegisteredData] = useState<RegisterResponse | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr("")
    setLoading(true)
    try {
      if (tab === "register") {
        const res = await apiClient.register()
        setRegisteredData(res)
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

  const handleContinue = () => {
    if (!registeredData) return
    login(registeredData.token, registeredData.player_id, registeredData.username)
    setRegisteredData(null)
  }

  return (
    <>
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
          {tab === "login" && (
            <Input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
            />
          )}

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

      {registeredData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
            <h2 className="text-xl font-bold">Account created!</h2>

            <p className="text-sm text-neutral-400">
              Your username is <span className="font-semibold text-white">{registeredData.username}</span>.
            </p>

            <p className="text-sm text-neutral-400">
              Your login token is shown below. Save it in a safe place — you'll need it
              to log in on another device.
            </p>

            <div className="bg-neutral-800 rounded p-3 font-mono text-sm break-all select-all">
              {OBFUSCATED_TOKEN}
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => handleCopy(registeredData.token)}
            >
              {copied ? "Copied!" : "Copy token"}
            </Button>

            <Button type="button" className="w-full" onClick={handleContinue}>
              Continue
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
