"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Alert, AlertDescription } from './ui/alert'
import { Progress } from './ui/progress'
import { Badge } from './ui/badge'
import { FileText, RefreshCw, Upload, Users, CheckCircle, XCircle, Clock } from 'lucide-react'
import { buildApiUrl } from '@/config/api'

interface Week {
  id: number
  label: string
  week_number: number
  year: number
  status: string
}

interface StagedContestRow {
  contest_id: number
  week_id: number
  sport_code: string
  game_type_code: string
  lineup_id?: string | null
  contest_description?: string
  contest_opponent?: string
  contest_date_utc: string
  contest_place?: number
  contest_points?: number
  winnings_non_ticket?: number
  winnings_ticket?: number
  contest_entries: number
  places_paid: number
  entry_fee_usd: number
  prize_pool_usd: number
}

interface Lineup {
  id: string
  name: string
  week_id: number
  status: string
}

interface OpponentRosterImportStatus {
  import_id: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  message: string
  progress?: {
    total: number
    processed: number
    successful: number
    failed: number
  }
  results?: OpponentRosterResult[]
  created_at: string
  updated_at: string
}

interface OpponentRosterResult {
  contest_id: string
  opponent_username: string
  success: boolean
  message: string
  fantasy_points?: number
  roster_data?: any
}

interface H2HContest {
  contest_id: string
  draft_group_id: number
  opponent_username: string
  opponent_entry_key: string
  opponent_fantasy_points: number
  opponent_rank: number
}

export function ImportContests() {
  const router = useRouter()
  const [weeks, setWeeks] = useState<Week[]>([])
  const [selectedWeek, setSelectedWeek] = useState<string>('')
  const [lineups, setLineups] = useState<Lineup[]>([])
  const [selectedLineup, setSelectedLineup] = useState<string>('none')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [parsedCount, setParsedCount] = useState<number>(0)
  const [isParsing, setIsParsing] = useState(false)
  
  // Opponent Roster Import state
  const [h2hContests, setH2hContests] = useState<H2HContest[]>([])
  const [isLoadingContests, setIsLoadingContests] = useState(false)
  const [importStatus, setImportStatus] = useState<OpponentRosterImportStatus | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [maxContests, setMaxContests] = useState<number>(50)
  const [forceRefresh, setForceRefresh] = useState(false)

  useEffect(() => {
    fetchWeeks()
  }, [])

  useEffect(() => {
    if (selectedWeek) {
      fetchLineups(selectedWeek)
    }
  }, [selectedWeek])

  const fetchWeeks = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/contests/weeks'))
      if (response.ok) {
        const data = await response.json()
        setWeeks(data.weeks)
        if (data.weeks.length > 0) {
          // Find the Active week first, fallback to first week if no Active week
          const activeWeek = data.weeks.find((week: Week) => week.status === 'Active')
          const defaultWeek = activeWeek || data.weeks[0]
          setSelectedWeek(defaultWeek.id.toString())
        }
      }
    } catch (e) {
      console.error('Failed to fetch weeks', e)
    }
  }

  const fetchLineups = async (weekId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/lineups?week_id=${weekId}&status=submitted&limit=1000`)
      if (response.ok) {
        const data = await response.json()
        setLineups(data.lineups || [])
        // Reset selected lineup when week changes
        setSelectedLineup('none')
      } else {
        setLineups([])
        setSelectedLineup('none')
      }
    } catch (e) {
      console.error('Failed to fetch lineups', e)
      setLineups([])
      setSelectedLineup('none')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
    }
  }

  const handleProcess = async () => {
    if (!csvFile || !selectedWeek) return
    setIsParsing(true)
    try {
      const form = new FormData()
      form.append('file', csvFile)
      form.append('week_id', selectedWeek)
      if (selectedLineup && selectedLineup !== 'none') {
        form.append('default_lineup_id', selectedLineup)
      }

      const res = await fetch('http://localhost:8000/api/contests/parse', {
        method: 'POST',
        body: form,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Failed to parse contests CSV')
      }
      const data = await res.json()
      setParsedCount(data.count)

      sessionStorage.setItem('contestImportReview', JSON.stringify({
        week_id: selectedWeek,
        filename: csvFile.name,
        rows: data.staged,
      }))
      router.push('/import/contests/review')
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Failed to parse CSV')
    } finally {
      setIsParsing(false)
    }
  }

  const getWeekLabel = (week: Week) => `Week ${week.week_number} (${week.year}) - ${week.status}`

  // Opponent Roster Import functions
  const fetchH2HContests = async () => {
    if (!selectedWeek) return
    
    setIsLoadingContests(true)
    try {
      const response = await fetch(buildApiUrl(`/api/import-opponent-roster/contests/week${selectedWeek}`))
      if (response.ok) {
        const data = await response.json()
        setH2hContests(data.contests || [])
      } else {
        setH2hContests([])
      }
    } catch (e) {
      console.error('Failed to fetch H2H contests', e)
      setH2hContests([])
    } finally {
      setIsLoadingContests(false)
    }
  }

  const startOpponentRosterImport = async () => {
    if (!selectedWeek) return
    
    setIsImporting(true)
    try {
      const response = await fetch(buildApiUrl('/api/import-opponent-roster/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week_id: `week${selectedWeek}`,
          max_contests: maxContests,
          force_refresh: forceRefresh,
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setImportStatus({
          import_id: data.import_id,
          status: 'pending',
          message: data.message,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        
        // Start polling for status updates
        pollImportStatus(data.import_id)
      } else {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.detail || 'Failed to start import')
      }
    } catch (e) {
      console.error('Failed to start opponent roster import', e)
      alert(e instanceof Error ? e.message : 'Failed to start import')
    } finally {
      setIsImporting(false)
    }
  }

  const pollImportStatus = async (importId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(buildApiUrl(`/api/import-opponent-roster/status/${importId}`))
        if (response.ok) {
          const status = await response.json()
          setImportStatus(status)
          
          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(pollInterval)
          }
        }
      } catch (e) {
        console.error('Failed to poll import status', e)
        clearInterval(pollInterval)
      }
    }, 2000) // Poll every 2 seconds
    
    // Clear interval after 5 minutes to prevent infinite polling
    setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'in_progress':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const getVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
      switch (status) {
        case 'pending':
          return 'outline'
        case 'in_progress':
          return 'default'
        case 'completed':
          return 'default'
        case 'failed':
          return 'destructive'
        default:
          return 'outline'
      }
    }
    
    return (
      <Badge variant={getVariant(status)} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Import Contests
          </CardTitle>
          <CardDescription>
            Import DraftKings contest results from CSV, review all rows, and save
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Week Selection */}
          <div className="space-y-2">
            <Label>Target Week</Label>
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger>
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent>
                {weeks.map((w) => (
                  <SelectItem key={w.id} value={w.id.toString()}>
                    {getWeekLabel(w)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Default Lineup Selection */}
          <div className="space-y-2">
            <Label>Default Lineup (Optional)</Label>
            <Select value={selectedLineup} onValueChange={setSelectedLineup}>
              <SelectTrigger>
                <SelectValue placeholder="Select a submitted lineup" />
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
            {lineups.length === 0 && selectedWeek && (
              <div className="text-sm text-muted-foreground">
                No submitted lineups found for this week
              </div>
            )}
          </div>

          {/* File Selection */}
          <div className="space-y-2">
            <Label>CSV File</Label>
            <Input type="file" accept=".csv" onChange={handleFileSelect} className="cursor-pointer" />
            {csvFile && (
              <div className="text-sm text-muted-foreground">Selected: {csvFile.name}</div>
            )}
          </div>

          <Alert>
            <AlertDescription>
              Upload the DraftKings contest results CSV. All rows will be staged for review and editing before saving.
            </AlertDescription>
          </Alert>

          <Button onClick={handleProcess} disabled={!csvFile || !selectedWeek || isParsing} className="w-full gap-2">
            {isParsing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Parsing CSV...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Process & Review Contests
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Import Opponent Roster Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Import Opponent Roster
          </CardTitle>
          <CardDescription>
            Import opponent roster data from H2H contests for the selected week
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Week Selection (reused from above) */}
          <div className="space-y-2">
            <Label>Target Week</Label>
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger>
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent>
                {weeks.map((w) => (
                  <SelectItem key={w.id} value={w.id.toString()}>
                    {getWeekLabel(w)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* H2H Contests Preview */}
          {selectedWeek && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>H2H Contests Preview</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchH2HContests}
                  disabled={isLoadingContests}
                  className="gap-2"
                >
                  {isLoadingContests ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  Refresh
                </Button>
              </div>
              
              {h2hContests.length > 0 ? (
                <div className="text-sm text-muted-foreground">
                  Found {h2hContests.length} H2H contests for Week {selectedWeek}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No H2H contests found. Click Refresh to check.
                </div>
              )}
            </div>
          )}

          {/* Import Options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max Contests</Label>
              <Input
                type="number"
                value={maxContests}
                onChange={(e) => setMaxContests(parseInt(e.target.value) || 50)}
                min="1"
                max="100"
              />
            </div>
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="force-refresh"
                  checked={forceRefresh}
                  onChange={(e) => setForceRefresh(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="force-refresh" className="text-sm">
                  Force refresh existing data
                </Label>
              </div>
            </div>
          </div>

          {/* Import Status */}
          {importStatus && (
            <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="font-medium">Import Status</span>
                {getStatusBadge(importStatus.status)}
              </div>
              
              <div className="text-sm text-muted-foreground">
                {importStatus.message}
              </div>

              {/* Progress Bar */}
              {importStatus.progress && importStatus.status === 'in_progress' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{importStatus.progress.processed} / {importStatus.progress.total}</span>
                  </div>
                  <Progress 
                    value={(importStatus.progress.processed / importStatus.progress.total) * 100} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>✅ {importStatus.progress.successful} successful</span>
                    <span>❌ {importStatus.progress.failed} failed</span>
                  </div>
                </div>
              )}

              {/* Results Summary */}
              {importStatus.results && importStatus.status === 'completed' && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Results Summary:</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-green-600">
                      ✅ {importStatus.results.filter(r => r.success).length} successful
                    </div>
                    <div className="text-red-600">
                      ❌ {importStatus.results.filter(r => !r.success).length} failed
                    </div>
                    <div className="text-muted-foreground">
                      📊 {importStatus.results.length} total
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <Alert>
            <AlertDescription>
              This will fetch opponent roster data from DraftKings H2H contests for the selected week. 
              The process runs in the background and may take a few minutes to complete.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={startOpponentRosterImport} 
            disabled={!selectedWeek || isImporting || importStatus?.status === 'in_progress'}
            className="w-full gap-2"
          >
            {isImporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Starting Import...
              </>
            ) : importStatus?.status === 'in_progress' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Import in Progress...
              </>
            ) : (
              <>
                <Users className="w-4 h-4" />
                Import Opponent Rosters
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
