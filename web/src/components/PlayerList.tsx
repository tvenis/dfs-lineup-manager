import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface Player {
  id: number;
  name: string;
  position: string;
  team: string;
  salary: number;
}

interface PlayerListProps {
  onPlayerSelect: (player: Player) => void;
}

export function PlayerList({ onPlayerSelect }: PlayerListProps) {
  const mockPlayers = [
    { id: 1, name: "Tua Tagovailoa", position: "QB", team: "MIA", salary: 7200 },
    { id: 2, name: "Saquon Barkley", position: "RB", team: "PHI", salary: 7800 },
    { id: 3, name: "Mike Evans", position: "WR", team: "TB", salary: 7400 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Player Pool</h1>
        <p className="text-muted-foreground">Browse and select players</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Players</CardTitle>
          <CardDescription>Click on a player to view details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockPlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer"
                onClick={() => onPlayerSelect(player)}
              >
                <div>
                  <div className="font-medium">{player.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {player.position} • {player.team}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">${player.salary.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
