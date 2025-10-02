"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, TrendingUp, TrendingDown, Minus, Eye, EyeOff } from 'lucide-react';
import { PlayerService } from '@/lib/playerService';
import type { Player } from '@/types/prd';

interface PlayerProfile {
  playerDkId: number;
  displayName: string;
  team: string;
  position: string;
  playerImage50?: string;
  hidden: boolean;
  currentWeekProj?: number;
  currentWeekSalary?: number;
  consistency?: number;
  ownership?: number;
  status?: string;
  trend?: 'up' | 'down' | 'stable';
  badge?: string;
}

// Pagination constants
const PAGE_SIZE = 50; // Reduced from 1000 to 50 for better performance
const DEBOUNCE_DELAY = 300; // ms

export default function PlayerProfilePageOptimized() {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('QB');
  const [teamFilter, setTeamFilter] = useState<string>('All');
  const [showHidden, setShowHidden] = useState<boolean>(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Debounced search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(0); // Reset to first page when searching
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch players with pagination
  const fetchPlayers = useCallback(async (page: number = 0, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
      }
      
      const data = await PlayerService.getPlayerProfilesWithPoolData({ 
        limit: PAGE_SIZE, 
        skip: page * PAGE_SIZE,
        show_hidden: showHidden,
        position: positionFilter !== 'All' ? positionFilter : undefined,
        team_id: teamFilter !== 'All' ? teamFilter : undefined,
        search: debouncedSearchTerm || undefined
      });
      
      const transformedPlayers: PlayerProfile[] = data.players.map((player: any) => ({
        playerDkId: player.playerDkId,
        displayName: player.displayName,
        team: player.team,
        position: player.position,
        playerImage50: player.playerImage50,
        hidden: player.hidden,
        currentWeekProj: player.currentWeekProj,
        currentWeekSalary: player.currentWeekSalary,
        consistency: player.consistency,
        ownership: player.ownership,
        status: player.status,
        trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable',
        badge: Math.random() > 0.7 ? 'Consistent' : undefined
      }));
      
      // Sort players alphabetically by last name
      const sortedPlayers = transformedPlayers.sort((a, b) => {
        const aLastName = a.displayName.split(' ').pop() || '';
        const bLastName = b.displayName.split(' ').pop() || '';
        return aLastName.localeCompare(bLastName);
      });
      
      if (reset) {
        setPlayers(sortedPlayers);
      } else {
        setPlayers(prev => [...prev, ...sortedPlayers]);
      }
      
      setTotalPlayers(data.total);
      setHasMore((page + 1) * PAGE_SIZE < data.total);
      
    } catch (err) {
      console.error('Error fetching players:', err);
      setError('Failed to fetch players');
    } finally {
      setLoading(false);
    }
  }, [showHidden, positionFilter, teamFilter, debouncedSearchTerm]);

  // Initial load and filter changes
  useEffect(() => {
    fetchPlayers(0, true);
  }, [fetchPlayers]);

  // Load more players
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchPlayers(nextPage, false);
    }
  }, [loading, hasMore, currentPage, fetchPlayers]);

  // Get status color for status badge
  const getStatusColor = useCallback((status: string) => {
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
  }, []);

  const getTrendIcon = useCallback((trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  }, []);

  // Memoized filter options
  const positionOptions = useMemo(() => {
    const positions = ['All', 'QB', 'RB', 'WR', 'TE', 'DST'];
    return positions;
  }, []);

  const teamOptions = useMemo(() => {
    const teams = ['All', ...Array.from(new Set(players.map(p => p.team))).sort()];
    return teams;
  }, [players]);

  if (loading && players.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading players...</p>
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-gray-900">Player Profile Search (Optimized)</h1>
        <p className="text-gray-600">Search and view detailed profiles for any NFL player</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search players or teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={positionFilter} onValueChange={setPositionFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {positionOptions.map((position) => (
              <SelectItem key={position} value={position}>
                {position}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {teamOptions.map((team) => (
              <SelectItem key={team} value={team}>
                {team}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center space-x-2">
          <Switch
            id="show-hidden"
            checked={showHidden}
            onCheckedChange={setShowHidden}
          />
          <Label htmlFor="show-hidden" className="flex items-center gap-2 text-sm">
            {showHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Show Hidden
          </Label>
        </div>
      </div>

      {/* Player Count */}
      <p className="text-sm text-gray-600">
        Showing {players.length} of {totalPlayers} players
      </p>

      {/* Player Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {players.map((player) => (
          <Card 
            key={player.playerDkId} 
            className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.02]"
            onClick={() => {
              window.location.href = `/profile/${player.playerDkId}`;
            }}
          >
            <CardContent className="p-6">
              {/* Player Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                    {player.playerImage50 ? (
                      <img
                        src={player.playerImage50}
                        alt={player.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 text-sm font-medium">
                          {player.displayName.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{player.displayName}</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-600 text-sm">{player.team}</p>
                      {player.status && (
                        <Badge 
                          variant="outline" 
                          className={`${getStatusColor(player.status)} text-xs font-medium`}
                        >
                          {player.status}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {player.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {player.badge}
                        </Badge>
                      )}
                      {player.hidden && (
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                          <EyeOff className="w-3 h-3 mr-1" />
                          Hidden
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {player.position}
                  </Badge>
                  {getTrendIcon(player.trend!)}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500">Current Week Proj</p>
                  <p className="font-semibold">{player.currentWeekProj?.toFixed(1) || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Current Week Salary</p>
                  <p className="font-semibold">${player.currentWeekSalary?.toLocaleString() || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Current Week Ownership</p>
                  <p className="font-semibold">{player.ownership?.toFixed(1) ? `${player.ownership.toFixed(1)}%` : 'N/A'}</p>
                </div>
              </div>


              {/* Click indicator */}
              <div className="text-center">
                <p className="text-sm text-blue-600 font-medium">Click to view full profile</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center">
          <Button 
            onClick={loadMore}
            disabled={loading}
            className="px-8 py-2"
          >
            {loading ? 'Loading...' : 'Load More Players'}
          </Button>
        </div>
      )}

      {/* No Results */}
      {players.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p>No players found matching your search criteria.</p>
          <p className="text-sm mt-1">Try adjusting your search terms or filters.</p>
        </div>
      )}
    </div>
  );
}
