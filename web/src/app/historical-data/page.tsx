"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  Database, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  BarChart3,
  Settings
} from 'lucide-react';
import { buildApiUrl, API_CONFIG } from '@/config/api';

interface Week {
  id: number;
  week_number: number;
  year: number;
  status: string;
  team_count: number;
}

interface BackfillResult {
  week_id: number;
  total_teams: number;
  updated_count: number;
  errors: string[];
  status: string;
}

interface BulkBackfillResponse {
  status: string;
  dry_run: boolean;
  total_weeks: number;
  total_teams_updated: number;
  total_errors: number;
  results: BackfillResult[];
  message: string;
}

export default function HistoricalDataPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeeks, setSelectedWeeks] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [backfillResults, setBackfillResults] = useState<BulkBackfillResponse | null>(null);
  const [showDryRun, setShowDryRun] = useState(false);

  // Fetch available weeks with team stats
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.TEAM_STATS_WEEKS));
        if (!response.ok) throw new Error('Failed to fetch weeks');
        const data = await response.json();
        setWeeks(data);
      } catch (err) {
        setError('Failed to load weeks data');
        console.error('Error fetching weeks:', err);
      }
    };

    fetchWeeks();
  }, []);

  const handleWeekSelection = (weekId: number, checked: boolean) => {
    const newSelection = new Set(selectedWeeks);
    if (checked) {
      newSelection.add(weekId);
    } else {
      newSelection.delete(weekId);
    }
    setSelectedWeeks(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedWeeks(new Set(weeks.map(w => w.id)));
    } else {
      setSelectedWeeks(new Set());
    }
  };

  const handleDryRun = async () => {
    if (selectedWeeks.size === 0) {
      setError('Please select at least one week');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/team-stats/bulk-recalculate-dk-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week_ids: Array.from(selectedWeeks),
          dry_run: true
        })
      });

      if (!response.ok) throw new Error('Failed to run dry run');
      const data = await response.json();
      setBackfillResults(data);
      setShowDryRun(true);
      setSuccess(`Dry run completed: ${data.message}`);
    } catch (err) {
      setError('Failed to run dry run');
      console.error('Error running dry run:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackfill = async () => {
    if (selectedWeeks.size === 0) {
      setError('Please select at least one week');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/team-stats/bulk-recalculate-dk-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week_ids: Array.from(selectedWeeks),
          dry_run: false
        })
      });

      if (!response.ok) throw new Error('Failed to run backfill');
      const data = await response.json();
      setBackfillResults(data);
      setSuccess(`Backfill completed: ${data.message}`);
      
      // Refresh weeks data
      const weeksResponse = await fetch('/api/team-stats/weeks');
      if (weeksResponse.ok) {
        const weeksData = await weeksResponse.json();
        setWeeks(weeksData);
      }
    } catch (err) {
      setError('Failed to run backfill');
      console.error('Error running backfill:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackfillAll = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/team-stats/bulk-recalculate-dk-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          all_weeks: true,
          dry_run: false
        })
      });

      if (!response.ok) throw new Error('Failed to run backfill all');
      const data = await response.json();
      setBackfillResults(data);
      setSuccess(`Backfill all completed: ${data.message}`);
      
      // Refresh weeks data
      const weeksResponse = await fetch('/api/team-stats/weeks');
      if (weeksResponse.ok) {
        const weeksData = await weeksResponse.json();
        setWeeks(weeksData);
      }
    } catch (err) {
      setError('Failed to run backfill all');
      console.error('Error running backfill all:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'partial_success':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'no_data':
        return <Database className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'partial_success':
        return 'border-yellow-200 bg-yellow-50';
      case 'no_data':
        return 'border-gray-200 bg-gray-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Historical Data Management</h1>
          <p className="text-muted-foreground">
            Backfill and manage DK defense scoring for historical data
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {weeks.length} weeks with team stats
          </span>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-600">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weeks Selection */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Select Weeks for Processing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Select All */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedWeeks.size === weeks.length && weeks.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium">
                    Select All Weeks ({weeks.length})
                  </label>
                </div>

                {/* Weeks Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Week</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Team Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weeks.map((week) => (
                      <TableRow key={week.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedWeeks.has(week.id)}
                            onCheckedChange={(checked) => 
                              handleWeekSelection(week.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          Week {week.week_number}
                        </TableCell>
                        <TableCell>{week.year}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {week.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{week.team_count} teams</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleDryRun}
                disabled={loading || selectedWeeks.size === 0}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Preview Changes
              </Button>

              <Button
                onClick={handleBackfill}
                disabled={loading || selectedWeeks.size === 0}
                className="w-full"
              >
                <Database className="h-4 w-4 mr-2" />
                Backfill Selected
              </Button>

              <Button
                onClick={handleBackfillAll}
                disabled={loading}
                variant="destructive"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Backfill All Weeks
              </Button>

              {loading && (
                <div className="space-y-2">
                  <Progress value={50} className="w-full" />
                  <p className="text-sm text-muted-foreground text-center">
                    Processing historical data...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Total Weeks:</span>
                <span className="font-medium">{weeks.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Selected Weeks:</span>
                <span className="font-medium">{selectedWeeks.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Total Teams:</span>
                <span className="font-medium">
                  {weeks.reduce((sum, week) => sum + week.team_count, 0)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Results */}
      {backfillResults && showDryRun && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{backfillResults.total_weeks}</div>
                  <div className="text-sm text-muted-foreground">Weeks</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{backfillResults.total_teams_updated}</div>
                  <div className="text-sm text-muted-foreground">Teams</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{backfillResults.total_errors}</div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Week</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Teams</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backfillResults.results.map((result) => (
                    <TableRow key={result.week_id}>
                      <TableCell className="font-medium">
                        Week {weeks.find(w => w.id === result.week_id)?.week_number || result.week_id}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.status)}
                          <Badge variant="outline" className={getStatusColor(result.status)}>
                            {result.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{result.total_teams}</TableCell>
                      <TableCell>{result.updated_count}</TableCell>
                      <TableCell>
                        {result.errors.length > 0 ? (
                          <Badge variant="destructive">
                            {result.errors.length}
                          </Badge>
                        ) : (
                          <span className="text-green-600">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
