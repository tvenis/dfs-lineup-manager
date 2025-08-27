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
import { PlayerService, PlayerPoolResponse, Week, WeekFilters } from "@/lib/playerService";
import { PlayerPoolEntry } from "@/types/prd";

type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'FLEX' | 'DST';

interface Player {
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
}

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
        const weeksResponse = await PlayerService.getWeeks();
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
        const weeksResponse = await PlayerService.getWeeks({ year: yearFilter });
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
        const poolResponse = await PlayerService.getPlayerPool(selectedWeek, { limit: 1000 });
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

  // Sorting function
  const sortPlayers = (players: Player[]) => {
    return [...players].sort((a, b) => {
      let aValue: string | number, bValue: string | number;
      
      switch (sortField) {
        case 'salary':
          aValue = a.salary;
          bValue = b.salary;
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'team':
          aValue = a.team.toLowerCase();
          bValue = b.team.toLowerCase();
          break;
        case 'position':
          aValue = a.position;
          bValue = b.position;
          break;
        case 'status':
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        case 'projection':
          aValue = a.projectedPoints || 0;
          bValue = b.projectedPoints || 0;
          break;
        case 'opponentRank':
          // Parse sortValue as number, fallback to value, then to 0
          const aSortValue = typeof a.opponentRank.sortValue === 'string' ? parseInt(a.opponentRank.sortValue, 10) : a.opponentRank.sortValue;
          const bSortValue = typeof b.opponentRank.sortValue === 'string' ? parseInt(b.opponentRank.sortValue, 10) : b.opponentRank.sortValue;
          aValue = aSortValue || 0;
          bValue = bSortValue || 0;
          break;
        case 'value':
          // Value = Projected Points / (Salary / 1000)
          aValue = a.projectedPoints && a.salary ? (a.projectedPoints / (a.salary / 1000)) : 0;
          bValue = b.projectedPoints && b.salary ? (b.projectedPoints / (b.salary / 1000)) : 0;
          break;
        case 'exclude':
          aValue = a.excluded ? 1 : 0;
          bValue = b.excluded ? 1 : 0;
          break;
        default:
          aValue = a.salary;
          bValue = b.salary;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  };

  // Transform player pool data to match the component structure
  const players = useMemo(() => {
            if (!playerPool) return { QB: [], RB: [], WR: [], TE: [], DST: [], FLEX: [] };

    const transformed: Record<Position, Player[]> = {
      QB: [],
      RB: [],
      WR: [],
      TE: [],
      DST: [],
      FLEX: []
    };

    playerPool.entries.forEach((entry) => {
      const position = entry.player.position?.toUpperCase();
      if (position) {
        let targetPosition: Position;
        
        // Map DST position
        if (position === 'DST') {
          targetPosition = 'DST';
        } else if (position === 'QB' || position === 'RB' || position === 'WR' || position === 'TE') {
          targetPosition = position as Position;
        } else {
          return; // Skip unknown positions
        }

        const player: Player = {
          id: entry.player.playerDkId.toString(),
          name: entry.player.displayName,
          team: entry.player.team,
          salary: entry.salary,
          position: position,
          status: entry.status || 'Available',
          excluded: entry.excluded || false,
          projectedPoints: entry.projectedPoints || 0, // Use actual projection data from API
          opponentRank: (() => {
            // Search through draftStatAttributes array for opponent rank (id: -2)
            if (entry.draftStatAttributes && Array.isArray(entry.draftStatAttributes)) {
                for (const attr of entry.draftStatAttributes) {
                    if (typeof attr === 'object' && attr !== null && attr.id === -2) {
                        return {
                            value: attr.value || 0,
                            sortValue: attr.sortValue || 0,
                            quality: attr.quality || 'Medium'
                        };
                    }
                }
            }
            return { value: 0, sortValue: 0, quality: 'Medium' };
          })(),
          avg_points: 0, // Not available in current data
          entry_id: entry.id
        };
        
        transformed[targetPosition].push(player);
      }
    });

    // Apply sorting to each position
    Object.keys(transformed).forEach((position) => {
      transformed[position as Position] = sortPlayers(transformed[position as Position]);
    });

    return transformed;
  }, [playerPool, sortField, sortDirection]);

  // Get FLEX players (RB, WR, TE combined and sorted by projected points)
  const getFlexPlayers = () => {
    return [...players.RB, ...players.WR, ...players.TE].sort((a, b) => 
      (b.projectedPoints || 0) - (a.projectedPoints || 0)
    );
  };

  // Get current players based on active tab
  const getCurrentPlayers = () => {
    if (activeTab === 'FLEX') {
      return getFlexPlayers();
    }
    return players[activeTab] || [];
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-50 text-gray-700 border-gray-200';
    
    switch (status.toLowerCase()) {
      case 'available': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'questionable': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'doubtful': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'out': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Handle column sorting
  const handleSort = (field: 'salary' | 'name' | 'team' | 'position' | 'status' | 'projection' | 'opponentRank' | 'value' | 'exclude') => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default direction
      if (field === 'salary' || field === 'projection' || field === 'value') {
        setSortDirection('desc'); // Higher values first for these fields
      } else if (field === 'opponentRank') {
        setSortDirection('asc'); // Lower rank numbers first (better matchup)
      } else if (field === 'exclude') {
        setSortDirection('asc'); // Excluded players (1) after available players (0)
      } else {
        setSortDirection('asc'); // Alphabetical order for text fields
      }
      setSortField(field);
    }
  };

  // Get sort indicator for column headers
  const getSortIndicator = (field: 'salary' | 'name' | 'team' | 'position' | 'status' | 'projection' | 'opponentRank' | 'value' | 'exclude') => {
    if (sortField !== field) return null;
    
    return (
      <span className="text-[var(--color-primary)] font-bold">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  const togglePlayerExclusion = async (playerId: string) => {
    const player = getCurrentPlayers().find(p => p.id === playerId);
    if (!player) return;

    const newExcluded = !player.excluded;
    
    try {
      await PlayerService.updatePlayerPoolEntry(player.entry_id, {
        excluded: newExcluded
      });

      // Update local state
      setExcludedPlayers(prev => {
        const newSet = new Set(prev);
        if (newExcluded) {
          newSet.add(playerId);
        } else {
          newSet.delete(playerId);
        }
        return newSet;
      });

      // Refresh player pool to get updated data
      if (selectedWeek) {
        const poolResponse = await PlayerService.getPlayerPool(selectedWeek, { limit: 1000 });
        setPlayerPool(poolResponse);
      }
    } catch (err) {
      console.error('Failed to update player exclusion:', err);
      // You might want to show a toast notification here
    }
  };

  const resetExclusions = async (position: Position) => {
    const playersToUpdate = position === 'FLEX' ? getFlexPlayers() : players[position];
    
    // If excluded players are hidden, only reset visible excluded players
    const playersToReset = showExcluded 
      ? playersToUpdate.filter(player => player.excluded)
      : playersToUpdate.filter(player => player.excluded && filteredPlayers.some(fp => fp.id === player.id));
    
    if (playersToReset.length === 0) return;
    
    try {
      const updates = playersToReset.map(player => ({
        entry_id: player.entry_id,
        excluded: false
      }));

      await PlayerService.bulkUpdatePlayerPoolEntries(updates);

      // Update local state
      const newExcluded = new Set(excludedPlayers);
      playersToReset.forEach(player => {
        newExcluded.delete(player.id);
      });
      setExcludedPlayers(newExcluded);

      // Refresh player pool
      if (selectedWeek) {
        const poolResponse = await PlayerService.getPlayerPool(selectedWeek, { limit: 1000 });
        setPlayerPool(poolResponse);
      }
    } catch (err) {
      console.error('Failed to reset exclusions:', err);
    }
  };

  const currentPlayers = getCurrentPlayers();
  const filteredPlayers = currentPlayers.filter(player => {
    // First filter by search term
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.team.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Then filter by excluded status if showExcluded is false
    if (!showExcluded && player.excluded) {
      return false;
    }
    
    return matchesSearch;
  });

  const excludedCount = currentPlayers.filter(player => player.excluded).length;
  const visibleExcludedCount = filteredPlayers.filter(player => player.excluded).length;
  const totalPlayers = currentPlayers.length;

  const onPlayerSelect = (player: Player) => {
    // Handle player selection - could open a modal or navigate to player details
    console.log('Selected player:', player);
  };

  const selectedWeekData = weeks.find(w => w.id === selectedWeek);

  if (loading && !playerPool) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-6 flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading player pool...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="text-center py-12">
            <div className="text-red-600 text-lg mb-4">
              Error: {error}
            </div>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Player Pool</h2>
              <div className="flex items-center gap-2">
                <Select value={yearFilter.toString()} onValueChange={(value) => setYearFilter(parseInt(value))}>
                  <SelectTrigger className="w-24">
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
                <Select value={selectedWeek?.toString() || ''} onValueChange={(value) => setSelectedWeek(parseInt(value))} disabled={loading}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select Week" />
                  </SelectTrigger>
                  <SelectContent>
                    {weeks.map((week) => (
                      <SelectItem key={week.id} value={week.id.toString()}>
                        <div className="flex items-center gap-2">
                          <span>Week {week.week_number}</span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${PlayerService.getWeekStatusColor(week.status)}`}
                          >
                            {week.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedWeekData && (
              <div className="flex items-center gap-4 text-sm text-[var(--color-text-secondary)]">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(selectedWeekData.start_date).toLocaleDateString()} - {new Date(selectedWeekData.end_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <CalendarDays className="w-4 h-4" />
                  <span>{selectedWeekData.game_count} games</span>
                </div>
                <Badge 
                  variant="outline" 
                  className={PlayerService.getWeekStatusColor(selectedWeekData.status)}
                >
                  {selectedWeekData.status}
                </Badge>
              </div>
            )}
            <p className="text-[var(--color-text-secondary)]">Manage player exclusions and view detailed information</p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExcluded(!showExcluded)}
              className="gap-2"
            >
              {showExcluded ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Hide Excluded
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Show Excluded
                </>
              )}
            </Button>
            
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-tertiary)] w-4 h-4" />
              <Input
                placeholder="Search players or teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Position Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Position)}>
          <div className="border border-[var(--color-border-primary)] rounded-lg overflow-hidden">
            <TabsList className="w-full h-auto p-0 bg-[var(--color-bg-secondary)] rounded-none">
              <TabsTrigger 
                value="QB" 
                className="flex-1 gap-2 px-4 py-4 rounded-none data-[state=active]:bg-[var(--color-bg-primary)] data-[state=active]:shadow-sm border-r border-[var(--color-border-primary)]"
              >
                <span className="font-medium">QB</span>
                <Badge variant="secondary" className="text-xs">
                  {players.QB.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="RB" 
                className="flex-1 gap-2 px-4 py-4 rounded-none data-[state=active]:bg-[var(--color-bg-primary)] data-[state=active]:shadow-sm border-r border-[var(--color-border-primary)]"
              >
                <span className="font-medium">RB</span>
                <Badge variant="secondary" className="text-xs">
                  {players.RB.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="WR" 
                className="flex-1 gap-2 px-4 py-4 rounded-none data-[state=active]:bg-[var(--color-bg-primary)] data-[state=active]:shadow-sm border-r border-[var(--color-border-primary)]"
              >
                <span className="font-medium">WR</span>
                <Badge variant="secondary" className="text-xs">
                  {players.WR.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="TE" 
                className="flex-1 gap-2 px-4 py-4 rounded-none data-[state=active]:bg-[var(--color-bg-primary)] data-[state=active]:shadow-sm border-r border-[var(--color-border-primary)]"
              >
                <span className="font-medium">TE</span>
                <Badge variant="secondary" className="text-xs">
                  {players.TE.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="FLEX" 
                className="flex-1 gap-2 px-4 py-4 rounded-none data-[state=active]:bg-[var(--color-bg-primary)] data-[state=active]:shadow-sm border-r border-[var(--color-border-primary)]"
              >
                <span className="font-medium">FLEX</span>
                <Badge variant="secondary" className="text-xs">
                  {getFlexPlayers().length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="DST" 
                className="flex-1 gap-2 px-4 py-4 rounded-none data-[state=active]:bg-[var(--color-bg-primary)] data-[state=active]:shadow-sm"
              >
                                  <span className="font-medium">DST</span>
                <Badge variant="secondary" className="text-xs">
                                      {players.DST.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {(['QB', 'RB', 'WR', 'TE', 'FLEX', 'DST'] as Position[]).map((position) => (
              <TabsContent key={position} value={position} className="m-0 border-t border-[var(--color-border-primary)]">
                {/* Tab Actions */}
                <div className="flex items-center justify-between px-6 py-4 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border-primary)]">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="gap-1">
                      <span className="w-2 h-2 rounded-full bg-[var(--color-text-tertiary)]"></span>
                      {visibleExcludedCount} of {totalPlayers} excluded
                    </Badge>
                    {visibleExcludedCount > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <X className="w-3 h-3" />
                        {visibleExcludedCount} excluded
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => resetExclusions(position)}
                      disabled={visibleExcludedCount === 0}
                      className="gap-2"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </Button>
                  </div>
                </div>

                {/* Sort Info */}
                <div className="flex items-center justify-between mb-4 text-sm text-[var(--color-text-tertiary)]">
                  <div className="flex items-center gap-2">
                    <span>Sorted by:</span>
                    <Badge variant="outline" className="text-xs">
                      {sortField.charAt(0).toUpperCase() + sortField.slice(1)} {sortDirection === 'asc' ? '↑' : '↓'}
                    </Badge>
                  </div>
                  <div className="text-xs">
                    Click column headers to sort
                  </div>
                </div>

                {/* Player Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-0 bg-[var(--color-bg-secondary)]">
                        <TableHead 
                          className="w-44 py-3 cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors select-none group"
                          onClick={() => handleSort('name')}
                          title="Click to sort by Player name"
                        >
                          <div className="flex items-center gap-2">
                            Player {getSortIndicator('name')}
                            <span className="text-xs text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity">↕</span>
                          </div>
                        </TableHead>
                        <TableHead 
                          className="w-16 py-3 cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors select-none group"
                          onClick={() => handleSort('team')}
                          title="Click to sort by Team"
                        >
                          <div className="flex items-center gap-2">
                            Team {getSortIndicator('team')}
                            <span className="text-xs text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity">↕</span>
                          </div>
                        </TableHead>
                        <TableHead 
                          className="w-24 text-right py-3 cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors select-none group"
                          onClick={() => handleSort('salary')}
                          title="Click to sort by Salary (default: highest first)"
                        >
                          <div className="flex items-center justify-end gap-2">
                            Salary {getSortIndicator('salary')}
                            <span className="text-xs text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity">↕</span>
                          </div>
                        </TableHead>
                        <TableHead 
                          className="w-20 text-right py-3 cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors select-none group"
                          onClick={() => handleSort('projection')}
                          title="Click to sort by Projected Points (default: highest first)"
                        >
                          <div className="flex items-center justify-end gap-2">
                            Projection {getSortIndicator('projection')}
                            <span className="text-xs text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity">↕</span>
                          </div>
                        </TableHead>
                        <TableHead 
                          className="w-20 text-right py-3 cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors select-none group"
                          onClick={() => handleSort('opponentRank')}
                          title="Click to sort by Opponent Rank"
                        >
                          <div className="flex items-center justify-end gap-2">
                            Opponent Rank {getSortIndicator('opponentRank')}
                            <span className="text-xs text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity">↕</span>
                          </div>
                        </TableHead>
                        <TableHead 
                          className="w-20 text-right py-3 cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors select-none group"
                          onClick={() => handleSort('value')}
                          title="Click to sort by Value (default: highest first)"
                        >
                          <div className="flex items-center justify-end gap-2">
                            Value {getSortIndicator('value')}
                            <span className="text-xs text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity">↕</span>
                          </div>
                        </TableHead>
                        <TableHead 
                          className="w-24 py-3 cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors select-none group"
                          onClick={() => handleSort('status')}
                          title="Click to sort by Status"
                        >
                          <div className="flex items-center gap-2">
                            Status {getSortIndicator('status')}
                            <span className="text-xs text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity">↕</span>
                          </div>
                        </TableHead>
                        <TableHead 
                          className="w-16 py-3 cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors select-none group"
                          onClick={() => handleSort('exclude')}
                          title="Click to sort by Exclusion Status"
                        >
                          <div className="flex items-center gap-2">
                            Exclude {getSortIndicator('exclude')}
                            <span className="text-xs text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity">↕</span>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPlayers.map((player, index) => (
                        <TableRow 
                          key={player.id}
                          className={`
                            ${player.excluded ? 'opacity-50 bg-[var(--color-bg-secondary)]' : ''} 
                            hover:bg-[var(--color-bg-secondary)] transition-colors
                            ${index !== filteredPlayers.length - 1 ? 'border-b border-[var(--color-border-primary)]' : 'border-b-0'}
                          `}
                        >
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onPlayerSelect(player)}
                                className="flex items-center gap-2 text-left hover:text-[var(--color-primary)] transition-colors group"
                              >
                                <span className={`${player.excluded ? 'line-through' : ''} group-hover:underline`}>
                                  {player.name}
                                </span>
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                              {player.excluded && <X className="w-4 h-4 text-destructive ml-1" />}
                              {position === 'FLEX' && (
                                <Badge variant="outline" className="text-xs ml-2">
                                  {players.RB.find(p => p.id === player.id) ? 'RB' : 
                                   players.WR.find(p => p.id === player.id) ? 'WR' : 'TE'}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 font-medium text-[var(--color-text-secondary)]">
                            {player.team}
                          </TableCell>
                          <TableCell className="py-3 text-right font-medium">
                            ${player.salary.toLocaleString()}
                          </TableCell>
                          <TableCell className="py-3 text-right font-medium">
                            {player.projectedPoints || 0}
                          </TableCell>
                          <TableCell className="py-3 text-right font-medium">
                            <span className={
                              player.opponentRank.quality === 'High' ? 'text-green-600' :
                              player.opponentRank.quality === 'Low' ? 'text-red-600' :
                              'text-black'
                            }>
                              {player.opponentRank.value || 0}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-right font-medium">
                            {player.salary > 0 ? ((player.projectedPoints || 0) / player.salary * 1000).toFixed(1) : '0.0'}
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge 
                              variant="outline" 
                              className={`${getStatusColor(player.status)} text-xs font-medium`}
                            >
                              {player.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3">
                            <Checkbox
                              checked={player.excluded}
                              onCheckedChange={() => togglePlayerExclusion(player.id)}
                              className="opacity-60 hover:opacity-100"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {filteredPlayers.length === 0 && (
                  <div className="text-center py-12 text-[var(--color-text-tertiary)]">
                    <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p>No players found matching your search criteria.</p>
                    <p className="text-sm mt-1">Try adjusting your search terms.</p>
                  </div>
                )}
              </TabsContent>
            ))}
          </div>
        </Tabs>

        {/* Empty State - when no players exist */}
        {Object.values(players).every(pos => pos.length === 0) && (
          <div className="text-center py-12">
            <div className="text-[var(--color-text-tertiary)] text-lg mb-4">
              No players imported yet
            </div>
            <button className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors font-medium">
              Import Player CSV
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
