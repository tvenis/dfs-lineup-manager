'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { buildApiUrl } from '@/config/api';

interface GameLogData {
  week: number;
  fantasy_points: number;
  salary: number;
  opponent: string | null;
  home_or_away: string | null;
  result: string | null;
  passing?: {
    completions: number;
    attempts: number;
    yards: number;
    touchdowns: number;
    interceptions: number;
  };
  rushing?: {
    attempts: number;
    yards: number;
    touchdowns: number;
  };
  receiving?: {
    targets: number;
    receptions: number;
    yards: number;
    touchdowns: number;
  };
}

interface GameLogResponse {
  game_log: GameLogData[];
  year: number;
  player: string;
  position: string;
}

interface GameLogCardProps {
  playerId: string;
  playerPosition: string;
}

export function GameLogCard({ playerId, playerPosition }: GameLogCardProps) {
  const [gameLogData, setGameLogData] = useState<GameLogData[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available years
  useEffect(() => {
    const fetchYears = async () => {
      try {
        console.log('GameLogCard - Fetching years...');
        const response = await fetch(buildApiUrl('/api/weeks/years'));
        console.log('GameLogCard - Years response status:', response.status);
        if (!response.ok) throw new Error('Failed to fetch years');
        const data = await response.json();
        console.log('GameLogCard - Years data:', data);
        setAvailableYears(data.years);
        if (data.years.length > 0) {
          setSelectedYear(data.years[0]); // Set to most recent year
        }
      } catch (err) {
        console.error('Error fetching years:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch years');
      }
    };

    fetchYears();
  }, []);

  // Fetch game log data
  useEffect(() => {
    const fetchGameLog = async () => {
      if (!playerId || !selectedYear) return;

      try {
        setLoading(true);
        setError(null);

        console.log('GameLogCard - Fetching game log for player:', playerId, 'year:', selectedYear);
        const response = await fetch(buildApiUrl(`/api/players/${playerId}/game-log/${selectedYear}`));
        console.log('GameLogCard - Game log response status:', response.status);
        if (!response.ok) throw new Error('Failed to fetch game log');
        
        const data: GameLogResponse = await response.json();
        console.log('GameLogCard - Game log data:', data);
        setGameLogData(data.game_log);
      } catch (err) {
        console.error('Error fetching game log:', err);
        setError(err instanceof Error ? err.message : 'Failed to load game log');
      } finally {
        setLoading(false);
      }
    };

    fetchGameLog();
  }, [playerId, selectedYear]);

  const formatHomeOrAway = (homeOrAway: string | null) => {
    if (!homeOrAway) return 'N/A';
    switch (homeOrAway) {
      case 'H': return 'H';
      case 'A': return 'A';
      case 'N': return 'N';
      default: return 'N/A';
    }
  };

  const getResultColor = (result: string | null) => {
    if (!result) return 'bg-gray-100';
    switch (result) {
      case 'W': return 'bg-green-100 text-green-800';
      case 'L': return 'bg-red-100 text-red-800';
      case 'T': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Game Log</CardTitle>
          <CardDescription>Loading game log data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Game Log</CardTitle>
          <CardDescription>Error loading game log data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Game Log</CardTitle>
            <CardDescription>
              {gameLogData.length} games played in {selectedYear}
            </CardDescription>
          </div>
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {gameLogData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No game data available for {selectedYear}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Week</th>
                  <th className="text-center p-2 font-medium">Fantasy</th>
                  <th className="text-center p-2 font-medium">Salary</th>
                  <th className="text-center p-2 font-medium">Game</th>
                  {playerPosition === 'QB' && (
                    <>
                      <th className="text-center p-2 font-medium">Passing</th>
                    </>
                  )}
                  <th className="text-center p-2 font-medium">Rushing</th>
                  {(playerPosition === 'RB' || playerPosition === 'WR' || playerPosition === 'TE') && (
                    <th className="text-center p-2 font-medium">Receiving</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {gameLogData.map((game, index) => (
                  <tr key={index} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-gray-50/30' : 'bg-white'}`}>
                    <td className="p-2 font-medium">{game.week}</td>
                    <td className="p-2 text-center font-medium">{game.fantasy_points.toFixed(1)}</td>
                    <td className="p-2 text-center">${game.salary.toLocaleString()}</td>
                    <td className="p-2 text-center">
                      <div className="flex flex-col items-center space-y-1">
                        <div className="flex items-center space-x-1">
                          <span className="text-xs">{formatHomeOrAway(game.home_or_away)}</span>
                          <span className="font-medium">{game.opponent || 'BYE'}</span>
                        </div>
                        {game.result && (
                          <Badge className={`text-xs ${getResultColor(game.result)}`}>
                            {game.result}
                          </Badge>
                        )}
                      </div>
                    </td>
                    {playerPosition === 'QB' && (
                      <td className="p-2 text-center">
                        {game.passing ? (
                          <div className="text-xs space-y-1">
                            <div>{game.passing.completions}/{game.passing.attempts}</div>
                            <div>{game.passing.yards} yds</div>
                            <div>{game.passing.touchdowns} TD, {game.passing.interceptions} INT</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    )}
                    <td className="p-2 text-center">
                      {game.rushing ? (
                        <div className="text-xs space-y-1">
                          <div>{game.rushing.attempts} att</div>
                          <div>{game.rushing.yards} yds</div>
                          <div>{game.rushing.touchdowns} TD</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    {(playerPosition === 'RB' || playerPosition === 'WR' || playerPosition === 'TE') && (
                      <td className="p-2 text-center">
                        {game.receiving ? (
                          <div className="text-xs space-y-1">
                            <div>{game.receiving.receptions}/{game.receiving.targets}</div>
                            <div>{game.receiving.yards} yds</div>
                            <div>{game.receiving.touchdowns} TD</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
