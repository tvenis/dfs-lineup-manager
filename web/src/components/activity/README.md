# Activity Components

This directory contains shared components and hooks for displaying and managing recent activity data across the application.

## Components

### RecentActivityCard

A reusable card component for displaying individual activity information.

```tsx
import { RecentActivityCard } from '@/components/activity';

<RecentActivityCard
  activity={activity}
  showDetails={true}
  compact={false}
  onRetry={(activityId) => handleRetry(activityId)}
  onViewDetails={(activityId) => handleViewDetails(activityId)}
/>
```

**Props:**
- `activity`: RecentActivity object
- `showDetails`: Whether to show detailed error information
- `compact`: Whether to use compact layout
- `onRetry`: Callback for retry action
- `onViewDetails`: Callback for view details action
- `className`: Additional CSS classes

### ActivityList

A comprehensive list component for displaying multiple activities with filtering and loading states.

```tsx
import { ActivityList } from '@/components/activity';

<ActivityList
  activities={activities}
  loading={false}
  error={null}
  showFilters={true}
  filters={filters}
  onFiltersChange={(filters) => setFilters(filters)}
  onRetry={(activityId) => handleRetry(activityId)}
  onViewDetails={(activityId) => handleViewDetails(activityId)}
/>
```

**Props:**
- `activities`: Array of RecentActivity objects
- `loading`: Whether data is loading
- `error`: Error message if any
- `showFilters`: Whether to show filter controls
- `filters`: Current filter state
- `onFiltersChange`: Callback when filters change
- `onRetry`: Callback for retry action
- `onViewDetails`: Callback for view details action
- `className`: Additional CSS classes

## Hooks

### useRecentActivity

Main hook for fetching and managing activity data.

```tsx
import { useRecentActivity } from '@/hooks/useRecentActivity';

const {
  activities,
  loading,
  error,
  refresh,
  retry
} = useRecentActivity({
  importType: 'player-pool',
  limit: 20,
  weekId: 1,
  autoRefresh: true,
  refreshInterval: 30000
});
```

**Options:**
- `importType`: Filter by import type (e.g., 'player-pool', 'projections')
- `limit`: Maximum number of activities to fetch
- `weekId`: Filter by week ID
- `autoRefresh`: Whether to auto-refresh data
- `refreshInterval`: Refresh interval in milliseconds

### useRecentActivity (with options)

The `useRecentActivity` hook supports filtering by import type and week through its options:

```tsx
import { useRecentActivity } from '@/hooks/useRecentActivity';

// Filter by import type
const {
  activities,
  loading,
  error,
  refresh
} = useRecentActivity({
  importType: 'player-pool',
  autoRefresh: false
});

// Filter by week
const {
  activities: weekActivities,
  loading: weekLoading,
  error: weekError,
  refresh: weekRefresh
} = useRecentActivity({
  weekId: 1,
  autoRefresh: false
});
```

## Types

### RecentActivity

Main interface for activity data.

```tsx
interface RecentActivity {
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
  user_name: string | null;
  retention_until: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  // Legacy fields for backward compatibility
  fileType?: string;
  fileName?: string | null;
  draftGroup?: string | null;
  recordsAdded?: number;
  recordsUpdated?: number;
  recordsSkipped?: number;
  errors?: string[];
  importType?: string;
}
```

### ActivityFilters

Interface for filtering activities.

```tsx
interface ActivityFilters {
  limit?: number;
  offset?: number;
  action_filter?: string;
  category_filter?: string;
  week_id?: number;
  operation_status?: string;
  include_archived?: boolean;
  import_type?: string;
}
```

## Usage Examples

### Basic Activity List

```tsx
import React from 'react';
import { ActivityList, useRecentActivity } from '@/components/activity';

const MyComponent = () => {
  const {
    activities,
    loading,
    error,
    refresh,
    retry
  } = useRecentActivity({
    limit: 20
  });

  return (
    <ActivityList
      activities={activities}
      loading={loading}
      error={error}
      onRetry={retry}
      onViewDetails={(id) => console.log('View details:', id)}
    />
  );
};
```

### Filtered Activity List

```tsx
import React, { useState } from 'react';
import { ActivityList, useRecentActivity } from '@/components/activity';

const FilteredActivityList = () => {
  const [importType, setImportType] = useState('player-pool');
  const [weekId, setWeekId] = useState(1);

  const {
    activities,
    loading,
    error,
    refresh,
    retry
  } = useRecentActivity({
    importType,
    weekId,
    limit: 20
  });

  return (
    <ActivityList
      activities={activities}
      loading={loading}
      error={error}
      showFilters={true}
      onRetry={retry}
    />
  );
};
```

### Individual Activity Cards

```tsx
import React from 'react';
import { RecentActivityCard } from '@/components/activity';

const ActivityCards = ({ activities }) => {
  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <RecentActivityCard
          key={activity.id}
          activity={activity}
          showDetails={true}
          onRetry={(id) => handleRetry(id)}
          onViewDetails={(id) => handleViewDetails(id)}
        />
      ))}
    </div>
  );
};
```

### Compact Activity List

```tsx
import React from 'react';
import { RecentActivityCard } from '@/components/activity';

const CompactActivityList = ({ activities }) => {
  return (
    <div className="space-y-2">
      {activities.map((activity) => (
        <RecentActivityCard
          key={activity.id}
          activity={activity}
          compact={true}
          onRetry={(id) => handleRetry(id)}
        />
      ))}
    </div>
  );
};
```

## Migration Guide

### From Old Components

1. **Replace individual activity interfaces** with the shared `RecentActivity` type
2. **Replace custom activity cards** with `RecentActivityCard` component
3. **Replace custom activity lists** with `ActivityList` component
4. **Replace manual data fetching** with `useRecentActivity` hook

### Backward Compatibility

The components maintain backward compatibility with existing field names:
- `fileType` maps to `file_type`
- `fileName` maps to `file_name`
- `draftGroup` maps to `draft_group`
- `recordsAdded` maps to `records_added`
- etc.

## Styling

The components use Tailwind CSS classes and are designed to work with the existing design system. Custom styling can be applied through the `className` prop.

## API Integration

The hooks expect the following API endpoints:
- `GET /api/activity` - Fetch activities with filters
- `GET /api/activity/stats` - Fetch activity statistics
- `POST /api/activity/{id}/retry` - Retry failed activity

## Performance

- Components are optimized for large lists with virtual scrolling support
- Hooks include caching and automatic refresh capabilities
- GIN indexes on JSONB fields for efficient filtering
