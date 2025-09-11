"use client";

import { useState, useMemo } from 'react';
import { usePlayerPool } from '@/hooks/usePlayerPool';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, Search, X, User, UserX, ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

export default function OptimizedPlayerPool() {
  const {
    weeks,
    selectedWeek,
    playerPool,
    playerProps,
    gamesMap,
    loading,
    error,
    setSelectedWeek,
    refetch
  } = usePlayerPool();

  // Local state for UI controls
  const [searchTerm, setSearchTerm] = useState('');
  const [hideExcluded, setHideExcluded] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('QB');
  const [sortField, setSortField] = useState<string>('projection');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [tierFilter, setTierFilter] = useState<number | 'all'>('all');
  const [draftGroupFilter, setDraftGroupFilter] = useState<string>('all');

  // Memoized filtered players by position
  const playersByPosition = useMemo(() => {
    const grouped: Record<string, any[]> = {
      QB: [],
      RB: [],
      WR: [],
      TE: [],
      DST: []
    };

    playerPool.forEach(entry => {
      const position = entry.player.position;
      if (grouped[position]) {
        grouped[position].push(entry);
      }
    });

    return grouped;
  }, [playerPool]);

  // Memoized unique draft groups
  const getUniqueDraftGroups = useMemo(() => {
    const draftGroups = new Set<string>();
    playerPool.forEach(entry => {
      if (entry.draftGroup) {
        draftGroups.add(entry.draftGroup);
      }
    });
    return Array.from(draftGroups).sort();
  }, [playerPool]);

  // Optimized filtering function
  const getFilteredPlayers = useMemo(() => {
    return (position: string) => {
      let players = playersByPosition[position] || [];
      
      // Apply filters
      if (searchTerm) {
        players = players.filter(entry => 
          entry.player.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.player.team.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (hideExcluded) {
        players = players.filter(entry => !entry.excluded);
      }

      if (tierFilter !== 'all') {
        players = players.filter(entry => entry.tier === tierFilter);
      }

      if (draftGroupFilter !== 'all') {
        players = players.filter(entry => entry.draftGroup === draftGroupFilter);
      }

      // Sort players
      players.sort((a, b) => {
        let aValue = 0;
        let bValue = 0;

        switch (sortField) {
          case 'projection':
            aValue = a.projectedPoints || 0;
            bValue = b.projectedPoints || 0;
            break;
          case 'salary':
            aValue = a.salary || 0;
            bValue = b.salary || 0;
            break;
          case 'name':
            aValue = a.player.displayName.localeCompare(b.player.displayName);
            bValue = 0;
            break;
        }

        if (sortField === 'name') {
          return sortDirection === 'asc' ? aValue : -aValue;
        }

        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      });

      return players;
    };
  }, [playersByPosition, searchTerm, hideExcluded, tierFilter, draftGroupFilter, sortField, sortDirection]);

  // Get props for a specific player and market
  const getPlayerProps = (playerId: number, market: string) => {
    return playerProps[playerId]?.[market] || {};
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading player data...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={refetch} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Player Pool</h1>
        <div className="flex items-center gap-4">
          <Button onClick={refetch} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Week Selection and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-shrink-0">
            <label htmlFor="week-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Week:
            </label>
            <select
              id="week-select"
              value={selectedWeek || ''}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="block w-auto min-w-[200px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {weeks.map((week) => (
                <option key={week.id} value={week.id}>
                  Week {week.week_number} - {week.year}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-shrink-0">
            <label htmlFor="draft-group-select" className="block text-sm font-medium text-gray-700 mb-2">
              Draft Group:
            </label>
            <Select value={draftGroupFilter} onValueChange={setDraftGroupFilter}>
              <SelectTrigger className="w-auto min-w-[200px]">
                <SelectValue placeholder="All Draft Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Draft Groups</SelectItem>
                {getUniqueDraftGroups.map((draftGroup) => (
                  <SelectItem key={draftGroup} value={draftGroup}>
                    Draft Group {draftGroup}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Search and Controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="hide-excluded"
            checked={hideExcluded}
            onCheckedChange={(checked) => setHideExcluded(checked as boolean)}
          />
          <label htmlFor="hide-excluded" className="text-sm font-medium">
            Hide Excluded
          </label>
        </div>
      </div>

      {/* Position Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          {['QB', 'RB', 'WR', 'TE', 'DST'].map((position) => {
            const players = getFilteredPlayers(position);
            return (
              <TabsTrigger key={position} value={position} className="flex items-center gap-2">
                {position}
                <Badge variant="secondary">{players.length}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {['QB', 'RB', 'WR', 'TE', 'DST'].map((position) => {
          const filteredPlayers = getFilteredPlayers(position);
          
          return (
            <TabsContent key={position} value={position} className="m-0 border-t">
              <div className="bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Player</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Salary</TableHead>
                      <TableHead>Projection</TableHead>
                      <TableHead>Props</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlayers.map((entry) => {
                      const props = getPlayerProps(entry.player.playerDkId, 'player_pass_yds');
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">
                            {entry.player.displayName}
                          </TableCell>
                          <TableCell>{entry.player.team}</TableCell>
                          <TableCell>${entry.salary?.toLocaleString()}</TableCell>
                          <TableCell>{entry.projectedPoints?.toFixed(1)}</TableCell>
                          <TableCell>
                            {props.point && (
                              <span className="text-sm text-gray-600">
                                {props.point} ({props.bookmaker})
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Link href={`/profile/${entry.player.playerDkId}`}>
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
