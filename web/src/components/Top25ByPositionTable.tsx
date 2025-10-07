"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, ChevronUp, ChevronDown } from "lucide-react";

interface Top25Player {
  player_id: number;
  player_name: string;
  position: string;
  total_projection: number;
  total_dk_points: number;
  games_played: number;
  avg_projection: number;
  avg_dk_points: number;
}

export function Top25ByPositionTable() {
  const [top25Players, setTop25Players] = useState<Top25Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string>("QB");
  const [sortColumn, setSortColumn] = useState<string>("total_dk_points");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Fetch top 25 players by position
  const fetchTop25Players = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.append('position', selectedPosition);
      params.append('limit', '25');
      params.append('sort_by', sortColumn);
      params.append('sort_direction', sortDirection);
      
      const response = await fetch(`/api/player-actuals/top25?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setTop25Players(data.players || []);
    } catch (err) {
      console.error("Error fetching top 25 players:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when position or sorting changes
  useEffect(() => {
    fetchTop25Players();
  }, [selectedPosition, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'QB': return 'bg-blue-100 text-blue-800';
      case 'RB': return 'bg-green-100 text-green-800';
      case 'WR': return 'bg-purple-100 text-purple-800';
      case 'TE': return 'bg-orange-100 text-orange-800';
      case 'DST': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 w-1/2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top 25 by Position
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32">
              <div className="text-lg text-gray-600">Loading top 25 players...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 w-1/2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top 25 by Position
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32">
              <div className="text-lg text-red-600">Error: {error}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-1/2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Top 25 by Position
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Position Filter */}
          <div className="mb-4">
            <Select value={selectedPosition} onValueChange={setSelectedPosition}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="QB">QB</SelectItem>
                <SelectItem value="RB">RB</SelectItem>
                <SelectItem value="WR">WR</SelectItem>
                <SelectItem value="TE">TE</SelectItem>
                <SelectItem value="DST">DST</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Top 25 Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("total_projection")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Projection
                      {sortColumn === "total_projection" && (
                        sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("total_dk_points")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Actual
                      {sortColumn === "total_dk_points" && (
                        sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top25Players.map((player, index) => (
                  <TableRow key={player.player_id}>
                    <TableCell className="font-medium text-gray-500">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link 
                          href={`/profile/${player.player_id}?from=top25`}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          {player.player_name}
                        </Link>
                        <Badge className={`${getPositionColor(player.position)} text-xs`}>
                          {player.position}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {player.total_projection.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {player.total_dk_points.toFixed(1)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Summary Stats */}
          {top25Players.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Players:</span>
                  <span className="ml-2 font-medium">{top25Players.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">Avg Projection:</span>
                  <span className="ml-2 font-medium">
                    {(top25Players.reduce((sum, p) => sum + p.avg_projection, 0) / top25Players.length).toFixed(1)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Avg Actual:</span>
                  <span className="ml-2 font-medium">
                    {(top25Players.reduce((sum, p) => sum + p.avg_dk_points, 0) / top25Players.length).toFixed(1)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Total Games:</span>
                  <span className="ml-2 font-medium">
                    {top25Players.reduce((sum, p) => sum + p.games_played, 0)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
