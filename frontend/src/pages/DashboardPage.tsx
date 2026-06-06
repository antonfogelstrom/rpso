import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../hooks/useProfile";
import { apiClient } from "../lib/api";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ProfileCard } from "../components/layout/ProfileCard";

export function DashboardPage() {
  const { playerId, logout } = useAuth();
  const { matches, loading, error } = useProfile(playerId);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [rotatedToken, setRotatedToken] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRotate = async () => {
    setRotating(true);
    try {
      const res = await apiClient.rotateToken();
      setRotatedToken(res.token);
    } catch {
      setShowRotateConfirm(false);
    } finally {
      setRotating(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeRotatedModal = () => {
    setShowRotateConfirm(false);
    setRotatedToken(null);
    setCopied(false);
  };

  if (loading)
    return <p className="text-neutral-500 text-center">Loading...</p>;
  if (error) return <p className="text-red-400 text-center">{error}</p>;

  return (
    <div className="space-y-6">
      <ProfileCard />

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

      <div>
        <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wide">
          Manage user
        </h2>
        <div className="flex justify-start gap-2 mt-4">
          <Button
            type="button"
            variant="secondary"
            className="text-xs px-3 py-1 min-h-0"
            onClick={() => setShowRotateConfirm(true)}
          >
            Generate new token
          </Button>
          <Button
            type="button"
            variant="danger"
            className="text-xs px-3 py-1 min-h-0"
            onClick={() => setShowLogoutConfirm(true)}
          >
            Logout
          </Button>
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="w-full max-w-sm mx-4 space-y-4">
            <p className="text-sm text-neutral-300 leading-relaxed">
              Are you sure you want to logout?
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={logout}>
                Logout
              </Button>
            </div>
          </Card>
        </div>
      )}

      {showRotateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="w-full max-w-sm mx-4 space-y-4">
            <p className="text-sm text-neutral-300 leading-relaxed">
              This will invalidate your current token. Any other devices using
              this token will be logged out. You will be shown the new token
              once — save it in a safe place.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => setShowRotateConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleRotate}
                disabled={rotating}
              >
                {rotating ? "Generating..." : "Continue"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {rotatedToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
            <h2 className="text-xl font-bold">New token generated</h2>

            <p className="text-sm text-neutral-400">
              Your old token has been invalidated. Save your new token in a safe
              place.
            </p>

            <div className="relative bg-neutral-800 rounded p-3 font-mono text-sm select-all overflow-hidden">
              <span className="invisible" aria-hidden="true">
                •
              </span>
              <div className="absolute inset-y-3 left-3 right-3 whitespace-nowrap overflow-hidden after:content-['••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••']"></div>
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => handleCopy(rotatedToken)}
            >
              {copied ? "Copied!" : "Copy token"}
            </Button>

            <Button
              type="button"
              className="w-full"
              onClick={closeRotatedModal}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
