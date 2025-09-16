"use client";

import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { PlayerPoolProps } from '@/components/PlayerPoolProps';
import type { PlayerPoolEntry } from '@/types/prd';
import type { PlayerPoolEntryWithAnalysisDto } from '@/lib/playerService';

interface PlayerPoolTableProps {
  players: (PlayerPoolEntry | PlayerPoolEntryWithAnalysisDto)[];
  position: string;
  gamesMap: Record<string, any>;
  propsData: Record<number, Record<string, any>>;
  hideExcluded: boolean;
  tierFilter: number | 'all';
  selectedWeek: number;
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
  selectedWeek,
  onPlayerUpdate,
  onBulkUpdate,
  getTierConfig,
  getTierStats
}: PlayerPoolTableProps) {
  
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

  // Get status abbreviation
  const getStatusAbbreviation = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'available':
        return 'AVL';
      case 'questionable':
      case 'q':
        return 'QST';
      case 'out':
        return 'OUT';
      case 'ir':
        return 'IR';
      default:
        return status || 'N/A';
    }
  };
  const [sortField, setSortField] = useState<string>('projection');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Helper function to get the entry from either type
  const getEntry = (player: PlayerPoolEntry | PlayerPoolEntryWithAnalysisDto): PlayerPoolEntry => {
    return 'entry' in player ? player.entry : player;
  };

  // Filter players based on hideExcluded and tierFilter
  const filteredPlayers = useMemo(() => {
    let filtered = players;
    
    if (hideExcluded) {
      filtered = filtered.filter(player => {
        const entry = getEntry(player);
        return !entry.excluded;
      });
    }
    
    if (tierFilter !== 'all') {
      filtered = filtered.filter(player => {
        const entry = getEntry(player);
        return entry.tier === tierFilter;
      });
    }
    
    return filtered;
  }, [players, hideExcluded, tierFilter]);

  // Sort players
  const sortedPlayers = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => {
      const aEntry = getEntry(a);
      const bEntry = getEntry(b);
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
        case 'status':
          aValue = aEntry.status?.toLowerCase() || '';
          bValue = bEntry.status?.toLowerCase() || '';
          break;
        case 'opponentRank':
          // Extract opponent rank sortValue from draftStatAttributes where id = -2
          const aDraftStats = Array.isArray(aEntry.draftStatAttributes) ? aEntry.draftStatAttributes : [];
          const bDraftStats = Array.isArray(bEntry.draftStatAttributes) ? bEntry.draftStatAttributes : [];
          const aOpponentRank = aDraftStats.find((attr: { id: number; sortValue?: number | string }) => attr.id === -2)?.sortValue || 0;
          const bOpponentRank = bDraftStats.find((attr: { id: number; sortValue?: number | string }) => attr.id === -2)?.sortValue || 0;
          
          aValue = typeof aOpponentRank === 'string' ? parseFloat(aOpponentRank) : aOpponentRank;
          bValue = typeof bOpponentRank === 'string' ? parseFloat(bOpponentRank) : bOpponentRank;
          break;
        case 'tier':
          aValue = aEntry.tier || 4;
          bValue = bEntry.tier || 4;
          break;
        case 'exclude':
          aValue = aEntry.excluded === true ? 1 : 0;
          bValue = bEntry.excluded === true ? 1 : 0;
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


  const getGameInfo = (player: PlayerPoolEntry | PlayerPoolEntryWithAnalysisDto) => {
    const entry = getEntry(player);
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
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-2">
                  Status
                  {getSortIcon('status')}
                </div>
              </TableHead>
              <TableHead>Opponent</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('opponentRank')}
              >
                <div className="flex items-center gap-2">
                  OPRK
                  {getSortIcon('opponentRank')}
                </div>
              </TableHead>
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
            className="cursor-pointer hover:bg-muted/50 w-20"
            onClick={() => handleSort('tier')}
          >
            <div className="flex items-center gap-2">
              Tier
              {getSortIcon('tier')}
            </div>
          </TableHead>
              <TableHead>Props</TableHead>
              <TableHead 
                className="w-20 cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('exclude')}
              >
                <div className="flex items-center gap-2">
                  Exclude
                  {getSortIcon('exclude')}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPlayers.map((player) => {
              const entry = getEntry(player);
              return (
                <TableRow key={entry.id} className={entry.excluded ? 'opacity-50' : ''}>
                  <TableCell>
                    {/* Empty cell for spacing */}
                  </TableCell>
                  <TableCell className="w-48">
                    <div className="space-y-1">
                      <Link 
                        href={`/profile/${entry.player?.playerDkId}`}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {entry.player?.displayName}
                      </Link>
                      <div className="text-sm text-muted-foreground">
                        {entry.player?.position} • {entry.player?.team}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={`${getStatusColor(entry.status)} text-xs font-medium`}
                    >
                      {getStatusAbbreviation(entry.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getGameInfo(player)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-center">
                      {(() => {
                        const draftStats = Array.isArray(entry.draftStatAttributes) ? entry.draftStatAttributes : [];
                        const oppRank = draftStats.find((attr: { id: number; value?: number; quality?: string }) => attr.id === -2) || {};
                        const value = oppRank.value ?? 0;
                        const quality = oppRank.quality as 'High' | 'Medium' | 'Low' | undefined;
                        
                        // Derive quality from value if quality is missing
                        let derivedQuality: 'High' | 'Medium' | 'Low' = 'Medium';
                        if (quality) {
                          derivedQuality = quality;
                        } else if (typeof value === 'number') {
                          if (value <= 10) derivedQuality = 'High';
                          else if (value <= 20) derivedQuality = 'Medium';
                          else derivedQuality = 'Low';
                        }
                        
                        const color = derivedQuality === 'High' ? 'text-green-600' : 
                                     derivedQuality === 'Low' ? 'text-red-600' : 
                                     'text-yellow-600';
                        
                        return (
                          <span className={color}>
                            {value || '-'}
                          </span>
                        );
                      })()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm flex items-center gap-1">
                      {(() => {
                        const entry = getEntry(player);
                        const team = entry.player?.team;
                        const gameInfo = gamesMap[team];
                        const total = gameInfo?.proj_total;
                        
                        if (!total) return 'N/A';
                        
                        // Determine color based on total value
                        let textColor = '';
                        
                        if (total >= 48) {
                          // Elite Shootouts (48+) → Gold
                          textColor = 'text-yellow-500';
                        } else if (total >= 45) {
                          // Above Average (45–47.5) → Green
                          textColor = 'text-green-600';
                        } else if (total >= 42) {
                          // Neutral (42–44.5) → Yellow
                          textColor = 'text-yellow-600';
                        } else {
                          // Low (<42) → Red
                          textColor = 'text-red-600';
                        }
                        
                        return (
                          <>
                            <span className={textColor}>{total.toFixed(1)}</span>
                            {total >= 48 && <span className="text-sm">🔥</span>}
                          </>
                        );
                      })()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm flex items-center gap-1">
                      {(() => {
                        const entry = getEntry(player);
                        const team = entry.player?.team;
                        const gameInfo = gamesMap[team];
                        const impliedTotal = gameInfo?.implied_team_total;
                        
                        if (!impliedTotal) return 'N/A';
                        
                        // Determine color based on implied total value
                        let textColor = '';
                        
                        if (impliedTotal >= 28) {
                          // Elite (28+) → Dark Green / "Gold"
                          textColor = 'text-yellow-500';
                        } else if (impliedTotal >= 24) {
                          // Strong (24–27.5) → Green
                          textColor = 'text-green-600';
                        } else if (impliedTotal >= 21) {
                          // Neutral (21–23.5) → Yellow
                          textColor = 'text-yellow-600';
                        } else {
                          // Low (<21) → Red
                          textColor = 'text-red-600';
                        }
                        
                        return (
                          <>
                            <span className={textColor}>{impliedTotal.toFixed(1)}</span>
                            {impliedTotal >= 28 && <span className="text-sm">🔥</span>}
                          </>
                        );
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
                  <TableCell className="w-20">
                    <Select 
                      value={entry.tier?.toString() || '4'} 
                      onValueChange={(value: string) => {
                        const newTierValue = parseInt(value);
                        onPlayerUpdate(entry.id, { tier: newTierValue });
                      }}
                    >
                      <SelectTrigger className="w-16 h-7 text-xs px-2">
                        <SelectValue>
                          <div className="flex items-center gap-1">
                            <span className="text-xs">{getTierConfig(entry.tier || 4).icon}</span>
                            <span className="text-xs font-medium">{entry.tier || 4}</span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">
                          <div className="flex items-center gap-1">
                            <span>{getTierConfig(1).icon}</span>
                            <span className="text-xs">1</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="2">
                          <div className="flex items-center gap-1">
                            <span>{getTierConfig(2).icon}</span>
                            <span className="text-xs">2</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="3">
                          <div className="flex items-center gap-1">
                            <span>{getTierConfig(3).icon}</span>
                            <span className="text-xs">3</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="4">
                          <div className="flex items-center gap-1">
                            <span>{getTierConfig(4).icon}</span>
                            <span className="text-xs">4</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <PlayerPoolProps 
                      player={entry} 
                      propsData={propsData} 
                      position={position}
                      selectedWeek={selectedWeek}
                    />
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={entry.excluded === true}
                      onCheckedChange={(checked) => 
                        onPlayerUpdate(entry.id, { excluded: checked })
                      }
                    />
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
