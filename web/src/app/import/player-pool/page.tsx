"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, CheckCircle, Database, Globe } from 'lucide-react';
import { Week } from '@/types/prd';
import { API_CONFIG, buildApiUrl } from '@/config/api';
import { ActivityList } from '@/components/activity';
import { useRecentActivityLegacy } from '@/hooks/useRecentActivityLegacy';

interface DraftKingsImportResponse {
  players_added: number;
  players_updated: number;
  entries_added: number;
  entries_updated: number;
  entries_skipped: number;
  errors: string[];
  total_processed: number;
}

export default function PlayerPoolImportPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [draftGroup, setDraftGroup] = useState<string>('');
  const [draftGroups, setDraftGroups] = useState<Array<{
    id: number;
    draftGroup: number;
    week_id: number;
    draftGroup_description: string;
    games: number;
    created_at: string;
    updated_at: string;
  }>>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [lastImportResult, setLastImportResult] = useState<DraftKingsImportResponse | null>(null);

  // Use the legacy activity hook for player pool activities
  const {
    activities: history,
    loading: activityLoading,
    error: activityError,
    refresh: refreshActivity,
    retry: retryActivity
  } = useRecentActivityLegacy({
    importType: 'player-pool',
    limit: 10,
    weekId: selectedWeekId || undefined
  });

  const fetchDraftGroups = async (weekId: number) => {
    console.log('🔍 fetchDraftGroups called with weekId:', weekId);
    try {
      const response = await fetch(`http://localhost:8000/api/draftgroups/?week_id=${weekId}`);
      console.log('📡 Draft groups response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Draft groups response data:', data);
        // The API returns an array directly, not an object with draftgroups property
        const groups = Array.isArray(data) ? data : [];
        console.log('📋 Setting draft groups to:', groups);
        setDraftGroups(groups);
      } else {
        console.error('❌ Failed to fetch draft groups:', response.statusText);
      }
    } catch (error) {
      console.error('❌ Error fetching draft groups:', error);
    }
  };

  // Fetch weeks on component mount
  useEffect(() => {
    console.log('🚀 Player Pool page useEffect triggered');
    const fetchWeeks = async () => {
      try {
        console.log('📡 Fetching weeks...');
        const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.WEEKS));
        console.log('📡 Weeks response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Weeks data:', data);
          // The API returns {weeks: Week[], total: number}
          const weeksData = data.weeks || data;
          console.log('📋 Setting weeks to:', weeksData);
          setWeeks(weeksData);
          // Set default to active week
          const activeWeek = weeksData.find((week: Week) => week.status === 'Active');
          console.log('🎯 Active week found:', activeWeek);
          if (activeWeek) {
            console.log('🎯 Setting selectedWeekId to:', activeWeek.id);
            setSelectedWeekId(activeWeek.id);
            console.log('🎯 Calling fetchDraftGroups with:', activeWeek.id);
            await fetchDraftGroups(activeWeek.id);
          }
        } else {
          console.error('❌ Failed to fetch weeks:', response.statusText);
        }
      } catch (error) {
        console.error('❌ Error fetching weeks:', error);
      }
    };

    fetchWeeks();
  }, []);

  // Fetch draft groups when week changes
  useEffect(() => {
    console.log('🔄 Week change useEffect triggered, selectedWeekId:', selectedWeekId);
    if (selectedWeekId) {
      console.log('🔄 Clearing draft group and fetching new draft groups for week:', selectedWeekId);
      setDraftGroup(''); // Clear draft group selection when week changes
      fetchDraftGroups(selectedWeekId);
    }
  }, [selectedWeekId]);

  const handleImportPlayerData = async () => {
    if (!selectedWeekId || !draftGroup) {
      alert('Please select a week and draft group');
      return;
    }

    setIsImporting(true);
    setLastImportResult(null);

    try {
      const response = await fetch(buildApiUrl('/api/draftkings/import'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week_id: selectedWeekId,
          draft_group: draftGroup
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = `API request failed: ${response.status}`;
        if (errorData.detail) {
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (typeof errorData.detail === 'object') {
            errorMessage = errorData.detail.message || errorData.detail.error || JSON.stringify(errorData.detail);
          }
        }
        throw new Error(errorMessage);
      }

      const result: DraftKingsImportResponse = await response.json();
      setLastImportResult(result);

      // Refresh the activity list to show the new import
      await refreshActivity();

    } catch (error) {
      console.error('Error importing player data:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const selectedWeek = weeks.find(week => week.id === selectedWeekId);

  return (
    <div className="container mx-auto p-6 space-y-6">

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Import Player Pool Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import Player Pool Data
            </CardTitle>
            <CardDescription>
              Fetch player pool data from DraftKings API using Draft Group numbers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Import Week Selection */}
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
                Data will be imported for the selected week.
              </p>
            </div>

            {/* Draft Group Selection */}
            <div className="space-y-2">
              <Label htmlFor="draft-group">Draft Group</Label>
              <Select
                value={draftGroup}
                onValueChange={setDraftGroup}
                disabled={!selectedWeekId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select draft group" />
                </SelectTrigger>
                <SelectContent>
                  {draftGroups.map((group) => (
                    <SelectItem key={group.draftGroup} value={group.draftGroup.toString()}>
                      {group.draftGroup} - {group.draftGroup_description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Select from available draft groups for the selected week.
              </p>
            </div>

            {/* Import Button */}
            <Button
              onClick={handleImportPlayerData}
              disabled={!selectedWeekId || !draftGroup || isImporting}
              className="w-full"
              size="lg"
            >
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Player Pool Data
                </>
              )}
            </Button>

            {/* Information Boxes */}
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Player data will be fetched from DraftKings API using the Draft Group number for the selected week.
              </AlertDescription>
            </Alert>

            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">How to find Draft Group ID</p>
                  <p className="text-sm">
                    You can find the Draft Group ID by using the contest API with your contest ID:
                  </p>
                  <code className="text-xs bg-muted p-1 rounded block">
                    https://api.draftkings.com/contests/v1/contests/[CONTEST_ID]?format=json
                  </code>
                  <p className="text-sm">
                    Look for the <code className="bg-muted px-1 rounded">draftGroupId</code> field in the response.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Right Column - API Import Help */}
        <Card>
          <CardHeader>
            <CardTitle>API Import Help</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Player data will be fetched from DraftKings API using the Draft Group number for the selected week.
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
        emptyMessage="No recent player pool import activity found."
        showFilters={false}
        onRetry={retryActivity}
        onViewDetails={(activityId) => {
          console.log('View details for activity:', activityId);
          // You can implement a modal or navigation here
        }}
      />

      {/* Success/Error Messages */}
      {lastImportResult && (
        <Alert className={lastImportResult.errors.length > 0 ? "border-destructive" : "border-green-500"}>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">
                Import {lastImportResult.errors.length > 0 ? 'completed with errors' : 'completed successfully'}!
              </p>
              <div className="text-sm space-y-1">
                <p>Players added: {lastImportResult.players_added}</p>
                <p>Players updated: {lastImportResult.players_updated}</p>
                <p>Entries added: {lastImportResult.entries_added}</p>
                <p>Entries updated: {lastImportResult.entries_updated}</p>
                {lastImportResult.entries_skipped > 0 && (
                  <p>Entries skipped: {lastImportResult.entries_skipped}</p>
                )}
                {lastImportResult.errors.length > 0 && (
                  <div>
                    <p className="font-medium text-destructive">Errors:</p>
                    <ul className="list-disc list-inside">
                      {lastImportResult.errors.map((error, index) => (
                        <li key={index} className="text-destructive">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
