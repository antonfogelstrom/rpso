import { Card } from "../ui/Card";
import { useAuth } from "../../context/AuthContext";
import { useProfile } from "../../hooks/useProfile";
import { Badge } from "../ui/Badge";

export function Profilecard() {
  const { playerId, username } = useAuth();
  const { profile } = useProfile(playerId);

  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold">{profile?.username ?? username}</p>
        <Badge variant="neutral">Rating: {profile?.rating}</Badge>
      </div>
      <div className="flex gap-4 text-sm">
        <Badge variant="win">{profile?.wins}W</Badge>
        <Badge variant="loss">{profile?.losses}L</Badge>
        <Badge variant="draw">{profile?.draws}D</Badge>
        <Badge variant="neutral">{profile?.total_matches} total</Badge>
      </div>
    </Card>
  );
}
