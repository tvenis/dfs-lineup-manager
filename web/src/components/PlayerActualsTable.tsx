"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Users,
  ChevronUp, 
  ChevronDown,
  Filter
} from "lucide-react";
import { WeekService } from "@/lib/weekService";
import type { Week } from "@/types/prd";

interface PlayerActual {
  player_id: number;
  player_name: string;
  position: string;
  team: string;
  week: number;
  season: number;
  projection: number | null;
  ownership: number | null;
  salary: number | null;
  tier: number | null;
  oprk_value: number | null;
  oprk_quality: string | null;
  dk_points: number | null;
  opponent?: string | null;
  homeoraway?: string | null;
}

interface SummaryStats {
  total_players: number;
  average_dk_score: number;
  top_performers: number;
  low_performers: number;
  position_breakdown: Record<string, number>;
}

export function PlayerActualsTable() {
  const [playerActuals, setPlayerActuals] = useState<PlayerActual[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Week management
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [activeWeekId, setActiveWeekId] = useState<number | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 50;
  
  // Sorting states
  const [sortColumn, setSortColumn] = useState<string>("dk_points");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Fetch weeks on component mount
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const weeksData = await WeekService.getWeeks();
        setWeeks(weeksData.weeks || []);
        
        // Auto-select active week or first week
        const activeWeek = weeksData.weeks?.find((w: Week) => w.status === 'Active');
        if (activeWeek) {
          setActiveWeekId(activeWeek.id);
          setSelectedWeekId(activeWeek.id);
        } else if (weeksData.weeks?.length > 0) {
          setSelectedWeekId(weeksData.weeks[0].id);
        }
      } catch (err) {
        console.error('Error fetching weeks:', err);
      }
    };

    fetchWeeks();
  }, []);

  // Fetch player actuals data
  const fetchPlayerActuals = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (positionFilter !== "all") params.append('position', positionFilter);
      if (selectedWeekId) {
        const selectedWeek = weeks.find(w => w.id === selectedWeekId);
        if (selectedWeek) params.append('week', selectedWeek.week_number.toString());
      }
      if (tierFilter !== "all") params.append('tier', tierFilter);
      if (searchTerm) params.append('search', searchTerm);
      params.append('limit', pageSize.toString());
      params.append('offset', ((currentPage - 1) * pageSize).toString());
      params.append('sort_by', sortColumn);
      params.append('sort_direction', sortDirection);
      
      const response = await fetch(`/api/player-actuals?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPlayerActuals(data);
      
      // Estimate total records (this could be improved with a count endpoint)
      setTotalRecords(data.length === pageSize ? currentPage * pageSize + 1 : currentPage * pageSize);
      setTotalPages(Math.ceil(totalRecords / pageSize));
      
    } catch (err) {
      console.error("Error fetching player actuals:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch player actuals");
    } finally {
      setLoading(false);
    }
  };

  // Fetch summary statistics
  const fetchSummaryStats = async () => {
    try {
      const params = new URLSearchParams();
      if (positionFilter !== "all") params.append('position', positionFilter);
      if (selectedWeekId) {
        const selectedWeek = weeks.find(w => w.id === selectedWeekId);
        if (selectedWeek) params.append('week', selectedWeek.week_number.toString());
      }
      if (tierFilter !== "all") params.append('tier', tierFilter);
      
      const response = await fetch(`/api/player-actuals/summary?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSummaryStats(data);
    } catch (err) {
      console.error("Error fetching summary stats:", err);
    }
  };

  // Fetch data when filters change
  useEffect(() => {
    if (selectedWeekId) {
      fetchPlayerActuals();
      fetchSummaryStats();
    }
  }, [currentPage, selectedWeekId, positionFilter, tierFilter, sortColumn, sortDirection]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1 && selectedWeekId) {
        fetchPlayerActuals();
        fetchSummaryStats();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleWeekChange = (value: string) => {
    setSelectedWeekId(parseInt(value));
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [positionFilter, selectedWeekId, tierFilter]);

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
      case "QB": return "bg-blue-100 text-blue-800";
      case "WR": return "bg-purple-100 text-purple-800";
      case "RB": return "bg-green-100 text-green-800";
      case "TE": return "bg-orange-100 text-orange-800";
      case "K": return "bg-yellow-100 text-yellow-800";
      case "DST": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatOPRK = (oprkValue: number | null, oprkQuality: string | null) => {
    if (oprkValue === null) return '-';
    
    // Derive quality from value if quality is missing
    let derivedQuality: 'High' | 'Medium' | 'Low' = 'Medium';
    if (oprkQuality) {
      derivedQuality = oprkQuality as 'High' | 'Medium' | 'Low';
    } else if (typeof oprkValue === 'number') {
      if (oprkValue <= 10) derivedQuality = 'High';
      else if (oprkValue <= 20) derivedQuality = 'Medium';
      else derivedQuality = 'Low';
    }
    
    const color = derivedQuality === 'High' ? 'text-green-600' : 
                 derivedQuality === 'Low' ? 'text-red-600' : 
                 'text-yellow-600';
    
    return { value: oprkValue, color };
  };

  const formatOpponent = (opponent: string | null | undefined, homeoraway: string | null | undefined) => {
    if (!opponent) return "";
    const prefix = homeoraway === "H" ? "vs " : homeoraway === "A" ? "@ " : "";
    return `${prefix}${opponent}`;
  };

  const getTierLabel = (tier: number | null) => {
    switch (tier) {
      case 1: return "Core/Cash";
      case 2: return "Strong Plays";
      case 3: return "GPP/Ceiling";
      case 4: return "Avoids/Thin";
      default: return "Unknown";
    }
  };

  const getTierColor = (tier: number | null) => {
    switch (tier) {
      case 1: return "bg-green-100 text-green-800";
      case 2: return "bg-blue-100 text-blue-800";
      case 3: return "bg-yellow-100 text-yellow-800";
      case 4: return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading player actuals...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-1/2">
      {/* Summary Cards */}
      {summaryStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Total Players</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{summaryStats.total_players}</div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Avg DK Score</CardTitle>
              <Target className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{summaryStats.average_dk_score}</div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-50 border-emerald-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-700">Top Performers</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-900">{summaryStats.top_performers}</div>
              <div className="text-xs text-emerald-600 mt-1">20+ DK Points</div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">Low Performers</CardTitle>
              <TrendingDown className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">{summaryStats.low_performers}</div>
              <div className="text-xs text-orange-600 mt-1">&lt;5 DK Points</div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">Projection Consistency</CardTitle>
              <Target className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">
                {(() => {
                  if (summaryStats.total_players === 0) return "0.00%";
                  
                  // Calculate weighted average of (actual / projection) for all players
                  const totalActual = playerActuals.reduce((sum, player) => {
                    return sum + (player.dk_points || 0);
                  }, 0);
                  
                  const totalProjection = playerActuals.reduce((sum, player) => {
                    return sum + (player.projection || 0);
                  }, 0);
                  
                  if (totalProjection === 0) return "0.00%";
                  
                  const consistency = (totalActual / totalProjection) * 100;
                  return `${consistency.toFixed(2)}%`;
                })()}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                Actual vs Projected
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Week Filter */}
        <Select value={selectedWeekId?.toString() || ""} onValueChange={handleWeekChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select Week" />
          </SelectTrigger>
          <SelectContent>
            {activeWeekId && <SelectItem value={activeWeekId.toString()}>Week {weeks.find(w => w.id === activeWeekId)?.week_number} (Active)</SelectItem>}
            {weeks.filter(week => week.id !== activeWeekId).map((week) => (
              <SelectItem key={week.id} value={week.id.toString()}>Week {week.week_number}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Position Filter */}
        <Select value={positionFilter} onValueChange={setPositionFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Positions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            <SelectItem value="QB">QB</SelectItem>
            <SelectItem value="RB">RB</SelectItem>
            <SelectItem value="WR">WR</SelectItem>
            <SelectItem value="TE">TE</SelectItem>
            <SelectItem value="DST">DST</SelectItem>
          </SelectContent>
        </Select>

        {/* Tier Filter */}
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="1">Core/Cash</SelectItem>
            <SelectItem value="2">Strong Plays</SelectItem>
            <SelectItem value="3">GPP/Ceiling</SelectItem>
            <SelectItem value="4">Avoids/Thin</SelectItem>
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search players or teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {playerActuals.length} player actuals
          {totalRecords > 0 && ` (${totalRecords} total)`}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("player_name")}
              >
                <div className="flex items-center gap-1">
                  Player Name
                  {sortColumn === "player_name" && (
                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead>Opponent</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("oprk_value")}
              >
                <div className="flex items-center gap-1">
                  OPRK
                  {sortColumn === "oprk_value" && (
                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("salary")}
              >
                <div className="flex items-center gap-1">
                  Salary
                  {sortColumn === "salary" && (
                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("projection")}
              >
                <div className="flex items-center gap-1">
                  Projection
                  {sortColumn === "projection" && (
                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("dk_points")}
              >
                <div className="flex items-center gap-1">
                  Actual DK Score
                  {sortColumn === "dk_points" && (
                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("proj_consistency")}
              >
                <div className="flex items-center gap-1">
                  Proj Consistency
                  {sortColumn === "proj_consistency" && (
                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("act_value")}
              >
                <div className="flex items-center gap-1">
                  Act Value
                  {sortColumn === "act_value" && (
                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort("ownership")}
              >
                <div className="flex items-center gap-1">
                  Ownership
                  {sortColumn === "ownership" && (
                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead>Tier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {playerActuals.map((player) => (
              <TableRow key={`${player.player_id}-${player.week}-${player.season}`}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Link 
                      href={`/profile/${player.player_id}?from=player-actuals`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {player.player_name}
                    </Link>
                    <Badge className={getPositionColor(player.position)}>
                      {player.position}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>{formatOpponent(player.opponent, player.homeoraway)}</TableCell>
                <TableCell>
                  {(() => {
                    const oprk = formatOPRK(player.oprk_value, player.oprk_quality);
                    return oprk === '-' ? '-' : (
                      <span className={oprk.color}>
                        {oprk.value}
                      </span>
                    );
                  })()}
                </TableCell>
                <TableCell>
                  {player.salary ? `$${player.salary.toLocaleString()}` : "-"}
                </TableCell>
                <TableCell>{player.projection ? player.projection.toFixed(1) : "-"}</TableCell>
                <TableCell className="font-medium">
                  {player.dk_points ? player.dk_points.toFixed(1) : "-"}
                </TableCell>
                <TableCell>
                  {(() => {
                    if (player.dk_points && player.projection && player.projection > 0) {
                      const consistency = (player.dk_points / player.projection) * 100;
                      return `${consistency.toFixed(2)}%`;
                    }
                    return "-";
                  })()}
                </TableCell>
                <TableCell>
                  {(() => {
                    if (player.dk_points && player.salary) {
                      const value = player.dk_points / (player.salary / 1000);
                      return value.toFixed(2);
                    }
                    return "-";
                  })()}
                </TableCell>
                <TableCell>
                  {player.ownership ? `${player.ownership.toFixed(1)}%` : "-"}
                </TableCell>
                <TableCell>
                  {player.tier ? player.tier : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {playerActuals.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No player actuals found matching your filters.
        </div>
      )}
    </div>
  );
}