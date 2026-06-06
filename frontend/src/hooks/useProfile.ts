import { useState, useEffect } from "react"
import { apiClient } from "../lib/api"
import type { PlayerProfile, Match } from "../types"

interface UseProfileResult {
  profile: PlayerProfile | null
  matches: Match[]
  loading: boolean
  error: string | null
}

export function useProfile(playerId: string | null): UseProfileResult {
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!playerId) {
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    Promise.all([
      apiClient.getProfile(playerId, controller.signal),
      apiClient.getMatches(playerId, 10, controller.signal),
    ])
      .then(([profileData, matchesData]) => {
        setProfile(profileData)
        setMatches(matchesData)
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(e.message)
      })
      .finally(() => setLoading(false))

    return () => controller.abort()
  }, [playerId])

  return { profile, matches, loading, error }
}
