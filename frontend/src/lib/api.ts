import type { Envelope, PlayerProfile, Match, Player, RegisterResponse, LoginRequest, RegisterRequest, LoginResponse } from '../types'

class ApiError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = "ApiError"
  }
}

const BASE = ""

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts.headers as Record<string, string> },
  })
  const body: Envelope<T> = await res.json()
  if (!res.ok || body.error) {
    throw new ApiError(body.error?.code ?? "UNKNOWN", body.error?.message ?? res.statusText)
  }
  return body.data as T
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` }
}

export const apiClient = {
  register(data: RegisterRequest): Promise<RegisterResponse> {
    return request<RegisterResponse>("/api/register", { method: "POST", body: JSON.stringify(data) })
  },

  login(data: LoginRequest): Promise<LoginResponse> {
    return request<LoginResponse>("/api/login", { method: "POST", body: JSON.stringify(data) })
  },

  getProfile(token: string, playerId: string): Promise<PlayerProfile> {
    return request<PlayerProfile>(`/api/players/${playerId}`, { headers: authHeaders(token) })
  },

  getMatches(token: string, playerId: string, limit = 10): Promise<Match[]> {
    return request<Match[]>(`/api/players/${playerId}/matches?limit=${limit}`, { headers: authHeaders(token) })
  },

  getLeaderboard(token: string, limit = 20): Promise<Player[]> {
    return request<Player[]>(`/api/leaderboard?limit=${limit}`, { headers: authHeaders(token) })
  },
}
