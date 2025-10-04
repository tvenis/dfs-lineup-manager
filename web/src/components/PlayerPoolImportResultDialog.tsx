"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Users, Plus, RefreshCw, SkipForward, Shield, Activity } from 'lucide-react';

interface DraftKingsImportResponse {
  players_added: number;
  players_updated: number;
  entries_added: number;
  entries_updated: number;
  entries_skipped: number;
  auto_excluded_count: number;
  status_updates: number;
  errors: string[];
  total_processed: number;
}

interface PlayerPoolImportResultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  result: DraftKingsImportResponse | null;
  error: string | null;
  draftGroup: string;
  week: string;
}

export function PlayerPoolImportResultDialog({
  isOpen,
  onClose,
  result,
  error,
  draftGroup,
  week
}: PlayerPoolImportResultDialogProps) {
  if (!isOpen) return null;

  const isSuccess = !error && result;
  const hasWarnings = result && (result.errors.length > 0 || result.auto_excluded_count > 0);

  const handleClose = () => {
    onClose();
  };

  const copyResultsToClipboard = () => {
    if (!result) return;
    
    const summary = `Player Pool Import Summary - Draft Group ${draftGroup}
Week: ${week}
Total Processed: ${result.total_processed}
Players Added: ${result.players_added}
Players Updated: ${result.players_updated}
Entries Added: ${result.entries_added}
Entries Updated: ${result.entries_updated}
Entries Skipped: ${result.entries_skipped}
Auto-Excluded Players: ${result.auto_excluded_count}
Status Updates: ${result.status_updates}
${result.errors.length > 0 ? `Errors: ${result.errors.join(', ')}` : ''}`;

    navigator.clipboard.writeText(summary);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSuccess ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            {isSuccess ? 'Import Complete' : 'Import Failed'}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isSuccess && result && (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-sm">Players</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Added:</span>
                      <span className="font-medium">{result.players_added}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-600">Updated:</span>
                      <span className="font-medium">{result.players_updated}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-sm">Pool Entries</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Added:</span>
                      <span className="font-medium">{result.entries_added}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-600">Updated:</span>
                      <span className="font-medium">{result.entries_updated}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-3 gap-2">
              <Card>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-1 mb-1">
                    <SkipForward className="w-3 h-3 text-orange-600" />
                    <span className="text-xs font-medium">Skipped</span>
                  </div>
                  <div className="text-lg font-bold text-orange-600">{result.entries_skipped}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-1 mb-1">
                    <Shield className="w-3 h-3 text-red-600" />
                    <span className="text-xs font-medium">Auto-Excluded</span>
                  </div>
                  <div className="text-lg font-bold text-red-600">{result.auto_excluded_count}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-1 mb-1">
                    <RefreshCw className="w-3 h-3 text-yellow-600" />
                    <span className="text-xs font-medium">Status Updates</span>
                  </div>
                  <div className="text-lg font-bold text-yellow-600">{result.status_updates}</div>
                </CardContent>
              </Card>
            </div>

            {/* Total Processed */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-sm">Total Draftables Processed</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{result.total_processed}</span>
                </div>
              </CardContent>
            </Card>

            {/* Warnings */}
            {hasWarnings && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Import completed with warnings:</p>
                    <div className="space-y-1">
                      {result.auto_excluded_count > 0 && (
                        <div className="text-sm text-muted-foreground">
                          • {result.auto_excluded_count} players were auto-excluded due to zero/null projections
                        </div>
                      )}
                      {result.errors.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          • {result.errors.length} error(s) occurred during processing
                        </div>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Errors */}
            {result.errors.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="font-medium text-sm">Errors ({result.errors.length})</span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {result.errors.map((error, index) => (
                      <div key={index} className="text-xs p-2 bg-red-50 text-red-800 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Auto-excluded players info */}
            {result.auto_excluded_count > 0 && (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Auto-Excluded Players</p>
                    <p className="text-sm text-muted-foreground">
                      {result.auto_excluded_count} players were automatically excluded because they have zero or null projected points. 
                      This typically happens for injured, suspended, or inactive players.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <div>
            {result && (
              <Button
                variant="outline"
                size="sm"
                onClick={copyResultsToClipboard}
              >
                Copy Summary
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            {isSuccess && (
              <Button onClick={handleClose}>
                Import Another
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
