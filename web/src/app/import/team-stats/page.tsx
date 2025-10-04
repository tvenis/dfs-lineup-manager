"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, CheckCircle, Database, FileText, RefreshCw, Shield } from 'lucide-react';
import { Week } from '@/types/prd';
import { API_CONFIG, buildApiUrl } from '@/config/api';
import { ActivityList } from '@/components/activity';
import { useRecentActivity } from '@/hooks/useRecentActivity';
import { TeamStatsImportResultDialog } from '@/components/TeamStatsImportResultDialog';

interface TeamStatsImportResponse {
  status: string;
  nflverse_stats: {
    exact: number;
    none: number;
  };
  total_nflverse_teams: number;
  auto_imported?: {
    total_processed: number;
    successful_matches: number;
    stats_created: number;
    stats_updated: number;
  };
  matched_teams?: Array<{
    team_name: string;
    opponent_name: string;
    match_confidence: string;
    dk_defense_score: number;
  }>;
  unmatched_teams?: Array<{
    team: string;
    opponent_team: string;
    stats: any;
  }>;
  message?: string;
}

export default function TeamStatsImportPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [seasons, setSeasons] = useState<number[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [selectedSeasonType, setSelectedSeasonType] = useState<string>('REG');
  const [isImporting, setIsImporting] = useState(false);
  
  // Result dialog state
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [importResult, setImportResult] = useState<TeamStatsImportResponse | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Use the modern activity hook for team stats activities
  const {
    activities: history,
    loading: activityLoading,
    error: activityError,
    refresh: refreshActivity
  } = useRecentActivity({
    importType: 'team-stats',
    limit: 10
  });

  // Fetch weeks and seasons on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch weeks
        const weeksResponse = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.WEEKS));
        if (weeksResponse.ok) {
          const weeksData = await weeksResponse.json();
          const weeksList = weeksData.weeks || weeksData;
          setWeeks(weeksList);
          
          // Set default to last completed week instead of active week
          const completedWeeks = weeksList.filter((week: Week) => week.status === 'Completed');
          if (completedWeeks.length > 0) {
            // Sort by year and week_number descending to get the latest completed week
            const sortedCompletedWeeks = completedWeeks.sort((a: Week, b: Week) => {
              if (a.year !== b.year) return b.year - a.year;
              return b.week_number - a.week_number;
            });
            setSelectedWeekId(sortedCompletedWeeks[0].id);
          }
        }

        // Fetch seasons
        const seasonsResponse = await fetch(buildApiUrl('/api/weeks/seasons'));
        if (seasonsResponse.ok) {
          const seasonsData = await seasonsResponse.json();
          setSeasons(seasonsData);
          // Set default to latest season
          if (seasonsData.length > 0) {
            setSelectedSeason(seasonsData[0]); // seasons are already sorted descending
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const handleImportFromNFLVerse = async () => {
    if (!selectedWeekId) {
      alert('Please select a week');
      return;
    }
    if (!selectedSeason) {
      alert('Please select a season');
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
      const response = await fetch(buildApiUrl('/api/team-stats/import-nflverse'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_id: week.id,
          season: selectedSeason,
          week_number: week.week_number,
          season_type: selectedSeasonType,
          auto_import: true // Auto-commit server side
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to import from NFLVerse');
      }

      const result: TeamStatsImportResponse = await response.json();
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
              <Shield className="w-5 h-5" />
              Import from NFLVerse
            </CardTitle>
            <CardDescription>
              Automatically fetch team statistics from NFLVerse (nflverse.com) for the selected week.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Configuration Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Week Selection */}
              <div className="space-y-2">
                <Label htmlFor="import-week">Week</Label>
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
              </div>

              {/* Season Selection */}
              <div className="space-y-2">
                <Label htmlFor="import-season">Season</Label>
                <Select
                  value={selectedSeason?.toString() || ''}
                  onValueChange={(value) => setSelectedSeason(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select season" />
                  </SelectTrigger>
                  <SelectContent>
                    {seasons.map((season) => (
                      <SelectItem key={season} value={season.toString()}>
                        {season}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Season Type Selection */}
              <div className="space-y-2">
                <Label htmlFor="import-season-type">Season Type</Label>
                <Select
                  value={selectedSeasonType}
                  onValueChange={setSelectedSeasonType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select season type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REG">REG</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PRE">PRE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Team statistics will be imported for the selected week, season, and season type.
            </p>

            {/* Import Button */}
            <Button
              onClick={handleImportFromNFLVerse}
              disabled={!selectedWeekId || !selectedSeason || isImporting}
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
                  <Shield className="w-4 h-4 mr-2" />
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
                    <li>Automatically fetches team statistics from nflverse.com</li>
                    <li>Matches teams with your database</li>
                    <li>Calculates DraftKings defense fantasy points automatically</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Right Column intentionally left empty (CSV import deprecated) */}
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
        emptyMessage="No recent team stats import activity found."
        showFilters={false}
        onViewDetails={(activityId) => {
          console.log('View details for activity:', activityId);
        }}
      />

      {/* Import Result Dialog */}
      <TeamStatsImportResultDialog
        isOpen={showResultDialog}
        onClose={() => setShowResultDialog(false)}
        result={importResult}
        error={importError}
        week={selectedWeek ? `Week ${selectedWeek.week_number} (${selectedWeek.year})` : ''}
      />

    </div>
  );
}
