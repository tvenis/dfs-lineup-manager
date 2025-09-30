/**
 * ActivityList Component
 * 
 * A reusable list component for displaying multiple activities
 * with filtering, loading states, and empty states.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ActivityDetailsModal } from './ActivityDetailsModal';
// import { Skeleton } from '@/components/ui/skeleton'; // Not available in this UI library
import { 
  RefreshCw, 
  Filter, 
  AlertCircle, 
  Inbox,
  Search,
  X
} from 'lucide-react';
import { RecentActivityCard } from './RecentActivityCard';
import { 
  ActivityListProps, 
  ActivityFilters,
  ACTION_DISPLAY_MAPPINGS,
  IMPORT_TYPE_MAPPINGS 
} from '@/types/activity';
import { cn } from '@/lib/utils';

const ActivityListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg animate-pulse">
        <div className="w-4 h-4 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="h-6 bg-gray-200 rounded w-16" />
      </div>
    ))}
  </div>
);

const EmptyState: React.FC<{ message?: string; onRefresh?: () => void }> = ({ 
  message = "No activities found", 
  onRefresh 
}) => (
  <div className="text-center py-8">
    <Inbox className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
    <h3 className="text-lg font-medium text-muted-foreground mb-2">
      {message}
    </h3>
    <p className="text-sm text-muted-foreground mb-4">
      Activities will appear here when you perform import or export operations.
    </p>
    {onRefresh && (
      <Button onClick={onRefresh} variant="outline" size="sm">
        <RefreshCw className="w-4 h-4 mr-2" />
        Refresh
      </Button>
    )}
  </div>
);

const ErrorState: React.FC<{ 
  error: string; 
  onRetry?: () => void 
}> = ({ error, onRetry }) => (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription className="flex items-center justify-between">
      <span>{error}</span>
      {onRetry && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRetry}
          className="ml-2"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      )}
    </AlertDescription>
  </Alert>
);

const FilterBar: React.FC<{
  filters: ActivityFilters;
  onFiltersChange: (filters: ActivityFilters) => void;
  onClearFilters: () => void;
}> = ({ filters, onFiltersChange, onClearFilters }) => {
  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== null && value !== ''
  );

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg">
      <Filter className="w-4 h-4 text-muted-foreground" />
      
      {/* Search */}
      <Input
        placeholder="Search activities..."
        value={filters.action_filter || ''}
        onChange={(e) => onFiltersChange({ ...filters, action_filter: e.target.value })}
        className="w-48"
      />

      {/* Category Filter */}
      <Select
        value={filters.category_filter || ''}
        onValueChange={(value) => onFiltersChange({ 
          ...filters, 
          category_filter: value || undefined 
        })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Categories</SelectItem>
          <SelectItem value="data-import">Data Import</SelectItem>
          <SelectItem value="data-export">Data Export</SelectItem>
          <SelectItem value="system-maintenance">System Maintenance</SelectItem>
          <SelectItem value="user-action">User Action</SelectItem>
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select
        value={filters.operation_status || ''}
        onValueChange={(value) => onFiltersChange({ 
          ...filters, 
          operation_status: value || undefined 
        })}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Status</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
          <SelectItem value="partial">Partial</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      {/* Import Type Filter */}
      <Select
        value={filters.import_type || ''}
        onValueChange={(value) => onFiltersChange({ 
          ...filters, 
          import_type: value || undefined 
        })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Import Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Types</SelectItem>
          {Object.entries(IMPORT_TYPE_MAPPINGS).map(([key, value]) => (
            <SelectItem key={key} value={value}>
              {ACTION_DISPLAY_MAPPINGS[key as keyof typeof ACTION_DISPLAY_MAPPINGS] || value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
};

export const ActivityList: React.FC<ActivityListProps> = ({
  activities,
  loading = false,
  error = null,
  emptyMessage = "No activities found",
  showFilters = true,
  filters = {},
  onFiltersChange,
  onRetry,
  onViewDetails,
  className
}) => {
  const handleClearFilters = () => {
    if (onFiltersChange) {
      onFiltersChange({});
    }
  };

  const handleRefresh = () => {
    if (onRetry) {
      onRetry(0); // Use 0 as a special ID for refresh
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Loading activities...</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityListSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Error loading activities</CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorState error={error} onRetry={handleRefresh} />
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your recent import and export activities</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState message={emptyMessage} onRefresh={handleRefresh} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              {activities.length} activit{activities.length === 1 ? 'y' : 'ies'} found
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showFilters && onFiltersChange && (
          <FilterBar
            filters={filters}
            onFiltersChange={onFiltersChange}
            onClearFilters={handleClearFilters}
          />
        )}
        
        <div className="space-y-3">
          {activities.map((activity) => (
            <RecentActivityCard
              key={activity.id}
              activity={activity}
              onRetry={onRetry}
              onViewDetails={onViewDetails}
              showDetails={true}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityList;
