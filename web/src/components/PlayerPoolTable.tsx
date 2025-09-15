"use client";

import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { PlayerPoolEntry } from '@/types/prd';

interface PlayerPoolEntryWithAnalysis {
  entry: PlayerPoolEntry;
  analysis?: any;
}

interface PlayerPoolTableProps {
  players: (PlayerPoolEntry | PlayerPoolEntryWithAnalysis)[];
  position: string;
  gamesMap: Record<string, any>;
  propsData: Record<number, Record<string, any>>;
  hideExcluded: boolean;
  tierFilter: number | 'all';
  onPlayerUpdate: (playerId: number, updates: any) => void;
  onBulkUpdate: (updates: Array<{ playerId: number; updates: any }>) => void;
  getTierConfig: (tier: number) => any;
  getTierStats: (position: string) => any;
}

export function PlayerPoolTable({
  players,
  position,
  gamesMap,
  propsData,
  hideExcluded,
  tierFilter,
  onPlayerUpdate,
  onBulkUpdate,
  getTierConfig,
  getTierStats
}: PlayerPoolTableProps) {
  const [sortField, setSortField] = useState<string>('projection');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Filter players based on hideExcluded and tierFilter
  const filteredPlayers = useMemo(() => {
    let filtered = players;
    
    if (hideExcluded) {
      filtered = filtered.filter(player => {
        const entry = player.entry || player;
        return !entry.excluded;
      });
    }
    
    if (tierFilter !== 'all') {
      filtered = filtered.filter(player => {
        const entry = player.entry || player;
        return entry.tier === tierFilter;
      });
    }
    
    return filtered;
  }, [players, hideExcluded, tierFilter]);

  // Sort players
  const sortedPlayers = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => {
      const aEntry = a.entry || a;
      const bEntry = b.entry || b;
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'projection':
          aValue = aEntry.projectedPoints || 0;
          bValue = bEntry.projectedPoints || 0;
          break;
        case 'salary':
          aValue = aEntry.salary || 0;
          bValue = bEntry.salary || 0;
          break;
        case 'value':
          aValue = aEntry.projectedPoints && aEntry.salary ? (aEntry.projectedPoints / aEntry.salary) * 1000 : 0;
          bValue = bEntry.projectedPoints && bEntry.salary ? (bEntry.projectedPoints / bEntry.salary) * 1000 : 0;
          break;
        case 'name':
          aValue = aEntry.player?.displayName || '';
          bValue = bEntry.player?.displayName || '';
          break;
        case 'tier':
          aValue = aEntry.tier || 4;
          bValue = bEntry.tier || 4;
          break;
        case 'total':
          const aTeam = aEntry.player?.team;
          const bTeam = bEntry.player?.team;
          const aGameInfo = gamesMap[aTeam];
          const bGameInfo = gamesMap[bTeam];
          aValue = aGameInfo?.proj_total || 0;
          bValue = bGameInfo?.proj_total || 0;
          break;
        case 'implied_total':
          const aTeamImplied = aEntry.player?.team;
          const bTeamImplied = bEntry.player?.team;
          const aGameInfoImplied = gamesMap[aTeamImplied];
          const bGameInfoImplied = gamesMap[bTeamImplied];
          aValue = aGameInfoImplied?.implied_team_total || 0;
          bValue = bGameInfoImplied?.implied_team_total || 0;
          break;
        default:
          aValue = aEntry.projectedPoints || 0;
          bValue = bEntry.projectedPoints || 0;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [filteredPlayers, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const getTierBadge = (tier: number) => {
    const config = getTierConfig(tier);
    return (
      <Badge 
        variant="outline" 
        className={`${config.badgeColor} ${config.badgeTextColor} border-current`}
      >
        {config.icon} Tier {tier}
      </Badge>
    );
  };

  const getGameInfo = (player: PlayerPoolEntry | PlayerPoolEntryWithAnalysis) => {
    const entry = player.entry || player;
    const team = entry.player?.team;
    const gameInfo = gamesMap[team];
    
    if (!gameInfo) return null;
    
    return (
      <div className="text-xs text-gray-500">
        {gameInfo.homeOrAway === 'H' ? 'vs' : '@'} {gameInfo.opponentAbbr}
        {gameInfo.proj_spread && (
          <span className="ml-1">
            ({gameInfo.proj_spread > 0 ? '+' : ''}{gameInfo.proj_spread})
          </span>
        )}
      </div>
    );
  };

  const getPropsDisplay = (player: PlayerPoolEntry | PlayerPoolEntryWithAnalysis) => {
    const entry = player.entry || player;
    const playerProps = propsData[entry.player?.playerDkId];
    if (!playerProps) return null;

    const props = [];
    
    // Add position-specific props
    if (position === 'QB') {
      if (playerProps['player_pass_yds']) {
        props.push(`Pass Yds: ${playerProps['player_pass_yds'].point}`);
      }
      if (playerProps['player_pass_tds']) {
        props.push(`Pass TDs: ${playerProps['player_pass_tds'].point}`);
      }
    } else if (position === 'RB') {
      if (playerProps['player_rush_yds']) {
        props.push(`Rush Yds: ${playerProps['player_rush_yds'].point}`);
      }
      if (playerProps['player_rush_attempts']) {
        props.push(`Rush Att: ${playerProps['player_rush_attempts'].point}`);
      }
    } else if (position === 'WR' || position === 'TE') {
      if (playerProps['player_receptions']) {
        props.push(`Rec: ${playerProps['player_receptions'].point}`);
      }
      if (playerProps['player_reception_yds']) {
        props.push(`Rec Yds: ${playerProps['player_reception_yds'].point}`);
      }
    }

    if (props.length === 0) return null;

    return (
      <div className="text-xs text-gray-500 space-y-1">
        {props.map((prop, index) => (
          <div key={index}>{prop}</div>
        ))}
      </div>
    );
  };

  const tierStats = getTierStats(position);

  return (
    <div className="space-y-4">
      {/* Tab Actions */}
      <div className="flex items-center justify-between px-6 py-4 bg-muted/20 border-b">
        <div className="flex items-center gap-3">
          {/* Tier Distribution - Interactive Filters */}
          <div className="flex items-center gap-2">
            {tierStats.tier1 > 0 && (
              <button
                onClick={() => onPlayerUpdate(0, { tierFilter: tierFilter === 1 ? 'all' : 1 })}
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
                onClick={() => onPlayerUpdate(0, { tierFilter: tierFilter === 2 ? 'all' : 2 })}
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
                onClick={() => onPlayerUpdate(0, { tierFilter: tierFilter === 3 ? 'all' : 3 })}
                className={`transition-all hover:scale-105 ${
                  tierFilter === 3 
                    ? 'ring-2 ring-yellow-400 shadow-md' 
                    : 'hover:shadow-sm'
                }`}
              >
                <Badge 
                  variant="outline" 
                  className={`gap-1 cursor-pointer ${
                    tierFilter === 3 
                      ? 'bg-yellow-100 text-yellow-900 border-yellow-300' 
                      : 'bg-yellow-50 text-yellow-800 border-yellow-200'
                  }`}
                >
                  <span>⚡</span>
                  {tierStats.tier3}
                </Badge>
              </button>
            )}
            {tierStats.tier4 > 0 && (
              <button
                onClick={() => onPlayerUpdate(0, { tierFilter: tierFilter === 4 ? 'all' : 4 })}
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
        </div>
        
        <div className="text-sm text-muted-foreground">
          {filteredPlayers.length} players
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 w-48"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-2">
                  Player
                  {getSortIcon('name')}
                </div>
              </TableHead>
              <TableHead>Opponent</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('total')}
              >
                <div className="flex items-center gap-2">
                  Total
                  {getSortIcon('total')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('implied_total')}
              >
                <div className="flex items-center gap-2">
                  Implied Total
                  {getSortIcon('implied_total')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('projection')}
              >
                <div className="flex items-center gap-2">
                  Proj
                  {getSortIcon('projection')}
                </div>
              </TableHead>
          <TableHead
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => handleSort('salary')}
          >
            <div className="flex items-center gap-2">
              Salary
              {getSortIcon('salary')}
            </div>
          </TableHead>
          <TableHead
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => handleSort('value')}
          >
            <div className="flex items-center gap-2">
              Value
              {getSortIcon('value')}
            </div>
          </TableHead>
          <TableHead
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => handleSort('tier')}
          >
            <div className="flex items-center gap-2">
              Tier
              {getSortIcon('tier')}
            </div>
          </TableHead>
              <TableHead>Props</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPlayers.map((player) => {
              const entry = player.entry || player;
              return (
                <TableRow key={entry.id} className={entry.excluded ? 'opacity-50' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={entry.excluded}
                      onCheckedChange={(checked) => 
                        onPlayerUpdate(entry.id, { excluded: checked })
                      }
                    />
                  </TableCell>
                  <TableCell className="w-48">
                    <div className="space-y-1">
                      <div className="font-medium">{entry.player?.displayName}</div>
                      <div className="text-sm text-muted-foreground">
                        {entry.player?.position} • {entry.player?.team}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getGameInfo(player)}
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm">
                      {(() => {
                        const entry = player.entry || player;
                        const team = entry.player?.team;
                        const gameInfo = gamesMap[team];
                        return gameInfo?.proj_total ? gameInfo.proj_total.toFixed(1) : 'N/A';
                      })()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm">
                      {(() => {
                        const entry = player.entry || player;
                        const team = entry.player?.team;
                        const gameInfo = gamesMap[team];
                        return gameInfo?.implied_team_total ? gameInfo.implied_team_total.toFixed(1) : 'N/A';
                      })()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm">
                      {entry.projectedPoints?.toFixed(1) || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm">
                      ${entry.salary?.toLocaleString() || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm text-primary">
                      {entry.projectedPoints && entry.salary 
                        ? ((entry.projectedPoints / entry.salary) * 1000).toFixed(1)
                        : 'N/A'
                      }
                    </div>
                  </TableCell>
                  <TableCell>
                    {getTierBadge(entry.tier || 4)}
                  </TableCell>
                  <TableCell>
                    {getPropsDisplay(player)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <Link href={`/profile/${entry.player?.playerDkId}`}>
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View Player Profile</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {sortedPlayers.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No players found for the selected filters.
        </div>
      )}
    </div>
  );
}
