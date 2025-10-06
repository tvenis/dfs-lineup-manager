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
  oprk?: {
    value: number | null;
    quality: 'High' | 'Medium' | 'Low' | null;
  };
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
    fumbles: number;
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

  const formatGameResult = (result: string | null) => {
    if (!result) return null;
    
    // Handle new format with scores: "W 26-23", "L 17-31", "T 14-14"
    if (result.startsWith('W ')) {
      const score = result.substring(2); // Get everything after "W "
      return (
        <>
          <span className="text-green-600 font-semibold">W</span> {score}
        </>
      );
    }
    if (result.startsWith('L ')) {
      const score = result.substring(2); // Get everything after "L "
      return (
        <>
          <span className="text-red-600 font-semibold">L</span> {score}
        </>
      );
    }
    if (result.startsWith('T ')) {
      const score = result.substring(2); // Get everything after "T "
      return (
        <>
          <span className="text-yellow-600 font-semibold">T</span> {score}
        </>
      );
    }
    if (result === 'NA') {
      return <span className="text-gray-600">NA</span>;
    }
    
    // Handle legacy single character format
    switch (result) {
      case 'W': return <span className="text-green-600 font-semibold">W</span>;
      case 'L': return <span className="text-red-600 font-semibold">L</span>;
      case 'T': return <span className="text-yellow-600 font-semibold">T</span>;
      default: return <span className="text-gray-600">{result}</span>;
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
                <tr className="border-b bg-gray-50">
                  <th rowSpan={2} className="text-center p-2 font-medium">Week</th>
                  <th rowSpan={2} className="text-right p-2 font-medium">Points</th>
                  <th rowSpan={2} className="text-right p-2 font-medium">Salary</th>
                  <th rowSpan={2} className="text-center p-2 font-medium">Opponent</th>
                  <th rowSpan={2} className="text-center p-2 font-medium">H/A</th>
                  <th rowSpan={2} className="text-center p-2 font-medium">Result</th>
                  <th rowSpan={2} className="text-center p-2 font-medium">OPRK</th>
                  {playerPosition === 'QB' && (
                    <th colSpan={5} className="text-center p-2 font-medium border-l border-r bg-blue-50">Passing</th>
                  )}
                  <th colSpan={4} className="text-center p-2 font-medium border-r bg-green-50">Rushing</th>
                  {(playerPosition === 'RB' || playerPosition === 'WR' || playerPosition === 'TE') && (
                    <th colSpan={4} className="text-center p-2 font-medium bg-purple-50">Receiving</th>
                  )}
                </tr>
                <tr className="border-b bg-gray-100">
                  {playerPosition === 'QB' && (
                    <>
                      <th className="text-right p-2 font-medium text-xs bg-blue-50">Comp</th>
                      <th className="text-right p-2 font-medium text-xs bg-blue-50">Att</th>
                      <th className="text-right p-2 font-medium text-xs bg-blue-50">Yds</th>
                      <th className="text-right p-2 font-medium text-xs bg-blue-50">TD</th>
                      <th className="text-right p-2 font-medium text-xs bg-blue-50 border-r">Int</th>
                    </>
                  )}
                  <th className="text-right p-2 font-medium text-xs bg-green-50">Att</th>
                  <th className="text-right p-2 font-medium text-xs bg-green-50">Yds</th>
                  <th className="text-right p-2 font-medium text-xs bg-green-50">TD</th>
                  <th className="text-right p-2 font-medium text-xs bg-green-50 border-r">Fum</th>
                  {(playerPosition === 'RB' || playerPosition === 'WR' || playerPosition === 'TE') && (
                    <>
                      <th className="text-right p-2 font-medium text-xs bg-purple-50">Tgt</th>
                      <th className="text-right p-2 font-medium text-xs bg-purple-50">Rec</th>
                      <th className="text-right p-2 font-medium text-xs bg-purple-50">Yds</th>
                      <th className="text-right p-2 font-medium text-xs bg-purple-50">TD</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {gameLogData.map((game, index) => (
                  <tr key={index} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-gray-50/30' : 'bg-white'}`}>
                    <td className="p-2 text-center font-medium">{game.week}</td>
                    <td className="p-2 text-right font-medium">{game.fantasy_points.toFixed(1)}</td>
                    <td className="p-2 text-right">${game.salary.toLocaleString()}</td>
                    <td className="p-2 text-center">{game.opponent || 'BYE'}</td>
                    <td className="p-2 text-center">{formatHomeOrAway(game.home_or_away)}</td>
                    <td className="p-2 text-center">
                      {game.result ? (
                        <span className="text-xs">
                          {formatGameResult(game.result)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      {(() => {
                        const { value, quality } = game.oprk || {};
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
                            {value ?? '-'}
                          </span>
                        );
                      })()}
                    </td>
                    {playerPosition === 'QB' && (
                      <>
                        <td className="p-2 text-right">{game.passing?.completions || 0}</td>
                        <td className="p-2 text-right">{game.passing?.attempts || 0}</td>
                        <td className="p-2 text-right">{game.passing?.yards || 0}</td>
                        <td className="p-2 text-right">{game.passing?.touchdowns || 0}</td>
                        <td className="p-2 text-right border-r">{game.passing?.interceptions || 0}</td>
                      </>
                    )}
                    <td className="p-2 text-right">{game.rushing?.attempts || 0}</td>
                    <td className="p-2 text-right">{game.rushing?.yards || 0}</td>
                    <td className="p-2 text-right">{game.rushing?.touchdowns || 0}</td>
                    <td className="p-2 text-right border-r">{game.rushing?.fumbles || 0}</td>
                    {(playerPosition === 'RB' || playerPosition === 'WR' || playerPosition === 'TE') && (
                      <>
                        <td className="p-2 text-right">{game.receiving?.targets || 0}</td>
                        <td className="p-2 text-right">{game.receiving?.receptions || 0}</td>
                        <td className="p-2 text-right">{game.receiving?.yards || 0}</td>
                        <td className="p-2 text-right">{game.receiving?.touchdowns || 0}</td>
                      </>
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
