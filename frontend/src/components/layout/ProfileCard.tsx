import { useState, useEffect } from "react";
import { Card } from "../ui/Card";
import { useAuth } from "../../context/AuthContext";
import { useProfile } from "../../hooks/useProfile";
import { Badge } from "../ui/Badge";

export function ProfileCard() {
  const { playerId, username } = useAuth();
  const { profile, error } = useProfile(playerId);
  const [phase, setPhase] = useState<"skeleton" | "transition" | "loaded">(
    profile ? "loaded" : "skeleton",
  );

  useEffect(() => {
    if (profile && phase === "skeleton") {
      setPhase("transition");
      const timer = setTimeout(() => {
        setPhase("loaded");
      }, 100);

      return () => clearTimeout(timer);
    }

    if (!profile && phase !== "skeleton") {
      setPhase("skeleton");
    }
  }, [profile]);

  if (!playerId) return null;
  if (error) {
    return (
      <Card className="space-y-2">
        <p className="text-red-400">Failed to load profile</p>
      </Card>
    );
  }

  return (
    <div className="relative">
      {phase !== "loaded" && (
        <div
          className={
            phase === "transition" ? "absolute inset-0 pointer-events-none" : ""
          }
        >
          <Card className={`space-y-2 animate-pulse opacity-75`}>
            <div className="flex items-center justify-between">
              <div className="h-5 my-1 w-72 rounded-full bg-neutral-700" />
              <div className="h-5 w-24 rounded-full bg-neutral-700" />
            </div>
            <div className="flex gap-4 text-sm">
              <div className="h-5 w-16 rounded-full bg-neutral-700" />
              <div className="h-5 w-16 rounded-full bg-neutral-700" />
              <div className="h-5 w-16 rounded-full bg-neutral-700" />
              <div className="h-5 w-20 rounded-full bg-neutral-700" />
            </div>
          </Card>
        </div>
      )}
      {profile && phase !== "skeleton" && (
        <Card
          className={`space-y-2 transition-all duration-300 ease-in ${
            phase === "transition" ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold">
              {profile.username ?? username}
            </p>
            <Badge variant="neutral">Rating: {profile.rating}</Badge>
          </div>
          <div className="flex gap-4 text-sm">
            <Badge variant="win">{profile.wins}W</Badge>
            <Badge variant="loss">{profile.losses}L</Badge>
            <Badge variant="draw">{profile.draws}D</Badge>
            <Badge variant="neutral">{profile.total_matches} total</Badge>
          </div>
        </Card>
      )}
    </div>
  );
}
