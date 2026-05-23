import { useState, useEffect } from "react";
import { apiClient } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import type { Player } from "../types";
import { Profilecard } from "../components/layout/ProfileCard";
import { useProfile } from "../hooks/useProfile";

export function LeaderboardPage() {
  const { playerId } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const { profile } = useProfile(playerId);

  useEffect(() => {
    apiClient
      .getLeaderboard(20)
      .then(setPlayers)
      .catch((e: Error) => setErr(e.message));
  }, []);

  if (err) return <p className="text-red-400 text-center">{err}</p>;

  return (
    <div className="space-y-2">
      <Profilecard />
      <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide space-y-3 mt-6">
        Leaderboard
      </h2>
      {players.map((p, i) => (
        <Card key={p.id} className="flex justify-between items-center py-2">
          <span>
            <span className="text-neutral-500 mr-2">#{i + 1}</span>
            {profile?.username === p.username ? (
              <span className="text-emerald-400">{p.username}</span>
            ) : (
              <span>{p.username}</span>
            )}
          </span>
          <Badge variant="win">{p.rating}</Badge>
        </Card>
      ))}
      {players.length === 0 && (
        <p className="text-neutral-500 text-center">No players yet</p>
      )}
    </div>
  );
}
