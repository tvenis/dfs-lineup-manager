import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Upload, FileText, CheckCircle, XCircle, Eye, RefreshCw, Database, Globe, Calendar as CalendarIcon } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Checkbox } from './ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Calendar } from './ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Badge } from './ui/badge'
import { ImportPlayerProjections } from './ImportPlayerProjections'

// Mock data for the component
const mockImportHistory = [
  {
    id: 1,
    type: 'import' as const,
    filename: 'Draft Group 12345',
    format: 'API',
    timestamp: new Date('2024-01-15T10:30:00'),
    status: 'success' as const,
    details: '150 players imported successfully for Week 1',
    week: 'Week 1'
  },
  {
    id: 2,
    type: 'import' as const,
    filename: 'projections_week1.csv',
    format: 'CSV',
    timestamp: new Date('2024-01-15T09:15:00'),
    status: 'success' as const,
    details: '120 projections imported successfully',
    week: 'Week 1'
  }
]

const mockWeeks = [
  { value: '1', label: 'Week 1', isActive: true },
  { value: '2', label: 'Week 2', isActive: false },
  { value: '3', label: 'Week 3', isActive: false },
  { value: 'wc', label: 'Wild Card', isActive: false },
  { value: 'div', label: 'Divisional', isActive: false },
  { value: 'conf', label: 'Conference Championship', isActive: false },
  { value: 'sb', label: 'Super Bowl', isActive: false }
]

// Dynamic games will be fetched per week; keep type here for convenience
interface GameOption {
  value: string
  label: string
}

const marketOptions = [
  { id: 'h2h', label: 'Head to Head', description: 'Moneyline betting' },
  { id: 'spreads', label: 'Spreads', description: 'Point spread betting' },
  { id: 'totals', label: 'Totals', description: 'Over/Under betting' }
]

// Types for API responses
interface DraftKingsImportResponse {
  players_added: number
  players_updated: number
  entries_added: number
  entries_updated: number
  entries_skipped: number
  errors: string[]
  total_processed: number
}

interface Week {
  id: number
  label: string
  week_number: number
  year: number
  status: string
}

interface RecentActivity {
  id: number
  timestamp: string
  action: 'import' | 'export'
  fileType: 'API' | 'CSV'
  fileName: string | null
  week_id: number
  draftGroup: string
  recordsAdded: number
  recordsUpdated: number
  recordsSkipped: number
  errors: string[]
  user: string | null
  details: unknown
  importType?: 'player-pool' | 'projections' | 'odds-api' // New field for tab-specific tracking
}

export function ImportManager({ selectedWeek = '1' }: { selectedWeek?: string }) {
  const [history, setHistory] = useState<RecentActivity[]>([])
  const [weeks, setWeeks] = useState<Week[]>([])
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null)
  const [draftGroup, setDraftGroup] = useState<string>('')
  const [isImporting, setIsImporting] = useState(false)
  const [, setLastImportResult] = useState<DraftKingsImportResponse | null>(null)
  
  // Odds-API Integration state
  const [oddsApiKey, setOddsApiKey] = useState<string>('')
  const [oddsWeek, setOddsWeek] = useState<string>(selectedWeek) // Default to active week
  const [oddsSport, setOddsSport] = useState<string>('NFL')
  const [oddsStartTime, setOddsStartTime] = useState<Date | undefined>(undefined)
  const [oddsEndTime, setOddsEndTime] = useState<Date | undefined>(undefined)
  const [oddsRegion, setOddsRegion] = useState<string>('us')
  const [oddsMarkets, setOddsMarkets] = useState<string[]>(['h2h', 'spreads', 'totals']) // Default selection
  // Odds/Date format removed; odds always requested in american and date in iso by backend
  const [oddsBookmakers, setOddsBookmakers] = useState<string>('draftkings')
  const [oddsDaysFrom, setOddsDaysFrom] = useState<string>('1')
  const [oddsGame, setOddsGame] = useState<string>('All')
  const [isImportingOdds, setIsImportingOdds] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('import-pool')
  const [gameOptions, setGameOptions] = useState<GameOption[]>([])
  // Player Prop market (single-select for now; expand to multi later)
  const [playerPropMarkets, setPlayerPropMarkets] = useState<string[]>(['player_pass_tds'])
  // Activity details dialog state
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false)
  const [detailsActivity, setDetailsActivity] = useState<RecentActivity | null>(null)

  // Check for success parameter from review page
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('success') === 'true') {
      // Refresh recent activity to show the new import
      fetchRecentActivity()
      // Clear the success parameter from URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    fetchWeeks()
    fetchRecentActivity()
  }, [])

  // When week changes, fetch games for the week to populate the Game picker
  useEffect(() => {
    const fetchGamesForWeek = async () => {
      if (!selectedWeekId) return
      try {
        const res = await fetch(`http://localhost:8000/api/games/week/${selectedWeekId}?future=true`)
        if (!res.ok) return
        const data = await res.json()
        // Deduplicate by odds_api_gameid (event id) and only include those with an id
        const seen = new Set<string>()
        const options: GameOption[] = []
        // Always include All at top
        options.push({ value: 'All', label: 'All Games' })
        for (const g of data.games as any[]) {
          const eid: string | null = g.odds_api_gameid
          if (!eid) continue
          if (seen.has(eid)) continue
          seen.add(eid)
          const label = `${g.team_name || 'TBD'} ${g.homeoraway === 'H' ? 'vs' : '@'} ${g.opponent_name || 'TBD'}`
          options.push({ value: eid, label })
        }
        setGameOptions(options)
        setOddsGame('All')
      } catch (e) {
        console.error('Failed to fetch games for week', e)
      }
    }
    fetchGamesForWeek()
  }, [selectedWeekId])

  const fetchWeeks = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/draftkings/weeks')
      if (response.ok) {
        const data = await response.json()
        setWeeks(data.weeks)
        // Set first week as default if available
        if (data.weeks.length > 0) {
          setSelectedWeekId(data.weeks[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch weeks:', error)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      // Fetch from both activity endpoints
      const [draftkingsResponse, projectionsResponse] = await Promise.all([
        fetch('http://localhost:8000/api/draftkings/activity?limit=20'),
        fetch('http://localhost:8000/api/projections/activity?limit=20')
      ])
      
      const allActivities: RecentActivity[] = []
      
      if (draftkingsResponse.ok) {
        const draftkingsData = await draftkingsResponse.json()
        allActivities.push(...draftkingsData)
      }
      
      if (projectionsResponse.ok) {
        const projectionsData = await projectionsResponse.json()
        allActivities.push(...projectionsData)
      }
      
      // Add import types to existing activities and sort by timestamp (most recent first)
      const sortedActivities = allActivities
        .map(activity => ({
          ...activity,
          importType: activity.importType || (
            activity.draftGroup === 'Odds-API' ? 'odds-api' :
            activity.fileType === 'CSV' ? 'projections' :
            'player-pool'
          )
        }))
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 20)
      
      setHistory(sortedActivities)
    } catch (error) {
      console.error('Failed to fetch recent activity:', error)
    }
  }

  const handleImportPlayerData = async () => {
    if (!selectedWeekId || !draftGroup.trim()) {
      alert('Please select a week and enter a Draft Group number')
      return
    }

    setIsImporting(true)
    setLastImportResult(null) // Clear previous result

    try {
      const response = await fetch('http://localhost:8000/api/draftkings/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week_id: selectedWeekId,
          draft_group: draftGroup
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `API request failed: ${response.status}`)
      }

      const result: DraftKingsImportResponse = await response.json()
      setLastImportResult(result)

      await fetchRecentActivity() // Refresh history
      
      // Add a local activity item for immediate feedback
      const newHistoryItem: RecentActivity = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        action: 'import',
        fileType: 'API',
        fileName: `Draft Group ${draftGroup}`,
        week_id: selectedWeekId,
        draftGroup: draftGroup,
        recordsAdded: result.players_added + result.entries_added,
        recordsUpdated: result.players_updated + result.entries_updated,
        recordsSkipped: result.entries_skipped,
        errors: result.errors,
        user: null,
        details: null,
        importType: 'player-pool'
      }
      
      setHistory(prev => [newHistoryItem, ...prev])

    } catch (error) {
      console.error('Import failed:', error)
      setLastImportResult({ // Set error result for display
        players_added: 0, players_updated: 0, entries_added: 0, entries_updated: 0, entries_skipped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
        total_processed: 0
      })
      
      // Add error activity item
      const errorHistoryItem: RecentActivity = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        action: 'import',
        fileType: 'API',
        fileName: `Draft Group ${draftGroup}`,
        week_id: selectedWeekId || 0,
        draftGroup: draftGroup,
        recordsAdded: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
        user: null,
        details: null,
        importType: 'player-pool'
      }
      
      setHistory(prev => [errorHistoryItem, ...prev])
    } finally {
      setIsImporting(false)
    }
  }

  const getWeekLabel = (weekId: number) => {
    const week = weeks.find(w => w.id === weekId)
    return week ? week.label : `Week ID: ${weekId}`
  }

  const getImportTypeLabel = (activity: RecentActivity) => {
    if (activity.importType) {
      switch (activity.importType) {
        case 'player-pool':
          return 'Import Player Pool'
        case 'projections':
          return 'Import Projections'
        case 'odds-api':
          return 'Odds-API Integration'
        default:
          return 'Import'
      }
    }
    
    // Fallback for existing activities without importType
    if (activity.draftGroup === 'Odds-API') {
      return 'Odds-API Integration'
    }
    if (activity.fileType === 'CSV') {
      return 'Import Projections'
    }
    return 'Import Player Pool'
  }

  const handleProjectionImportComplete = (importData: {
    filename: string;
    timestamp: string;
    failedImports: number;
    successfulImports: number;
    projectionSource: string;
    week: number;
  }) => {
    const newHistoryItem: RecentActivity = {
      id: Date.now(),
      timestamp: importData.timestamp,
      action: 'import',
      fileType: 'CSV',
      fileName: importData.filename,
      week_id: importData.week,
      draftGroup: importData.projectionSource,
      recordsAdded: importData.successfulImports,
      recordsUpdated: 0,
      recordsSkipped: importData.failedImports,
      errors: importData.failedImports > 0 ? [`${importData.failedImports} failed to match`] : [],
      user: null,
      details: null,
      importType: 'projections'
    }
    
    setHistory(prev => [newHistoryItem, ...prev])
  }

  const handleOddsApiImport = async (endpoint: string) => {
    if (!oddsApiKey.trim()) {
      alert('Please enter your Odds-API key')
      return
    }

    // Validate required parameters for Events endpoint
    if (endpoint === 'events' && (!oddsStartTime || !oddsEndTime)) {
      alert('Please configure Start Time and End Time for the Events endpoint')
      return
    }

    if (endpoint === 'events' && !selectedWeekId) {
      alert('Please select a week for the Events endpoint')
      return
    }

    // Validate required parameters for Odds endpoint
    if (endpoint === 'odds' && (!oddsStartTime || !oddsEndTime)) {
      alert('Please configure Start Time and End Time for the Odds endpoint')
      return
    }

    if (endpoint === 'odds' && !selectedWeekId) {
      alert('Please select a week for the Odds endpoint')
      return
    }

    setIsImportingOdds(true)
    
    try {
      let apiUrl = ''
      let description = ''
      let sport = ''
      let requestBody: any = {
        api_key: oddsApiKey
      }
      
      switch (endpoint) {
        case 'participants':
          // Map sport selection to API format
          sport = oddsSport === 'NFL' ? 'americanfootball_nfl' : oddsSport
          apiUrl = `http://localhost:8000/api/odds-api/participants/${sport}`
          description = 'NFL team participants'
          break
        case 'player-props':
          // Map sport selection to API format
          sport = oddsSport === 'NFL' ? 'americanfootball_nfl' : oddsSport
          apiUrl = `http://localhost:8000/api/odds-api/player-props/${sport}`
          description = 'NFL player props'
          requestBody.week_id = selectedWeekId
          requestBody.regions = oddsRegion
          requestBody.markets = playerPropMarkets
          // event_id: either specific odds_api_gameid or 'All'
          requestBody.event_id = oddsGame || 'All'
          // bookmakers: allow 'all' or specific
          requestBody.bookmakers = oddsBookmakers
          break
        case 'events':
          // Map sport selection to API format
          sport = oddsSport === 'NFL' ? 'americanfootball_nfl' : oddsSport
          apiUrl = `http://localhost:8000/api/odds-api/events/${sport}`
          description = 'NFL games/events'
          
          // Add required parameters for events
          requestBody.week_id = selectedWeekId
          
          // Format times according to Odds-API requirements
          // Start Time: Midnight of the selected day (00:00:00Z)
          // End Time: 1 minute before midnight of the next day (23:59:00Z)
          if (oddsStartTime) {
            const startDate = new Date(oddsStartTime)
            startDate.setUTCHours(0, 0, 0, 0) // Set to midnight UTC
            requestBody.commence_time_from = startDate.toISOString().replace('.000Z', 'Z')
          }
          
          if (oddsEndTime) {
            const endDate = new Date(oddsEndTime)
            endDate.setUTCHours(23, 59, 0, 0) // Set to 23:59:00 UTC
            requestBody.commence_time_to = endDate.toISOString().replace('.000Z', 'Z')
          }
          requestBody.regions = oddsRegion
          requestBody.markets = oddsMarkets.join(',')
          // odds/date format not used for events
          requestBody.bookmakers = oddsBookmakers
          break
        case 'odds':
          // Map sport selection to API format
          sport = oddsSport === 'NFL' ? 'americanfootball_nfl' : oddsSport
          apiUrl = `http://localhost:8000/api/odds-api/odds/${sport}`
          description = 'NFL odds for current week'
          
          // Add required parameters for odds
          requestBody.week_id = selectedWeekId
          
          // Format times according to Odds-API requirements
          if (oddsStartTime) {
            const startDate = new Date(oddsStartTime)
            startDate.setUTCHours(0, 0, 0, 0) // Set to midnight UTC
            requestBody.commence_time_from = startDate.toISOString().replace('.000Z', 'Z')
          }
          
          if (oddsEndTime) {
            const endDate = new Date(oddsEndTime)
            endDate.setUTCHours(23, 59, 0, 0) // Set to 23:59:00 UTC
            requestBody.commence_time_to = endDate.toISOString().replace('.000Z', 'Z')
          }
          requestBody.regions = oddsRegion
          requestBody.markets = oddsMarkets.join(',')
          // odds/date format forced by backend for odds endpoint
          requestBody.bookmakers = oddsBookmakers
          break
        default:
          throw new Error('Unknown endpoint')
      }
      
      console.log(`Importing ${description} from Odds-API via backend`)
      console.log(`Backend API URL: ${apiUrl}`)
      console.log(`Request body:`, requestBody)
      
      // Make the API call to our backend
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `API request failed: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Process the API response
      console.log('Backend Odds-API Response:', data)
      
      let details = ''
      let recordsAdded = 0
      let recordsUpdated = 0
      
      if (endpoint === 'participants') {
        recordsAdded = data.teams_created || 0
        recordsUpdated = data.teams_updated || 0
        details = `${recordsAdded} teams created, ${recordsUpdated} teams updated from Odds-API`
        if (data.errors && data.errors.length > 0) {
          details += ` (${data.errors.length} errors)`
        }
      } else if (endpoint === 'events') {
        recordsAdded = data.games_created || 0
        recordsUpdated = data.games_updated || 0
        details = `${recordsAdded} games created, ${recordsUpdated} games updated from Odds-API`
        if (data.errors && data.errors.length > 0) {
          details += ` (${data.errors.length} errors)`
        }
      } else if (endpoint === 'odds') {
        recordsAdded = 0
        recordsUpdated = data.games_updated || 0
        details = `${recordsUpdated} games updated with odds data from Odds-API`
        if (data.errors && data.errors.length > 0) {
          details += ` (${data.errors.length} errors)`
        }
      } else if (endpoint === 'player-props') {
        recordsAdded = data.created || 0
        recordsUpdated = 0
        details = `${recordsAdded} player prop rows created across ${data.events_processed || 0} event(s)`
        if (data.unmatched_players && data.unmatched_players > 0) {
          details += ` (${data.unmatched_players} unmatched players logged)`
        }
      }
      
      const newHistoryItem: RecentActivity = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        action: 'import',
        fileType: 'API',
        fileName: `Odds-API ${endpoint}`,
        week_id: endpoint === 'events' ? selectedWeekId || 0 : 0,
        draftGroup: 'Odds-API',
        recordsAdded,
        recordsUpdated,
        recordsSkipped: 0,
        errors: data.errors || [],
        user: null,
        details: null,
        importType: 'odds-api'
      }
      
      setHistory(prev => [newHistoryItem, ...prev])
      
    } catch (error) {
      console.error('Odds-API import failed:', error)
      
      const errorHistoryItem: RecentActivity = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        action: 'import',
        fileType: 'API',
        fileName: `Odds-API ${endpoint}`,
        week_id: endpoint === 'events' ? selectedWeekId || 0 : 0,
        draftGroup: 'Odds-API',
        recordsAdded: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        user: null,
        details: null,
        importType: 'odds-api'
      }
      
      setHistory(prev => [errorHistoryItem, ...prev])
    } finally {
      setIsImportingOdds(false)
    }
  }

  const handleMarketChange = (marketId: string, checked: boolean) => {
    if (checked) {
      setOddsMarkets(prev => [...prev, marketId])
    } else {
      setOddsMarkets(prev => prev.filter(id => id !== marketId))
    }
  }

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Select date'
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2>Import Data</h2>
        <p className="text-muted-foreground">
          Import player data from DraftKings API, CSV projection files, or Odds-API integration
        </p>
      </div>

      {/* Import Tabs */}
      <Tabs defaultValue="import-pool" className="space-y-6" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="import-pool" className="gap-2">
            <Database className="w-4 h-4" />
            Import Player Pool
          </TabsTrigger>
          <TabsTrigger value="import-projections" className="gap-2">
            <FileText className="w-4 h-4" />
            Import Projections
          </TabsTrigger>
          <TabsTrigger value="odds-api" className="gap-2">
            <Globe className="w-4 h-4" />
            Odds-API Integration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import-pool">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Import Player Pool Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Import Player Pool Data
                </CardTitle>
                <CardDescription>
                  Fetch player pool data from DraftKings API using Draft Group numbers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Week Display */}
                <div className="space-y-2">
                  <Label>Import Week</Label>
                  <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                    <span className="text-sm font-medium">
                      {selectedWeek === "1" ? "Week 1" :
                       selectedWeek === "wc" ? "Wild Card" :
                       selectedWeek === "div" ? "Divisional" :
                       selectedWeek === "conf" ? "Conference Championship" :
                       selectedWeek === "sb" ? "Super Bowl" :
                       `Week ${selectedWeek}`}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Data will be imported for the selected week
                    </span>
                  </div>
                </div>

                {/* Draft Group Input */}
                <div className="space-y-2">
                  <Label htmlFor="draft-group">Draft Group</Label>
                  <Input
                    id="draft-group"
                    type="number"
                    placeholder="Enter Draft Group number"
                    value={draftGroup}
                    onChange={(e) => setDraftGroup(e.target.value)}
                  />
                </div>

                {/* Import Button */}
                <Button 
                  onClick={handleImportPlayerData}
                  disabled={isImporting || !draftGroup.trim()}
                  className="w-full gap-2"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Importing Player Data...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import Player Pool Data
                    </>
                  )}
                </Button>

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Player data will be fetched from DraftKings API using the Draft Group number for the selected week.
                  </AlertDescription>
                </Alert>

                {/* Draft Group ID Help */}
                <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span className="text-sm font-medium">How to find Draft Group ID</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    You can find the Draft Group ID by using the contest API with your contest ID:
                    <br />
                    <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">
                      https://api.draftkings.com/contests/v1/contests/[CONTEST_ID]?format=json
                    </code>
                    <br />
                    Look for the <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">draftGroupId</code> field in the response.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Help Card */}
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
        </TabsContent>

        <TabsContent value="import-projections">
          <ImportPlayerProjections onImportComplete={handleProjectionImportComplete} />
        </TabsContent>

        <TabsContent value="odds-api">
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
                {/* API Key */}
                <div className="space-y-2">
                  <Label htmlFor="odds-api-key">API Key</Label>
                  <Input
                    id="odds-api-key"
                    type="password"
                    placeholder="Enter your Odds-API key"
                    value={oddsApiKey}
                    onChange={(e) => setOddsApiKey(e.target.value)}
                  />
                </div>

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
                            {week.label} {week.status === 'Active' ? '(Active)' : ''}
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
                        <SelectItem value="draftkings">DraftKings</SelectItem>
                        <SelectItem value="fanduel">FanDuel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Markets */}
                <div className="space-y-3">
                  <Label>Markets</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {marketOptions.map((market) => (
                      <div key={market.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={market.id}
                          checked={oddsMarkets.includes(market.id)}
                          onCheckedChange={(checked) => handleMarketChange(market.id, checked as boolean)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor={market.id}
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

                {/* Game (Required for Player Props) */}
                <div className="space-y-2">
                  <Label>Game (Required for Player Props)</Label>
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

                {/* Player Prop Markets */}
                <div className="mt-2 space-y-2">
                  <Label>Player Prop Markets</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="player_pass_tds"
                        checked={playerPropMarkets.includes('player_pass_tds')}
                        onCheckedChange={(checked) => {
                          setPlayerPropMarkets((prev) => {
                            const exists = prev.includes('player_pass_tds')
                            if (checked && !exists) return [...prev, 'player_pass_tds']
                            if (!checked && exists) return prev.filter(m => m !== 'player_pass_tds')
                            return prev
                          })
                        }}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label htmlFor="player_pass_tds" className="text-sm font-medium leading-none">
                          Passing TDs
                        </label>
                        <p className="text-xs text-muted-foreground">Player passing touchdowns</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="player_pass_attempts"
                        checked={playerPropMarkets.includes('player_pass_attempts')}
                        onCheckedChange={(checked) => {
                          setPlayerPropMarkets((prev) => {
                            const exists = prev.includes('player_pass_attempts')
                            if (checked && !exists) return [...prev, 'player_pass_attempts']
                            if (!checked && exists) return prev.filter(m => m !== 'player_pass_attempts')
                            return prev
                          })
                        }}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label htmlFor="player_pass_attempts" className="text-sm font-medium leading-none">
                          Pass Attempts
                        </label>
                        <p className="text-xs text-muted-foreground">Player passing attempts</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="player_pass_completions"
                        checked={playerPropMarkets.includes('player_pass_completions')}
                        onCheckedChange={(checked) => {
                          setPlayerPropMarkets((prev) => {
                            const exists = prev.includes('player_pass_completions')
                            if (checked && !exists) return [...prev, 'player_pass_completions']
                            if (!checked && exists) return prev.filter(m => m !== 'player_pass_completions')
                            return prev
                          })
                        }}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label htmlFor="player_pass_completions" className="text-sm font-medium leading-none">
                          Pass Completions
                        </label>
                        <p className="text-xs text-muted-foreground">Player passing completions</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="player_pass_yds"
                        checked={playerPropMarkets.includes('player_pass_yds')}
                        onCheckedChange={(checked) => {
                          setPlayerPropMarkets((prev) => {
                            const exists = prev.includes('player_pass_yds')
                            if (checked && !exists) return [...prev, 'player_pass_yds']
                            if (!checked && exists) return prev.filter(m => m !== 'player_pass_yds')
                            return prev
                          })
                        }}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label htmlFor="player_pass_yds" className="text-sm font-medium leading-none">
                          Passing Yards
                        </label>
                        <p className="text-xs text-muted-foreground">Player passing yards</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2 opacity-50">
                      <Checkbox id="player_receptions" disabled />
                      <div className="grid gap-1.5 leading-none">
                        <label htmlFor="player_receptions" className="text-sm font-medium leading-none">
                          Receptions (Coming Soon)
                        </label>
                        <p className="text-xs text-muted-foreground">Player receptions</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2 opacity-50">
                      <Checkbox id="player_rec_tds" disabled />
                      <div className="grid gap-1.5 leading-none">
                        <label htmlFor="player_rec_tds" className="text-sm font-medium leading-none">
                          Reception TDs (Coming Soon)
                        </label>
                        <p className="text-xs text-muted-foreground">Player reception touchdowns</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2 opacity-50">
                      <Checkbox id="player_rec_yds" disabled />
                      <div className="grid gap-1.5 leading-none">
                        <label htmlFor="player_rec_yds" className="text-sm font-medium leading-none">
                          Reception Yards (Coming Soon)
                        </label>
                        <p className="text-xs text-muted-foreground">Player reception yards</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2 opacity-50">
                      <Checkbox id="player_rush_atts" disabled />
                      <div className="grid gap-1.5 leading-none">
                        <label htmlFor="player_rush_atts" className="text-sm font-medium leading-none">
                          Rush Attempts (Coming Soon)
                        </label>
                        <p className="text-xs text-muted-foreground">Player rushing attempts</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Days From */}
                <div className="mt-2 space-y-2">
                  <Label>Days From</Label>
                  <Select value={oddsDaysFrom} onValueChange={setOddsDaysFrom}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select days" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Day</SelectItem>
                      <SelectItem value="2">2 Days</SelectItem>
                      <SelectItem value="3">3 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Odds/Date format configuration removed; backend forces american/iso */}

                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    These parameters will be applied to all Odds-API endpoint calls. Get your free API key from the-odds-api.com.
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
                    disabled={isImportingOdds || !oddsApiKey.trim()}
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
                    disabled={isImportingOdds || !oddsApiKey.trim() || !oddsStartTime || !oddsEndTime || !selectedWeekId}
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
                        <Badge variant="secondary" className="text-xs">
                          New
                        </Badge>
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Import NFL odds data to update game records with money lines, spreads, and totals
                      </p>
                    </div>
                    <Badge variant="outline">Odds</Badge>
                  </div>
                  <Button 
                    onClick={() => handleOddsApiImport('odds')}
                    disabled={isImportingOdds || !oddsApiKey.trim() || !oddsStartTime || !oddsEndTime || !selectedWeekId}
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

                {/* Placeholder for future endpoints */}
                <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Player Props</h4>
                      <p className="text-sm text-muted-foreground">
                        Import player prop bets (currently Passing TDs). Requires Week and optional Game selection.
                      </p>
                    </div>
                    <Badge variant="outline">Player Props</Badge>
                  </div>
                  <Button
                    onClick={() => handleOddsApiImport('player-props')}
                    disabled={isImportingOdds || !oddsApiKey.trim() || !selectedWeekId}
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
                    Required parameters: API Key, Sport, Player Prop Markets, Game (Event ID) or All, Region
                    <br />
                    This endpoint pulls player prop bets for all bookmakers.
                  </div>
                </div>

                <Alert>
                  <Globe className="h-4 w-4" />
                  <AlertDescription>
                    Configure your parameters above, then use the endpoints to import NFL team data and games from the Odds-API.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Import Activity</CardTitle>
          <CardDescription>
            {activeTab === 'import-pool' && 'Your recent player pool imports'}
            {activeTab === 'import-projections' && 'Your recent projection imports'}
            {activeTab === 'odds-api' && 'Your recent Odds-API imports'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(() => {
              // Filter activities based on current tab
              const filteredHistory = history.filter(item => {
                if (item.action !== 'import') return false
                
                switch (activeTab) {
                  case 'import-pool':
                    return item.importType === 'player-pool' || (!item.importType && item.fileType === 'API' && item.draftGroup !== 'Odds-API')
                  case 'import-projections':
                    return item.importType === 'projections' || (!item.importType && item.fileType === 'CSV')
                  case 'odds-api':
                    return item.importType === 'odds-api' || (!item.importType && item.draftGroup === 'Odds-API')
                  default:
                    return true
                }
              })
              
              if (filteredHistory.length === 0) {
                return (
                  <div className="text-center text-gray-500 py-8">
                    No recent {activeTab === 'import-pool' ? 'player pool' : activeTab === 'import-projections' ? 'projection' : 'Odds-API'} import activity found
                  </div>
                )
              }
              
              return filteredHistory.map((item, index) => (
                <div key={`${item.draftGroup}-${item.id}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {(item.errors && item.errors.length > 0) ? (
                      <XCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{getImportTypeLabel(item)}</span>
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {item.fileType}
                        </span>
                        {item.week_id > 0 && (
                          <span className="text-xs bg-muted px-2 py-1 rounded">
                            {getWeekLabel(item.week_id)}
                          </span>
                        )}
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {item.draftGroup}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          (item.errors && item.errors.length > 0) ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
                        }`}>
                          {(item.errors && item.errors.length > 0) ? 'Error' : 'Success'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.recordsAdded} added, {item.recordsUpdated} updated, {item.recordsSkipped} skipped
                      </p>
                      {item.errors && item.errors.length > 0 && (
                        <p className="text-sm text-red-600">
                          Errors: {item.errors.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDetailsActivity(item)
                        setIsDetailsOpen(true)
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Details</DialogTitle>
            <DialogDescription>
              Metadata and payload for troubleshooting.
            </DialogDescription>
          </DialogHeader>

          {detailsActivity && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Action:</span> {detailsActivity.action}
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span> {detailsActivity.fileType}
                </div>
                <div>
                  <span className="text-muted-foreground">Week:</span> {detailsActivity.week_id > 0 ? getWeekLabel(detailsActivity.week_id) : '—'}
                </div>
                <div>
                  <span className="text-muted-foreground">Draft Group:</span> {detailsActivity.draftGroup}
                </div>
                <div>
                  <span className="text-muted-foreground">Added:</span> {detailsActivity.recordsAdded}
                </div>
                <div>
                  <span className="text-muted-foreground">Updated:</span> {detailsActivity.recordsUpdated}
                </div>
                <div>
                  <span className="text-muted-foreground">Skipped:</span> {detailsActivity.recordsSkipped}
                </div>
                <div>
                  <span className="text-muted-foreground">Timestamp:</span> {new Date(detailsActivity.timestamp).toLocaleString()}
                </div>
              </div>

              {detailsActivity.errors && detailsActivity.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Errors</div>
                  <ul className="list-disc list-inside text-sm text-red-600">
                    {detailsActivity.errors.map((e, idx) => (
                      <li key={idx}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-sm font-medium">Details</div>
                <div className="rounded-md border bg-muted p-2 max-h-80 overflow-auto">
                  <pre className="text-xs whitespace-pre-wrap">
{JSON.stringify(detailsActivity.details, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
