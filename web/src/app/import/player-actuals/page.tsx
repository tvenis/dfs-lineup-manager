"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, CheckCircle, Database, FileText, RefreshCw } from 'lucide-react';
import { Week } from '@/types/prd';
import { API_CONFIG, buildApiUrl } from '@/config/api';
import { ActivityList } from '@/components/activity';
import { useRecentActivity } from '@/hooks/useRecentActivity';
import { PlayerActualsImportResultDialog } from '@/components/PlayerActualsImportResultDialog';

interface NFLVerseImportResponse {
  status: string;
  nflverse_stats: {
    exact: number;
    high: number;
    medium: number;
    low: number;
    none: number;
  };
  total_nflverse_players: number;
  auto_imported?: {
    total_processed: number;
    successful_matches: number;
    actuals_created: number;
    actuals_updated: number;
  };
  message?: string;
}

export default function PlayerActualsImportPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  // Result dialog state
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [importResult, setImportResult] = useState<NFLVerseImportResponse | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Use the modern activity hook for player actuals activities
  const {
    activities: history,
    loading: activityLoading,
    error: activityError,
    refresh: refreshActivity
  } = useRecentActivity({
    importType: 'player-actuals',
    limit: 10
  });

  // Fetch weeks on component mount
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.WEEKS));
        if (response.ok) {
          const data = await response.json();
          const weeksData = data.weeks || data;
          setWeeks(weeksData);
          // Set default to active week
          const activeWeek = weeksData.find((week: Week) => week.status === 'Active');
          if (activeWeek) {
            setSelectedWeekId(activeWeek.id);
          }
        }
      } catch (error) {
        console.error('Error fetching weeks:', error);
      }
    };

    fetchWeeks();
  }, []);

  const handleImportFromNFLVerse = async () => {
    if (!selectedWeekId) {
      alert('Please select a week');
      return;
    }

    const week = weeks.find(w => w.id === selectedWeekId);
    if (!week) {
      alert('Selected week not found');
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    setImportError(null);

    try {
      const response = await fetch(buildApiUrl('/api/actuals/import-nflverse'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_id: week.id,
          season: week.year,
          week_number: week.week_number,
          season_type: 'REG',
          auto_import: true // Auto-commit server side
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to import from NFLVerse');
      }

      const result: NFLVerseImportResponse = await response.json();
      setImportResult(result);
      setShowResultDialog(true);

      // Refresh the activity list to show the new import
      await refreshActivity();

    } catch (error) {
      console.error('Error importing from NFLVerse:', error);
      setImportError(error instanceof Error ? error.message : 'Unknown error');
      setShowResultDialog(true);
    } finally {
      setIsImporting(false);
    }
  };

  const selectedWeek = weeks.find(week => week.id === selectedWeekId);

  return (
    <div className="container mx-auto p-6 space-y-6">

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Import from NFLVerse */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Import from NFLVerse
            </CardTitle>
            <CardDescription>
              Automatically fetch actual player stats from NFLVerse (nflverse.com) for the selected week.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Week Selection */}
            <div className="space-y-2">
              <Label htmlFor="import-week">Import Week</Label>
              <Select
                value={selectedWeekId?.toString() || ''}
                onValueChange={(value) => setSelectedWeekId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select week" />
                </SelectTrigger>
                <SelectContent>
                  {weeks.map((week) => (
                    <SelectItem key={week.id} value={week.id.toString()}>
                      Week {week.week_number} ({week.year}) - {week.status === 'Active' ? 'Active' : week.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Actual stats will be imported for the selected week.
              </p>
            </div>

            {/* Import Button */}
            <Button
              onClick={handleImportFromNFLVerse}
              disabled={!selectedWeekId || isImporting}
              className="w-full"
              size="lg"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Fetching from NFLVerse...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Import from NFLVerse
                </>
              )}
            </Button>

            {/* Information */}
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">How it works:</p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Automatically fetches real player stats from nflverse.com</li>
                    <li>Matches players with your DraftKings player database</li>
                    <li>Calculates DraftKings fantasy points automatically</li>
                    <li>Takes you to review page before importing</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Right Column - Manual CSV Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Import from CSV
            </CardTitle>
            <CardDescription>
              Or upload a CSV file with player actual performance data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <Upload className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">CSV Import (Alternative)</p>
                  <p className="text-sm">
                    For CSV-based imports, you can still use the legacy import page. However, we recommend using NFLVerse for automatic, up-to-date stats.
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Why NFLVerse?</p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>No manual CSV downloads required</li>
                    <li>Always up-to-date official NFL stats</li>
                    <li>Automatic DK points calculation</li>
                    <li>Smart player matching (99%+ accuracy)</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Activity Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Statistics</CardTitle>
          <CardDescription>Overview of your recent import activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{history.length}</div>
              <div className="text-sm text-blue-800">Total Activities</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {history.filter(a => a.operation_status === 'completed').length}
              </div>
              <div className="text-sm text-green-800">Successful</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {history.reduce((sum, a) => sum + (a.records_added || 0), 0)}
              </div>
              <div className="text-sm text-orange-800">Records Added</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {history.reduce((sum, a) => sum + (a.records_updated || 0), 0)}
              </div>
              <div className="text-sm text-purple-800">Records Updated</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Import Activity */}
      <ActivityList
        activities={history}
        loading={activityLoading}
        error={activityError}
        emptyMessage="No recent player actuals import activity found."
        showFilters={false}
        onViewDetails={(activityId) => {
          console.log('View details for activity:', activityId);
        }}
      />

      {/* Import Result Dialog */}
      <PlayerActualsImportResultDialog
        isOpen={showResultDialog}
        onClose={() => setShowResultDialog(false)}
        result={importResult}
        error={importError}
        week={selectedWeek ? `Week ${selectedWeek.week_number} (${selectedWeek.year})` : ''}
      />

    </div>
  );
}

