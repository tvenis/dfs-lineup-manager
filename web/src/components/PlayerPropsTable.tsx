"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Check, X, Minus, Trophy, Target, Clock } from "lucide-react";
import { buildApiUrl } from "@/config/api";
import { WeekService } from "@/lib/weekService";
import type { Week } from "@/types/prd";

interface PlayerPropsData {
  week_number: number;
  player_id: number;
  player_name: string;
  opponent: string | null;
  homeoraway: string | null;
  bookmaker: string | null;
  market: string | null;
  outcome_name: string | null;
  outcome_price: number | null;
  outcome_point: number | null;
  probability: number | null;
  actual_value: number | null;
  result_status: string | null;
}

interface PlayerPropsTableProps {}

const MARKET_OPTIONS = [
  { value: "player_tds_over", label: "Player TDs Over" },
  { value: "player_pass_yds", label: "Passing Yards" },
  { value: "player_pass_tds", label: "Passing TDs" },
  { value: "player_pass_attempts", label: "Pass Attempts" },
  { value: "player_pass_comp", label: "Pass Completions" },
  { value: "player_rush_yds", label: "Rushing Yards" },
  { value: "player_rush_tds", label: "Rushing TDs" },
  { value: "player_rec_yds", label: "Receiving Yards" },
  { value: "player_rec_tds", label: "Receiving TDs" },
  { value: "player_receptions", label: "Receptions" },
  { value: "player_rush_attempts", label: "Rush Attempts" },
];

export function PlayerPropsTable({}: PlayerPropsTableProps) {
  const [propsData, setPropsData] = useState<PlayerPropsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [activeWeekId, setActiveWeekId] = useState<number | null>(null);
  const [selectedBookmaker, setSelectedBookmaker] = useState<string>("all");
  const [selectedMarket, setSelectedMarket] = useState<string>("player_tds_over");
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all");
  const [selectedResult, setSelectedResult] = useState<string>("all");
  const [availableBookmakers, setAvailableBookmakers] = useState<string[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<string[]>([]);

  // Calculate summary statistics from filtered props data
  const summaryStats = useMemo(() => {
    let totalProps = propsData.length;
    let oversHits = 0;
    let pushes = 0;
    let undersMisses = 0;
    let notGraded = 0;

    propsData.forEach(prop => {
      const outcomeLower = prop.outcome_name?.toLowerCase() || '';
      
      if (prop.result_status === 'HIT' && outcomeLower.includes('over')) {
        oversHits++;
      } else if (prop.result_status === 'MISS' && outcomeLower.includes('over')) {
        undersMisses++;
      } else if (prop.result_status === 'PUSH') {
        pushes++;
      } else if (prop.result_status === null) {
        notGraded++;
      }
    });

    return {
      totalProps,
      oversHits,
      pushes,
      undersMisses,
      notGraded,
    };
  }, [propsData]);

  // Fetch weeks on component mount (battle-tested pattern)
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

  // Fetch data when filters change
  useEffect(() => {
    if (selectedWeekId) {
      fetchPlayerProps();
    }
  }, [selectedWeekId, selectedBookmaker, selectedMarket, selectedPlayer, selectedResult]);


  const fetchPlayerProps = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        week: selectedWeekId ? selectedWeekId.toString() : "active",
        bookmaker: selectedBookmaker,
        market: selectedMarket,
        player_name: selectedPlayer !== "all" ? selectedPlayer : "all",
        result_status: selectedResult !== "all" ? selectedResult : "all",
      });

      const response = await fetch(buildApiUrl(`/api/leaderboard/player-props?${params}`));
      if (response.ok) {
        const data = await response.json();
        setPropsData(data);
        
      // Extract unique bookmakers and players from the data
      const bookmakers = [...new Set(data.map((p: any) => p.bookmaker).filter(Boolean))].sort() as string[];
      setAvailableBookmakers(bookmakers);
      
      const players = [...new Set(data.map((p: any) => p.player_name).filter(Boolean))].sort() as string[];
      setAvailablePlayers(players);
      } else {
        console.error("Failed to fetch player props");
        setPropsData([]);
      }
    } catch (error) {
      console.error("Error fetching player props:", error);
      setPropsData([]);
    } finally {
      setLoading(false);
    }
  };

  const getResultIcon = (resultStatus: string | null) => {
    switch (resultStatus) {
      case "HIT":
        return <Check className="h-4 w-4 text-green-600" />;
      case "MISS":
        return <X className="h-4 w-4 text-red-600" />;
      case "PUSH":
        return <Minus className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const formatOpponent = (opponent: string | null, homeoraway: string | null) => {
    if (!opponent) return "";
    const prefix = homeoraway === "H" ? "vs " : homeoraway === "A" ? "@ " : "";
    return `${prefix}${opponent}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Loading player props...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-1/2">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Total Props</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{summaryStats.totalProps}</div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Overs</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{summaryStats.oversHits}</div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">Pushes</CardTitle>
            <Minus className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-900">{summaryStats.pushes}</div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Unders</CardTitle>
            <X className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">{summaryStats.undersMisses}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50 border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Not Graded</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{summaryStats.notGraded}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <Select value={selectedWeekId?.toString() || "all"} onValueChange={handleWeekChange}>
          <SelectTrigger>
            <SelectValue placeholder="All Weeks" />
          </SelectTrigger>
          <SelectContent>
            {activeWeekId && <SelectItem value={activeWeekId.toString()}>Week {weeks.find(w => w.id === activeWeekId)?.week_number} (Active)</SelectItem>}
            <SelectItem value="all">All Weeks</SelectItem>
            {weeks.map((week) => (
              <SelectItem key={week.id} value={week.id.toString()}>Week {week.week_number}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedBookmaker} onValueChange={handleBookmakerChange}>
          <SelectTrigger>
            <SelectValue placeholder="All Bookmakers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Bookmakers</SelectItem>
            {availableBookmakers.map((bookmaker) => (
              <SelectItem key={bookmaker} value={bookmaker}>{bookmaker}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedMarket} onValueChange={handleMarketChange}>
          <SelectTrigger>
            <SelectValue placeholder="All Markets" />
          </SelectTrigger>
          <SelectContent>
            {MARKET_OPTIONS.map((market) => (
              <SelectItem key={market.value} value={market.value}>{market.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedPlayer} onValueChange={handlePlayerChange}>
          <SelectTrigger>
            <SelectValue placeholder="All Players" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Players</SelectItem>
            {availablePlayers.map((player) => (
              <SelectItem key={player} value={player}>{player}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedResult} onValueChange={handleResultChange}>
          <SelectTrigger>
            <SelectValue placeholder="All Results" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Results</SelectItem>
            <SelectItem value="HIT">HIT</SelectItem>
            <SelectItem value="MISS">MISS</SelectItem>
            <SelectItem value="PUSH">PUSH</SelectItem>
            <SelectItem value="NULL">NOT GRADED</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {propsData.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No player props data available for the selected filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-center p-2 font-medium w-16">Week</th>
                <th className="text-left p-2 font-medium w-32">Player Name</th>
                <th className="text-center p-2 font-medium w-20">Opponent</th>
                <th className="text-center p-2 font-medium w-24">Bookmaker</th>
                <th className="text-center p-2 font-medium w-32">Market</th>
                <th className="text-right p-2 font-medium w-16">Price</th>
                <th className="text-right p-2 font-medium w-16">Point</th>
                <th className="text-right p-2 font-medium w-20">Probability</th>
                <th className="text-right p-2 font-medium w-20">Actual Result</th>
                <th className="text-center p-2 font-medium w-20">Result</th>
              </tr>
            </thead>
            <tbody>
              {propsData.map((prop, idx) => (
                <tr key={`${prop.week_number}-${idx}-${prop.player_id}-${prop.market}`} className="border-b hover:bg-gray-50">
                  <td className="text-center p-2">{prop.week_number}</td>
                  <td className="text-left p-2">
                    <Link 
                      href={`/profile/${prop.player_id}?from=player-props`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {prop.player_name}
                    </Link>
                  </td>
                  <td className="text-center p-2">{formatOpponent(prop.opponent, prop.homeoraway)}</td>
                  <td className="text-center p-2">{prop.bookmaker}</td>
                  <td className="text-center p-2">{prop.market}</td>
                  <td className="text-right p-2">{prop.outcome_price ?? ''}</td>
                  <td className="text-right p-2">{prop.outcome_point ?? ''}</td>
                  <td className="text-right p-2">
                    {prop.probability != null ? `${prop.probability.toFixed(1)}%` : ''}
                  </td>
                  <td className="text-right p-2">
                    {prop.actual_value != null ? prop.actual_value.toFixed(1) : '-'}
                  </td>
                  <td className="text-center p-2">
                    {getResultIcon(prop.result_status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
