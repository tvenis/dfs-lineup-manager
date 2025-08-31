"use client";

import { useState, useEffect, useMemo } from 'react';
import { PlayerService } from '@/lib/playerService';
import type { PlayerPoolEntry, Week } from '@/types/prd';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, RotateCcw, Search, X, UserX } from 'lucide-react';

export default function PlayerPoolPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [playerPool, setPlayerPool] = useState<PlayerPoolEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [hideExcluded, setHideExcluded] = useState(false);
  const [excludedPlayers, setExcludedPlayers] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<string>('QB');

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
        }
      } catch (err: any) {
        console.error('🎯 Error fetching data:', err);
        console.error('🎯 Error details:', {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
        setError(`Failed to fetch data: ${err.message}`);
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
                 } catch (err: any) {
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
      excludedCount: excludedPlayers.size
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

    // Apply user exclusion filter (checkboxes)
    const beforeUserFilter = players.length;
    players = players.filter(entry => !excludedPlayers.has(entry.id));
    console.log(`🎯 After user exclusion filter: ${beforeUserFilter} -> ${players.length} players`);

    console.log(`🎯 Final filtered players for ${position}: ${players.length}`);
    return players;
  };

  // Handle player exclusion
  const togglePlayerExclusion = (playerId: number) => {
    setExcludedPlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerId)) {
        newSet.delete(playerId);
      } else {
        newSet.add(playerId);
      }
      return newSet;
    });
  };

  // Reset exclusions for a specific position
  const resetExclusions = (position: string) => {
    const allPlayersForPosition = getAllPlayersForPosition(position);
    setExcludedPlayers(prev => {
      const newSet = new Set(prev);
      allPlayersForPosition.forEach(player => {
        newSet.delete(player.id);
      });
      return newSet;
    });
  };

  // Reset all exclusions
  const resetAllExclusions = () => {
    setExcludedPlayers(new Set());
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'questionable':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'out':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
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
  const totalExcluded = excludedPlayers.size;

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
          <h1 className="text-3xl font-bold text-gray-900">Player Pool</h1>
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
            const excludedCount = filteredPlayers.filter(player => excludedPlayers.has(player.id)).length;
            
            return (
              <TabsContent key={position} value={position} className="m-0 border-t">
                {/* Tab Actions */}
                <div className="flex items-center justify-between px-6 py-4 bg-muted/20 border-b">
                  <div className="flex items-center gap-3">
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
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => resetExclusions(position)}
                      disabled={excludedCount === 0}
                      className="gap-2"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </Button>
                  </div>
                </div>

                {/* Player Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-0 bg-muted/10">
                        <TableHead className="w-44 py-3">Player</TableHead>
                        <TableHead className="w-16 py-3">Team</TableHead>
                        <TableHead className="w-24 text-right py-3">Salary</TableHead>
                        <TableHead className="w-20 text-right py-3">Projection</TableHead>
                        <TableHead className="w-20 text-right py-3">Value</TableHead>
                        <TableHead className="w-24 py-3">Status</TableHead>
                        <TableHead className="w-16 py-3 text-muted-foreground">Exclude</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPlayers.map((player, index) => {
                        const isExcluded = excludedPlayers.has(player.id);
                        const isDatabaseExcluded = player.excluded === true;
                        return (
                          <TableRow 
                            key={player.id}
                            className={`
                              ${isExcluded ? 'opacity-50 bg-muted/30' : ''} 
                              ${isDatabaseExcluded ? 'bg-yellow-50' : ''}
                              hover:bg-muted/50 transition-colors
                              ${index !== filteredPlayers.length - 1 ? 'border-b' : 'border-b-0'}
                            `}
                          >
                            <TableCell className="py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 text-left">
                                  <span className={`${isExcluded ? 'line-through' : ''}`}>
                                    {player.player.displayName}
                                  </span>
                                </div>
                                {isExcluded && <X className="w-4 h-4 text-destructive ml-1" />}
                                {isDatabaseExcluded && (
                                  <Badge variant="outline" className="text-xs ml-2 bg-yellow-100 text-yellow-800">
                                    DB Excluded
                                  </Badge>
                                )}
                                {position === 'FLEX' && (
                                  <Badge variant="outline" className="text-xs ml-2">
                                    {player.player.position}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-3 font-medium text-muted-foreground">
                              {player.player.team}
                            </TableCell>
                            <TableCell className="py-3 text-right font-medium">
                              ${player.salary?.toLocaleString() || 'N/A'}
                            </TableCell>
                            <TableCell className="py-3 text-right font-medium">
                              {player.projectedPoints || 'N/A'}
                            </TableCell>
                            <TableCell className="py-3 text-right font-medium text-primary">
                              {player.projectedPoints && player.salary 
                                ? ((player.projectedPoints / player.salary) * 1000).toFixed(1)
                                : 'N/A'
                              }
                            </TableCell>
                            <TableCell className="py-3">
                              <Badge 
                                variant="outline" 
                                className={`${getStatusColor(player.status)} text-xs font-medium`}
                              >
                                {player.status || 'Active'}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3">
                              <Checkbox
                                checked={isExcluded}
                                onCheckedChange={() => togglePlayerExclusion(player.id)}
                                className="opacity-60 hover:opacity-100"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
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
