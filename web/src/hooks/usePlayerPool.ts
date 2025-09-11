import { useState, useEffect, useMemo, useCallback } from 'react';
import { PlayerService } from '@/lib/playerService';
import type { PlayerPoolEntry, Week } from '@/types/prd';

interface PlayerProps {
  [playerId: number]: {
    [market: string]: {
      point?: number;
      price?: number;
      bookmaker?: string;
    };
  };
}

interface UsePlayerPoolReturn {
  // Data
  weeks: Week[];
  selectedWeek: number | null;
  playerPool: PlayerPoolEntry[];
  playerProps: PlayerProps;
  gamesMap: Record<string, any>;
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Actions
  setSelectedWeek: (weekId: number) => void;
  refetch: () => Promise<void>;
}

export function usePlayerPool(): UsePlayerPoolReturn {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [playerPool, setPlayerPool] = useState<PlayerPoolEntry[]>([]);
  const [playerProps, setPlayerProps] = useState<PlayerProps>({});
  const [gamesMap, setGamesMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch weeks on mount
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const weeksData = await PlayerService.getWeeks();
        setWeeks(weeksData.weeks || []);
        
        // Auto-select active week or first week
        const activeWeek = weeksData.weeks?.find((w: Week) => w.status === 'Active');
        if (activeWeek) {
          setSelectedWeek(activeWeek.id);
        } else if (weeksData.weeks?.length > 0) {
          setSelectedWeek(weeksData.weeks[0].id);
        }
      } catch (err) {
        console.error('Error fetching weeks:', err);
        setError('Failed to fetch weeks');
      }
    };

    fetchWeeks();
  }, []);

  // Fetch player pool and props when week changes
  const fetchPlayerData = useCallback(async (weekId: number) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch player pool and analysis in parallel
      const [poolData, analysisData] = await Promise.all([
        PlayerService.getPlayerPool(weekId, { limit: 1000 }),
        PlayerService.getPlayerPoolWithAnalysis(weekId)
      ]);

      const entries = poolData.entries || [];
      setPlayerPool(entries);

      // Build games map from analysis data
      const mapByTeam: Record<string, any> = {};
      (analysisData.entries || []).forEach((e: any) => {
        const team = e.entry?.player?.team;
        if (team) {
          mapByTeam[team] = {
            opponentAbbr: e.analysis?.opponent_abbr ?? null,
            homeOrAway: (e.analysis?.homeoraway as 'H' | 'A' | 'N') || 'N',
            proj_spread: e.analysis?.proj_spread ?? null,
            proj_total: e.analysis?.proj_total ?? null,
            implied_team_total: e.analysis?.implied_team_total ?? null
          };
        }
      });
      setGamesMap(mapByTeam);

      // Fetch all props in a single batch call
      if (entries.length > 0) {
        const playerIds = entries.map(entry => entry.player.playerDkId);
        const propsData = await PlayerService.getPlayerPropsBatch(playerIds, weekId);
        setPlayerProps(propsData);
      }

    } catch (err) {
      console.error('Error fetching player data:', err);
      setError('Failed to fetch player data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data when selectedWeek changes
  useEffect(() => {
    if (selectedWeek) {
      fetchPlayerData(selectedWeek);
    }
  }, [selectedWeek, fetchPlayerData]);

  const refetch = useCallback(async () => {
    if (selectedWeek) {
      await fetchPlayerData(selectedWeek);
    }
  }, [selectedWeek, fetchPlayerData]);

  return {
    weeks,
    selectedWeek,
    playerPool,
    playerProps,
    gamesMap,
    loading,
    error,
    setSelectedWeek,
    refetch
  };
}
