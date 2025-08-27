import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Upload, Download, FileText, CheckCircle, XCircle, AlertTriangle, Eye, FileJson, RefreshCw } from 'lucide-react'

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
}

export function ImportExportManager() {
  const [history, setHistory] = useState<RecentActivity[]>([])
  const [weeks, setWeeks] = useState<Week[]>([])
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null)
  const [draftGroup, setDraftGroup] = useState<string>('')
  const [isImporting, setIsImporting] = useState(false)
  const [lastImportResult, setLastImportResult] = useState<DraftKingsImportResponse | null>(null)

  useEffect(() => {
    fetchWeeks()
    fetchRecentActivity()
  }, [])

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
      const response = await fetch('http://localhost:8000/api/draftkings/activity?limit=20')
      if (response.ok) {
        const data = await response.json()
        setHistory(data)
      }
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

    } catch (error) {
      console.error('Import failed:', error)
      setLastImportResult({ // Set error result for display
        players_added: 0, players_updated: 0, entries_added: 0, entries_updated: 0, entries_skipped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
        total_processed: 0
      })
    } finally {
      setIsImporting(false)
    }
  }

  const getWeekLabel = (weekId: number) => {
    const week = weeks.find(w => w.id === weekId)
    return week ? week.label : `Week ID: ${weekId}`
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2>Import/Export</h2>
        <p className="text-muted-foreground">
          Import player pool data from DraftKings API and export lineups in CSV or JSON format
        </p>
      </div>

      {/* Import Result Summary */}
      {lastImportResult && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 h-5 text-blue-600" />
              Import Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{lastImportResult.players_added}</div>
                <div className="text-sm text-muted-foreground">Players Added</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{lastImportResult.players_updated}</div>
                <div className="text-sm text-muted-foreground">Players Updated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{lastImportResult.entries_added}</div>
                <div className="text-sm text-muted-foreground">Entries Added</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{lastImportResult.entries_updated}</div>
                <div className="text-sm text-muted-foreground">Entries Updated</div>
              </div>
            </div>
            
            {lastImportResult.errors.length > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription>
                  <strong>Errors encountered:</strong>
                  <ul className="mt-2 list-disc list-inside">
                    {lastImportResult.errors.map((error, index) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Section */}
        <div className="space-y-6">
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
              {/* Week Selection */}
              <div className="space-y-2">
                <Label htmlFor="week-select">Import Week</Label>
                <Select value={selectedWeekId?.toString() || ''} onValueChange={(value) => setSelectedWeekId(parseInt(value))}>
                  <SelectTrigger id="week-select">
                    <SelectValue placeholder="Select week" />
                  </SelectTrigger>
                  <SelectContent>
                    {weeks.map((week) => (
                      <SelectItem key={week.id} value={week.id.toString()}>
                        {week.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                disabled={isImporting || !selectedWeekId || !draftGroup.trim()}
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
        </div>

        {/* Export Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export Data
              </CardTitle>
              <CardDescription>
                Download lineups and data in your preferred format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button className="gap-2">
                    <FileText className="w-4 h-4" />
                    Export CSV
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <FileJson className="w-4 h-4" />
                    Export JSON
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Button variant="outline" className="w-full gap-2">
                    <Download className="w-4 h-4" />
                    Export Current Week
                  </Button>
                  <Button variant="outline" className="w-full gap-2">
                    <Download className="w-4 h-4" />
                    Export All Data
                  </Button>
                  <Button variant="outline" className="w-full gap-2">
                    <Download className="w-4 h-4" />
                    Export Selected Week...
                  </Button>
                </div>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  CSV files are ready for DraftKings contests. JSON files include complete data with projections and settings.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Import/Export History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your recent import and export operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No recent activity found
              </div>
            ) : (
              history.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {item.errors.length > 0 ? (
                      <XCircle className="w-4 h-4 text-red-600" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.fileName || `${item.action} for ${getWeekLabel(item.week_id)}`}</span>
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {item.fileType}
                        </span>
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {getWeekLabel(item.week_id)}
                        </span>
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {item.draftGroup}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          item.errors.length > 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
                        }`}>
                          {item.errors.length > 0 ? 'Error' : 'Success'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.recordsAdded} added, {item.recordsUpdated} updated, {item.recordsSkipped} skipped
                      </p>
                      {item.errors.length > 0 && (
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
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


