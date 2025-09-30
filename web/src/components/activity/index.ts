/**
 * Activity Components Index
 * 
 * Centralized exports for all activity-related components and hooks
 */

export { RecentActivityCard } from './RecentActivityCard';
export { ActivityList } from './ActivityList';
export { ActivityDetailsModal } from './ActivityDetailsModal';
export { default as RecentActivityCardDefault } from './RecentActivityCard';
export { default as ActivityListDefault } from './ActivityList';

// Re-export types for convenience
export type {
  RecentActivity,
  ActivityError,
  ActivityStats,
  ActivityFilters,
  ActivityCardProps,
  ActivityListProps,
  ImportType
} from '@/types/activity';

// Re-export hooks
export {
  useRecentActivity,
  useRecentActivityByType,
  useRecentActivityByWeek,
  useRecentActivityStats
} from '@/hooks/useRecentActivity';
