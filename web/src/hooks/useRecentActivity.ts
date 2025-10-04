/**
 * Modern useRecentActivity Hook
 * 
 * Fetches recent activity data from the API in modern format.
 * Replaces useRecentActivityLegacy with cleaner implementation.
 */

import { useState, useEffect, useCallback } from 'react';
import { RecentActivity } from '@/types/activity';
import { buildApiUrl as buildBaseUrl } from '@/config/api';

interface UseRecentActivityOptions {
  importType?: string;
  limit?: number;
  weekId?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseRecentActivityReturn {
  activities: RecentActivity[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  retry: (activityId: number) => Promise<void>;
}

export const useRecentActivity = (options: UseRecentActivityOptions = {}): UseRecentActivityReturn => {
  const {
    importType,
    limit = 10,
    weekId,
    autoRefresh = false,
    refreshInterval = 30000 // 30 seconds
  } = options;

  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build API URL
  const buildApiUrl = useCallback(() => {
    const params = new URLSearchParams();
    
    if (importType) params.set('import_type', importType);
    if (limit) params.set('limit', limit.toString());
    if (weekId) params.set('week_id', weekId.toString());

    return buildBaseUrl('/api/recent-activity') + '?' + params.toString();
  }, [importType, limit, weekId]);

  // Fetch activities from API
  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = buildApiUrl();
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: RecentActivity[] = await response.json();
      setActivities(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch activities';
      setError(errorMessage);
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl]);

  // Refresh activities
  const refresh = useCallback(async () => {
    await fetchActivities();
  }, [fetchActivities]);

  // Retry failed activity (placeholder for now)
  const retry = useCallback(async (activityId: number) => {
    console.log('Retry activity:', activityId);
    // In a real implementation, this would call a retry API endpoint
    await refresh();
  }, [refresh]);

  // Initial fetch
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Auto refresh if enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(() => {
      fetchActivities();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchActivities]);

  return {
    activities,
    loading,
    error,
    refresh,
    retry
  };
};

export default useRecentActivity;
