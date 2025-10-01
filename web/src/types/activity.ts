/**
 * Shared types for Recent Activity functionality
 * 
 * This file provides consistent type definitions for activity-related
 * components and hooks across the application.
 */

export interface RecentActivity {
  id: number;
  timestamp: string;
  action: string;
  category: 'data-import' | 'data-export' | 'system-maintenance' | 'user-action';
  file_type: 'API' | 'CSV' | 'JSON' | 'XML';
  file_name: string | null;
  file_size_bytes: number | null;
  import_source: string | null;
  week_id: number;
  draft_group: string | null;
  records_added: number;
  records_updated: number;
  records_skipped: number;
  records_failed: number;
  operation_status: 'completed' | 'failed' | 'partial' | 'cancelled';
  duration_ms: number | null;
  errors: ActivityError[] | null;
  error_count: number;
  created_by: string | null;
  ip_address: string | null;
  session_id: string | null;
  user_agent: string | null;
  parent_activity_id: number | null;
  details: Record<string, any> | null;
  retention_until: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  week?: {
    id: number;
    week_number: number;
    year: number;
    status: string;
  };
}

export interface ActivityError {
  type: 'validation' | 'database' | 'api' | 'file' | 'network';
  code: string;
  message: string;
  row?: number;
  field?: string;
  timestamp?: string;
}

export interface ActivityStats {
  total_activities: number;
  total_records_added: number;
  total_records_updated: number;
  total_records_skipped: number;
  total_records_failed: number;
  action_counts: Record<string, number>;
  status_counts: Record<string, number>;
  period_days: number;
}

export interface ActivityFilters {
  limit?: number;
  offset?: number;
  action_filter?: string;
  category_filter?: string;
  week_id?: number;
  operation_status?: string;
  include_archived?: boolean;
  import_type?: string;
}

export interface ActivityCardProps {
  activity: RecentActivity;
  showDetails?: boolean;
  compact?: boolean;
  onRetry?: (activityId: number) => void;
  onViewDetails?: (activityId: number) => void;
  className?: string;
}

export interface ActivityListProps {
  activities: RecentActivity[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  showFilters?: boolean;
  filters?: ActivityFilters;
  onFiltersChange?: (filters: ActivityFilters) => void;
  onRetry?: (activityId: number) => void;
  onViewDetails?: (activityId: number) => void;
  className?: string;
}

// Import type mappings for consistent categorization
export const IMPORT_TYPE_MAPPINGS = {
  'player-pool-import': 'player-pool',
  'projections-import': 'projections',
  'odds-api-import': 'odds-api',
  'contests-import': 'contests',
  'actuals-import': 'actuals',
  'ownership-import': 'ownership',
} as const;

export type ImportType = keyof typeof IMPORT_TYPE_MAPPINGS;

// Action type mappings for display
export const ACTION_DISPLAY_MAPPINGS = {
  'player-pool-import': 'Player Pool Import',
  'player-pool-export': 'Player Pool Export',
  'projections-import': 'Projections Import',
  'projections-export': 'Projections Export',
  'odds-api-import': 'Odds API Import',
  'odds-api-export': 'Odds API Export',
  'contests-import': 'Contests Import',
  'contests-export': 'Contests Export',
  'actuals-import': 'Actuals Import',
  'actuals-export': 'Actuals Export',
  'ownership-import': 'Ownership Import',
  'ownership-export': 'Ownership Export',
} as const;

// Status color mappings
export const STATUS_COLOR_MAPPINGS = {
  completed: 'text-green-600 bg-green-50',
  failed: 'text-red-600 bg-red-50',
  partial: 'text-yellow-600 bg-yellow-50',
  cancelled: 'text-gray-600 bg-gray-50',
} as const;

// Category icon mappings
export const CATEGORY_ICON_MAPPINGS = {
  'data-import': 'Download',
  'data-export': 'Upload',
  'system-maintenance': 'Settings',
  'user-action': 'User',
} as const;
