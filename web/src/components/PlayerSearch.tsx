import { useState } from "react";
// import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Search } from "lucide-react";

interface Player {
  id: number;
  name: string;
  position: string;
  team: string;
  salary: number;
}

interface PlayerSearchProps {
  onPlayerSelect: (player: Player) => void;
}

export function PlayerSearch({ onPlayerSelect }: PlayerSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const mockPlayers = [
    { id: 1, name: "Tua Tagovailoa", position: "QB", team: "MIA", salary: 7200 },
    { id: 2, name: "Saquon Barkley", position: "RB", team: "PHI", salary: 7800 },
    { id: 3, name: "Mike Evans", position: "WR", team: "TB", salary: 7400 },
  ];

  const filteredPlayers = mockPlayers.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Player Search</h1>
        <p className="text-muted-foreground">Search for specific players</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Players</CardTitle>
          <CardDescription>Find players by name, position, or team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md"
              />
            </div>

            <div className="space-y-3">
              {filteredPlayers.map((player) => (
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
