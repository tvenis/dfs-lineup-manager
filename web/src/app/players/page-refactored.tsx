"use client";

import { useState, useEffect, useMemo } from 'react';
import { PlayerService, PlayerPoolEntryWithAnalysisDto } from '@/lib/playerService';
import { WeekService } from '@/lib/weekService';
import type { PlayerPoolEntry, Week } from '@/types/prd';
import { PlayerWeekAnalysis, WeekAnalysisData } from '@/components/PlayerWeekAnalysis';
import { PlayerPoolTips } from '@/components/PlayerPoolTips';
import { PlayerPoolFilters } from '@/components/PlayerPoolFilters';
import { PlayerPoolTable } from '@/components/PlayerPoolTable';
import { PlayerPoolProps } from '@/components/PlayerPoolProps';
import { PlayerPoolPagination } from '@/components/PlayerPoolPagination';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';

export default function PlayerPoolPage() {
  // State management
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [playerPool, setPlayerPool] = useState<PlayerPoolEntryWithAnalysisDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gamesMap, setGamesMap] = useState<Record<string, any>>({});
  const [propsData, setPropsData] = useState<Record<number, Record<string, any>>>({});
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [hideExcluded, setHideExcluded] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('QB');
  const [tierFilter, setTierFilter] = useState<number | 'all'>('all');
  const [draftGroupFilter, setDraftGroupFilter] = useState<string>('all');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);

  // Fetch weeks on component mount
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const weeksData = await WeekService.getWeeks();
        setWeeks(weeksData.weeks);
        if (weeksData.weeks.length > 0) {
          setSelectedWeek(weeksData.weeks[0].id);
        }
      } catch (error) {
        console.error('Error fetching weeks:', error);
        setError('Failed to load weeks');
      }
    };

    fetchWeeks();
  }, []);

  // Fetch player data when week changes
  useEffect(() => {
    if (selectedWeek) {
      fetchPlayerData(selectedWeek);
    }
  }, [selectedWeek]);

  // Fetch player data using the optimized endpoint
  const fetchPlayerData = async (weekId: number) => {
    try {
      setLoading(true);
      setError(null);

      const data = await PlayerService.getPlayerPoolComplete(weekId, {
        limit: 1000
      }, true);

      setPlayerPool(data.entries || []);
      setGamesMap(data.games_map || {});
      setPropsData(data.props_data || {});

    } catch (error) {
      console.error('Error fetching player data:', error);
      setError('Failed to load player data');
    } finally {
      setLoading(false);
    }
  };

  // Get unique draft groups
  const getUniqueDraftGroups = useMemo(() => {
    const draftGroups = new Set<string>();
    playerPool.forEach(player => {
      if (player.entry.draftGroup) {
        draftGroups.add(player.entry.draftGroup);
      }
    });
    return Array.from(draftGroups).sort();
  }, [playerPool]);

  // Group players by position
  const playersByPosition = useMemo(() => {
    const grouped: Record<string, PlayerPoolEntryWithAnalysisDto[]> = {
      QB: [],
      RB: [],
      WR: [],
      TE: [],
      DST: []
    };

    playerPool.forEach(player => {
      const position = player.entry.player.position;
      if (grouped[position]) {
        grouped[position].push(player);
      }
    });

    return grouped;
  }, [playerPool]);

  // Get flex players (RB + WR + TE)
  const getFlexPlayers = () => {
    return [
      ...playersByPosition.RB,
      ...playersByPosition.WR,
      ...playersByPosition.TE
    ];
  };

  // Filter players based on search, draft group, and other filters
  const getFilteredPlayers = (position: string) => {
    let players = playersByPosition[position] || [];
    
    if (position === 'FLEX') {
      players = getFlexPlayers();
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      players = players.filter(player => 
        player.entry.player.displayName.toLowerCase().includes(term) ||
        player.entry.player.team.toLowerCase().includes(term)
      );
    }

    // Apply draft group filter
    if (draftGroupFilter !== 'all') {
      players = players.filter(player => player.entry.draftGroup === draftGroupFilter);
    }

    return players;
  };

  // Get tier statistics for a position
  const getTierStats = (position: string) => {
    const players = getFilteredPlayers(position);
    const stats = { tier1: 0, tier2: 0, tier3: 0, tier4: 0 };
    
    players.forEach(player => {
      const tier = player.entry.tier || 4;
      if (tier === 1) stats.tier1++;
      else if (tier === 2) stats.tier2++;
      else if (tier === 3) stats.tier3++;
      else stats.tier4++;
    });
    
    return stats;
  };

  // Get tier configuration
  const getTierConfig = (tier: number) => {
    const configs = {
      1: {
        icon: '⭐',
        label: 'Elite',
        description: 'Top tier players',
        headerColor: 'bg-gradient-to-r from-yellow-400 to-yellow-500',
        headerTextColor: 'text-yellow-900',
        badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        badgeTextColor: 'text-yellow-800'
      },
      2: {
        icon: '💪',
        label: 'Strong',
        description: 'Reliable performers',
        headerColor: 'bg-gradient-to-r from-green-400 to-green-500',
        headerTextColor: 'text-green-900',
        badgeColor: 'bg-green-100 text-green-800 border-green-300',
        badgeTextColor: 'text-green-800'
      },
      3: {
        icon: '⚡',
        label: 'Value',
        description: 'Good value plays',
        headerColor: 'bg-gradient-to-r from-blue-400 to-blue-500',
        headerTextColor: 'text-blue-900',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
        badgeTextColor: 'text-blue-800'
      },
      4: {
        icon: '⚠️',
        label: 'Avoid',
        description: 'High risk plays',
        headerColor: 'bg-gradient-to-r from-red-400 to-red-500',
        headerTextColor: 'text-red-900',
        badgeColor: 'bg-red-100 text-red-800 border-red-300',
        badgeTextColor: 'text-red-800'
      }
    };
    
    return configs[tier as keyof typeof configs] || configs[4];
  };

  // Handle player updates
  const handlePlayerUpdate = async (playerId: number, updates: any) => {
    if (playerId === 0) {
      // Handle filter updates
      if (updates.tierFilter !== undefined) {
        setTierFilter(updates.tierFilter);
      }
      return;
    }

    try {
      // Update player in database
      await PlayerService.updatePlayerPoolEntry(playerId, updates);
      
      // Update local state
      setPlayerPool(prev => 
        prev.map(player => 
          player.entry.id === playerId 
            ? { ...player, entry: { ...player.entry, ...updates } }
            : player
        )
      );
    } catch (error) {
      console.error('Error updating player:', error);
    }
  };

  // Handle bulk updates
  const handleBulkUpdate = async (updates: Array<{ playerId: number; updates: any }>) => {
    try {
      // Update all players in database
      await Promise.all(
        updates.map(({ playerId, updates: playerUpdates }) =>
          PlayerService.updatePlayerPoolEntry(playerId, playerUpdates)
        )
      );
      
      // Update local state
      setPlayerPool(prev => 
        prev.map(player => {
          const update = updates.find(u => u.playerId === player.entry.id);
          return update ? { ...player, entry: { ...player.entry, ...update.updates } } : player;
        })
      );
    } catch (error) {
      console.error('Error updating players:', error);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading player data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
        <p className="font-medium">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <PlayerPoolFilters
        weeks={weeks}
        selectedWeek={selectedWeek}
        onWeekChange={setSelectedWeek}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        hideExcluded={hideExcluded}
        onHideExcludedChange={setHideExcluded}
        draftGroupFilter={draftGroupFilter}
        onDraftGroupChange={setDraftGroupFilter}
        uniqueDraftGroups={getUniqueDraftGroups}
        tierFilter={tierFilter}
        onTierFilterChange={setTierFilter}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        playersByPosition={playersByPosition}
        getFlexPlayers={getFlexPlayers}
      />

      {/* Player Evaluation Tips & Strategy Section */}
      <PlayerPoolTips selectedWeek={weeks.find(w => w.id === selectedWeek)?.week_number || 1} />

      {/* Tier Legend */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Player Tiers</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(tier => {
            const config = getTierConfig(tier);
            return (
              <div key={tier} className={`${config.headerColor} ${config.headerTextColor} p-3 rounded-lg flex items-center gap-3`}>
                <span className="text-xl">{config.icon}</span>
                <div>
                  <div className="font-medium">Tier {tier}</div>
                  <div className="text-xs opacity-90">{config.label}</div>
                  <div className="text-xs opacity-75">{config.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg border border-gray-200">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {(['QB', 'RB', 'WR', 'TE', 'FLEX', 'DST'] as string[]).map((position) => {
            const filteredPlayers = getFilteredPlayers(position);
            const excludedCount = filteredPlayers.filter(player => player.entry.excluded === true).length;
            const tierStats = getTierStats(position);

            return (
              <TabsContent key={position} value={position} className="m-0 border-t">
                <PlayerPoolTable
                  players={filteredPlayers}
                  position={position}
                  selectedWeek={selectedWeek!}
                  gamesMap={gamesMap}
                  propsData={propsData}
                  hideExcluded={hideExcluded}
                  tierFilter={tierFilter}
                  onPlayerUpdate={handlePlayerUpdate}
                  onBulkUpdate={handleBulkUpdate}
                  getTierConfig={getTierConfig}
                  getTierStats={getTierStats}
                />
              </TabsContent>
            );
          })}
        </Tabs>
      </div>

      {/* Pagination */}
      <PlayerPoolPagination
        currentPage={currentPage}
        totalPages={Math.ceil(playerPool.length / itemsPerPage)}
        totalItems={playerPool.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
}
