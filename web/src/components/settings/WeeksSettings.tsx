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
import { Plus, Calendar, Clock, Edit, Trash2 } from "lucide-react";

interface Week {
  id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  status: "upcoming" | "active" | "completed";
  gamesCount: number;
  season: string;
}

const initialWeeks: Week[] = [
  { id: "1", weekNumber: 1, startDate: "2024-09-05", endDate: "2024-09-09", status: "completed", gamesCount: 16, season: "2024" },
  { id: "2", weekNumber: 2, startDate: "2024-09-12", endDate: "2024-09-16", status: "completed", gamesCount: 16, season: "2024" },
  { id: "3", weekNumber: 3, startDate: "2024-09-19", endDate: "2024-09-23", status: "completed", gamesCount: 16, season: "2024" },
  { id: "4", weekNumber: 4, startDate: "2024-09-26", endDate: "2024-09-30", status: "completed", gamesCount: 16, season: "2024" },
  { id: "5", weekNumber: 5, startDate: "2024-10-03", endDate: "2024-10-07", status: "completed", gamesCount: 16, season: "2024" },
  { id: "6", weekNumber: 6, startDate: "2024-10-10", endDate: "2024-10-14", status: "active", gamesCount: 16, season: "2024" },
  { id: "7", weekNumber: 7, startDate: "2024-10-17", endDate: "2024-10-21", status: "upcoming", gamesCount: 16, season: "2024" },
];

export function WeeksSettings() {
  const [weeks, setWeeks] = useState<Week[]>(initialWeeks);
  const [selectedSeason, setSelectedSeason] = useState<string>("2024");

  const seasons = ["2024", "2023", "2022"];
  
  const filteredWeeks = weeks.filter(week => week.season === selectedSeason);

  const getStatusBadge = (status: Week["status"]) => {
    switch (status) {
      case "upcoming":
        return <Badge variant="outline">Upcoming</Badge>;
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "completed":
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return null;
    }
  };

  const deleteWeek = (id: string) => {
    setWeeks(prev => prev.filter(week => week.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Weeks Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Season Schedule</CardTitle>
          <CardDescription>
            Manage NFL season weeks and game schedules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{weeks.length}</div>
              <div className="text-sm text-muted-foreground">Total Weeks</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">18</div>
              <div className="text-sm text-muted-foreground">Regular Season</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">256</div>
              <div className="text-sm text-muted-foreground">Total Games</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">1</div>
              <div className="text-sm text-muted-foreground">Active Week</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Week Management */}
      <Card>
        <CardHeader>
          <CardTitle>Week Management</CardTitle>
          <CardDescription>
            Add, edit, or remove weeks from the schedule
          </CardDescription>
          <CardAction>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Week
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Filter by Season</label>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              {seasons.map(season => (
                <option key={season} value={season}>
                  {season} Season
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {filteredWeeks.map((week) => (
              <div
                key={week.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-lg">
                    {week.weekNumber}
                  </div>
                  <div>
                    <div className="font-medium">Week {week.weekNumber}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {week.startDate} - {week.endDate}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {week.gamesCount} games
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(week.status)}
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteWeek(week.id)}
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

      {/* Schedule Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Configuration</CardTitle>
          <CardDescription>
            Configure default settings for weeks and games
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Week Settings</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Default Games per Week
                  </label>
                  <input
                    type="number"
                    defaultValue={16}
                    className="w-32 px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Week Start Day
                  </label>
                  <select className="w-32 px-3 py-2 border rounded-md">
                    <option value="thursday">Thursday</option>
                    <option value="sunday">Sunday</option>
                    <option value="monday">Monday</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">Game Settings</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Default Game Time
                  </label>
                  <input
                    type="time"
                    defaultValue="13:00"
                    className="w-32 px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Time Zone
                  </label>
                  <select className="w-32 px-3 py-2 border rounded-md">
                    <option value="EST">Eastern</option>
                    <option value="CST">Central</option>
                    <option value="MST">Mountain</option>
                    <option value="PST">Pacific</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
