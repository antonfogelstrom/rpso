import { useState } from "react"
import { useAuth } from "../context/AuthContext"
import { useProfile } from "../hooks/useProfile"
import { Card } from "../components/ui/Card"
import { Badge } from "../components/ui/Badge"
import { Button } from "../components/ui/Button"

const OBFUSCATED_TOKEN = "••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"

export function DashboardPage() {
  const { token, playerId, username } = useAuth()
  const { profile, matches, loading, error } = useProfile(token, playerId)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(token!)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <p className="text-neutral-500 text-center">Loading...</p>
  if (error) return <p className="text-red-400 text-center">{error}</p>

  return (
    <div className="space-y-6">
      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold">{profile?.username ?? username}</p>
          <Badge variant="neutral">Rating: {profile?.rating}</Badge>
        </div>
        <div className="flex gap-4 text-sm">
          <Badge variant="win">{profile?.wins}W</Badge>
          <Badge variant="loss">{profile?.losses}L</Badge>
          <Badge variant="draw">{profile?.draws}D</Badge>
          <Badge variant="neutral">{profile?.total_matches} total</Badge>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-neutral-400 uppercase tracking-wide">
            Login Token
          </p>
          <Button
            type="button"
            variant="secondary"
            className="text-xs px-3 py-1 min-h-0"
            onClick={handleCopy}
          >
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
        <div className="bg-neutral-800 rounded p-3 font-mono text-sm break-all select-all text-neutral-500">
          {OBFUSCATED_TOKEN}
        </div>
      </Card>

      {matches.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide">Recent Matches</h2>
          {matches.map((m) => {
            const isWin = m.winner_id === playerId
            const isDraw = m.winner_id === null
            return (
              <Card key={m.id} className="flex justify-between items-center py-2">
                <Badge variant={isDraw ? "draw" : isWin ? "win" : "loss"}>
                  {isDraw ? "Draw" : isWin ? "Win" : "Loss"}
                </Badge>
                <span className="text-neutral-500 text-sm">
                  {new Date(m.created_at).toLocaleDateString()}
                </span>
              </Card>
            )
          })}
        </div>
      )}

      {matches.length === 0 && (
        <p className="text-neutral-500 text-center">No matches yet</p>
      )}
    </div>
  )
}
