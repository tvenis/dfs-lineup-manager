"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle, RefreshCw, Globe, Calendar as CalendarIcon } from 'lucide-react';
import { Week } from '@/types/prd';
import { API_CONFIG, buildApiUrl } from '@/config/api';
import { ActivityList } from '@/components/activity';
import { useRecentActivity } from '@/hooks/useRecentActivity';
import { OddsImportResultDialog } from '@/components/OddsImportResultDialog';

interface GameOption {
  value: string;
  label: string;
}

const marketOptions = [
  { id: 'h2h', label: 'Head to Head', description: 'Moneyline betting' },
  { id: 'spreads', label: 'Spreads', description: 'Point spread betting' },
  { id: 'totals', label: 'Totals', description: 'Over/Under betting' }
];

export default function OddsImportPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [isImportingOdds, setIsImportingOdds] = useState(false);
  
  // Odds-API Integration state
  const [oddsSport, setOddsSport] = useState<string>('NFL');
  const [oddsStartTime, setOddsStartTime] = useState<Date | undefined>(undefined);
  const [oddsEndTime, setOddsEndTime] = useState<Date | undefined>(undefined);
  const [oddsRegion, setOddsRegion] = useState<string>('us');
  const [oddsMarkets, setOddsMarkets] = useState<string[]>(['h2h', 'spreads', 'totals']);
  const [oddsBookmakers, setOddsBookmakers] = useState<string>('draftkings');
  const [oddsGame, setOddsGame] = useState<string>('All');
  const [gameOptions, setGameOptions] = useState<GameOption[]>([]);
  const [playerPropMarkets, setPlayerPropMarkets] = useState<string[]>(['player_pass_tds']);
  
  // Result dialog state
  const [showResultDialog, setShowResultDialog] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [importResult, setImportResult] = useState<{ success: boolean; data?: any; error?: string } | null>(null);
  const [lastEndpoint, setLastEndpoint] = useState<string>('');

  // Use the modern activity hook for odds-api activities
  const {
    activities: history,
    loading: activityLoading,
    error: activityError,
    refresh: refreshActivity
  } = useRecentActivity({
    importType: 'odds-api',
    limit: 10
    // No weekId filter - show all activities for this import type
  });

  // Fetch weeks on component mount
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        console.log('📡 Fetching weeks for odds...');
        const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.WEEKS));
        console.log('📡 Weeks response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Weeks data:', data);
          const weeksData = data.weeks || data;
          setWeeks(weeksData);
          // Find the Active week first, fallback to first week if no Active week
          const activeWeek = weeksData.find((week: Week) => week.status === 'Active');
          const defaultWeek = activeWeek || weeksData[0];
          if (defaultWeek) {
            console.log('🎯 Setting default week to:', defaultWeek.id, defaultWeek.status);
            setSelectedWeekId(defaultWeek.id);
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

  // When week changes, fetch games and set date range from week data
  useEffect(() => {
    const fetchGamesForWeek = async () => {
      if (!selectedWeekId) return;
      
      // Set start and end dates from the selected week
      const selectedWeek = weeks.find(w => w.id === selectedWeekId);
      if (selectedWeek) {
        if (selectedWeek.start_date) {
          // Parse date as UTC to avoid timezone shifts
          const dateStr = selectedWeek.start_date;
          const [year, month, day] = dateStr.split('-').map(Number);
          setOddsStartTime(new Date(year, month - 1, day));
        }
        if (selectedWeek.end_date) {
          // Parse date as UTC to avoid timezone shifts
          const dateStr = selectedWeek.end_date;
          const [year, month, day] = dateStr.split('-').map(Number);
          setOddsEndTime(new Date(year, month - 1, day));
        }
      }
      
      try {
        const res = await fetch(`http://localhost:8000/api/games/week/${selectedWeekId}?future=true`);
        if (!res.ok) return;
        const data = await res.json();
        // Deduplicate by odds_api_gameid (event id) and only include those with an id
        const seen = new Set<string>();
        const options: GameOption[] = [];
        // Always include All at top
        options.push({ value: 'All', label: 'All Games' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const g of data.games as any[]) {
          const eid: string | null = g.odds_api_gameid;
          if (!eid) continue;
          if (seen.has(eid)) continue;
          seen.add(eid);
          const label = `${g.team_name || 'TBD'} ${g.homeoraway === 'H' ? 'vs' : '@'} ${g.opponent_name || 'TBD'}`;
          options.push({ value: eid, label });
        }
        setGameOptions(options);
        setOddsGame('All');
      } catch (e) {
        console.error('Failed to fetch games for week', e);
      }
    }
    fetchGamesForWeek();
  }, [selectedWeekId, weeks]);


  const handleOddsApiImport = async (endpoint: string) => {
    // Validate required parameters for Events endpoint
    if (endpoint === 'events' && (!oddsStartTime || !oddsEndTime || !selectedWeekId)) {
      alert('Events endpoint requires Start Date, End Date, and Week selection');
      return;
    }

    // Validate required parameters for Odds endpoint
    if (endpoint === 'odds' && (!oddsStartTime || !oddsEndTime || !selectedWeekId)) {
      alert('Odds endpoint requires Start Date, End Date, and Week selection');
      return;
    }

    setIsImportingOdds(true);
    
    try {
      let apiUrl = '';
      let description = '';
      let sport = '';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requestBody: any = {};
      
      switch (endpoint) {
        case 'participants':
          // Map sport selection to API format
          sport = oddsSport === 'NFL' ? 'americanfootball_nfl' : oddsSport;
          apiUrl = `http://localhost:8000/api/odds-api/participants/${sport}`;
          description = 'NFL team participants';
          break;
        case 'player-props':
          // Map sport selection to API format
          sport = oddsSport === 'NFL' ? 'americanfootball_nfl' : oddsSport;
          apiUrl = `http://localhost:8000/api/odds-api/player-props/${sport}`;
          description = 'NFL player props';
          requestBody.week_id = selectedWeekId;
          requestBody.regions = oddsRegion;
          requestBody.markets = playerPropMarkets;
          // event_id: either specific odds_api_gameid or 'All'
          requestBody.event_id = oddsGame || 'All';
          // bookmakers: allow 'all' or specific
          requestBody.bookmakers = oddsBookmakers;
          break;
        case 'events':
          // Map sport selection to API format
          sport = oddsSport === 'NFL' ? 'americanfootball_nfl' : oddsSport;
          apiUrl = `http://localhost:8000/api/odds-api/events/${sport}`;
          description = 'NFL games for current week';
          
          // Add required parameters for events
          requestBody.week_id = selectedWeekId;
          
          // Format times according to Odds-API requirements
          if (oddsStartTime) {
            const startDate = new Date(oddsStartTime);
            startDate.setUTCHours(0, 0, 0, 0); // Set to midnight UTC
            requestBody.commence_time_from = startDate.toISOString().replace('.000Z', 'Z');
          }
          
          if (oddsEndTime) {
            const endDate = new Date(oddsEndTime);
            endDate.setUTCHours(23, 59, 0, 0); // Set to 23:59:00 UTC
            requestBody.commence_time_to = endDate.toISOString().replace('.000Z', 'Z');
          }
          requestBody.regions = oddsRegion;
          // bookmakers: allow 'all' or specific
          requestBody.bookmakers = oddsBookmakers;
          break;
        case 'odds':
          // Map sport selection to API format
          sport = oddsSport === 'NFL' ? 'americanfootball_nfl' : oddsSport;
          apiUrl = `http://localhost:8000/api/odds-api/odds/${sport}`;
          description = 'NFL odds for current week';
          
          // Add required parameters for odds
          requestBody.week_id = selectedWeekId;
          
          // Format times according to Odds-API requirements
          if (oddsStartTime) {
            const startDate = new Date(oddsStartTime);
            startDate.setUTCHours(0, 0, 0, 0); // Set to midnight UTC
            requestBody.commence_time_from = startDate.toISOString().replace('.000Z', 'Z');
          }
          
          if (oddsEndTime) {
            const endDate = new Date(oddsEndTime);
            endDate.setUTCHours(23, 59, 0, 0); // Set to 23:59:00 UTC
            requestBody.commence_time_to = endDate.toISOString().replace('.000Z', 'Z');
          }
          requestBody.regions = oddsRegion;
          requestBody.markets = oddsMarkets.join(',');
          // odds/date format forced by backend for odds endpoint
          requestBody.bookmakers = oddsBookmakers;
          break;
        default:
          throw new Error('Unknown endpoint');
      }
      
      console.log(`Importing ${description} from Odds-API via backend`);
      console.log(`Backend API URL: ${apiUrl}`);
      console.log(`Request body:`, requestBody);
      
      // Make the API call to our backend
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Successfully imported ${description}:`, data);
      
      await refreshActivity();
      
      // Show success dialog
      setLastEndpoint(endpoint);
      setImportResult({
        success: true,
        data: data
      });
      setShowResultDialog(true);
      
    } catch (error) {
      console.error(`Error importing ${endpoint}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Show error dialog
      setLastEndpoint(endpoint);
      setImportResult({
        success: false,
        error: errorMessage
      });
      setShowResultDialog(true);
    } finally {
      setIsImportingOdds(false);
    }
  };

  const handleMarketChange = (marketId: string, checked: boolean) => {
    if (checked) {
      setOddsMarkets(prev => [...prev, marketId]);
    } else {
      setOddsMarkets(prev => prev.filter(id => id !== marketId));
    }
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Find the currently selected week for dialog display
  const selectedWeekData = weeks.find(w => w.id === selectedWeekId);

  const getWeekLabel = (week: Week) => {
    const weekLabel = week.week_number === 1 ? "Week 1" :
                     week.week_number === 2 ? "Week 2" :
                     week.week_number === 3 ? "Week 3" :
                     week.week_number === 4 ? "Week 4" :
                     week.week_number === 5 ? "Week 5" :
                     week.week_number === 6 ? "Week 6" :
                     week.week_number === 7 ? "Week 7" :
                     week.week_number === 8 ? "Week 8" :
                     week.week_number === 9 ? "Week 9" :
                     week.week_number === 10 ? "Week 10" :
                     week.week_number === 11 ? "Week 11" :
                     week.week_number === 12 ? "Week 12" :
                     week.week_number === 13 ? "Week 13" :
                     week.week_number === 14 ? "Week 14" :
                     week.week_number === 15 ? "Week 15" :
                     week.week_number === 16 ? "Week 16" :
                     week.week_number === 17 ? "Week 17" :
                     week.week_number === 18 ? "Week 18" :
                     week.week_number === 19 ? "Wild Card" :
                     week.week_number === 20 ? "Divisional" :
                     week.week_number === 21 ? "Conference Championship" :
                     week.week_number === 22 ? "Super Bowl" :
                     `Week ${week.week_number}`;
    
    return `${weekLabel} (${week.year}) - ${week.status}`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Odds-API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Odds-API Configuration
            </CardTitle>
            <CardDescription>
              Configure your Odds-API settings and standard parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Week and Sport */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Week</Label>
                <Select value={selectedWeekId?.toString() || ''} onValueChange={(value) => setSelectedWeekId(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select week" />
                  </SelectTrigger>
                  <SelectContent>
                    {weeks.map((week) => (
                      <SelectItem key={week.id} value={week.id.toString()}>
                        {getWeekLabel(week)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sport</Label>
                <Select value={oddsSport} onValueChange={setOddsSport}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sport" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NFL">NFL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Start Time and End Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formatDate(oddsStartTime)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={oddsStartTime}
                      onSelect={setOddsStartTime}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Will be set to 00:00:00Z (midnight UTC)
                </p>
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formatDate(oddsEndTime)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={oddsEndTime}
                      onSelect={setOddsEndTime}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Will be set to 23:59:00Z (1 min before midnight UTC)
                </p>
              </div>
            </div>

            {/* Region and Bookmakers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Region</Label>
                <Select value={oddsRegion} onValueChange={setOddsRegion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="us">United States</SelectItem>
                    <SelectItem value="uk">United Kingdom</SelectItem>
                    <SelectItem value="eu">Europe</SelectItem>
                    <SelectItem value="au">Australia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bookmakers</Label>
                <Select value={oddsBookmakers} onValueChange={setOddsBookmakers}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bookmaker" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="betmgm">BetMGM</SelectItem>
                    <SelectItem value="betonlineag">BetOnline</SelectItem>
                    <SelectItem value="betrivers">BetRivers</SelectItem>
                    <SelectItem value="bovada">Bovada</SelectItem>
                    <SelectItem value="draftkings">DraftKings</SelectItem>
                    <SelectItem value="fanduel">FanDuel</SelectItem>
                    <SelectItem value="williamhill_us">William Hill US</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                These parameters will be applied to all Odds-API endpoint calls. The API key is configured via environment variables.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Available Endpoints */}
        <Card>
          <CardHeader>
            <CardTitle>Available Endpoints</CardTitle>
            <CardDescription>
              Import data from different Odds-API endpoints
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Participants Endpoint */}
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Participants</h4>
                  <p className="text-sm text-muted-foreground">
                    Import NFL team data to populate Teams table
                  </p>
                </div>
                <Badge variant="outline">Teams</Badge>
              </div>
              <Button 
                onClick={() => handleOddsApiImport('participants')}
                disabled={isImportingOdds}
                className="w-full gap-2"
                size="sm"
              >
                {isImportingOdds ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import Participants
                  </>
                )}
              </Button>
              <div className="text-xs text-muted-foreground">
                Required parameters: API Key, Sport
              </div>
            </div>

            {/* Events Endpoint */}
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Events (Games)</h4>
                  <p className="text-sm text-muted-foreground">
                    Import NFL games for the selected time period (requires Start/End Time)
                  </p>
                </div>
                <Badge variant="outline">Games</Badge>
              </div>
              <Button 
                onClick={() => handleOddsApiImport('events')}
                disabled={isImportingOdds || !oddsStartTime || !oddsEndTime || !selectedWeekId}
                className="w-full gap-2"
                size="sm"
              >
                {isImportingOdds ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import Events
                  </>
                )}
              </Button>
              <div className="text-xs text-muted-foreground">
                Required parameters: API Key, Sport, Start Date, End Date, Week
                <br />
                Times are automatically set to midnight (start) and 23:59 (end)
              </div>
            </div>

            {/* Odds Endpoint */}
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    Odds
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Import NFL odds data to update game records with money lines, spreads, and totals
                  </p>
                </div>
                <Badge variant="outline">Odds</Badge>
              </div>
              
              {/* Markets Selection - specific to Odds endpoint */}
              <div className="space-y-3">
                <Label>Markets</Label>
                <div className="grid grid-cols-2 gap-3">
                  {marketOptions.map((market) => (
                    <div key={market.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`odds-${market.id}`}
                        checked={oddsMarkets.includes(market.id)}
                        onCheckedChange={(checked) => handleMarketChange(market.id, checked as boolean)}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor={`odds-${market.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {market.label}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {market.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <Button 
                onClick={() => handleOddsApiImport('odds')}
                disabled={isImportingOdds || !oddsStartTime || !oddsEndTime || !selectedWeekId}
                className="w-full gap-2"
                size="sm"
              >
                {isImportingOdds ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import Odds
                  </>
                )}
              </Button>
              <div className="text-xs text-muted-foreground">
                Required parameters: API Key, Sport, Start Date, End Date, Week
                <br />
                Updates existing games with money line, spread, and total odds
              </div>
            </div>

            {/* Player Props Endpoint */}
            <div className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Player Props</h4>
                  <p className="text-sm text-muted-foreground">
                    Import player prop bets (currently Passing TDs). Only imports Over bets. Requires Week and optional Game selection.
                  </p>
                </div>
                <Badge variant="outline">Player Props</Badge>
              </div>
              
              {/* Game Selection - specific to Player Props endpoint */}
              <div className="space-y-2">
                <Label>Game</Label>
                <Select value={oddsGame} onValueChange={setOddsGame}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select game for player props" />
                  </SelectTrigger>
                  <SelectContent>
                    {gameOptions.map((game) => (
                      <SelectItem key={game.value} value={game.value}>
                        {game.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Player Prop Markets - specific to Player Props endpoint */}
              <div className="mt-2 space-y-2">
                <Label>Player Prop Markets</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="props-player_pass_tds"
                      checked={playerPropMarkets.includes('player_pass_tds')}
                      onCheckedChange={(checked) => {
                        setPlayerPropMarkets((prev) => {
                          const exists = prev.includes('player_pass_tds');
                          if (checked && !exists) return [...prev, 'player_pass_tds'];
                          if (!checked && exists) return prev.filter(m => m !== 'player_pass_tds');
                          return prev;
                        });
                      }}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="props-player_pass_tds" className="text-sm font-medium leading-none">
                        Passing TDs
                      </label>
                      <p className="text-xs text-muted-foreground">Player passing touchdowns</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="props-player_pass_attempts"
                      checked={playerPropMarkets.includes('player_pass_attempts')}
                      onCheckedChange={(checked) => {
                        setPlayerPropMarkets((prev) => {
                          const exists = prev.includes('player_pass_attempts');
                          if (checked && !exists) return [...prev, 'player_pass_attempts'];
                          if (!checked && exists) return prev.filter(m => m !== 'player_pass_attempts');
                          return prev;
                        });
                      }}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="props-player_pass_attempts" className="text-sm font-medium leading-none">
                        Pass Attempts
                      </label>
                      <p className="text-xs text-muted-foreground">Player passing attempts</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="props-player_pass_completions"
                      checked={playerPropMarkets.includes('player_pass_completions')}
                      onCheckedChange={(checked) => {
                        setPlayerPropMarkets((prev) => {
                          const exists = prev.includes('player_pass_completions');
                          if (checked && !exists) return [...prev, 'player_pass_completions'];
                          if (!checked && exists) return prev.filter(m => m !== 'player_pass_completions');
                          return prev;
                        });
                      }}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="props-player_pass_completions" className="text-sm font-medium leading-none">
                        Pass Completions
                      </label>
                      <p className="text-xs text-muted-foreground">Player passing completions</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="props-player_pass_yds"
                      checked={playerPropMarkets.includes('player_pass_yds')}
                      onCheckedChange={(checked) => {
                        setPlayerPropMarkets((prev) => {
                          const exists = prev.includes('player_pass_yds');
                          if (checked && !exists) return [...prev, 'player_pass_yds'];
                          if (!checked && exists) return prev.filter(m => m !== 'player_pass_yds');
                          return prev;
                        });
                      }}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="props-player_pass_yds" className="text-sm font-medium leading-none">
                        Passing Yards
                      </label>
                      <p className="text-xs text-muted-foreground">Player passing yards</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="props-player_receptions"
                      checked={playerPropMarkets.includes('player_receptions')}
                      onCheckedChange={(checked) => {
                        setPlayerPropMarkets((prev) => {
                          const exists = prev.includes('player_receptions');
                          if (checked && !exists) return [...prev, 'player_receptions'];
                          if (!checked && exists) return prev.filter(m => m !== 'player_receptions');
                          return prev;
                        });
                      }}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="props-player_receptions" className="text-sm font-medium leading-none">
                        Receptions
                      </label>
                      <p className="text-xs text-muted-foreground">Player receptions</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="props-player_reception_yds"
                      checked={playerPropMarkets.includes('player_reception_yds')}
                      onCheckedChange={(checked) => {
                        setPlayerPropMarkets((prev) => {
                          const exists = prev.includes('player_reception_yds');
                          if (checked && !exists) return [...prev, 'player_reception_yds'];
                          if (!checked && exists) return prev.filter(m => m !== 'player_reception_yds');
                          return prev;
                        });
                      }}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="props-player_reception_yds" className="text-sm font-medium leading-none">
                        Reception Yards
                      </label>
                      <p className="text-xs text-muted-foreground">Player reception yards</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="props-player_rush_attempts"
                      checked={playerPropMarkets.includes('player_rush_attempts')}
                      onCheckedChange={(checked) => {
                        setPlayerPropMarkets((prev) => {
                          const exists = prev.includes('player_rush_attempts');
                          if (checked && !exists) return [...prev, 'player_rush_attempts'];
                          if (!checked && exists) return prev.filter(m => m !== 'player_rush_attempts');
                          return prev;
                        });
                      }}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="props-player_rush_attempts" className="text-sm font-medium leading-none">
                        Rush Attempts
                      </label>
                      <p className="text-xs text-muted-foreground">Player rushing attempts</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="props-player_rush_yds"
                      checked={playerPropMarkets.includes('player_rush_yds')}
                      onCheckedChange={(checked) => {
                        setPlayerPropMarkets((prev) => {
                          const exists = prev.includes('player_rush_yds');
                          if (checked && !exists) return [...prev, 'player_rush_yds'];
                          if (!checked && exists) return prev.filter(m => m !== 'player_rush_yds');
                          return prev;
                        });
                      }}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="props-player_rush_yds" className="text-sm font-medium leading-none">
                        Rush Yards
                      </label>
                      <p className="text-xs text-muted-foreground">Player rushing yards</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="props-player_tds_over"
                      checked={playerPropMarkets.includes('player_tds_over')}
                      onCheckedChange={(checked) => {
                        setPlayerPropMarkets((prev) => {
                          const exists = prev.includes('player_tds_over');
                          if (checked && !exists) return [...prev, 'player_tds_over'];
                          if (!checked && exists) return prev.filter(m => m !== 'player_tds_over');
                          return prev;
                        });
                      }}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="props-player_tds_over" className="text-sm font-medium leading-none">
                        Total TDs (Over)
                      </label>
                      <p className="text-xs text-muted-foreground">Player total touchdowns over</p>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => handleOddsApiImport('player-props')}
                disabled={isImportingOdds || !selectedWeekId}
                className="w-full gap-2"
                size="sm"
              >
                {isImportingOdds ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import Player Props
                  </>
                )}
              </Button>
              <div className="text-xs text-muted-foreground">
                Required parameters: API Key, Sport, Week
                <br />
                Optional: Game selection, Player Prop Markets
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Statistics</CardTitle>
          <CardDescription>Overview of your recent Odds-API import activity</CardDescription>
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
        emptyMessage="No recent Odds-API import activity found."
        showFilters={false}
        onViewDetails={(activityId) => {
          console.log('View details for activity:', activityId);
        }}
      />

      {/* Import Result Dialog */}
      <OddsImportResultDialog
        isOpen={showResultDialog}
        onClose={() => setShowResultDialog(false)}
        result={importResult?.success ? importResult.data : null}
        error={importResult?.error || null}
        endpoint={lastEndpoint}
        week={selectedWeekData ? `Week ${selectedWeekData.week_number} (${selectedWeekData.year})` : 'Unknown'}
      />
    </div>
  );
}
