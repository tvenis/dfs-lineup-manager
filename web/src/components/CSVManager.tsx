import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, Download, FileText, CheckCircle, XCircle, AlertTriangle, Eye, Loader2 } from 'lucide-react'
import { CSVImportService, ImportResult } from '@/lib/csvService'

// Mock import/export history
const mockHistory = [
  {
    id: 1,
    type: 'import',
    filename: 'DKSalaries_Week1.csv',
    timestamp: new Date('2024-01-07T09:30:00'),
    status: 'success',
    details: '156 players imported successfully',
    week: 'Week 1'
  },
  {
    id: 2,
    type: 'export',
    filename: 'MyLineups_Week1.csv',
    timestamp: new Date('2024-01-07T14:20:00'),
    status: 'success',
    details: '3 lineups exported in DraftKings format',
    week: 'Week 1'
  },
  {
    id: 3,
    type: 'import',
    filename: 'DKSalaries_Week2.csv',
    timestamp: new Date('2024-01-14T08:45:00'),
    status: 'error',
    details: 'Invalid file format - missing required columns',
    week: 'Week 2'
  }
]

const csvInstructions = {
  import: {
    title: 'Player Pool Import Format',
    description: 'Import DraftKings salary files with the following required columns:',
    columns: [
      { name: 'Name', description: 'Player full name' },
      { name: 'Position', description: 'Player position (QB, RB, WR, TE, DST)' },
      { name: 'Salary', description: 'DraftKings salary amount' },
      { name: 'TeamAbbrev', description: 'Team abbreviation (3 letters)' },
      { name: 'Game Info', description: 'Game matchup information' },
      { name: 'AvgPointsPerGame', description: 'Average fantasy points (optional)' }
    ]
  },
  export: {
    title: 'Lineup Export Format',
    description: 'Lineups are exported in DraftKings contest entry format:',
    columns: [
      { name: 'QB', description: 'Quarterback player name' },
      { name: 'RB', description: 'Running Back 1 player name' },
      { name: 'RB2', description: 'Running Back 2 player name' },
      { name: 'WR', description: 'Wide Receiver 1 player name' },
      { name: 'WR2', description: 'Wide Receiver 2 player name' },
      { name: 'WR3', description: 'Wide Receiver 3 player name' },
      { name: 'TE', description: 'Tight End player name' },
      { name: 'FLEX', description: 'Flex position player name' },
      { name: 'DST', description: 'Defense/Special Teams name' }
    ]
  }
}

export function CSVManager() {
  const [dragActive, setDragActive] = useState(false)
  const [history, setHistory] = useState(mockHistory)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [weekId, setWeekId] = useState('2024-WK01')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return
    
    const file = files[0]
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setImportResult({
        success: false,
        message: 'Please select a CSV file',
        errors: ['Only CSV files are supported']
      })
      return
    }

    setIsImporting(true)
    setImportResult(null)

    try {
      const csvText = await file.text()
      
      // First, just parse to validate the CSV format
      const parseResult = CSVImportService.parseDraftKingsCSV(csvText)
      
      if (!parseResult.success) {
        setImportResult(parseResult)
        return
      }

      // If parsing is successful, import to backend
      const importResult = await CSVImportService.importPlayersToBackend(csvText, weekId)
      setImportResult(importResult)

      if (importResult.success) {
        // Add to history
        const newHistoryItem = {
          id: Date.now(),
          type: 'import' as const,
          filename: file.name,
          timestamp: new Date(),
          status: 'success' as const,
          details: `${importResult.playersImported} players imported successfully`,
          week: weekId
        }
        setHistory([newHistoryItem, ...history])
      }

    } catch (error) {
      setImportResult({
        success: false,
        message: 'Failed to process CSV file',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      })
    } finally {
      setIsImporting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'error': return <XCircle className="w-4 h-4 text-red-600" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2>CSV Import/Export</h2>
        <p className="text-muted-foreground">
          Import DraftKings player data and export your lineups for contest entry
        </p>
      </div>

      {/* Week Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Week Selection</CardTitle>
          <CardDescription>Select the week for importing player data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <label htmlFor="week-select" className="text-sm font-medium">
              Week:
            </label>
            <select
              id="week-select"
              value={weekId}
              onChange={(e) => setWeekId(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background text-sm"
            >
              <option value="2024-WK01">Week 1</option>
              <option value="2024-WK02">Week 2</option>
              <option value="2024-WK03">Week 3</option>
              <option value="2024-WK04">Week 4</option>
              <option value="2024-WK05">Week 5</option>
              <option value="2024-WK06">Week 6</option>
              <option value="2024-WK07">Week 7</option>
              <option value="2024-WK08">Week 8</option>
              <option value="2024-WK09">Week 9</option>
              <option value="2024-WK10">Week 10</option>
              <option value="2024-WK11">Week 11</option>
              <option value="2024-WK12">Week 12</option>
              <option value="2024-WK13">Week 13</option>
              <option value="2024-WK14">Week 14</option>
              <option value="2024-WK15">Week 15</option>
              <option value="2024-WK16">Week 16</option>
              <option value="2024-WK17">Week 17</option>
              <option value="2024-WK18">Week 18</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Import Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import Player Pool
              </CardTitle>
              <CardDescription>
                Upload DraftKings salary CSV files to import player data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Drag and Drop Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 mx-auto bg-muted rounded-full flex items-center justify-center">
                    {isImporting ? (
                      <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                    ) : (
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <p>Drag and drop your CSV file here</p>
                    <p className="text-sm text-muted-foreground">or</p>
                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isImporting}
                    >
                      Browse Files
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supported formats: .csv (DraftKings salary format)
                  </p>
                </div>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Import Result Alert */}
              {importResult && (
                <Alert className={importResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                  {importResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={importResult.success ? 'text-green-800' : 'text-red-800'}>
                    <div className="font-medium">{importResult.message}</div>
                    {importResult.playersImported && (
                      <div className="text-sm mt-1">
                        Players imported: {importResult.playersImported}
                      </div>
                    )}
                    {importResult.errors && importResult.errors.length > 0 && (
                      <div className="text-sm mt-2">
                        <div className="font-medium">Errors:</div>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          {importResult.errors.map((error, index) => (
                            <li key={index} className="text-xs">{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Make sure your CSV file includes all required columns for successful import.
                  <Button variant="link" className="p-0 h-auto text-sm ml-1">
                    View format requirements
                  </Button>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {/* Export Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export Lineups
              </CardTitle>
              <CardDescription>
                Download your lineups in DraftKings contest entry format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Button className="w-full gap-2">
                  <Download className="w-4 h-4" />
                  Export Current Week Lineups
                </Button>
                <Button variant="outline" className="w-full gap-2">
                  <Download className="w-4 h-4" />
                  Export All Lineups
                </Button>
                <Button variant="outline" className="w-full gap-2">
                  <Download className="w-4 h-4" />
                  Export Selected Week...
                </Button>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Exported files are formatted for direct upload to DraftKings contests.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Format Instructions */}
      <Tabs defaultValue="import" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import">Import Format</TabsTrigger>
          <TabsTrigger value="export">Export Format</TabsTrigger>
        </TabsList>

        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>{csvInstructions.import.title}</CardTitle>
              <CardDescription>{csvInstructions.import.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {csvInstructions.import.columns.map((column) => (
                  <div key={column.name} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="space-y-1">
                      <Badge variant="outline" className="font-mono text-xs">
                        {column.name}
                      </Badge>
                      <p className="text-sm text-muted-foreground">{column.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>{csvInstructions.export.title}</CardTitle>
              <CardDescription>{csvInstructions.export.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {csvInstructions.export.columns.map((column) => (
                  <div key={column.name} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="space-y-1">
                      <Badge variant="outline" className="font-mono text-xs">
                        {column.name}
                      </Badge>
                      <p className="text-sm text-muted-foreground">{column.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import/Export History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your recent import and export operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(item.status)}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.filename}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.week}
                      </Badge>
                      <Badge variant="secondary" className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.details}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {item.timestamp.toLocaleDateString()} {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
