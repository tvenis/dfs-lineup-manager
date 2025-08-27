import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";

interface GameStyle {
  id: string;
  name: string;
  isActive: boolean;
  salaryCap: number;
  playerCount: number;
}

const initialGameStyles: GameStyle[] = [
  {
    id: "1",
    name: "Classic",
    isActive: true,
    salaryCap: 50000,
    playerCount: 9,
  },
  {
    id: "2",
    name: "Showdown",
    isActive: true,
    salaryCap: 50000,
    playerCount: 6,
  },
  {
    id: "3",
    name: "Tiers",
    isActive: false,
    salaryCap: 50000,
    playerCount: 8,
  },
];

export function DraftKingsSettings() {
  const [gameStyles, setGameStyles] = useState<GameStyle[]>(initialGameStyles);
  const [defaultSalaryCap, setDefaultSalaryCap] = useState(50000);
  const [scoringSystem, setScoringSystem] = useState("Standard");

  const toggleGameStyle = (id: string) => {
    setGameStyles(prev =>
      prev.map(style =>
        style.id === id ? { ...style, isActive: !style.isActive } : style
      )
    );
  };

  const deleteGameStyle = (id: string) => {
    setGameStyles(prev => prev.filter(style => style.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Game Styles Section */}
      <Card>
        <CardHeader>
          <CardTitle>Game Styles</CardTitle>
          <CardDescription>
            Manage available DraftKings game styles and their configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {gameStyles.map((style) => (
              <div
                key={style.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleGameStyle(style.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        style.isActive
                          ? "bg-primary"
                          : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          style.isActive ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                    {style.isActive && (
                      <Badge variant="default">Active</Badge>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{style.name}</div>
                    <div className="text-sm text-muted-foreground">
                      ${style.salaryCap.toLocaleString()} cap • {style.playerCount} players
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteGameStyle(style.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Game Style
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Default Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle>Default Settings</CardTitle>
          <CardDescription>
            Configure default salary cap, scoring system, and other preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Default Salary Cap
              </label>
              <input
                type="number"
                value={defaultSalaryCap}
                onChange={(e) => setDefaultSalaryCap(Number(e.target.value))}
                className="w-48 px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Scoring System
              </label>
              <select
                value={scoringSystem}
                onChange={(e) => setScoringSystem(e.target.value)}
                className="w-48 px-3 py-2 border rounded-md"
              >
                <option value="Standard">Standard</option>
                <option value="PPR">PPR</option>
                <option value="Half PPR">Half PPR</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
