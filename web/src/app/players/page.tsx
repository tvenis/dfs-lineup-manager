"use client";
import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, RotateCcw, ExternalLink, Loader2, Calendar, CalendarDays, Eye, EyeOff } from "lucide-react";

// Temporary mock interfaces to get build working
interface PlayerPoolEntry {
  id: string;
  name: string;
  team: string;
  salary: number;
  position: string;
  status: string;
  excluded: boolean;
  projectedPoints?: number;
  game_info?: string;
  avg_points?: number;
  entry_id: number;
  opponentRank: { value: number; sortValue: number; quality: string };
  player?: {
    name: string;
    team: string;
    position: string;
    player_dk_id: string;
  };
  draftStatAttributes?: {
    value?: number;
    quality?: string;
  };
}

interface Week {
  id: number;
  week_number: number;
  year: number;
  start_date: string;
  end_date: string;
  game_count: number;
  status: 'Completed' | 'Active' | 'Upcoming';
  notes?: string;
  imported_at: string;
  created_at: string;
  updated_at?: string;
}

interface PlayerPoolResponse {
  entries: PlayerPoolEntry[];
  total: number;
  week_id: number;
}

interface WeekFilters {
  year?: number;
  status?: 'Completed' | 'Active' | 'Upcoming';
}

// Temporary mock service
class MockPlayerService {
  static async getWeeks(filters?: WeekFilters): Promise<{ weeks: Week[]; total: number }> {
    return { weeks: [], total: 0 };
  }
  
  static async getPlayerPool(weekId: number, filters: any = {}): Promise<PlayerPoolResponse> {
    return { entries: [], total: 0, week_id: weekId };
  }

  static async updatePlayerPoolEntry(entryId: number, updates: any): Promise<void> {
    // Mock implementation
  }

  static async bulkUpdatePlayerPoolEntries(updates: any[]): Promise<void> {
    // Mock implementation
  }

  static getWeekStatusColor(status: string): string {
    if (status === 'Active') return 'bg-green-100 text-green-800 border-green-200';
    if (status === 'Upcoming') return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'FLEX' | 'DST';

export default function PlayerPoolPage() {
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<Position>('QB');
  const [excludedPlayers, setExcludedPlayers] = useState<Set<string>>(new Set());
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [playerPool, setPlayerPool] = useState<PlayerPoolResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  
  // Sorting state
  const [sortField, setSortField] = useState<'salary' | 'name' | 'team' | 'position' | 'status' | 'projection' | 'opponentRank' | 'value' | 'exclude'>('salary');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showExcluded, setShowExcluded] = useState<boolean>(true);

  // Fetch available years on component mount
  useEffect(() => {
    const fetchAvailableYears = async () => {
      try {
        const weeksResponse = await MockPlayerService.getWeeks();
        const years = [...new Set(weeksResponse.weeks.map(week => week.year))].sort((a, b) => b - a);
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
  }, []);

  // Fetch weeks when year filter changes
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        setLoading(true);
        const weeksResponse = await MockPlayerService.getWeeks({ year: yearFilter });
        setWeeks(weeksResponse.weeks);
        
        // Set the Active week as selected, or fall back to the first week if no Active week exists
        if (weeksResponse.weeks.length > 0) {
          const activeWeek = weeksResponse.weeks.find(week => week.status === 'Active');
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
        const poolResponse = await MockPlayerService.getPlayerPool(selectedWeek, { limit: 1000 });
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
  const mockPlayerPool: PlayerPoolEntry[] = [
    {
      id: "1",
      name: "Patrick Mahomes",
      team: "KC",
      salary: 8500,
      position: "QB",
      status: "Active",
      excluded: false,
      projectedPoints: 25.5,
      entry_id: 1,
      opponentRank: { value: 15, sortValue: 15, quality: "Good" }
    }
  ];

  const mockWeeks: Week[] = [
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
  ];

  // Use mock data for now
  useEffect(() => {
    setPlayerPool({ entries: mockPlayerPool, total: 1, week_id: 1 });
    setWeeks(mockWeeks);
    setAvailableYears([2024]);
    setLoading(false);
  }, []);

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
                      <TableCell>{entry.name}</TableCell>
                      <TableCell>{entry.team}</TableCell>
                      <TableCell>{entry.position}</TableCell>
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
