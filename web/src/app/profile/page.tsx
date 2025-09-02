"use client";

import { useState, useEffect } from 'react';
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
  trend?: 'up' | 'down' | 'stable';
  note?: string;
  badge?: string;
}

export default function PlayerProfilePage() {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('QB');
  const [teamFilter, setTeamFilter] = useState<string>('All');
  const [showHidden, setShowHidden] = useState<boolean>(false);

  // Fetch players from API
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setLoading(true);
        const data = await PlayerService.getPlayerProfiles({ limit: 1000, show_hidden: showHidden });
        
        // Transform the data to match our PlayerProfile interface
        const transformedPlayers: PlayerProfile[] = data.players.map((player: Player) => ({
          playerDkId: player.playerDkId,
          displayName: player.displayName,
          team: player.team,
          position: player.position,
          playerImage50: player.playerImage50,
          hidden: player.hidden,
          // Mock data for demonstration - in real implementation, these would come from current week data
          currentWeekProj: Math.random() * 10 + 15, // 15-25 range
          currentWeekSalary: Math.floor(Math.random() * 3000) + 5000, // 5000-8000 range
          consistency: Math.floor(Math.random() * 30) + 70, // 70-100 range
          ownership: Math.random() * 30, // 0-30 range
          trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable',
          note: generateMockNote(player.displayName, player.position),
          badge: Math.random() > 0.7 ? 'Consistent' : undefined
        }));
        
        setPlayers(transformedPlayers);
        setFilteredPlayers(transformedPlayers);
      } catch (err) {
        console.error('Error fetching players:', err);
        setError('Failed to fetch players');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, [showHidden]);

  // Filter players based on search and filters
  useEffect(() => {
    let filtered = players;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(player =>
        player.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.team.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Position filter
    if (positionFilter !== 'All') {
      filtered = filtered.filter(player => player.position === positionFilter);
    }

    // Team filter
    if (teamFilter !== 'All') {
      filtered = filtered.filter(player => player.team === teamFilter);
    }

    setFilteredPlayers(filtered);
  }, [players, searchTerm, positionFilter, teamFilter]);

  const generateMockNote = (name: string, position: string): string => {
    const notes = [
      `${name} threw for 4 TDs in last game`,
      `${name} MVP favorite after strong finish`,
      `${name} showing improved deep ball accuracy`,
      `${name} has been consistent all season`,
      `${name} coming off a breakout performance`,
      `${name} facing a tough defense this week`,
      `${name} has favorable matchup this week`
    ];
    return notes[Math.floor(Math.random() * notes.length)];
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPositionOptions = () => {
    const positions = ['All', ...Array.from(new Set(players.map(p => p.position)))];
    return positions;
  };

  const getTeamOptions = () => {
    const teams = ['All', ...Array.from(new Set(players.map(p => p.team))).sort()];
    return teams;
  };

  if (loading) {
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
        <h1 className="text-3xl font-bold text-gray-900">Player Profile Search</h1>
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
            {getPositionOptions().map((position) => (
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
            {getTeamOptions().map((team) => (
              <SelectItem key={team} value={team}>
                {team}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Show Hidden Players Toggle */}
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
        Showing {filteredPlayers.length} of {players.length} players
      </p>

      {/* Player Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlayers.map((player) => (
          <Card 
            key={player.playerDkId} 
            className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-[1.02]"
            onClick={() => {
              // Navigate to player detail page
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
                    <p className="text-gray-600 text-sm">{player.team}</p>
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
                  <p className="font-semibold">{player.currentWeekProj?.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Current Week Salary</p>
                  <p className="font-semibold">${player.currentWeekSalary?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Consistency</p>
                  <p className="font-semibold">{player.consistency}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Ownership</p>
                  <p className="font-semibold">{player.ownership?.toFixed(1)}%</p>
                </div>
              </div>

              {/* Note */}
              {player.note && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-700">{player.note}</p>
                </div>
              )}

              {/* Click indicator */}
              <div className="text-center">
                <p className="text-sm text-blue-600 font-medium">Click to view full profile</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {filteredPlayers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p>No players found matching your search criteria.</p>
          <p className="text-sm mt-1">Try adjusting your search terms or filters.</p>
        </div>
      )}
    </div>
  );
}