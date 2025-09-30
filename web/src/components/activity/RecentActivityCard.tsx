/**
 * RecentActivityCard Component
 * 
 * A reusable card component for displaying recent activity information
 * with consistent styling and functionality across the application.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ActivityDetailsModal } from './ActivityDetailsModal';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Download, 
  Upload, 
  Settings, 
  User,
  Eye,
  RotateCcw,
  Clock,
  FileText,
  Database,
  Globe,
  Zap
} from 'lucide-react';
import { 
  RecentActivity, 
  ActivityCardProps, 
  ACTION_DISPLAY_MAPPINGS, 
  STATUS_COLOR_MAPPINGS, 
  CATEGORY_ICON_MAPPINGS,
  IMPORT_TYPE_MAPPINGS 
} from '@/types/activity';
import { cn } from '@/lib/utils';

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'failed':
      return <XCircle className="w-4 h-4 text-red-600" />;
    case 'partial':
      return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    case 'cancelled':
      return <XCircle className="w-4 h-4 text-gray-600" />;
    default:
      return <Clock className="w-4 h-4 text-gray-600" />;
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'data-import':
      return <Download className="w-4 h-4 text-blue-600" />;
    case 'data-export':
      return <Upload className="w-4 h-4 text-green-600" />;
    case 'system-maintenance':
      return <Settings className="w-4 h-4 text-purple-600" />;
    case 'user-action':
      return <User className="w-4 h-4 text-orange-600" />;
    default:
      return <FileText className="w-4 h-4 text-gray-600" />;
  }
};

const getFileTypeIcon = (fileType: string) => {
  switch (fileType) {
    case 'API':
      return <Globe className="w-4 h-4 text-blue-600" />;
    case 'CSV':
      return <FileText className="w-4 h-4 text-green-600" />;
    case 'JSON':
      return <Database className="w-4 h-4 text-yellow-600" />;
    case 'XML':
      return <FileText className="w-4 h-4 text-orange-600" />;
    default:
      return <FileText className="w-4 h-4 text-gray-600" />;
  }
};

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '';
  
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

const formatDuration = (ms: number | null): string => {
  if (!ms) return '';
  
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

const getImportTypeFromAction = (action: string): string => {
  for (const [key, value] of Object.entries(IMPORT_TYPE_MAPPINGS)) {
    if (action.includes(key)) {
      return value;
    }
  }
  return 'unknown';
};

export const RecentActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  showDetails = false,
  compact = false,
  onRetry,
  onViewDetails,
  className
}) => {
  const {
    id,
    timestamp,
    action,
    category,
    file_type,
    file_name,
    file_size_bytes,
    import_source,
    week_id,
    draft_group,
    records_added,
    records_updated,
    records_skipped,
    records_failed,
    operation_status,
    duration_ms,
    error_count,
    errors,
    created_by,
    details,
    // Legacy fields
    fileType,
    fileName,
    draftGroup,
    recordsAdded,
    recordsUpdated,
    recordsSkipped,
    importType
  } = activity;

  const displayName = ACTION_DISPLAY_MAPPINGS[action as keyof typeof ACTION_DISPLAY_MAPPINGS] || action;
  const activityImportType = importType || getImportTypeFromAction(action);
  const statusColor = STATUS_COLOR_MAPPINGS[operation_status as keyof typeof STATUS_COLOR_MAPPINGS] || 'text-gray-600 bg-gray-50';
  const hasErrors = error_count > 0 || (errors && errors.length > 0);
  const hasRecords = records_added > 0 || records_updated > 0 || records_skipped > 0 || records_failed > 0;

  if (compact) {
    return (
      <div className={cn("flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50", className)}>
        <div className="flex items-center gap-3">
          {getStatusIcon(operation_status)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {file_name || displayName}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(timestamp).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasRecords && (
            <div className="text-xs text-muted-foreground">
              +{records_added} added, {records_updated} updated
            </div>
          )}
          {hasErrors && (
            <Badge variant="destructive" className="text-xs">
              {error_count} errors
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Status and Category Icons */}
            <div className="flex flex-col gap-1">
              {getStatusIcon(operation_status)}
              {getCategoryIcon(category)}
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm truncate">
                  {file_name || fileName || displayName}
                </h4>
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs", statusColor)}
                >
                  {operation_status}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(timestamp).toLocaleString()}
                </span>
                {duration_ms && (
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {formatDuration(duration_ms)}
                  </span>
                )}
                {file_size_bytes && (
                  <span className="flex items-center gap-1">
                    {getFileTypeIcon(file_type)}
                    {formatFileSize(file_size_bytes)}
                  </span>
                )}
              </div>

              {/* Records Summary */}
              {hasRecords && (
                <div className="flex items-center gap-2 mb-2">
                  {(records_added || recordsAdded || 0) > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      +{records_added || recordsAdded || 0} added
                    </Badge>
                  )}
                  {(records_updated || recordsUpdated || 0) > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {records_updated || recordsUpdated || 0} updated
                    </Badge>
                  )}
                  {(records_skipped || recordsSkipped || 0) > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {records_skipped || recordsSkipped || 0} skipped
                    </Badge>
                  )}
                  {records_failed > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {records_failed} failed
                    </Badge>
                  )}
                </div>
              )}

              {/* Additional Info */}
              <div className="text-xs text-muted-foreground space-y-1">
                {import_source && (
                  <div>Source: {import_source}</div>
                )}
                {(draft_group || draftGroup) && (
                  <div>Draft Group: {draft_group || draftGroup}</div>
                )}
                {created_by && (
                  <div>Created by: {created_by}</div>
                )}
                {week_id && (
                  <div>Week: {week_id}</div>
                )}
              </div>

              {/* Error Summary */}
              {hasErrors && showDetails && errors && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                  <div className="font-medium text-red-800 mb-1">
                    {error_count} error{error_count !== 1 ? 's' : ''}:
                  </div>
                  <div className="text-red-700 space-y-1">
                    {errors.slice(0, 3).map((error, index) => (
                      <div key={index} className="truncate">
                        {typeof error === 'string' ? error : error.message}
                      </div>
                    ))}
                    {errors.length > 3 && (
                      <div className="text-red-600">
                        ... and {errors.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <ActivityDetailsModal 
              activity={activity}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-gray-100 flex-shrink-0"
                  title="View Details"
                  type="button"
                >
                  <Eye className="w-4 h-4 text-gray-600 hover:text-gray-800" />
                </Button>
              }
            />
            {onRetry && operation_status === 'failed' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRetry(id)}
                className="h-8 w-8 p-0 hover:bg-gray-100 flex-shrink-0"
                title="Retry"
                type="button"
              >
                <RotateCcw className="w-4 h-4 text-gray-600 hover:text-gray-800" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivityCard;
