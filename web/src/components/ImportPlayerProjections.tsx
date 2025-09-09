import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { Upload, FileText, RefreshCw } from 'lucide-react'

interface ImportPlayerProjectionsProps {
  onImportComplete: (importData: {
    filename: string;
    timestamp: string;
    failedImports: number;
    successfulImports: number;
    projectionSource: string;
    week: number;
  }) => void
}

interface Week {
  id: number
  label: string
  week_number: number
  year: number
  status: string
}

interface Player {
  id: number
  playerDkId: number
  displayName: string
  team: string
  position: string
}

interface CSVPlayer {
  name: string
  team: string
  position: string
  projRank?: number
  actualStats?: number
  dkmProjection?: number
  dfsProjection?: number
  hfrcProjection?: number
  sldProjection?: number
  actuals?: number
  selectedProjection: number
  projectionSource: string
  pprProjection?: number
  hpprProjection?: number
  stdProjection?: number
  projStatsJson?: Record<string, unknown>
  actualStatsJson?: Record<string, unknown>
}

interface MatchedPlayer extends CSVPlayer {
  csvIndex: number
  matchedPlayerId?: number
  matchConfidence?: 'exact' | 'partial' | 'none'
  possibleMatches?: Player[]
}

export function ImportPlayerProjections({ }: ImportPlayerProjectionsProps) {
  const router = useRouter()
  const [weeks, setWeeks] = useState<Week[]>([])
  const [selectedWeek, setSelectedWeek] = useState<string>('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CSVPlayer[]>([])
  const [, setMatchedPlayers] = useState<MatchedPlayer[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [projectionSource, setProjectionSource] = useState<string>('')
  const [allPlayers, setAllPlayers] = useState<Player[]>([])

  // Fetch weeks and players on component mount
  useEffect(() => {
    fetchWeeks()
    fetchAllPlayers()
  }, [])

  const fetchWeeks = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/projections/weeks')
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

  const fetchAllPlayers = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/players?limit=1000')
      if (response.ok) {
        const data = await response.json()
        setAllPlayers(data.players || [])
      }
    } catch (error) {
      console.error('Failed to fetch players:', error)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
      parseCSV(file)
    }
  }

  // Helper function to parse CSV line handling quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current.trim())
    return result
  }

  const parseCSV = (file: File) => {
    setIsParsing(true)
    const reader = new FileReader()
    reader.onload = (e) => {
      const csv = e.target?.result as string
      console.log('CSV content:', csv.substring(0, 500)) // Debug: show first 500 chars
      const lines = csv.split('\n')
      console.log('CSV lines:', lines.length) // Debug: show number of lines
      const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase())
      console.log('CSV headers:', headers) // Debug: show headers

      const findIndex = (candidates: string[]): number => {
        for (const c of candidates) {
          const idx = headers.indexOf(c)
          if (idx !== -1) return idx
        }
        return -1
      }

      const players: CSVPlayer[] = []

      // New format indices (strict)
      const playerIndex = findIndex(['player'])
      const positionIndex = findIndex(['pos', 'position'])
      const projectionsIndex = findIndex(['projections'])
      const actualsIndex = findIndex(['actuals'])
      const rankIndex = findIndex(['rank'])

      console.log('Column indices (new):', {
        playerIndex, positionIndex, projectionsIndex, actualsIndex, rankIndex
      })
      
      // Debug: show what values are being extracted for first few players
      if (lines.length > 1) {
        const firstLineValues = parseCSVLine(lines[1])
        console.log('First line values:', firstLineValues)
        console.log('Projections value at index', projectionsIndex, ':', firstLineValues[projectionsIndex])
        console.log('Actuals value at index', actualsIndex, ':', firstLineValues[actualsIndex])
        console.log('Rank value at index', rankIndex, ':', firstLineValues[rankIndex])
      }
      
      for (let i = 1; i < lines.length; i++) {
        // Parse CSV line properly handling quoted fields
        const values = parseCSVLine(lines[i])
        console.log(`Processing line ${i}:`, values) // Debug: show each line
        if (values.length >= 3 && values[playerIndex] && values[positionIndex]) {
          const playerName = values[playerIndex]
          const position = values[positionIndex]
          
          // Extract team from player name if it includes team (e.g., "Josh Allen BUF")
          const nameParts = playerName.split(' ')
          const possibleTeam = nameParts[nameParts.length - 1]
          const isTeamCode = possibleTeam.length === 2 || possibleTeam.length === 3
          
          const name = isTeamCode ? nameParts.slice(0, -1).join(' ') : playerName
          const team = isTeamCode ? possibleTeam : ''
          
          // Parse new-format projection values
          const pprProjection = projectionsIndex >= 0 ? parseFloat(values[projectionsIndex]) || 0 : 0
          const actualsVal = actualsIndex >= 0 ? parseFloat(values[actualsIndex]) || 0 : 0
          
          // No JSON fields in new format
          const projStatsJson = null
          const actualStatsJson = null
          
          // Selected projection is strictly the Projections column
          let selectedProjection = pprProjection
          let source = projectionSource || 'Projections'
          
          // If still no projection found, try to use any numeric value from the row
          if (selectedProjection === 0) {
            for (let j = 2; j < values.length; j++) { // Skip player name and position
              const numValue = parseFloat(values[j])
              if (!isNaN(numValue) && numValue > 0) {
                selectedProjection = numValue
                source = projectionSource || 'Auto-detected'
                break
              }
            }
          }
          
          const player: CSVPlayer = {
            name: name.trim(),
            team: team.toUpperCase(),
            position: position.toUpperCase(),
            projRank: rankIndex >= 0 ? (parseInt(values[rankIndex]) || undefined) : undefined,
            actuals: actualsVal || undefined,
            selectedProjection,
            projectionSource: source,
            // Add the individual projection values for debugging
            pprProjection: pprProjection,
            // No JSON fields in new format
            projStatsJson: projStatsJson,
            actualStatsJson: actualStatsJson
          }
          
          if (player.name && player.position && selectedProjection > 0) {
            players.push(player)
            console.log('Added player:', player) // Debug: show added player
          } else {
            console.log('Skipped player:', { name: player.name, position: player.position, selectedProjection }) // Debug: show skipped player
          }
        } else {
          console.log(`Skipping line ${i}: insufficient data or missing required fields`) // Debug: show skipped line
        }
      }
      
      console.log('Final players array:', players) // Debug: show final result
      setCsvData(players)
      setIsParsing(false)
    }
    reader.readAsText(file)
  }

  const findPlayerMatches = (csvPlayer: CSVPlayer) => {
    // Try exact match first
    const exactMatch = allPlayers.find(p => 
      p.displayName.toLowerCase() === csvPlayer.name.toLowerCase() &&
      (csvPlayer.team === '' || p.team.toUpperCase() === csvPlayer.team.toUpperCase()) &&
      p.position.toUpperCase() === csvPlayer.position.toUpperCase()
    )

    if (exactMatch) {
      return { player: exactMatch, confidence: 'exact' as const, possibleMatches: [] }
    }

    // Try partial matches
    const partialMatches = allPlayers.filter(p => {
      const nameMatch = p.displayName.toLowerCase().includes(csvPlayer.name.toLowerCase()) ||
                       csvPlayer.name.toLowerCase().includes(p.displayName.toLowerCase())
      const teamMatch = csvPlayer.team === '' || p.team.toUpperCase() === csvPlayer.team.toUpperCase()
      const positionMatch = p.position.toUpperCase() === csvPlayer.position.toUpperCase()
      
      return (nameMatch && positionMatch) || (nameMatch && teamMatch) || (teamMatch && positionMatch && nameMatch)
    })

    if (partialMatches.length > 0) {
      return { player: partialMatches[0], confidence: 'partial' as const, possibleMatches: partialMatches }
    }

    return { player: null, confidence: 'none' as const, possibleMatches: [] }
  }

  const processMatching = async () => {
    console.log('processMatching called!') // Debug
    console.log('Button state:', { selectedWeek, csvFile: !!csvFile, csvDataLength: csvData.length, isProcessing, isParsing }) // Debug
    setIsProcessing(true)
    
    try {
      // Add a small delay to show the spinner, especially for large datasets
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const matched: MatchedPlayer[] = csvData.map((csvPlayer, index) => {
        const { player, confidence, possibleMatches } = findPlayerMatches(csvPlayer)
        
        return {
          ...csvPlayer,
          csvIndex: index,
          matchedPlayerId: player?.playerDkId,
          matchConfidence: confidence,
          possibleMatches
        }
      })

      setMatchedPlayers(matched)
      
      // Store data for review page and navigate
      const reviewData = {
        matchedPlayers: matched,
        importData: {
          week: selectedWeek,
          projectionSource: projectionSource || 'Custom Projections',
          csvFileName: csvFile?.name || 'unknown.csv',
          csvData: csvData
        }
      }
      
      sessionStorage.setItem('importReviewData', JSON.stringify(reviewData))
      router.push('/import/review')
    } catch (error) {
      console.error('Error during processing:', error)
    } finally {
      setIsProcessing(false)
    }
  }



  const getWeekLabel = (week: Week) => {
    return `Week ${week.week_number} (${week.year}) - ${week.status}`
  }



  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Import Player Projections
          </CardTitle>
          <CardDescription>
            Import weekly player projections from CSV file with automatic player matching
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Week Selection */}
          <div className="space-y-2">
            <Label>Target Week</Label>
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger>
                <SelectValue placeholder="Select week for projections" />
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

          {/* File Selection */}
          <div className="space-y-2">
            <Label>CSV File</Label>
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
            {csvFile && (
              <div className="text-sm text-muted-foreground">
                {isParsing ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Parsing CSV file...
                  </div>
                ) : (
                  <div>
                    Selected: {csvFile.name} ({csvData.length} players found{projectionSource ? ` for ${projectionSource}` : ''})
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Projection Source Input */}
          <div className="space-y-2">
            <Label htmlFor="projection-source">Projection Source</Label>
            <Input
              id="projection-source"
              placeholder="Enter projection source name (e.g., DFS, HFRC, Expert Pick, etc.)"
              value={projectionSource}
              onChange={(e) => setProjectionSource(e.target.value)}
            />
          </div>

          {/* CSV Format Help */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <strong>Expected CSV format:</strong> Player, Pos, Attempts, Comps, Pass Yards, Pass TDs, Ints, Receptions, Rec Yards, Rec TDs, Rush Yards, Rush TDs, Fumbles, Projections, Actuals, Rank
              <br />
              <strong>Example:</strong> Jayden Daniels, QB, 31.38, 21.72, 229.5, 1.71, 0.45, , , , 43.5, 0.48, 0.23, 22.82, 0, 4
              <br />
              <em>Player names can include team codes (e.g., &quot;Josh Allen BUF&quot;) or be separate columns. The importer reads Projections strictly from the "Projections" column.</em>
              <br />
              <br />
              <strong>Download CSV files:</strong> Visit{' '}
              <a 
                href="https://winwithodds.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                winwithodds.com
              </a>
              {' '}to download projection CSV files.
            </AlertDescription>
          </Alert>

          {/* Process Button */}
          <Button 
            onClick={() => {
              console.log('Button clicked!') // Debug
              console.log('Button disabled state:', !selectedWeek || !csvFile || csvData.length === 0 || isProcessing || isParsing) // Debug
              processMatching()
            }}
            disabled={!selectedWeek || !csvFile || csvData.length === 0 || isProcessing || isParsing}
            className="w-full gap-2"
          >
            {isParsing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Parsing CSV File...
              </>
            ) : isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Processing & Matching Players...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Process & Match Players
              </>
            )}
          </Button>

          {/* Preview */}
          {csvData.length > 0 && (
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">Preview ({csvData.length} players)</span>
                </div>
                <Badge variant="outline">{projectionSource || 'Auto-detected'} Source</Badge>
              </div>
              <div className="max-h-32 overflow-y-auto text-sm space-y-1">
                {csvData.slice(0, 5).map((player, index) => (
                  <div key={index} className="flex gap-4 text-muted-foreground">
                    <span className="font-medium">{player.name}</span>
                    <span>{player.team || 'N/A'}</span>
                    <span>{player.position}</span>
                    <span>{player.selectedProjection.toFixed(1)} pts ({player.projectionSource})</span>
                    {player.projRank && <span>Rank #{player.projRank}</span>}
                  </div>
                ))}
                {csvData.length > 5 && (
                  <div className="text-muted-foreground">... and {csvData.length - 5} more</div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  )
}
