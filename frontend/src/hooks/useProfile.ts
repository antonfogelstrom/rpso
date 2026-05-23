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

    setLoading(true)
    setError(null)

    Promise.all([
      apiClient.getProfile(playerId),
      apiClient.getMatches(playerId, 10),
    ])
      .then(([profileData, matchesData]) => {
        setProfile(profileData)
        setMatches(matchesData)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [playerId])

  return { profile, matches, loading, error }
}
