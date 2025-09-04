"use client";

import { useState, useEffect, useMemo } from 'react';
import { PlayerService } from '@/lib/playerService';
import { WeekService } from '@/lib/weekService';
import type { PlayerPoolEntry, Week } from '@/types/prd';
import { PlayerWeekAnalysis, WeekAnalysisData } from '@/components/PlayerWeekAnalysis';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, Search, X, User, UserX, ChevronUp, ChevronDown, ExternalLink, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Minimal tooltip shim to avoid new dependency; optional
import Link from 'next/link';

export default function PlayerPoolPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [playerPool, setPlayerPool] = useState<PlayerPoolEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [hideExcluded, setHideExcluded] = useState(true);
  // Removed excludedPlayers state since we're using database exclusions directly
  const [activeTab, setActiveTab] = useState<string>('QB');
  const [sortField, setSortField] = useState<string>('player');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [tierFilter, setTierFilter] = useState<number | 'all'>('all');
  const [gamesMap, setGamesMap] = useState<Record<string, { opponentAbbr: string | null; homeOrAway: 'H' | 'A' | 'N'; proj_spread?: number | null; proj_total?: number | null; implied_team_total?: number | null }>>({});

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🎯 Starting to fetch data...');
        setLoading(true);
        
        // Fetch weeks
        console.log('🎯 Fetching weeks from:', `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/weeks/`);

        const weeksData = await PlayerService.getWeeks();
        console.log('🎯 Weeks data received:', weeksData);
        setWeeks(weeksData.weeks);
        
        if (weeksData.weeks.length > 0) {
          // Find Week 1 specifically, or default to the first week
          const week1 = weeksData.weeks.find(w => w.week_number === 1);
          const defaultWeek = week1 || weeksData.weeks[0];
          console.log('🎯 Selected week:', defaultWeek);
          setSelectedWeek(defaultWeek.id);
          
          // Fetch player pool for the selected week
          console.log('🎯 Fetching player pool for week:', defaultWeek.id);
          console.log('🎯 PlayerService.getPlayerPool will be called with week ID:', defaultWeek.id);

          const poolData = await PlayerService.getPlayerPool(defaultWeek.id, { limit: 1000 });
          console.log('🎯 Player pool data received:', poolData);
          console.log('🎯 Pool data entries length:', poolData.entries?.length || 'undefined');
          console.log('🎯 Pool data total:', poolData.total || 'undefined');
          setPlayerPool(poolData.entries || []);

          // Prefer server-side joined analysis for accuracy
          try {
            const analysis = await PlayerService.getPlayerPoolWithAnalysis(defaultWeek.id);
            const mapByTeam: Record<string, { opponentAbbr: string | null; homeOrAway: 'H' | 'A' | 'N'; proj_spread?: number | null; proj_total?: number | null; implied_team_total?: number | null }> = {};
            (analysis.entries || []).forEach((e: any) => {
              const team = e.entry?.player?.team;
              if (team) {
                mapByTeam[team] = {
                  opponentAbbr: e.analysis?.opponent_abbr ?? null,
                  homeOrAway: (e.analysis?.homeoraway as 'H' | 'A' | 'N') || 'N',
                  proj_spread: e.analysis?.proj_spread ?? null,
                  proj_total: e.analysis?.proj_total ?? null,
                  implied_team_total: e.analysis?.implied_team_total ?? null
                };
              }
            });
            setGamesMap(mapByTeam);
          } catch (e) {
            console.error('Failed to load joined analysis; falling back to games map', e);
            try {
              const gamesResp = await WeekService.getGamesForWeek(defaultWeek.id);
              const fallback: Record<string, { opponentAbbr: string | null; homeOrAway: 'H' | 'A' | 'N'; proj_spread?: number | null; proj_total?: number | null; implied_team_total?: number | null }> = {};
              (gamesResp.games || []).forEach((g: any) => {
                if (g.team_abbr) {
                  fallback[g.team_abbr] = {
                    opponentAbbr: g.opponent_abbr ?? null,
                    homeOrAway: g.homeoraway as 'H' | 'A' | 'N',
                    proj_spread: g.proj_spread ?? null,
                    proj_total: g.proj_total ?? null,
                    implied_team_total: g.implied_team_total ?? null
                  };
                }
              });
              setGamesMap(fallback);
            } catch (e2) {
              console.error('Failed to load games for week', e2);
            }
          }
        }
      } catch (err: unknown) {
        console.error('🎯 Error fetching data:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('🎯 Error details:', {
          message: errorMessage,
          stack: err instanceof Error ? err.stack : undefined,
          name: err instanceof Error ? err.name : undefined
        });
        setError(`Failed to fetch data: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch player pool when week changes
  useEffect(() => {
    if (!selectedWeek) return;

    const fetchPlayerPool = async () => {
      try {
        setLoading(true);
        setError(null);
        const poolData = await PlayerService.getPlayerPool(selectedWeek, { limit: 1000 });
        setPlayerPool(poolData.entries || []);
        try {
          const analysis = await PlayerService.getPlayerPoolWithAnalysis(selectedWeek);
          const mapByTeam: Record<string, { opponentAbbr: string | null; homeOrAway: 'H' | 'A' | 'N'; proj_spread?: number | null; proj_total?: number | null; implied_team_total?: number | null }> = {};
          (analysis.entries || []).forEach((e: any) => {
            const team = e.entry?.player?.team;
            if (team) {
              mapByTeam[team] = {
                opponentAbbr: e.analysis?.opponent_abbr ?? null,
                homeOrAway: (e.analysis?.homeoraway as 'H' | 'A' | 'N') || 'N',
                proj_spread: e.analysis?.proj_spread ?? null,
                proj_total: e.analysis?.proj_total ?? null,
                implied_team_total: e.analysis?.implied_team_total ?? null
              };
            }
          });
          setGamesMap(mapByTeam);
        } catch (e) {
          console.error('Failed to load joined analysis; falling back to games map', e);
          try {
            const gamesResp = await WeekService.getGamesForWeek(selectedWeek);
            const map: Record<string, { opponentAbbr: string | null; homeOrAway: 'H' | 'A' | 'N'; proj_spread?: number | null; proj_total?: number | null; implied_team_total?: number | null }> = {};
            (gamesResp.games || []).forEach((g: any) => {
              if (g.team_abbr) {
                map[g.team_abbr] = {
                  opponentAbbr: g.opponent_abbr ?? null,
                  homeOrAway: g.homeoraway as 'H' | 'A' | 'N',
                  proj_spread: g.proj_spread ?? null,
                  proj_total: g.proj_total ?? null,
                  implied_team_total: g.implied_team_total ?? null
                };
              }
            });
            setGamesMap(map);
          } catch (e2) {
            console.error('Failed to load games for week', e2);
          }
        }
      } catch (err: unknown) {
        console.error('Error fetching player pool:', err);
        setError('Failed to fetch player pool');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerPool();
  }, [selectedWeek]);

  // Group players by position
  const playersByPosition = useMemo(() => {
    const grouped: Record<string, PlayerPoolEntry[]> = {
      QB: [],
      RB: [],
      WR: [],
      TE: [],
      DST: []
    };

    playerPool.forEach(entry => {
      const pos = entry.player.position;
      if (grouped[pos]) {
        grouped[pos].push(entry);
      }
    });

    return grouped;
  }, [playerPool]);

  // Get flex players (RB, WR, TE)
  const getFlexPlayers = () => {
    return [
      ...playersByPosition.RB,
      ...playersByPosition.WR,
      ...playersByPosition.TE
    ];
  };

  // Get all players for a position (without filters)
  const getAllPlayersForPosition = (position: string) => {
    if (position === 'FLEX') {
      return getFlexPlayers();
    } else {
      return playersByPosition[position] || [];
    }
  };

  // Filter players for current tab
  const getFilteredPlayers = (position: string) => {
    let players = getAllPlayersForPosition(position);
    
    console.log(`🎯 getFilteredPlayers for ${position}:`, {
      initialCount: players.length,
      searchTerm,
      hideExcluded,
      databaseExcludedCount: players.filter(p => p.excluded === true).length
    });

    // Filter out disabled players first (isDisabled = 1)
    players = players.filter(entry => !entry.isDisabled);
    console.log(`🎯 After disabled filter: ${players.length} players`);

    // Apply database exclusion filter based on Hide Excluded button
    if (hideExcluded) {
      // When Hide Excluded is ON: only show players with excluded = false
      players = players.filter(entry => !entry.excluded);
      console.log(`🎯 After database exclusion filter: ${players.length} players`);
    }
    // When Hide Excluded is OFF: show all players (excluded = false and excluded = true)

    // Apply search filter
    if (searchTerm) {
      players = players.filter(entry => 
        entry.player.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.player.team.toLowerCase().includes(searchTerm.toLowerCase())
      );
      console.log(`🎯 After search filter: ${players.length} players`);
    }

    // Apply tier filter
    if (tierFilter !== 'all') {
      players = players.filter(entry => entry.tier === tierFilter);
      console.log(`🎯 After tier filter: ${players.length} players`);
    }

    console.log(`🎯 Final filtered players for ${position}: ${players.length}`);
    
    // Return unsorted players - sorting will be applied within tier groups
    return players;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'questionable':
      case 'q':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'out':
      case 'ir':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get tier configuration
  const getTierConfig = (tier: number) => {
    switch (tier) {
      case 1:
        return {
          label: 'Core/Cash',
          description: 'Must-have foundational plays',
          color: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: '⭐',
          headerColor: 'bg-blue-50/80 border-b border-blue-200',
          headerTextColor: 'text-blue-800'
        };
      case 2:
        return {
          label: 'Strong Plays',
          description: 'Solid complementary pieces',
          color: 'bg-green-100 text-green-800 border-green-300',
          icon: '💪',
          headerColor: 'bg-green-50/80 border-b border-green-200',
          headerTextColor: 'text-green-800'
        };
      case 3:
        return {
          label: 'GPP/Ceiling',
          description: 'High-variance leverage plays',
          color: 'bg-purple-100 text-purple-800 border-purple-300',
          icon: '🚀',
          headerColor: 'bg-purple-50/80 border-b border-purple-200',
          headerTextColor: 'text-purple-800'
        };
      case 4:
        return {
          label: 'Avoids/Thin',
          description: 'Rarely played options',
          color: 'bg-red-100 text-red-800 border-red-300',
          icon: '⚠️',
          headerColor: 'bg-red-50/80 border-b border-red-200',
          headerTextColor: 'text-red-800'
        };
      default:
        return {
          label: 'Unknown',
          description: 'Unknown tier',
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: '❓',
          headerColor: 'bg-gray-50/80 border-b border-gray-200',
          headerTextColor: 'text-gray-800'
        };
    }
  };

  // Sort players
  const sortPlayers = (players: PlayerPoolEntry[]) => {
    return [...players].sort((a, b) => {
      let aValue: string | number, bValue: string | number;
      
      switch (sortField) {
        case 'player':
          aValue = a.player.displayName.toLowerCase();
          bValue = b.player.displayName.toLowerCase();
          break;
        case 'team':
          aValue = a.player.team.toLowerCase();
          bValue = b.player.team.toLowerCase();
          break;
        case 'salary':
          aValue = a.salary || 0;
          bValue = b.salary || 0;
          break;
        case 'projection':
          aValue = a.projectedPoints || 0;
          bValue = b.projectedPoints || 0;
          break;
        case 'opponentRank':
          // Extract opponent rank sortValue from draftStatAttributes where id = -2
          const aDraftStats = Array.isArray(a.draftStatAttributes) ? a.draftStatAttributes : [];
          const bDraftStats = Array.isArray(b.draftStatAttributes) ? b.draftStatAttributes : [];
          const aOpponentRank = aDraftStats.find((attr: { id: number; sortValue?: number | string }) => attr.id === -2)?.sortValue || 0;
          const bOpponentRank = bDraftStats.find((attr: { id: number; sortValue?: number | string }) => attr.id === -2)?.sortValue || 0;
          
          aValue = typeof aOpponentRank === 'string' ? parseFloat(aOpponentRank) : aOpponentRank;
          bValue = typeof bOpponentRank === 'string' ? parseFloat(bOpponentRank) : bOpponentRank;
          break;
        case 'value':
          aValue = a.projectedPoints && a.salary ? (a.projectedPoints / a.salary) * 1000 : 0;
          bValue = b.projectedPoints && b.salary ? (b.projectedPoints / b.salary) * 1000 : 0;
          break;
        case 'status':
          aValue = a.status?.toLowerCase() || '';
          bValue = b.status?.toLowerCase() || '';
          break;
        case 'tier':
          aValue = a.tier || 4;
          bValue = b.tier || 4;
          break;
        case 'exclude':
          aValue = a.excluded === true ? 1 : 0;
          bValue = b.excluded === true ? 1 : 0;
          break;
        default:
          return 0;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  // Handle column sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // Set default sort direction based on field type
      if (field === 'opponentRank') {
        setSortDirection('asc'); // Lower opponent rank (better matchup) first
      } else {
        setSortDirection('asc');
      }
    }
  };

  // Calculate tier statistics for current position (excluding excluded players)
  const getTierStats = (position: string) => {
    const players = getAllPlayersForPosition(position).filter(player => !player.excluded);
    return {
      tier1: players.filter(player => player.tier === 1).length,
      tier2: players.filter(player => player.tier === 2).length,
      tier3: players.filter(player => player.tier === 3).length,
      tier4: players.filter(player => player.tier === 4).length
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading player pool...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  const totalPlayers = playerPool.length;
  const totalExcluded = playerPool.filter(p => p.excluded === true).length;

  console.log('🎯 Rendering Player Pool page with:', {
    totalPlayers,
    totalExcluded,
    activeTab,
    searchTerm,
    hideExcluded
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <User className="h-8 w-8 text-blue-600" />
            Player Pool
          </h1>
          <p className="text-gray-600 mt-1">Managing player exclusions for Week {weeks.find(w => w.id === selectedWeek)?.week_number}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={hideExcluded ? "default" : "outline"}
            onClick={() => setHideExcluded(!hideExcluded)}
            className="flex items-center gap-2"
          >
            {hideExcluded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            Hide Excluded
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search players or teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      {/* Week Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <label htmlFor="week-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select Week:
        </label>
        <select
          id="week-select"
          value={selectedWeek || ''}
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
          className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          {weeks.map((week) => (
            <option key={week.id} value={week.id}>
              Week {week.week_number} - {week.year}
            </option>
          ))}
        </select>
      </div>

      {/* Position Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)}>
        <div className="border rounded-lg overflow-hidden">
          <TabsList className="w-full h-auto p-0 bg-muted/30 rounded-none">
            <TabsTrigger 
              value="QB" 
              className="flex-1 gap-2 px-4 py-4 rounded-none data-[state=active]:bg-background data-[state=active]:shadow-sm border-r"
            >
              <span className="font-medium">QB</span>
              <Badge variant="secondary" className="text-xs">
                {playersByPosition.QB.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="RB" 
              className="flex-1 gap-2 px-4 py-4 rounded-none data-[state=active]:bg-background data-[state=active]:shadow-sm border-r"
            >
              <span className="font-medium">RB</span>
              <Badge variant="secondary" className="text-xs">
                {playersByPosition.RB.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="WR" 
              className="flex-1 gap-2 px-4 py-4 rounded-none data-[state=active]:bg-background data-[state=active]:shadow-sm border-r"
            >
              <span className="font-medium">WR</span>
              <Badge variant="secondary" className="text-xs">
                {playersByPosition.WR.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="TE" 
              className="flex-1 gap-2 px-4 py-4 rounded-none data-[state=active]:bg-background data-[state=active]:shadow-sm border-r"
            >
              <span className="font-medium">TE</span>
              <Badge variant="secondary" className="text-xs">
                {playersByPosition.TE.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="FLEX" 
              className="flex-1 gap-2 px-4 py-4 rounded-none data-[state=active]:bg-background data-[state=active]:shadow-sm border-r"
            >
              <span className="font-medium">FLEX</span>
              <Badge variant="secondary" className="text-xs">
                {getFlexPlayers().length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="DST" 
              className="flex-1 gap-2 px-4 py-4 rounded-none data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <span className="font-medium">DST</span>
              <Badge variant="secondary" className="text-xs">
                {playersByPosition.DST.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {(['QB', 'RB', 'WR', 'TE', 'FLEX', 'DST'] as string[]).map((position) => {
            const filteredPlayers = getFilteredPlayers(position);
            const excludedCount = filteredPlayers.filter(player => player.excluded === true).length;
            const tierStats = getTierStats(position);

            return (
              <TabsContent key={position} value={position} className="m-0 border-t">
                {/* Tab Actions */}
                <div className="flex items-center justify-between px-6 py-4 bg-muted/20 border-b">
                  <div className="flex items-center gap-3">
                    {/* Tier Distribution - Interactive Filters */}
                    <div className="flex items-center gap-2">
                      {tierStats.tier1 > 0 && (
                        <button
                          onClick={() => setTierFilter(tierFilter === 1 ? 'all' : 1)}
                          className={`transition-all hover:scale-105 ${
                            tierFilter === 1 
                              ? 'ring-2 ring-blue-400 shadow-md' 
                              : 'hover:shadow-sm'
                          }`}
                        >
                          <Badge 
                            variant="outline" 
                            className={`gap-1 cursor-pointer ${
                              tierFilter === 1 
                                ? 'bg-blue-100 text-blue-900 border-blue-300' 
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            <span>⭐</span>
                            {tierStats.tier1}
                          </Badge>
                        </button>
                      )}
                      {tierStats.tier2 > 0 && (
                        <button
                          onClick={() => setTierFilter(tierFilter === 2 ? 'all' : 2)}
                          className={`transition-all hover:scale-105 ${
                            tierFilter === 2 
                              ? 'ring-2 ring-green-400 shadow-md' 
                              : 'hover:shadow-sm'
                          }`}
                        >
                          <Badge 
                            variant="outline" 
                            className={`gap-1 cursor-pointer ${
                              tierFilter === 2 
                                ? 'bg-green-100 text-green-900 border-green-300' 
                                : 'bg-green-50 text-green-800 border-green-200'
                            }`}
                          >
                            <span>💪</span>
                            {tierStats.tier2}
                          </Badge>
                        </button>
                      )}
                      {tierStats.tier3 > 0 && (
                        <button
                          onClick={() => setTierFilter(tierFilter === 3 ? 'all' : 3)}
                          className={`transition-all hover:scale-105 ${
                            tierFilter === 3 
                              ? 'ring-2 ring-purple-400 shadow-md' 
                              : 'hover:shadow-sm'
                          }`}
                        >
                          <Badge 
                            variant="outline" 
                            className={`gap-1 cursor-pointer ${
                              tierFilter === 3 
                                ? 'bg-purple-100 text-purple-900 border-purple-300' 
                                : 'bg-purple-50 text-purple-800 border-purple-200'
                            }`}
                          >
                            <span>🚀</span>
                            {tierStats.tier3}
                          </Badge>
                        </button>
                      )}
                      {tierStats.tier4 > 0 && (
                        <button
                          onClick={() => setTierFilter(tierFilter === 4 ? 'all' : 4)}
                          className={`transition-all hover:scale-105 ${
                            tierFilter === 4 
                              ? 'ring-2 ring-red-400 shadow-md' 
                              : 'hover:shadow-sm'
                          }`}
                        >
                          <Badge 
                            variant="outline" 
                            className={`gap-1 cursor-pointer ${
                              tierFilter === 4 
                                ? 'bg-red-100 text-red-900 border-red-300' 
                                : 'bg-red-50 text-red-800 border-red-200'
                            }`}
                          >
                            <span>⚠️</span>
                            {tierStats.tier4}
                          </Badge>
                        </button>
                      )}
                    </div>
                    
                    <div className="w-px h-4 bg-border"></div>
                    
                    {tierFilter !== 'all' && (
                      <Badge variant="secondary" className="gap-1">
                        <span>Filtered to Tier {tierFilter}</span>
                        <button 
                          onClick={() => setTierFilter('all')}
                          className="ml-1 hover:bg-destructive/20 rounded-full w-4 h-4 flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )}
                    
                    <Badge variant="outline" className="gap-1">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground"></span>
                      {excludedCount} of {filteredPlayers.length} excluded
                    </Badge>
                    {excludedCount > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <UserX className="w-3 h-3" />
                        {excludedCount} excluded
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Players Grouped by Tier */}
                <div className="overflow-x-auto">
                  {/* Table Header */}
                  <div className="bg-muted/10 border-b">
                    <div className="grid grid-cols-20 gap-2 px-6 py-2.5 text-xs font-medium text-muted-foreground items-center">
                      <div 
                        className="col-span-5 cursor-pointer hover:bg-muted/20 transition-colors flex items-center gap-1"
                        onClick={() => handleSort('player')}
                      >
                        PLAYER NAME
                        {sortField === 'player' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                      <div className="col-span-1 text-center">TEAM</div>
                      <div className="col-span-2 text-center flex items-center justify-center gap-1">
                        OPPONENT
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Info className="w-3 h-3 opacity-60 hover:opacity-100" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>@ = Away game, • = Home game</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="col-span-1 text-center flex items-center justify-center gap-1">
                        SPREAD
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Info className="w-3 h-3 opacity-60 hover:opacity-100" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Team's point spread. + underdog, - favorite</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="col-span-1 text-center flex items-center justify-center gap-1">
                        O/U
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Info className="w-3 h-3 opacity-60 hover:opacity-100" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Game Over/Under total</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="col-span-1 text-center flex items-center justify-center gap-1">
                        IMPLIED
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Info className="w-3 h-3 opacity-60 hover:opacity-100" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Team's implied point total</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div
                        role="button"
                        tabIndex={0}
                        className="col-span-1 text-center flex items-center justify-center gap-1 cursor-pointer hover:bg-muted/20 transition-colors"
                        onClick={() => handleSort('opponentRank')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSort('opponentRank') }}
                      >
                        OPRK
                        {sortField === 'opponentRank' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Info className="w-3 h-3 opacity-60 hover:opacity-100" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Opponent Position Rank — lower is better</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div 
                        className="col-span-2 text-right cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-end gap-1"
                        onClick={() => handleSort('salary')}
                      >
                        SALARY
                        {sortField === 'salary' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                      <div 
                        className="col-span-2 text-right cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-end gap-1"
                        onClick={() => handleSort('projection')}
                      >
                        PROJECTION
                        {sortField === 'projection' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                      <div 
                        className="col-span-1 text-right cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-end gap-1"
                        onClick={() => handleSort('value')}
                      >
                        VALUE
                        {sortField === 'value' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                      <div className="col-span-1 text-center">STATUS</div>
                      <div className="col-span-1 text-center">TIER</div>
                      <div className="col-span-1 text-center">EXCLUDE</div>
                    </div>
                  </div>

                  {/* Tier Groups */}
                  {[1, 2, 3, 4].map(tier => {
                    const tieredPlayers = sortPlayers(filteredPlayers.filter(player => player.tier === tier))
                    if (tieredPlayers.length === 0) return null

                    return (
                      <div key={tier} className="border-b">
                        {/* Tier Header */}
                        <div className={`${getTierConfig(tier).headerColor} ${getTierConfig(tier).headerTextColor} px-6 py-3 flex items-center gap-3`}>
                          <span className="text-xl">{getTierConfig(tier).icon}</span>
                          <span className="font-medium">Tier {tier}</span>
                          <span className="opacity-90 text-sm">
                            {getTierConfig(tier).label} - {getTierConfig(tier).description}
                          </span>
                        </div>

                        {/* Players in this tier */}
                        {tieredPlayers.map((player, index) => (
                          <div
                            key={player.id}
                            className={`
                              grid grid-cols-12 gap-4 px-6 py-3 border-b border-border/50 last:border-b-0
                              ${player.excluded === true ? 'opacity-50 bg-muted/30' : ''} 
                              hover:bg-muted/50 transition-colors
                            `}
                          >
                            <div className="col-span-5">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {/* onPlayerSelect(player) */}}
                                  className="flex items-center gap-2 text-left hover:text-primary transition-colors group"
                                >
                                  <Link 
                                    href={`/profile/${player.player.playerDkId}`}
                                    className={`text-sm font-medium ${player.excluded === true ? 'line-through' : ''} group-hover:underline`}
                                  >
                                    {player.player.displayName}
                                  </Link>
                                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                                {player.excluded === true && <X className="w-4 h-4 text-destructive ml-1" />}
                                {position === 'FLEX' && (
                                  <Badge variant="outline" className="text-xs ml-2">
                                    {player.player.position}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="col-span-1 text-center text-sm font-medium text-muted-foreground">
                              {player.player.team}
                            </div>

                            {/* Opponent */}
                            <div className="col-span-2 text-center">
                              {(() => {
                                const g = gamesMap[player.player.team];
                                const data: WeekAnalysisData = {
                                  opponent: {
                                    opponentAbbr: g?.opponentAbbr || null,
                                    homeOrAway: g?.homeOrAway || 'N'
                                  }
                                };
                                return <PlayerWeekAnalysis weekAnalysis={data} column="opponent" />
                              })()}
                            </div>

                            {/* Spread */}
                            <div className="col-span-1 text-center">
                              {(() => {
                                const g = gamesMap[player.player.team];
                                const data: WeekAnalysisData = { spread: g?.proj_spread ?? null };
                                return <PlayerWeekAnalysis weekAnalysis={data} column="spread" />
                              })()}
                            </div>

                            {/* O/U */}
                            <div className="col-span-1 text-center">
                              {(() => {
                                const g = gamesMap[player.player.team];
                                const data: WeekAnalysisData = { total: g?.proj_total ?? null };
                                return <PlayerWeekAnalysis weekAnalysis={data} column="total" />
                              })()}
                            </div>

                            {/* Implied */}
                            <div className="col-span-1 text-center">
                              {(() => {
                                const g = gamesMap[player.player.team];
                                const data: WeekAnalysisData = { implied: g?.implied_team_total ?? null };
                                return <PlayerWeekAnalysis weekAnalysis={data} column="implied" />
                              })()}
                            </div>
                            {/* OPRK */}
                            <div className="col-span-1 text-center">
                              {(() => {
                                const attrs = Array.isArray(player.draftStatAttributes) ? (player.draftStatAttributes as any[]) : []
                                const oppRank = attrs.find((a: any) => a.id === -2) || {}
                                const data: WeekAnalysisData = {
                                  oprk: {
                                    value: oppRank.value ?? 0,
                                    quality: (oppRank.quality as 'High' | 'Medium' | 'Low') || 'Medium'
                                  }
                                }
                                return <PlayerWeekAnalysis weekAnalysis={data} column="oprk" />
                              })()}
                            </div>

                            <div className="col-span-2 text-right text-sm font-medium">
                              ${player.salary?.toLocaleString() || 'N/A'}
                            </div>

                            <div className="col-span-2 text-right text-sm font-medium">
                              {player.projectedPoints || 'N/A'}
                            </div>

                            <div className="col-span-1 text-right text-sm font-medium text-primary">
                              {player.projectedPoints && player.salary 
                                ? ((player.projectedPoints / player.salary) * 1000).toFixed(1)
                                : 'N/A'
                              }
                            </div>

                            <div className="col-span-1 text-center">
                              <Badge 
                                variant="outline" 
                                className={`${getStatusColor(player.status)} text-xs font-medium`}
                              >
                                {player.status || 'Active'}
                              </Badge>
                            </div>

                            <div className="col-span-1 text-center">
                              <Select 
                                value={player.tier?.toString() || '4'} 
                                onValueChange={(value: string) => {
                                  const newTierValue = parseInt(value);
                                  // Call API to update the player pool entry
                                  PlayerService.updatePlayerPoolEntry(player.id, { tier: newTierValue })
                                    .then(() => {
                                      // Update local state to reflect the change
                                      setPlayerPool(prev => 
                                        prev.map(p => 
                                          p.id === player.id 
                                            ? { ...p, tier: newTierValue }
                                            : p
                                        )
                                      );
                                    })
                                    .catch(err => {
                                      console.error('Error updating player tier:', err);
                                      // Could add a toast notification here
                                    });
                                }}
                              >
                                <SelectTrigger className="w-full h-8 text-xs">
                                  <SelectValue>
                                    <span className="font-medium">{player.tier || 4}</span>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1</SelectItem>
                                  <SelectItem value="2">2</SelectItem>
                                  <SelectItem value="3">3</SelectItem>
                                  <SelectItem value="4">4</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="col-span-1 text-center">
                              <Checkbox
                                checked={player.excluded === true}
                                onCheckedChange={(checked) => {
                                  // Update the player's excluded status in the database
                                  const newExcludedValue = checked === true;
                                  // Call API to update the player pool entry
                                  PlayerService.updatePlayerPoolEntry(player.id, { excluded: newExcludedValue })
                                    .then(() => {
                                      // Update local state to reflect the change
                                      setPlayerPool(prev => 
                                        prev.map(p => 
                                          p.id === player.id 
                                            ? { ...p, excluded: newExcludedValue }
                                            : p
                                        )
                                      );
                                    })
                                    .catch(err => {
                                      console.error('Error updating player exclusion:', err);
                                      // Could add a toast notification here
                                    });
                                }}
                                className="w-4 h-4"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>

                {filteredPlayers.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p>No players found matching your search criteria.</p>
                    <p className="text-sm mt-1">Try adjusting your search terms.</p>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </div>
      </Tabs>
    </div>
  );
}