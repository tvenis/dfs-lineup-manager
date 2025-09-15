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

  // Fetch player pool and props when week changes using optimized single call
  const fetchPlayerData = useCallback(async (weekId: number) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🚀 [OPTIMIZED] Fetching complete player pool data in single call');

      // Use optimized single endpoint that gets everything at once
      const completeData = await PlayerService.getPlayerPoolComplete(weekId, { limit: 1000 }, true);

      // Extract data from the optimized response
      const entries = completeData.entries || [];
      const gamesMap = completeData.games_map || {};
      const propsData = completeData.props_data || {};

      console.log(`📊 [OPTIMIZED] Received complete data:`, {
        entries: entries.length,
        gamesMap: Object.keys(gamesMap).length,
        propsData: Object.keys(propsData).length,
        meta: completeData.meta
      });

      // Update state with all the data
      setPlayerPool(entries);
      setGamesMap(gamesMap);
      setPlayerProps(propsData);

      console.log('✅ [OPTIMIZED] Complete player pool data loaded successfully');

    } catch (err) {
      console.error('Error fetching complete player data:', err);
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
