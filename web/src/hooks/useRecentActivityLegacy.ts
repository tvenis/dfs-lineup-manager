/**
 * Legacy useRecentActivity Hook
 * 
 * A temporary hook that works with the existing API structure
 * while we transition to the new activity system.
 */

import { useState, useEffect, useCallback } from 'react';
import { RecentActivity } from '@/types/activity';
import { buildApiUrl } from '@/config/api';

interface UseRecentActivityLegacyOptions {
  importType?: string;
  limit?: number;
  weekId?: number;
}

interface UseRecentActivityLegacyReturn {
  activities: RecentActivity[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  retry: (activityId: number) => Promise<void>;
}

export const useRecentActivityLegacy = (options: UseRecentActivityLegacyOptions = {}): UseRecentActivityLegacyReturn => {
  const {
    importType,
    limit = 10,
    weekId
  } = options;

  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build API URL with legacy parameters
  const buildLegacyApiUrl = useCallback(() => {
    const params = new URLSearchParams();
    
    if (importType) params.set('import_type', importType);
    if (limit) params.set('limit', limit.toString());
    if (weekId) params.set('week_id', weekId.toString());

    return `/api/recent-activity?${params.toString()}`;
  }, [importType, limit, weekId]);

  // Fetch activities from API
  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = buildApiUrl(buildLegacyApiUrl());
      console.log('🔍 Fetching activities from URL:', url);
      const response = await fetch(url);
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Raw API data:', data);
      
      // Convert legacy format to new format
      const convertedActivities: RecentActivity[] = data.map((activity: any) => ({
        id: activity.id,
        timestamp: activity.timestamp,
        action: activity.action || 'import',
        category: 'data-import',
        file_type: activity.fileType || 'API',
        file_name: activity.fileName,
        file_size_bytes: null,
        import_source: activity.draftGroup === 'Odds-API' ? 'odds-api' : 
                      activity.fileType === 'CSV' ? 'csv' : 'draftkings',
        week_id: activity.week_id,
        draft_group: activity.draftGroup,
        records_added: activity.recordsAdded || 0,
        records_updated: activity.recordsUpdated || 0,
        records_skipped: activity.recordsSkipped || 0,
        records_failed: 0,
        operation_status: 'completed',
        duration_ms: null,
        errors: activity.errors || [],
        legacyErrors: activity.errors || [],
        error_count: activity.errors?.length || 0,
        created_by: activity.user_name,
        ip_address: null,
        session_id: null,
        user_agent: null,
        parent_activity_id: null,
        details: activity.details,
        user_name: activity.user_name,
        retention_until: null,
        is_archived: false,
        created_at: activity.timestamp,
        updated_at: activity.timestamp,
        // Legacy fields for backward compatibility
        fileType: activity.fileType,
        fileName: activity.fileName,
        draftGroup: activity.draftGroup,
        recordsAdded: activity.recordsAdded,
        recordsUpdated: activity.recordsUpdated,
        recordsSkipped: activity.recordsSkipped,
        importType: activity.importType || (
          activity.fileName?.startsWith('odds-api:') ? 'odds-api' :
          activity.draftGroup === 'Odds-API' ? 'odds-api' :
          activity.draftGroup === 'CONTEST_IMPORT' ? 'contests' :
          activity.fileType === 'CSV' ? 'projections' :
          'player-pool'
        )
      }));
      
      console.log('🔄 Converted activities:', convertedActivities);
      setActivities(convertedActivities);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch activities';
      setError(errorMessage);
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  }, [buildLegacyApiUrl]);

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

  return {
    activities,
    loading,
    error,
    refresh,
    retry
  };
};

export default useRecentActivityLegacy;
