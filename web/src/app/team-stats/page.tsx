"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DKDefenseScoreCard } from '@/components/DKDefenseScoreCard';
import { Shield, TrendingUp, TrendingDown } from 'lucide-react';
import { buildApiUrl, API_CONFIG } from '@/config/api';

interface Week {
  id: number;
  week_number: number;
  year: number;
  status: string;
  label: string;
}

interface TeamStats {
  id: number;
  week_id: number;
  team_id: number;
  team: {
    id: number;
    full_name: string;
    abbreviation: string;
  };
  dk_defense_score: number;
  points_allowed: number;
  def_sacks: number;
  def_interceptions: number;
  fumble_recovery_opp?: number; // optional for compatibility
  def_tds: number;
  special_teams_tds: number;
  def_safeties: number;
  blocked_kicks?: number; // optional for compatibility
  week: {
    week_number: number;
    season: number;
  };
}

export default function TeamStatsPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available weeks
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.TEAM_STATS_WEEKS));
        if (!response.ok) throw new Error('Failed to fetch weeks');
        const data = await response.json();
        setWeeks(data);
        if (data.length > 0) {
          setSelectedWeek(data[0].id);
        }
      } catch (err) {
        setError('Failed to load weeks');
        console.error('Error fetching weeks:', err);
      }
    };

    fetchWeeks();
  }, []);

  // Fetch team stats for selected week
  useEffect(() => {
    if (!selectedWeek) return;

    const fetchTeamStats = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(buildApiUrl(`${API_CONFIG.ENDPOINTS.TEAM_STATS_WEEK}/${selectedWeek}`));
        if (!response.ok) throw new Error('Failed to fetch team stats');
        const data = await response.json();
        setTeamStats(data.stats || []);
      } catch (err) {
        setError('Failed to load team stats');
        console.error('Error fetching team stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamStats();
  }, [selectedWeek]);

  // Get score trend indicator
  const getScoreTrend = (score: number) => {
    if (score >= 10) return { icon: TrendingUp, color: 'text-green-600', label: 'Excellent' };
    if (score >= 5) return { icon: TrendingUp, color: 'text-yellow-600', label: 'Good' };
    if (score >= 0) return { icon: TrendingDown, color: 'text-orange-600', label: 'Average' };
    return { icon: TrendingDown, color: 'text-red-600', label: 'Poor' };
  };

  // Calculate DK points awarded for points allowed
  const getDKPointsForPointsAllowed = (pointsAllowed: number | null): number => {
    if (pointsAllowed === null || pointsAllowed === undefined) return 0;
    
    if (pointsAllowed === 0) return 10.0;
    else if (1 <= pointsAllowed && pointsAllowed <= 6) return 7.0;
    else if (7 <= pointsAllowed && pointsAllowed <= 13) return 4.0;
    else if (14 <= pointsAllowed && pointsAllowed <= 20) return 1.0;
    else if (21 <= pointsAllowed && pointsAllowed <= 27) return 0.0;
    else if (28 <= pointsAllowed && pointsAllowed <= 34) return -1.0;
    else return -4.0; // 35+ points allowed
  };

  // Sort team stats by DK defense score (descending)
  const sortedTeamStats = [...teamStats].sort((a, b) => (b.dk_defense_score || 0) - (a.dk_defense_score || 0));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Defense Stats</h1>
          <p className="text-muted-foreground">
            DraftKings Defense/Special Teams scoring analysis
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select 
            value={selectedWeek?.toString() || ''} 
            onValueChange={(value) => setSelectedWeek(parseInt(value))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Week" />
            </SelectTrigger>
            <SelectContent>
              {weeks.map((week) => (
                <SelectItem key={week.id} value={week.id.toString()}>
                  Week {week.week_number} ({week.year})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-600">{error}</div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-8">Loading team stats...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Team Stats Table */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Team Defense Scoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>DK Score</TableHead>
                      <TableHead>Pts Allowed</TableHead>
                      <TableHead>DK Points</TableHead>
                      <TableHead>Sacks</TableHead>
                      <TableHead>INTs</TableHead>
                      <TableHead>Fumble Rec</TableHead>
                      <TableHead>Def TDs</TableHead>
                      <TableHead>ST TDs</TableHead>
                      <TableHead>Safeties</TableHead>
                      <TableHead>Blocked Kicks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTeamStats.map((stats, index) => {
                      const trend = getScoreTrend(stats.dk_defense_score || 0);
                      const TrendIcon = trend.icon;
                      
                      return (
                        <TableRow key={stats.id}>
                          <TableCell className="font-medium">
                            #{index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {stats.team.abbreviation}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {stats.team.full_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${trend.color}`}>
                                {stats.dk_defense_score?.toFixed(1) || 'N/A'}
                              </span>
                              <TrendIcon className={`h-4 w-4 ${trend.color}`} />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline"
                              className={
                                (stats.points_allowed || 0) <= 6 ? 'border-green-200 text-green-700' :
                                (stats.points_allowed || 0) <= 13 ? 'border-yellow-200 text-yellow-700' :
                                (stats.points_allowed || 0) <= 20 ? 'border-orange-200 text-orange-700' :
                                'border-red-200 text-red-700'
                              }
                            >
                              {stats.points_allowed || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {stats.points_allowed !== null && stats.points_allowed !== undefined 
                              ? `${getDKPointsForPointsAllowed(stats.points_allowed) > 0 ? '+' : ''}${getDKPointsForPointsAllowed(stats.points_allowed).toFixed(1)}`
                              : 'N/A'
                            }
                          </TableCell>
                          <TableCell>{stats.def_sacks || 0}</TableCell>
                          <TableCell>{stats.def_interceptions || 0}</TableCell>
                          <TableCell>{stats.fumble_recovery_opp || 0}</TableCell>
                          <TableCell>{stats.def_tds || 0}</TableCell>
                          <TableCell>{stats.special_teams_tds || 0}</TableCell>
                          <TableCell>{stats.def_safeties || 0}</TableCell>
                          <TableCell>{stats.blocked_kicks || 0}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* DK Defense Score Breakdown */}
          <div className="space-y-4">
            <DKDefenseScoreCard
              dkDefenseScore={null}
              pointsAllowed={null}
              defSacks={null}
              defInterceptions={null}
              defTds={null}
              specialTeamsTds={null}
              defSafeties={null}
              className="border-blue-200 bg-blue-50"
            />
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Scoring Guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="space-y-1">
                  <div className="font-medium">Defensive Stats:</div>
                  <div>• Sacks: +1 point each</div>
                  <div>• Interceptions: +2 points each</div>
                  <div>• Fumble Recovery: +2 points each</div>
                  <div>• Defensive TDs: +6 points each</div>
                  <div>• Special Teams TDs: +6 points each</div>
                  <div>• Safeties: +2 points each</div>
                  <div>• Blocked Kicks: +2 points each</div>
                </div>
                <div className="space-y-1 pt-2 border-t">
                  <div className="font-medium">Points Allowed:</div>
                  <div>• 0 points: +10</div>
                  <div>• 1-6 points: +7</div>
                  <div>• 7-13 points: +4</div>
                  <div>• 14-20 points: +1</div>
                  <div>• 21-27 points: 0</div>
                  <div>• 28-34 points: -1</div>
                  <div>• 35+ points: -4</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
