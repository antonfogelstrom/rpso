import type { Envelope, PlayerProfile, Match, Player, RegisterResponse, LoginRequest, LoginResponse } from '../types'

let onUnauthorized: (() => void) | null = null

export function setOnUnauthorized(cb: (() => void) | null) {
  onUnauthorized = cb
}

class ApiError extends Error {
  code: string
  status: number
  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
    this.name = "ApiError"
  }
}

const BASE = ""

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    ...opts,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...opts.headers as Record<string, string> },
  })
  const body: Envelope<T> = await res.json()
  if (!res.ok || body.error) {
    if (res.status === 401) onUnauthorized?.()
    throw new ApiError(body.error?.code ?? "UNKNOWN", body.error?.message ?? res.statusText, res.status)
  }
  return body.data as T
}

export const apiClient = {
  rotateToken(): Promise<{ token: string }> {
    return request<{ token: string }>("/api/token/rotate", { method: "POST" })
  },

  register(): Promise<RegisterResponse> {
    return request<RegisterResponse>("/api/register", { method: "POST", body: "{}" })
  },

  login(data: LoginRequest): Promise<LoginResponse> {
    return request<LoginResponse>("/api/login", { method: "POST", body: JSON.stringify(data) })
  },

  logout(): Promise<void> {
    return request<void>("/api/logout", { method: "POST" })
  },

  getProfile(playerId: string): Promise<PlayerProfile> {
    return request<PlayerProfile>(`/api/players/${playerId}`)
  },

  getMatches(playerId: string, limit = 10): Promise<Match[]> {
    return request<Match[]>(`/api/players/${playerId}/matches?limit=${limit}`)
  },

  getLeaderboard(limit = 20): Promise<Player[]> {
    return request<Player[]>(`/api/leaderboard?limit=${limit}`)
  },
}
