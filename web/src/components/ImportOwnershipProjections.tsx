import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { Upload, FileText, RefreshCw, CheckCircle, XCircle, Eye, Calendar, Tag } from 'lucide-react'
import { buildApiUrl } from '@/config/api'
import { OwnershipImportResultDialog } from './OwnershipImportResultDialog'

interface OwnershipImportResponse {
  total_processed: number
  successful_matches: number
  failed_matches: number
  projections_created: number
  projections_updated: number
  player_pool_updated: number
  errors: string[]
  unmatched_players: Array<{
    csv_data: {
      name: string
      ownership: number
    }
    match_confidence: string
    possible_matches?: Array<{
      name: string
      position: string
      team: string
    }>
  }>
}

interface Week {
  id: number
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
  user_name: string | null
  details: unknown
  importType?: 'player-pool' | 'projections' | 'odds-api' | 'actuals' | 'ownership'
}

interface ImportOwnershipProjectionsProps {
  onImportComplete?: (data: {
    filename: string
    timestamp: string
    failedImports: number
    successfulImports: number
    projectionSource: string
    week: number
  }) => void
}

export function ImportOwnershipProjections({ onImportComplete }: ImportOwnershipProjectionsProps) {
  const router = useRouter()
  const [weeks, setWeeks] = useState<Week[]>([])
  const [selectedWeek, setSelectedWeek] = useState<string>('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [projectionSource, setProjectionSource] = useState<string>('Rotowire')
  const [history, setHistory] = useState<RecentActivity[]>([])
  
  // Import result dialog state
  const [importResult, setImportResult] = useState<{
    success: boolean
    data?: OwnershipImportResponse
    error?: string
  } | null>(null)
  const [showResultDialog, setShowResultDialog] = useState(false)

  // Fetch weeks and history on component mount
  useEffect(() => {
    fetchWeeks()
    fetchRecentActivity()
  }, [])

  const fetchWeeks = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/projections/weeks'))
      if (response.ok) {
        const data = await response.json()
        setWeeks(data.weeks)
        if (data.weeks.length > 0) {
          setSelectedWeek(data.weeks[0].id.toString())
        }
      }
    } catch (error) {
      console.error('Failed to fetch weeks:', error)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      // Fetch from all activity endpoints
      const [draftkingsResponse, projectionsResponse, oddsApiResponse] = await Promise.all([
        fetch(buildApiUrl('/api/draftkings/activity?limit=20')),
        fetch(buildApiUrl('/api/projections/activity?limit=20')),
        fetch(buildApiUrl('/api/odds-api/activity?limit=20'))
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
      
      if (oddsApiResponse.ok) {
        const oddsApiData = await oddsApiResponse.json()
        allActivities.push(...oddsApiData)
      }
      
      // Add import types and sort by timestamp (most recent first)
      const sortedActivities = allActivities
        .map(activity => ({
          ...activity,
          importType: activity.importType || (
            activity.fileName?.startsWith('odds-api:') ? 'odds-api' :
            activity.draftGroup === 'Odds-API' ? 'odds-api' :
            activity.draftGroup === 'OWNERSHIP_IMPORT' ? 'ownership' :
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
    }
  }

  const handleImport = async () => {
    if (!csvFile || !selectedWeek) {
      console.error('Missing required data for processing')
      alert('Please select a CSV file and target week')
      return
    }
    
    console.log('Starting ownership import:', {
      fileName: csvFile.name,
      weekId: selectedWeek,
      source: projectionSource
    })
    
    setIsProcessing(true)
    setImportResult(null)
    
    try {
      const formData = new FormData()
      formData.append('file', csvFile)
      formData.append('week_id', selectedWeek.toString())
      formData.append('projection_source', projectionSource || 'Rotowire')
      
      const apiUrl = buildApiUrl('/api/projections/import-ownership')
      console.log('Making request to:', apiUrl)
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
      })
      
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = typeof errorData.detail === 'string' 
          ? errorData.detail 
          : errorData.detail?.message || errorData.detail?.error || 'Import failed'
        
        setImportResult({
          success: false,
          error: errorMessage
        })
        setShowResultDialog(true)
        return
      }
      
      const result = await response.json() as OwnershipImportResponse
      console.log('Backend import result:', result)
      
      setImportResult({
        success: true,
        data: result
      })
      setShowResultDialog(true)
      
      console.log('Import completed successfully, showing result dialog')
      
      // Call the callback for activity tracking
      if (onImportComplete) {
        onImportComplete({
          filename: csvFile.name,
          timestamp: new Date().toISOString(),
          failedImports: result.failed_matches,
          successfulImports: result.successful_matches,
          projectionSource: projectionSource || 'Rotowire',
          week: parseInt(selectedWeek)
        })
      }
      
      // Refresh activity history
      fetchRecentActivity()
      
    } catch (error) {
      console.error('Error during processing:', error)
      setImportResult({
        success: false,
        error: `Network error during import: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
      setShowResultDialog(true)
    } finally {
      setIsProcessing(false)
    }
  }

  const selectedWeekData = weeks.find(w => w.id.toString() === selectedWeek)

  return (
    <div className="p-6 space-y-6">
      {/* Import Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Import Ownership Projections
          </CardTitle>
          <CardDescription>
            Import weekly ownership projections from CSV file with automatic player matching.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Target Week Selection */}
          <div className="space-y-2">
            <Label htmlFor="week-select">Target Week</Label>
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger id="week-select">
                <SelectValue placeholder="Select a week" />
              </SelectTrigger>
              <SelectContent>
                {weeks.map((week) => (
                  <SelectItem key={week.id} value={week.id.toString()}>
                    Week {week.week_number} ({week.year}) - {week.status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* CSV File Upload */}
          <div className="space-y-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <div className="flex items-center gap-4">
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="flex-1"
              />
              <div className="text-sm text-muted-foreground">
                {csvFile ? csvFile.name : 'No file chosen'}
              </div>
            </div>
          </div>

          {/* Projection Source */}
          <div className="space-y-2">
            <Label htmlFor="projection-source">Projection Source</Label>
            <Input
              id="projection-source"
              type="text"
              placeholder="Enter projection source name (e.g., Rotowire, DFS, HFRC, etc.)"
              value={projectionSource}
              onChange={(e) => setProjectionSource(e.target.value)}
            />
          </div>

          {/* Instructions */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Expected CSV format:</p>
                <p className="text-sm">
                  <code>PLAYER,POS,TEAM,OPP,ML,O/U,SPRD,TM/P,SAL,FPTS,VAL,RST%</code>
                </p>
                <p className="text-sm">
                  <strong>Example:</strong> <code>Justin Fields,QB,NYJ,DAL,116,46.50,2.50,22.00,5600,20.23,3.6,32.73</code>
                </p>
                <p className="text-sm">
                  The importer will only use the <strong>PLAYER</strong> and <strong>RST%</strong> columns. 
                  All other columns will be ignored.
                </p>
                <p className="text-sm">
                  <strong>Download CSV files:</strong> Visit winwithodds.com to download ownership CSV files.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={!csvFile || !selectedWeek || isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import Ownership Projections
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Import Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Import Activity</CardTitle>
          <CardDescription>Your recent projection imports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No recent import activity
              </div>
            ) : (
              history.map((item, index) => (
                <div key={`${item.id}-${item.timestamp}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {item.recordsSkipped > 0 ? (
                      <XCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.fileName || 'Unknown File'}</span>
                        <Badge variant="outline" className="text-xs">
                          {item.week_id}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {item.draftGroup}
                        </Badge>
                        <Badge 
                          variant={item.recordsSkipped > 0 ? "destructive" : "default"}
                          className="text-xs"
                        >
                          {item.recordsSkipped > 0 ? 'Partial Success' : 'Success'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.recordsAdded} added, {item.recordsUpdated} updated, {item.recordsSkipped} skipped
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

      {/* Import Result Dialog */}
      {importResult && (
        <OwnershipImportResultDialog
          isOpen={showResultDialog}
          onClose={() => setShowResultDialog(false)}
          result={importResult.data}
          error={importResult.error}
          filename={csvFile?.name || 'Unknown'}
          week={selectedWeekData ? `Week ${selectedWeekData.week_number} (${selectedWeekData.year})` : 'Unknown'}
          source={projectionSource || 'Rotowire'}
        />
      )}
    </div>
  )
}
