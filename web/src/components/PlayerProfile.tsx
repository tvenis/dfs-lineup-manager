import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ArrowLeft } from "lucide-react";

interface Player {
  id: number;
  name: string;
  position: string;
  team: string;
  salary: number;
}

interface PlayerProfileProps {
  player: Player;
  onBack: () => void;
}

export function PlayerProfile({ player, onBack }: PlayerProfileProps) {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{player.name}</h1>
          <p className="text-muted-foreground">{player.position} • {player.team}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Player Details</CardTitle>
          <CardDescription>Comprehensive player information</CardDescription>
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
              <label className="text-sm font-medium text-muted-foreground">Salary</label>
              <p className="text-lg">${player.salary.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
