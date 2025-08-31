"use client";
import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

import { PlayerService } from '@/lib/playerService';
import type { PlayerPoolEntry, Week } from '@/types/prd';
import type { PlayerPoolResponse } from '@/lib/playerService';

export default function PlayerPoolPage() {
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [playerPool, setPlayerPool] = useState<PlayerPoolResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  
  // Fetch available years on component mount
  useEffect(() => {
    const fetchAvailableYears = async () => {
      try {
        const weeksResponse = await PlayerService.getWeeks();
        const years = [...new Set(weeksResponse.weeks.map((week: Week) => week.year))].sort((a: number, b: number) => b - a);
        setAvailableYears(years);
        
        // Set the first available year as default if current year is not available
        if (years.length > 0 && !years.includes(yearFilter)) {
          setYearFilter(years[0]);
        }
      } catch (err) {
        console.error('Failed to fetch available years:', err);
      }
    };

    fetchAvailableYears();
  }, [yearFilter]);

  // Fetch weeks when year filter changes
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        setLoading(true);
        const weeksResponse = await PlayerService.getWeeks();
        setWeeks(weeksResponse.weeks);
        
        // Set the Active week as selected, or fall back to the first week if no Active week exists
        if (weeksResponse.weeks.length > 0) {
          const activeWeek = weeksResponse.weeks.find((week: Week) => week.status === 'Active');
          if (activeWeek) {
            setSelectedWeek(activeWeek.id);
          } else {
            setSelectedWeek(weeksResponse.weeks[0].id);
          }
        }
      } catch (err) {
        setError('Failed to fetch weeks');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeeks();
  }, [yearFilter]);

  // Fetch player pool when week changes
  useEffect(() => {
    if (!selectedWeek) return;

    const fetchPlayerPool = async () => {
      try {
        setLoading(true);
        setError(null);
        const poolResponse = await PlayerService.getPlayerPool(selectedWeek);
        setPlayerPool(poolResponse);
      } catch (err) {
        setError('Failed to fetch player pool');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerPool();
  }, [selectedWeek]);

  // Mock data for testing
  const mockPlayerPool = useMemo<PlayerPoolEntry[]>(() => [
    {
      id: 1,
      week_id: 1,
      draftGroup: "test",
      playerDkId: 1,
      projectedPoints: 25.5,
      salary: 8500,
      status: "Active",
      isDisabled: false,
      excluded: false,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
      week: {
        id: 1,
        week_number: 1,
        year: 2024,
        start_date: "2024-09-05",
        end_date: "2024-09-09",
        game_count: 16,
        status: "Active",
        imported_at: "2024-09-05T00:00:00Z",
        created_at: "2024-09-05T00:00:00Z"
      },
      player: {
        playerDkId: 1,
        firstName: "Patrick",
        lastName: "Mahomes",
        displayName: "Patrick Mahomes",
        position: "QB",
        team: "KC",
        created_at: "2024-01-01T00:00:00Z"
      }
    }
  ], []);

  const mockWeeks = useMemo<Week[]>(() => [
    {
      id: 1,
      week_number: 1,
      year: 2024,
      start_date: "2024-09-05",
      end_date: "2024-09-09",
      game_count: 16,
      status: "Active",
      imported_at: "2024-09-05T00:00:00Z",
      created_at: "2024-09-05T00:00:00Z"
    }
  ], []);

  // Use mock data for now
  useEffect(() => {
    setPlayerPool({ entries: mockPlayerPool, total: 1, week_id: 1 });
    setWeeks(mockWeeks);
    setAvailableYears([2024]);
    setLoading(false);
  }, [mockPlayerPool, mockWeeks]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Player Pool</h1>
      
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-red-500 text-center">{error}</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Year</label>
              <Select value={yearFilter.toString()} onValueChange={(value) => setYearFilter(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Week</label>
              <Select value={selectedWeek?.toString() || ""} onValueChange={(value) => setSelectedWeek(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weeks.map(week => (
                    <SelectItem key={week.id} value={week.id.toString()}>
                      Week {week.week_number} - {week.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <Input
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {playerPool && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-xl font-semibold">
                  Player Pool ({playerPool.total} players)
                </h2>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Projected Points</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playerPool.entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.player.displayName}</TableCell>
                      <TableCell>{entry.player.team}</TableCell>
                      <TableCell>{entry.player.position}</TableCell>
                      <TableCell>${entry.salary.toLocaleString()}</TableCell>
                      <TableCell>{entry.projectedPoints || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {entry.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
