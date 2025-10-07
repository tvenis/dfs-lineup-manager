"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Check, X, Minus, Trophy, Target, Clock, ChevronUp, ChevronDown } from "lucide-react";
import { buildApiUrl } from "@/config/api";
import { WeekService } from "@/lib/weekService";
import type { Week } from "@/types/prd";

interface PlayerPropsData {
  week_number: number;
  player_id: number;
  player_name: string;
  opponent: string | null;
  homeoraway: string | null;
  oprk_value: number | null;
  oprk_quality: string | null;
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
  { value: "anytime_td", label: "Anytime TD" },
  { value: "player_tds_1_5", label: "1.5+ Player TDs" },
  { value: "player_pass_yds", label: "Passing Yards" },
  { value: "player_pass_tds", label: "Passing TDs" },
  { value: "player_pass_attempts", label: "Pass Attempts" },
  { value: "player_pass_completions", label: "Pass Completions" },
  { value: "player_rush_yds", label: "Rushing Yards" },
  { value: "player_reception_yds", label: "Receiving Yards" },
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
  const [selectedMarket, setSelectedMarket] = useState<string>("anytime_td");
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [selectedResult, setSelectedResult] = useState<string>("all");
  const [availableBookmakers, setAvailableBookmakers] = useState<string[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<string[]>([]);
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string>("probability");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

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

    // Calculate percentages
    const oversPercentage = totalProps > 0 ? (oversHits / totalProps) * 100 : 0;
    const pushesPercentage = totalProps > 0 ? (pushes / totalProps) * 100 : 0;
    const undersPercentage = totalProps > 0 ? (undersMisses / totalProps) * 100 : 0;
    const notGradedPercentage = totalProps > 0 ? (notGraded / totalProps) * 100 : 0;

    return {
      totalProps,
      oversHits,
      pushes,
      undersMisses,
      notGraded,
      oversPercentage,
      pushesPercentage,
      undersPercentage,
      notGradedPercentage,
    };
  }, [propsData]);

  // Sort the props data based on current sort settings
  const sortedPropsData = useMemo(() => {
    const sorted = [...propsData].sort((a, b) => {
      let aValue: any = a[sortColumn as keyof PlayerPropsData];
      let bValue: any = b[sortColumn as keyof PlayerPropsData];
      
      // Handle null/undefined values
      if (aValue === null || aValue === undefined) aValue = "";
      if (bValue === null || bValue === undefined) bValue = "";
      
      // Handle numeric values
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      
      // Handle string values
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (aStr < bStr) return sortDirection === "asc" ? -1 : 1;
      if (aStr > bStr) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [propsData, sortColumn, sortDirection]);

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
  }, [selectedWeekId, selectedBookmaker, selectedMarket, selectedPlayer, selectedTier, selectedResult]);


  const fetchPlayerProps = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        week: selectedWeekId ? selectedWeekId.toString() : "active",
        bookmaker: selectedBookmaker,
        market: selectedMarket,
        player_name: selectedPlayer !== "all" ? selectedPlayer : "all",
        tier: selectedTier !== "all" ? selectedTier : "all",
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

  const handleWeekChange = (value: string) => {
    setSelectedWeekId(value === "all" ? null : parseInt(value));
  };

  const handleBookmakerChange = (value: string) => {
    setSelectedBookmaker(value);
  };

  const handleMarketChange = (value: string) => {
    setSelectedMarket(value);
  };

  const handlePlayerChange = (value: string) => {
    setSelectedPlayer(value);
  };

  const handleTierChange = (value: string) => {
    setSelectedTier(value);
  };

  const handleResultChange = (value: string) => {
    setSelectedResult(value);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection("asc");
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

  const formatMarket = (market: string | null, outcomePoint: number | null) => {
    if (!market) return "";
    
    // Special case for player_tds_over with 0.5 point = "Anytime TD"
    if (market === "player_tds_over" && outcomePoint === 0.5) {
      return "Anytime TD";
    }
    
    // Special case for player_tds_over with 1.5 point = "1.5+ Player TDs"
    if (market === "player_tds_over" && outcomePoint === 1.5) {
      return "1.5+ Player TDs";
    }
    
    // Find the formatted label from MARKET_OPTIONS
    const marketOption = MARKET_OPTIONS.find(m => m.value === market);
    return marketOption ? marketOption.label : market;
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
            <div className="text-xs text-green-600 mt-1">{summaryStats.oversPercentage.toFixed(2)}%</div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">Pushes</CardTitle>
            <Minus className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-900">{summaryStats.pushes}</div>
            <div className="text-xs text-yellow-600 mt-1">{summaryStats.pushesPercentage.toFixed(2)}%</div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Unders</CardTitle>
            <X className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">{summaryStats.undersMisses}</div>
            <div className="text-xs text-red-600 mt-1">{summaryStats.undersPercentage.toFixed(2)}%</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-50 border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Not Graded</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{summaryStats.notGraded}</div>
            <div className="text-xs text-gray-600 mt-1">{summaryStats.notGradedPercentage.toFixed(2)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        {/* Week Filter */}
        <Select value={selectedWeekId?.toString() || "all"} onValueChange={handleWeekChange}>
          <SelectTrigger>
            <SelectValue placeholder="All Weeks" />
          </SelectTrigger>
          <SelectContent>
            {activeWeekId && <SelectItem value={activeWeekId.toString()}>Week {weeks.find(w => w.id === activeWeekId)?.week_number} (Active)</SelectItem>}
            <SelectItem value="all">All Weeks</SelectItem>
            {weeks.filter(week => week.id !== activeWeekId).map((week) => (
              <SelectItem key={week.id} value={week.id.toString()}>Week {week.week_number}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Player Filter */}
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

        {/* Tier Filter */}
        <Select value={selectedTier} onValueChange={handleTierChange}>
          <SelectTrigger>
            <SelectValue placeholder="All Tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="1">Tier 1</SelectItem>
            <SelectItem value="2">Tier 2</SelectItem>
            <SelectItem value="3">Tier 3</SelectItem>
            <SelectItem value="4">Tier 4</SelectItem>
          </SelectContent>
        </Select>

        {/* Market Filter */}
        <Select value={selectedMarket} onValueChange={handleMarketChange}>
          <SelectTrigger>
            <SelectValue placeholder="All Markets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Markets</SelectItem>
            {MARKET_OPTIONS.map((market) => (
              <SelectItem key={market.value} value={market.value}>{market.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Result Filter */}
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

        {/* Bookmaker Filter */}
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
                <th 
                  className="text-center p-2 font-medium w-16 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort("week_number")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Week
                    {sortColumn === "week_number" && (
                      sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="text-left p-2 font-medium w-32 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort("player_name")}
                >
                  <div className="flex items-center gap-1">
                    Player Name
                    {sortColumn === "player_name" && (
                      sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="text-center p-2 font-medium w-20 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort("opponent")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Opponent
                    {sortColumn === "opponent" && (
                      sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="text-center p-2 font-medium w-16 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort("oprk_value")}
                >
                  <div className="flex items-center justify-center gap-1">
                    OPRK
                    {sortColumn === "oprk_value" && (
                      sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="text-center p-2 font-medium w-24 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort("bookmaker")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Bookmaker
                    {sortColumn === "bookmaker" && (
                      sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="text-center p-2 font-medium w-32 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort("market")}
                >
                  <div className="flex items-center justify-center gap-1">
                    Market
                    {sortColumn === "market" && (
                      sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="text-right p-2 font-medium w-16 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort("outcome_price")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Price
                    {sortColumn === "outcome_price" && (
                      sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="text-right p-2 font-medium w-16 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort("outcome_point")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Prop
                    {sortColumn === "outcome_point" && (
                      sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="text-right p-2 font-medium w-20 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort("probability")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Probability
                    {sortColumn === "probability" && (
                      sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
                <th 
                  className="text-right p-2 font-medium w-24 cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort("actual_value")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Actual Result
                    {sortColumn === "actual_value" && (
                      sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPropsData.map((prop, idx) => (
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
                  <td className="text-center p-2">
                    {(() => {
                      const oprk = formatOPRK(prop.oprk_value, prop.oprk_quality);
                      return oprk === '-' ? '-' : (
                        <span className={oprk.color}>
                          {oprk.value}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="text-center p-2">{prop.bookmaker}</td>
                  <td className="text-center p-2">{formatMarket(prop.market, prop.outcome_point)}</td>
                  <td className="text-right p-2">{prop.outcome_price ?? ''}</td>
                  <td className="text-right p-2">{prop.outcome_point ?? ''}</td>
                  <td className="text-right p-2">
                    {prop.probability != null ? `${prop.probability.toFixed(1)}%` : ''}
                  </td>
                  <td className="text-right p-2">
                    <div className="flex items-center justify-end gap-2">
                      <span>{prop.actual_value != null ? prop.actual_value.toFixed(1) : '-'}</span>
                      {getResultIcon(prop.result_status)}
                    </div>
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
