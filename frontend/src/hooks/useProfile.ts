import { useState, useEffect } from "react"
import { apiClient } from "../lib/api"
import type { PlayerProfile, Match } from "../types"

interface UseProfileResult {
  profile: PlayerProfile | null
  matches: Match[]
  loading: boolean
  error: string | null
}

export function useProfile(token: string | null, playerId: string | null): UseProfileResult {
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !playerId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    Promise.all([
      apiClient.getProfile(token, playerId),
      apiClient.getMatches(token, playerId, 10),
    ])
      .then(([profileData, matchesData]) => {
        setProfile(profileData)
        setMatches(matchesData)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [token, playerId])

  return { profile, matches, loading, error }
}
