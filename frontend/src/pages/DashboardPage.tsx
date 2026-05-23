import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../hooks/useProfile";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Profilecard } from "../components/layout/ProfileCard";

export function DashboardPage() {
  const { token, playerId } = useAuth();
  const { matches, loading, error } = useProfile(token, playerId);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(token!);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading)
    return <p className="text-neutral-500 text-center">Loading...</p>;
  if (error) return <p className="text-red-400 text-center">{error}</p>;

  return (
    <div className="space-y-6">
      <Profilecard/>

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
        <div className="relative bg-neutral-800 rounded p-3 font-mono text-sm select-all overflow-hidden">
          <span className="invisible" aria-hidden="true">
            •
          </span>
          <div className="absolute inset-y-3 left-3 right-3 whitespace-nowrap overflow-hidden after:content-['••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••']"></div>
        </div>
      </Card>

      {matches.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide">
            Recent Matches
          </h2>
          {matches.map((m) => {
            const isWin = m.winner_id === playerId;
            const isDraw = m.winner_id === null;
            return (
              <Card
                key={m.id}
                className="flex justify-between items-center py-2"
              >
                <Badge variant={isDraw ? "draw" : isWin ? "win" : "loss"}>
                  {isDraw ? "Draw" : isWin ? "Win" : "Loss"}
                </Badge>
                <span className="text-neutral-500 text-sm">
                  {new Date(m.created_at).toLocaleDateString()}
                </span>
              </Card>
            );
          })}
        </div>
      )}

      {matches.length === 0 && (
        <p className="text-neutral-500 text-center">No matches yet</p>
      )}
    </div>
  );
}
