import { useState, useEffect, useRef, useCallback } from 'react'

const API = (path, opts = {}) =>
  fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts.headers },
  }).then(async r => {
    const body = await r.json()
    if (!r.ok) throw new Error(body.error?.message || r.statusText)
    return body.data
  })

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [playerId, setPlayerId] = useState(localStorage.getItem('playerId'))
  const [username, setUsername] = useState(localStorage.getItem('username'))
  const [view, setView] = useState('auth')
  const authed = !!token

  const login = (t, pid, u) => {
    localStorage.setItem('token', t)
    localStorage.setItem('playerId', pid)
    localStorage.setItem('username', u)
    setToken(t); setPlayerId(pid); setUsername(u); setView('dash')
  }

  const logout = () => {
    localStorage.clear()
    setToken(null); setPlayerId(null); setUsername(null); setView('auth')
  }

  useEffect(() => {
    if (authed) setView('dash')
  }, [authed])

  if (!authed) return <AuthView onLogin={login} />
  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <nav className="flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-emerald-400">{username}</span>
        <div className="flex gap-3">
          <button onClick={() => setView('dash')} className={view === 'dash' ? 'text-white' : 'text-neutral-500'}>Dashboard</button>
          <button onClick={() => setView('lb')} className={view === 'lb' ? 'text-white' : 'text-neutral-500'}>Leaderboard</button>
          <button onClick={() => setView('play')} className={view === 'play' ? 'text-white' : 'text-neutral-500'}>Play</button>
          <button onClick={logout} className="text-red-400">Logout</button>
        </div>
      </nav>
      {view === 'dash' && <Dashboard playerId={playerId} token={token} />}
      {view === 'lb' && <Leaderboard token={token} />}
      {view === 'play' && <GameView playerId={playerId} username={username} token={token} />}
    </div>
  )
}

function AuthView({ onLogin }) {
  const [tab, setTab] = useState('login')
  const [username, setUsername] = useState('')
  const [token, setToken] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async e => {
    e.preventDefault(); setErr(''); setLoading(true)
    try {
      if (tab === 'register') {
        const d = await API('/api/register', { method: 'POST', body: JSON.stringify({ username }) })
        onLogin(d.token, d.player_id, d.username)
      } else {
        await API('/api/login', { method: 'POST', body: JSON.stringify({ username, token }) })
        onLogin(token, null, username)
      }
    } catch (e) { setErr(e.message) } finally { setLoading(false) }
  }

  return (
    <div className="max-w-sm mx-auto mt-24 p-6 space-y-4">
      <h1 className="text-2xl font-bold text-center">rpso</h1>
      <div className="flex gap-2">
        <button onClick={() => setTab('login')} className={`flex-1 py-1 rounded ${tab === 'login' ? 'bg-emerald-600' : 'bg-neutral-800'}`}>Login</button>
        <button onClick={() => setTab('register')} className={`flex-1 py-1 rounded ${tab === 'register' ? 'bg-emerald-600' : 'bg-neutral-800'}`}>Register</button>
      </div>
      <form onSubmit={handle} className="space-y-3">
        <input className="w-full bg-neutral-900 border border-neutral-700 rounded p-2" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required minLength={3} maxLength={20} />
        {tab === 'login' && <input className="w-full bg-neutral-900 border border-neutral-700 rounded p-2" placeholder="Token" value={token} onChange={e => setToken(e.target.value)} required />}
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <button className="w-full bg-emerald-600 hover:bg-emerald-500 rounded p-2 font-medium disabled:opacity-50" disabled={loading}>{loading ? '...' : tab === 'register' ? 'Register' : 'Login'}</button>
      </form>
    </div>
  )
}

function Dashboard({ playerId, token }) {
  const [profile, setProfile] = useState(null)
  const [matches, setMatches] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => {
    API(`/api/players/${playerId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(setProfile).catch(e => setErr(e.message))
    API(`/api/players/${playerId}/matches?limit=10`, { headers: { Authorization: `Bearer ${token}` } })
      .then(setMatches).catch(() => {})
  }, [playerId, token])

  if (err) return <p className="text-red-400">{err}</p>
  if (!profile) return <p className="text-neutral-500">Loading...</p>

  return (
    <div className="space-y-6">
      <div className="bg-neutral-900 rounded p-4 space-y-2">
        <p className="text-lg font-semibold">{profile.username} <span className="text-neutral-500 text-sm">Rating: {profile.rating}</span></p>
        <div className="flex gap-4 text-sm">
          <span className="text-emerald-400">{profile.wins}W</span>
          <span className="text-red-400">{profile.losses}L</span>
          <span className="text-neutral-400">{profile.draws}D</span>
          <span className="text-neutral-500">{profile.total_matches} total</span>
        </div>
      </div>
      {matches.length > 0 && (
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-neutral-400 uppercase">Recent Matches</h2>
          {matches.map(m => (
            <div key={m.id} className="bg-neutral-900 rounded px-3 py-2 text-sm flex justify-between">
              <span className={m.winner_id === null ? 'text-neutral-400' : m.winner_id === profile.id ? 'text-emerald-400' : 'text-red-400'}>
                {m.winner_id === null ? 'Draw' : m.winner_id === profile.id ? 'Win' : 'Loss'}
              </span>
              <span className="text-neutral-500">{new Date(m.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Leaderboard({ token }) {
  const [players, setPlayers] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => {
    API('/api/leaderboard?limit=20', { headers: { Authorization: `Bearer ${token}` } })
      .then(setPlayers).catch(e => setErr(e.message))
  }, [token])

  if (err) return <p className="text-red-400">{err}</p>

  return (
    <div className="space-y-1">
      <h2 className="text-sm font-semibold text-neutral-400 uppercase">Leaderboard</h2>
      {players.map((p, i) => (
        <div key={p.id} className="bg-neutral-900 rounded px-3 py-2 text-sm flex justify-between">
          <span><span className="text-neutral-500 mr-2">#{i + 1}</span>{p.username}</span>
          <span className="text-emerald-400">{p.rating}</span>
        </div>
      ))}
      {players.length === 0 && <p className="text-neutral-500">No players yet</p>}
    </div>
  )
}

function GameView({ playerId, username, token }) {
  const ws = useRef(null)
  const [status, setStatus] = useState('idle')
  const [position, setPosition] = useState(0)
  const [match, setMatch] = useState(null)
  const [rounds, setRounds] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const connect = useCallback(() => {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = import.meta.env.DEV ? 'localhost:8080' : location.host
    const socket = new WebSocket(`${protocol}//${host}/api/ws`, [`bearer-${token}`])
    ws.current = socket

    socket.onopen = () => setStatus('connected')
    socket.onclose = () => { setStatus('idle'); setError('Disconnected') }
    socket.onerror = () => setError('Connection error')

    socket.onmessage = e => {
      const msg = JSON.parse(e.data)
      switch (msg.type) {
        case 'queue_status':
          setPosition(msg.position)
          break
        case 'match_found':
          setMatch(msg)
          setRounds([])
          setResult(null)
          setStatus('playing')
          setPosition(0)
          break
        case 'round_result':
          setRounds(prev => [...prev, msg])
          break
        case 'match_result':
          setResult(msg)
          setStatus('done')
          break
        case 'error':
          setError(msg.message)
          break
      }
    }
  }, [token])

  useEffect(() => { connect(); return () => ws.current?.close() }, [connect])

  const send = msg => ws.current?.send(JSON.stringify(msg))

  const join = () => { setError(''); send({ type: 'join_queue' }); setStatus('queueing') }
  const leave = () => { send({ type: 'leave_queue' }); setStatus('connected'); setPosition(0) }
  const move = m => send({ type: 'move', data: { move: m } })

  return (
    <div className="space-y-4">
      <div className="bg-neutral-900 rounded p-4 text-center space-y-2">
        {status === 'idle' && <p className="text-neutral-500">Connecting...</p>}
        {status === 'connected' && (
          <>
            <p className="text-emerald-400 font-semibold">Connected</p>
            <button onClick={join} className="bg-emerald-600 hover:bg-emerald-500 rounded px-6 py-2 font-medium">Join Queue</button>
          </>
        )}
        {status === 'queueing' && (
          <>
            <p className="text-yellow-400">In queue{position > 0 && ` (#${position})`}...</p>
            <button onClick={leave} className="bg-red-600 hover:bg-red-500 rounded px-4 py-1 text-sm">Leave</button>
          </>
        )}
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      {(status === 'playing' || status === 'done') && match && (
        <div className="space-y-3">
          <p className="text-center text-sm">vs <span className="font-semibold text-emerald-400">{match.opponent}</span> <span className="text-neutral-500">({match.opponent_rating})</span></p>

          <div className="flex justify-center gap-3">
            {['rock', 'paper', 'scissors'].map(m => (
              <button key={m} onClick={() => move(m)} disabled={status === 'done'}
                className="bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 rounded-lg px-4 py-3 text-lg font-medium capitalize border border-neutral-700">
                {m}
              </button>
            ))}
          </div>

          {rounds.length > 0 && (
            <div className="space-y-1">
              {rounds.map(r => (
                <div key={r.round} className="bg-neutral-900 rounded px-3 py-2 text-sm flex justify-between">
                  <span>Round {r.round}: {r.your_move} vs {r.opponent_move}</span>
                  <span className={r.result === 'win' ? 'text-emerald-400' : r.result === 'loss' ? 'text-red-400' : 'text-neutral-400'}>
                    {r.result === 'win' ? 'W' : r.result === 'loss' ? 'L' : 'T'} ({r.score[0]}-{r.score[1]})
                  </span>
                </div>
              ))}
            </div>
          )}

          {result && (
            <div className="bg-neutral-900 rounded p-4 text-center space-y-1">
              <p className={result.winner === 'you' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                {result.winner === 'you' ? 'You Win!' : result.winner === 'opponent' ? 'You Lose' : 'Draw'}
              </p>
              <p className="text-sm text-neutral-400">
                Rating: {result.rating_change > 0 ? '+' : ''}{result.rating_change} &middot; {result.final_score[0]}-{result.final_score[1]}
              </p>
              <button onClick={join} className="mt-2 bg-emerald-600 hover:bg-emerald-500 rounded px-4 py-1 text-sm font-medium">Play Again</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
