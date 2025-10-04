import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Database, CheckCircle, RefreshCw, Trophy } from 'lucide-react';
import { API_CONFIG, buildApiUrl } from '@/config/api';
import { Week } from '@/types/prd';
import { ActivityList } from '@/components/activity';
import { useRecentActivity } from '@/hooks/useRecentActivity';
import { GameResultsImportResultDialog } from '@/components/GameResultsImportResultDialog';

interface GameResultsImportResponse {
  status?: string;
  total_processed?: number;
  total_nflverse_games?: number;
  successful_matches: number;
  failed_matches: number;
  games_created: number;
  games_updated: number;
  errors: string[];
  unmatched_games: any[];
  match_stats?: {
    exact: number;
    none: number;
  };
  nflverse_stats?: {
    exact: number;
    none: number;
  };
  auto_imported?: {
    total_processed: number;
    successful_matches: number;
    games_created: number;
    games_updated: number;
  };
}

export function ImportGameResults() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [seasons, setSeasons] = useState<number[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [selectedSeasonType, setSelectedSeasonType] = useState<string>('REG');
  const [isImporting, setIsImporting] = useState(false);
  
  // Result dialog state
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [importResult, setImportResult] = useState<GameResultsImportResponse | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Use the modern activity hook for game results activities
  const {
    activities: history,
    loading: activityLoading,
    error: activityError,
    refresh: refreshActivity
  } = useRecentActivity({
    importType: 'game-results',
    limit: 10
  });

  // Fetch weeks and seasons on component mount
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.GAME_RESULTS_WEEKS));
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Week[] = await response.json();
        setWeeks(data);
        
        // Extract unique seasons from weeks
        const uniqueSeasons = [...new Set(data.map(week => week.year))].sort((a, b) => b - a);
        setSeasons(uniqueSeasons);
        
        // Set default to most recent week
        if (data.length > 0 && !selectedWeekId) {
          const mostRecentWeek = data[0];
          setSelectedWeekId(mostRecentWeek.id);
          setSelectedSeason(mostRecentWeek.year);
        }
      } catch (error: any) {
        console.error('Failed to fetch weeks:', error);
      }
    };

    fetchWeeks();
  }, []);

  const handleImportFromNFLVerse = async () => {
    if (!selectedWeekId || !selectedSeason) {
      setImportError('Please select both a week and season.');
      return;
    }

    setIsImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.GAME_RESULTS_IMPORT_NFLVERSE), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_id: selectedWeekId,
          season: selectedSeason,
          week_number: weeks.find(w => w.id === selectedWeekId)?.week_number,
          season_type: selectedSeasonType,
          auto_import: true, // Auto-import exact matches
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const result: GameResultsImportResponse = await response.json();
      setImportResult(result);
      setShowResultDialog(true);
      
      // Refresh activity list
      refreshActivity();
    } catch (error: any) {
      setImportError(error.message);
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
              <Trophy className="w-5 h-5" />
              Import from NFLVerse
            </CardTitle>
            <CardDescription>
              Automatically fetch game results from NFLVerse (nflverse.com) for the selected week.
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
                    <SelectItem value="REG">Regular Season</SelectItem>
                    <SelectItem value="WC">Wildcard</SelectItem>
                    <SelectItem value="DIV">Division Playoff</SelectItem>
                    <SelectItem value="CON">Conference Championship</SelectItem>
                    <SelectItem value="SB">Super Bowl</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Game results will be imported for the selected week, season, and season type.
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
                  <Trophy className="w-4 h-4 mr-2" />
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
                    <li>Automatically fetches real game results from nflverse.com</li>
                    <li>Matches teams with your database</li>
                    <li>Updates game records with actual scores and statistics</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Right Column intentionally left empty */}
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
        emptyMessage="No recent game results import activity found."
        showFilters={false}
        onViewDetails={(activityId) => {
          console.log('View details for activity:', activityId);
        }}
      />

      {/* Import Result Dialog */}
      <GameResultsImportResultDialog
        isOpen={showResultDialog}
        onClose={() => setShowResultDialog(false)}
        result={importResult}
        error={importError}
        week={selectedWeek ? `Week ${selectedWeek.week_number} (${selectedWeek.year})` : ''}
      />

    </div>
  );
}