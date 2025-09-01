import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PlayerService } from "@/lib/playerService";
import { PlayerPoolEntry } from "@/types/prd";

interface PlayerProfileProps {
  playerId: string;
}

export function PlayerProfile({ playerId }: PlayerProfileProps) {
  const [playerData, setPlayerData] = useState<PlayerPoolEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // For now, we'll need to get the player from the current week's player pool
        // This is a simplified approach - in a real app, you'd have a dedicated player endpoint
        const response = await PlayerService.getPlayerPool(1, { limit: 1000 });
        const player = response.entries?.find(entry => 
          entry.player.playerDkId.toString() === playerId
        );
        
        if (player) {
          setPlayerData(player);
        } else {
          setError("Player not found");
        }
      } catch (err) {
        setError("Failed to load player data");
        console.error("Error fetching player data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (playerId) {
      fetchPlayerData();
    }
  }, [playerId]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading player data...</p>
        </div>
      </div>
    );
  }

  if (error || !playerData) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/builder">
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Lineup Builder
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-destructive">{error || "Player not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const player = playerData.player;
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/builder">
          <Button variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Lineup Builder
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{player.displayName}</h1>
          <p className="text-muted-foreground">{player.position} • {player.team}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Player Details</CardTitle>
            <CardDescription>Basic player information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Position</label>
                <p className="text-lg">{player.position}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Team</label>
                <p className="text-lg">{player.team}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">DraftKings ID</label>
                <p className="text-lg">{player.playerDkId}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fantasy Information</CardTitle>
            <CardDescription>Salary and projections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Salary</label>
                <p className="text-lg">${playerData.salary?.toLocaleString() || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Projected Points</label>
                <p className="text-lg">{playerData.projectedPoints || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Value</label>
                <p className="text-lg">
                  {playerData.projectedPoints && playerData.salary 
                    ? (playerData.projectedPoints / (playerData.salary / 1000)).toFixed(2)
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {playerData.draftStatAttributes && Object.keys(playerData.draftStatAttributes).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Stats</CardTitle>
            <CardDescription>Detailed player statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(playerData.draftStatAttributes).map(([key, value], index) => (
                <div key={index}>
                  <label className="text-sm font-medium text-muted-foreground">
                    {key}
                  </label>
                  <p className="text-lg">
                    {typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value || 'N/A')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
