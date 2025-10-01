"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, FileText, Users, RefreshCw, Trophy } from 'lucide-react';
import { Week } from '@/types/prd';
import { API_CONFIG, buildApiUrl } from '@/config/api';
import { ContestImportResultDialog } from '@/components/ContestImportResultDialog';
import { ActivityList } from '@/components/activity';
import { useRecentActivity } from '@/hooks/useRecentActivity';

interface Lineup {
  id: string;
  name: string;
  week_id: number;
  status: string;
}

export default function ContestsImportPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [defaultLineup, setDefaultLineup] = useState<string>('none');
  const [maxContests, setMaxContests] = useState<string>('50');
  const [forceRefresh, setForceRefresh] = useState<boolean>(false);
  const [h2hContests, setH2hContests] = useState<any[]>([]);
  const [isProcessingContests, setIsProcessingContests] = useState(false);
  const [isImportingRosters, setIsImportingRosters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Result dialog state
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; data?: any; error?: string } | null>(null);
  
  // Use the modern activity hook for contest activities
  const {
    activities: history,
    loading: activityLoading,
    error: activityError,
    refresh: refreshActivity
  } = useRecentActivity({
    importType: 'contests',
    limit: 10
  });

  // Fetch weeks on component mount
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        console.log('📡 Fetching weeks for contests...');
        const response = await fetch(buildApiUrl('/api/contests/weeks'));
        console.log('📡 Contests weeks response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Contests weeks data:', data);
          const weeksData = data.weeks || data;
          setWeeks(weeksData);
          // Find the Active week first, fallback to first week if no Active week
          const activeWeek = weeksData.find((week: Week) => week.status === 'Active');
          const defaultWeek = activeWeek || weeksData[0];
          if (defaultWeek) {
            console.log('🎯 Setting default week to:', defaultWeek.id, defaultWeek.status);
            setSelectedWeekId(defaultWeek.id);
            await fetchH2hContests(defaultWeek.id);
          }
        } else {
          console.error('❌ Failed to fetch contests weeks:', response.statusText);
        }
      } catch (error) {
        console.error('❌ Error fetching contests weeks:', error);
      }
    };

    fetchWeeks();
  }, []);

  // Fetch H2H contests when week changes
  useEffect(() => {
    if (selectedWeekId) {
      fetchH2hContests(selectedWeekId);
    }
  }, [selectedWeekId]);

  // Fetch lineups when week changes
  useEffect(() => {
    if (selectedWeekId) {
      fetchLineups(selectedWeekId);
    }
  }, [selectedWeekId]);

  const fetchH2hContests = async (weekId: number) => {
    try {
      const response = await fetch(buildApiUrl(`/api/contests/h2h?week_id=${weekId}`));
      if (response.ok) {
        const data = await response.json();
        setH2hContests(data);
      } else {
        setH2hContests([]);
      }
    } catch (error) {
      console.error('Error fetching H2H contests:', error);
      setH2hContests([]);
    }
  };

  const fetchLineups = async (weekId: number) => {
    try {
      console.log('📡 Fetching lineups for week:', weekId);
      const response = await fetch(`http://localhost:8000/api/lineups?week_id=${weekId}&status=submitted&limit=1000`);
      console.log('📡 Lineups response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Lineups data:', data);
        setLineups(data.lineups || []);
        // Reset selected lineup when week changes
        setDefaultLineup('none');
      } else {
        console.error('❌ Failed to fetch lineups:', response.statusText);
        setLineups([]);
        setDefaultLineup('none');
      }
    } catch (error) {
      console.error('❌ Error fetching lineups:', error);
      setLineups([]);
      setDefaultLineup('none');
    }
  };


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFile(file);
    }
  };

  const handleProcessContests = async () => {
    if (!csvFile || !selectedWeekId) {
      alert('Please select a week and upload a CSV file');
      return;
    }

    setIsProcessingContests(true);

    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      formData.append('week_id', selectedWeekId.toString());
      if (defaultLineup !== 'none') {
        formData.append('default_lineup', defaultLineup);
      }

      const response = await fetch(buildApiUrl('/api/contests/parse'), {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process contests');
      }

      const result = await response.json();
      await refreshActivity();
      
      // Show success dialog
      setImportResult({
        success: true,
        data: {
          total_processed: result.total_processed || (result.created + result.updated) || 0,
          created: result.created || 0,
          updated: result.updated || 0,
          errors: result.errors || []
        }
      });
      setShowResultDialog(true);

    } catch (error) {
      console.error('Error processing contests:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Show error dialog
      setImportResult({
        success: false,
        error: errorMessage
      });
      setShowResultDialog(true);
    } finally {
      setIsProcessingContests(false);
    }
  };

  const handleRefreshH2hContests = async () => {
    if (!selectedWeekId) return;
    
    setIsRefreshing(true);
    try {
      await fetchH2hContests(selectedWeekId);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleImportOpponentRosters = async () => {
    if (!selectedWeekId) {
      alert('Please select a week');
      return;
    }

    setIsImportingRosters(true);

    try {
      const response = await fetch(buildApiUrl('/api/contests/import-opponent-rosters'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week_id: selectedWeekId,
          max_contests: parseInt(maxContests),
          force_refresh: forceRefresh
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to import opponent rosters');
      }

      const result = await response.json();
      await refreshActivity();
      alert('Opponent rosters import started! This process runs in the background.');

    } catch (error) {
      console.error('Error importing opponent rosters:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImportingRosters(false);
    }
  };

  const selectedWeek = weeks.find(week => week.id === selectedWeekId);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Import Contests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Import Contests
            </CardTitle>
            <CardDescription>
              Import DraftKings contest results from CSV, review all rows, and save.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Target Week Selection */}
            <div className="space-y-2">
              <Label htmlFor="target-week">Target Week</Label>
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

            {/* Default Lineup Selection */}
            <div className="space-y-2">
              <Label htmlFor="default-lineup">Default Lineup (Optional)</Label>
              <Select
                value={defaultLineup}
                onValueChange={setDefaultLineup}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select default lineup" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No default lineup</SelectItem>
                  {lineups.map((lineup) => (
                    <SelectItem key={lineup.id} value={lineup.id}>
                      {lineup.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {lineups.length === 0 && selectedWeekId && (
                <div className="text-sm text-muted-foreground">
                  No submitted lineups found for this week
                </div>
              )}
            </div>

            {/* CSV File Upload */}
            <div className="space-y-2">
              <Label htmlFor="csv-file">CSV File</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('csv-file')?.click()}
                  className="flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Choose File
                </Button>
                <span className="text-sm text-muted-foreground">
                  {csvFile ? csvFile.name : 'No file chosen'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                Upload the DraftKings contest results CSV. All rows will be staged for review and editing before saving.
              </p>
            </div>

            {/* Process Button */}
            <Button
              onClick={handleProcessContests}
              disabled={!selectedWeekId || !csvFile || isProcessingContests}
              className="w-full"
              size="lg"
            >
              {isProcessingContests ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Process & Review Contests
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Right Column - Import Opponent Roster */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Import Opponent Roster
            </CardTitle>
            <CardDescription>
              Import opponent roster data from H2H contests for the selected week.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Target Week Selection */}
            <div className="space-y-2">
              <Label htmlFor="target-week-rosters">Target Week</Label>
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

            {/* H2H Contests Preview */}
            <div className="space-y-2">
              <Label>H2H Contests Preview</Label>
              <div className="p-4 border rounded-lg bg-muted/30">
                {h2hContests.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Found {h2hContests.length} H2H contests</p>
                    <div className="text-xs text-muted-foreground">
                      {h2hContests.slice(0, 3).map((contest, index) => (
                        <div key={index}>• {contest.contest_name || `Contest ${contest.id}`}</div>
                      ))}
                    </div>
                    {h2hContests.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        ... and {h2hContests.length - 3} more
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      No H2H contests found. Click Refresh to check.
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshH2hContests}
                      disabled={isRefreshing}
                    >
                      {isRefreshing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Refresh
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Max Contests */}
            <div className="space-y-2">
              <Label htmlFor="max-contests">Max Contests</Label>
              <Input
                id="max-contests"
                type="number"
                value={maxContests}
                onChange={(e) => setMaxContests(e.target.value)}
                min="1"
                max="100"
              />
            </div>

            {/* Force Refresh Option */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="force-refresh"
                checked={forceRefresh}
                onCheckedChange={(checked) => setForceRefresh(checked as boolean)}
              />
              <Label htmlFor="force-refresh" className="text-sm">
                Force refresh existing data
              </Label>
            </div>

            {/* Instructions */}
            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                This will fetch opponent roster data from DraftKings H2H contests for the selected week. The process runs in the background and may take a few minutes to complete.
              </AlertDescription>
            </Alert>

            {/* Import Button */}
            <Button
              onClick={handleImportOpponentRosters}
              disabled={!selectedWeekId || isImportingRosters}
              className="w-full"
              size="lg"
            >
              {isImportingRosters ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Import Opponent Rosters
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Activity Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Statistics</CardTitle>
          <CardDescription>Overview of your recent contest import activity</CardDescription>
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
        emptyMessage="No recent contest import activity found."
        showFilters={false}
        onViewDetails={(activityId) => {
          console.log('View details for activity:', activityId);
        }}
      />

      {/* Import Result Dialog */}
      <ContestImportResultDialog
        isOpen={showResultDialog}
        onClose={() => setShowResultDialog(false)}
        result={importResult?.success ? importResult.data : undefined}
        error={importResult?.error}
        filename={csvFile?.name || 'Unknown'}
        week={weeks.find(w => w.id === selectedWeekId) ? `Week ${weeks.find(w => w.id === selectedWeekId)!.week_number} (${weeks.find(w => w.id === selectedWeekId)!.year})` : 'Unknown'}
      />
    </div>
  );
}
