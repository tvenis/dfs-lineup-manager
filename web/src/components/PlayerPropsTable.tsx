"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Check, X, Minus, Trophy } from "lucide-react";
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
  const [availableBookmakers, setAvailableBookmakers] = useState<string[]>([]);

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
  }, [selectedWeekId, selectedBookmaker, selectedMarket]);


  const fetchPlayerProps = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        week: selectedWeekId ? selectedWeekId.toString() : "active",
        bookmaker: selectedBookmaker,
        market: selectedMarket,
      });

      const response = await fetch(buildApiUrl(`/api/leaderboard/player-props?${params}`));
      if (response.ok) {
        const data = await response.json();
        setPropsData(data);
        
        // Extract unique bookmakers from the data
        const bookmakers = [...new Set(data.map((p: any) => p.bookmaker).filter(Boolean))].sort() as string[];
        setAvailableBookmakers(bookmakers);
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
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-shrink-0">
          <label htmlFor="week-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select Week:
          </label>
          <select
            id="week-select"
            value={selectedWeekId || ''}
            onChange={(e) => setSelectedWeekId(Number(e.target.value))}
            className="block w-auto min-w-[200px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={weeks.length === 0}
          >
            {weeks.length === 0 ? (
              <option value="">Loading weeks...</option>
            ) : (
              weeks.map((week) => (
                <option key={week.id} value={week.id}>
                  Week {week.week_number} - {week.year}{week.id === activeWeekId ? ' (Active)' : ''}
                </option>
              ))
            )}
          </select>
        </div>

        <Select value={selectedBookmaker} onValueChange={setSelectedBookmaker}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Bookmaker" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Bookmakers</SelectItem>
            {availableBookmakers.map((bookmaker) => (
              <SelectItem key={bookmaker} value={bookmaker}>
                {bookmaker}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedMarket} onValueChange={setSelectedMarket}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Market" />
          </SelectTrigger>
          <SelectContent>
            {MARKET_OPTIONS.map((market) => (
              <SelectItem key={market.value} value={market.value}>
                {market.label}
              </SelectItem>
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
                <th className="text-center p-2 font-medium">Week</th>
                <th className="text-left p-2 font-medium">Player Name</th>
                <th className="text-center p-2 font-medium">Opponent</th>
                <th className="text-center p-2 font-medium">Bookmaker</th>
                <th className="text-center p-2 font-medium">Market</th>
                <th className="text-right p-2 font-medium">Price</th>
                <th className="text-right p-2 font-medium">Point</th>
                <th className="text-right p-2 font-medium">Probability</th>
                <th className="text-right p-2 font-medium">Actual Result</th>
                <th className="text-center p-2 font-medium">Result</th>
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
