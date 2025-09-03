import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Label } from './ui/label'
import { Download, FileText, FileJson, CheckCircle, Eye, RefreshCw } from 'lucide-react'

// Types for API responses
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

export function ExportManager() {
  const [history, setHistory] = useState<RecentActivity[]>([])
  const [weeks, setWeeks] = useState<Week[]>([])
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null)
  const [isExporting, setIsExporting] = useState(false)

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
      
      // Sort by timestamp (most recent first) and limit to 20
      const sortedActivities = allActivities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 20)
      
      setHistory(sortedActivities)
    } catch (error) {
      console.error('Failed to fetch recent activity:', error)
    }
  }

  const getWeekLabel = (weekId: number) => {
    const week = weeks.find(w => w.id === weekId)
    return week ? week.label : `Week ID: ${weekId}`
  }

  const handleExportCSV = async () => {
    setIsExporting(true)
    try {
      // TODO: Implement CSV export functionality
      console.log('Exporting CSV...')
      // Add actual export logic here
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportJSON = async () => {
    setIsExporting(true)
    try {
      // TODO: Implement JSON export functionality
      console.log('Exporting JSON...')
      // Add actual export logic here
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportCurrentWeek = async () => {
    if (!selectedWeekId) {
      alert('Please select a week')
      return
    }
    
    setIsExporting(true)
    try {
      // TODO: Implement current week export functionality
      console.log(`Exporting current week: ${selectedWeekId}`)
      // Add actual export logic here
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportAllData = async () => {
    setIsExporting(true)
    try {
      // TODO: Implement all data export functionality
      console.log('Exporting all data...')
      // Add actual export logic here
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportSelectedWeek = async () => {
    if (!selectedWeekId) {
      alert('Please select a week')
      return
    }
    
    setIsExporting(true)
    try {
      // TODO: Implement selected week export functionality
      console.log(`Exporting selected week: ${selectedWeekId}`)
      // Add actual export logic here
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2>Export Data</h2>
        <p className="text-muted-foreground">
          Download lineups and data in your preferred format
        </p>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Format Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Export Format
            </CardTitle>
            <CardDescription>
              Choose your preferred export format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={handleExportCSV}
                disabled={isExporting}
                className="gap-2"
              >
                {isExporting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                Export CSV
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExportJSON}
                disabled={isExporting}
                className="gap-2"
              >
                {isExporting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <FileJson className="w-4 h-4" />
                )}
                Export JSON
              </Button>
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                CSV files are ready for DraftKings contests. JSON files include complete data with projections and settings.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Week Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Export Scope</CardTitle>
            <CardDescription>
              Select what data to export
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Week</Label>
              <Select 
                value={selectedWeekId?.toString() || ''} 
                onValueChange={(value) => setSelectedWeekId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a week" />
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

            <div className="space-y-2">
              <Button 
                variant="outline" 
                onClick={handleExportCurrentWeek}
                disabled={isExporting || !selectedWeekId}
                className="w-full gap-2"
              >
                {isExporting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Export Current Week
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExportSelectedWeek}
                disabled={isExporting || !selectedWeekId}
                className="w-full gap-2"
              >
                {isExporting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Export Selected Week
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExportAllData}
                disabled={isExporting}
                className="w-full gap-2"
              >
                {isExporting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Export All Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Export Activity</CardTitle>
          <CardDescription>Your recent export operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {history.filter(item => item.action === 'export').length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No recent export activity found
              </div>
            ) : (
              history
                .filter(item => item.action === 'export')
                .map((item, index) => (
                  <div key={`${item.draftGroup}-${item.id}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {(item.errors && item.errors.length > 0) ? (
                        <CheckCircle className="w-4 h-4 text-red-600" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.fileName || `Export for ${getWeekLabel(item.week_id)}`}</span>
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
