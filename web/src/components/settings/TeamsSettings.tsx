import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, MapPin } from "lucide-react";

interface Team {
  id: string;
  name: string;
  abbreviation: string;
  division: string;
  conference: string;
  city: string;
  state: string;
}

const initialTeams: Team[] = [
  { id: "1", name: "Arizona Cardinals", abbreviation: "ARI", division: "NFC West", conference: "NFC", city: "Glendale", state: "AZ" },
  { id: "2", name: "Atlanta Falcons", abbreviation: "ATL", division: "NFC South", conference: "NFC", city: "Atlanta", state: "GA" },
  { id: "3", name: "Baltimore Ravens", abbreviation: "BAL", division: "AFC North", conference: "AFC", city: "Baltimore", state: "MD" },
  { id: "4", name: "Buffalo Bills", abbreviation: "BUF", division: "AFC East", conference: "AFC", city: "Buffalo", state: "NY" },
  { id: "5", name: "Carolina Panthers", abbreviation: "CAR", division: "NFC South", conference: "NFC", city: "Charlotte", state: "NC" },
  { id: "6", name: "Chicago Bears", abbreviation: "CHI", division: "NFC North", conference: "NFC", city: "Chicago", state: "IL" },
];

export function TeamsSettings() {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [selectedDivision, setSelectedDivision] = useState<string>("all");

  const divisions = ["all", "AFC East", "AFC North", "AFC South", "AFC West", "NFC East", "NFC North", "NFC South", "NFC West"];
  
  const filteredTeams = selectedDivision === "all" 
    ? teams 
    : teams.filter(team => team.division === selectedDivision);

  const deleteTeam = (id: string) => {
    setTeams(prev => prev.filter(team => team.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Teams Overview */}
      <Card>
        <CardHeader>
          <CardTitle>NFL Teams</CardTitle>
          <CardDescription>
            Manage NFL teams and their division assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{teams.length}</div>
              <div className="text-sm text-muted-foreground">Total Teams</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">2</div>
              <div className="text-sm text-muted-foreground">Conferences</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">8</div>
              <div className="text-sm text-muted-foreground">Divisions</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">32</div>
              <div className="text-sm text-muted-foreground">Expected Teams</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Management */}
      <Card>
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
          <CardDescription>
            Add, edit, or remove teams from the database
          </CardDescription>
          <CardAction>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Team
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Filter by Division</label>
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              {divisions.map(division => (
                <option key={division} value={division}>
                  {division === "all" ? "All Divisions" : division}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {filteredTeams.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-sm">
                    {team.abbreviation}
                  </div>
                  <div>
                    <div className="font-medium">{team.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      {team.city}, {team.state}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{team.division}</Badge>
                  <Badge variant="outline">{team.conference}</Badge>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTeam(team.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Division Management */}
      <Card>
        <CardHeader>
          <CardTitle>Division Management</CardTitle>
          <CardDescription>
            Configure divisions and their team assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">AFC Divisions</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>AFC East:</span>
                  <span className="text-muted-foreground">4 teams</span>
                </div>
                <div className="flex justify-between">
                  <span>AFC North:</span>
                  <span className="text-muted-foreground">4 teams</span>
                </div>
                <div className="flex justify-between">
                  <span>AFC South:</span>
                  <span className="text-muted-foreground">4 teams</span>
                </div>
                <div className="flex justify-between">
                  <span>AFC West:</span>
                  <span className="text-muted-foreground">4 teams</span>
                </div>
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">NFC Divisions</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>NFC East:</span>
                  <span className="text-muted-foreground">4 teams</span>
                </div>
                <div className="flex justify-between">
                  <span>NFC North:</span>
                  <span className="text-muted-foreground">4 teams</span>
                </div>
                <div className="flex justify-between">
                  <span>NFC South:</span>
                  <span className="text-muted-foreground">4 teams</span>
                </div>
                <div className="flex justify-between">
                  <span>NFC West:</span>
                  <span className="text-muted-foreground">4 teams</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
