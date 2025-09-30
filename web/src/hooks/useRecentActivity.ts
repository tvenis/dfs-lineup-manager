/**
 * useRecentActivity Hook
 * 
 * A custom React hook for fetching and managing recent activity data
 * with caching, error handling, and automatic refresh capabilities.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  RecentActivity, 
  ActivityFilters, 
  ActivityStats 
} from '@/types/activity';
import { buildApiUrl } from '@/config/api';

interface UseRecentActivityOptions {
  initialFilters?: ActivityFilters;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enabled?: boolean;
}

interface UseRecentActivityReturn {
  activities: RecentActivity[];
  loading: boolean;
  error: string | null;
  stats: ActivityStats | null;
  filters: ActivityFilters;
  hasMore: boolean;
  totalCount: number;
  setFilters: (filters: ActivityFilters) => void;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  retry: (activityId: number) => Promise<void>;
  clearError: () => void;
}

const DEFAULT_FILTERS: ActivityFilters = {
  limit: 20,
  offset: 0,
  include_archived: false,
};

export const useRecentActivity = (options: UseRecentActivityOptions = {}): UseRecentActivityReturn => {
  const {
    initialFilters = {},
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
    enabled = true
  } = options;

  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [filters, setFiltersState] = useState<ActivityFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters
  });
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Build API URL with filters
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    
    if (filters.limit) params.set('limit', filters.limit.toString());
    if (filters.offset) params.set('offset', filters.offset.toString());
    if (filters.action_filter) params.set('action', filters.action_filter);
    if (filters.category_filter) params.set('category', filters.category_filter);
    if (filters.week_id) params.set('week_id', filters.week_id.toString());
    if (filters.operation_status) params.set('status', filters.operation_status);
    if (filters.include_archived) params.set('include_archived', 'true');
    if (filters.import_type) params.set('import_type', filters.import_type);

    return buildApiUrl(`/api/activity?${params.toString()}`);
  }, [filters]);

  // Fetch activities from API
  const fetchActivities = useCallback(async (append = false) => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (append) {
        setActivities(prev => [...prev, ...data.activities]);
      } else {
        setActivities(data.activities || []);
      }
      
      setTotalCount(data.total_count || 0);
      setHasMore(data.has_more || false);
      
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch activities';
      setError(errorMessage);
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, enabled]);

  // Fetch activity statistics
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl('/api/activity/stats'));
      
      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Error fetching activity stats:', err);
    }
  }, []);

  // Refresh activities
  const refresh = useCallback(async () => {
    await fetchActivities(false);
  }, [fetchActivities]);

  // Load more activities
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    
    const newFilters = {
      ...filters,
      offset: (filters.offset || 0) + (filters.limit || 20)
    };
    
    setFiltersState(newFilters);
    await fetchActivities(true);
  }, [filters, hasMore, loading, fetchActivities]);

  // Retry failed activity
  const retry = useCallback(async (activityId: number) => {
    try {
      const response = await fetch(buildApiUrl(`/api/activity/${activityId}/retry`), {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to retry activity ${activityId}`);
      }
      
      // Refresh activities after retry
      await refresh();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to retry activity';
      setError(errorMessage);
    }
  }, [refresh]);

  // Set filters
  const setFilters = useCallback((newFilters: ActivityFilters) => {
    setFiltersState(prev => ({
      ...prev,
      ...newFilters,
      offset: 0 // Reset offset when filters change
    }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchActivities(false);
      fetchStats();
    }
  }, [enabled, fetchActivities, fetchStats]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || !enabled) return;

    const interval = setInterval(() => {
      fetchActivities(false);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, enabled, refreshInterval, fetchActivities]);

  // Fetch when filters change
  useEffect(() => {
    if (enabled) {
      fetchActivities(false);
    }
  }, [filters, enabled, fetchActivities]);

  return {
    activities,
    loading,
    error,
    stats,
    filters,
    hasMore,
    totalCount,
    setFilters,
    refresh,
    loadMore,
    retry,
    clearError
  };
};

// Specialized hooks for different use cases

export const useRecentActivityByType = (
  importType: string,
  options: Omit<UseRecentActivityOptions, 'initialFilters'> = {}
) => {
  return useRecentActivity({
    ...options,
    initialFilters: {
      import_type: importType,
      limit: 10
    }
  });
};

export const useRecentActivityByWeek = (
  weekId: number,
  options: Omit<UseRecentActivityOptions, 'initialFilters'> = {}
) => {
  return useRecentActivity({
    ...options,
    initialFilters: {
      week_id: weekId,
      limit: 20
    }
  });
};

export const useRecentActivityStats = () => {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl('/api/activity/stats'));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stats';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refresh: fetchStats
  };
};

export default useRecentActivity;
