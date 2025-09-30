"use client";

import React from 'react';
import { RecentActivity } from '@/types/activity';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Eye, 
  Calendar, 
  FileText, 
  Database, 
  Clock, 
  User, 
  AlertCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X
} from 'lucide-react';

interface ActivityDetailsModalProps {
  activity: RecentActivity;
  trigger?: React.ReactNode;
}

export const ActivityDetailsModal: React.FC<ActivityDetailsModalProps> = ({ 
  activity, 
  trigger 
}) => {
  const [open, setOpen] = React.useState(false);
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
    errors,
    error_count,
    created_by,
    details,
    // Legacy fields
    fileType,
    fileName,
    draftGroup,
    recordsAdded,
    recordsUpdated,
    recordsSkipped,
    legacyErrors,
    importType
  } = activity;

  const displayName = file_name || fileName || action;
  const displayFileType = file_type || fileType || 'Unknown';
  const displayDraftGroup = draft_group || draftGroup;
  const displayRecordsAdded = records_added || recordsAdded || 0;
  const displayRecordsUpdated = records_updated || recordsUpdated || 0;
  const displayRecordsSkipped = records_skipped || recordsSkipped || 0;
  const hasErrors = error_count > 0 || (errors && errors.length > 0) || (legacyErrors && legacyErrors.length > 0);

  const getStatusIcon = () => {
    switch (operation_status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'Unknown';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Activity Details
          </DialogTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Activity ID</label>
                  <p className="text-sm">{id}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Status</label>
                  <div className="flex items-center gap-2">
                    {getStatusIcon()}
                    <Badge variant={operation_status === 'completed' ? 'default' : 'destructive'} className="text-xs">
                      {operation_status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Action</label>
                  <p className="text-sm font-mono">{action}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Category</label>
                  <p className="text-sm">{category}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Timestamp</label>
                  <p className="text-sm">{formatTimestamp(timestamp)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Duration</label>
                  <p className="text-sm">{formatDuration(duration_ms)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* File Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">File Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">File Name</label>
                  <p className="text-sm font-mono truncate">{displayName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">File Type</label>
                  <p className="text-sm">{displayFileType}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">File Size</label>
                  <p className="text-sm">{formatFileSize(file_size_bytes)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Import Source</label>
                  <p className="text-sm">{import_source || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Week ID</label>
                  <p className="text-sm">{week_id}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Draft Group</label>
                  <p className="text-sm">{displayDraftGroup || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Operation Results */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Operation Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-xl font-bold text-green-600">{displayRecordsAdded}</div>
                  <div className="text-xs text-green-800">Added</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">{displayRecordsUpdated}</div>
                  <div className="text-xs text-blue-800">Updated</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-xl font-bold text-yellow-600">{displayRecordsSkipped}</div>
                  <div className="text-xs text-yellow-800">Skipped</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-xl font-bold text-red-600">{records_failed}</div>
                  <div className="text-xs text-red-800">Failed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Errors */}
          {hasErrors && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-red-600">Errors ({error_count || (legacyErrors?.length || 0)})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(errors || legacyErrors || []).slice(0, 5).map((error, index) => (
                    <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                      <div className="font-medium text-red-800 text-xs">
                        {typeof error === 'string' ? error : error.message}
                      </div>
                      {typeof error === 'object' && error.code && (
                        <div className="text-red-600 mt-1">
                          <div className="text-xs">Code: {error.code}</div>
                          {error.field && <div className="text-xs">Field: {error.field}</div>}
                          {error.row && <div className="text-xs">Row: {error.row}</div>}
                        </div>
                      )}
                    </div>
                  ))}
                  {(errors || legacyErrors || []).length > 5 && (
                    <div className="text-xs text-gray-500 text-center py-2">
                      ... and {(errors || legacyErrors || []).length - 5} more errors
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Details */}
          {details && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Additional Details</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto max-h-32">
                  {JSON.stringify(details, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Audit Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Audit Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Created By</label>
                  <p className="text-sm">{created_by || 'System'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">User Name</label>
                  <p className="text-sm">{activity.user_name || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
