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
  onImportComplete: (importData: any) => void
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
}

interface MatchedPlayer extends CSVPlayer {
  csvIndex: number
  matchedPlayerId?: number
  matchConfidence?: 'exact' | 'partial' | 'none'
  possibleMatches?: Player[]
}

export function ImportPlayerProjections({ onImportComplete }: ImportPlayerProjectionsProps) {
  const router = useRouter()
  const [weeks, setWeeks] = useState<Week[]>([])
  const [selectedWeek, setSelectedWeek] = useState<string>('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CSVPlayer[]>([])
  const [matchedPlayers, setMatchedPlayers] = useState<MatchedPlayer[]>([])
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
      
      const players: CSVPlayer[] = []
      
      // Find column indices for different data types (more flexible matching)
      const playerIndex = Math.max(
        headers.indexOf('player'), 
        headers.indexOf('name'), 
        headers.findIndex(h => h.includes('player') || h.includes('name')), 
        0
      )
      const positionIndex = Math.max(
        headers.indexOf('position'), 
        headers.findIndex(h => h.includes('position') || h.includes('pos')), 
        1
      )
      const projStatsIndex = Math.max(
        headers.indexOf('proj stats'), 
        headers.indexOf('proj rank'), 
        headers.indexOf('rank'),
        headers.findIndex(h => h.includes('proj') || h.includes('rank')),
        -1
      )
      const actualStatsIndex = Math.max(
        headers.indexOf('actual stats'),
        headers.findIndex(h => h.includes('actual') && h.includes('stats')),
        -1
      )
      const dateIndex = Math.max(
        headers.indexOf('date'),
        headers.findIndex(h => h.includes('date')),
        -1
      )
      const pprIndex = Math.max(
        headers.indexOf('ppr projections'), 
        headers.indexOf('ppr'),
        headers.findIndex(h => h.includes('ppr')),
        -1
      )
      const hpprIndex = Math.max(
        headers.indexOf('hppr projections'), 
        headers.indexOf('hppr'),
        headers.findIndex(h => h.includes('hppr')),
        -1
      )
      const stdIndex = Math.max(
        headers.indexOf('std projections'), 
        headers.indexOf('std'),
        headers.findIndex(h => h.includes('std')),
        -1
      )
      const actualsIndex = Math.max(
        headers.indexOf('actuals'),
        headers.findIndex(h => h.includes('actuals')),
        -1
      )
      
      // Legacy column support
      const dkmIndex = headers.indexOf('dkm')
      const dfsIndex = Math.max(headers.indexOf('dfs projections'), headers.indexOf('dfs'))
      const hfrcIndex = Math.max(headers.indexOf('hfrc projections'), headers.indexOf('hfrc'))
      const sldIndex = Math.max(headers.indexOf('sld projections'), headers.indexOf('sld'))
      
      console.log('Column indices:', {
        playerIndex, positionIndex, projStatsIndex, actualStatsIndex, dateIndex,
        pprIndex, hpprIndex, stdIndex, actualsIndex, dkmIndex, dfsIndex, hfrcIndex, sldIndex
      }) // Debug: show column indices
      
      // Debug: show what values are being extracted for first few players
      if (lines.length > 1) {
        const firstLineValues = parseCSVLine(lines[1])
        console.log('First line values:', firstLineValues)
        console.log('PPR value at index', pprIndex, ':', firstLineValues[pprIndex])
        console.log('Actuals value at index', actualsIndex, ':', firstLineValues[actualsIndex])
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
          
          // Parse projection values
          const projStats = projStatsIndex >= 0 ? parseFloat(values[projStatsIndex]) || 0 : 0
          const pprProjection = pprIndex >= 0 ? parseFloat(values[pprIndex]) || 0 : 0
          const hpprProjection = hpprIndex >= 0 ? parseFloat(values[hpprIndex]) || 0 : 0
          const stdProjection = stdIndex >= 0 ? parseFloat(values[stdIndex]) || 0 : 0
          
          // Legacy projection support
          const dkmProjection = dkmIndex >= 0 ? parseFloat(values[dkmIndex]) || 0 : 0
          const dfsProjection = dfsIndex >= 0 ? parseFloat(values[dfsIndex]) || 0 : 0
          const hfrcProjection = hfrcIndex >= 0 ? parseFloat(values[hfrcIndex]) || 0 : 0
          const sldProjection = sldIndex >= 0 ? parseFloat(values[sldIndex]) || 0 : 0
          
          // Determine which projection to use based on source name or first available
          let selectedProjection = 0
          let source = projectionSource || 'Auto-detected'
          
          // Try to match the projection source name to a column
          const sourceLower = projectionSource.toLowerCase()
          if (sourceLower.includes('ppr') && pprProjection > 0) {
            selectedProjection = pprProjection
          } else if (sourceLower.includes('std') && stdProjection > 0) {
            selectedProjection = stdProjection
          } else if (sourceLower.includes('proj') && projStats > 0) {
            selectedProjection = projStats
          } else if (sourceLower.includes('dkm') && dkmProjection > 0) {
            selectedProjection = dkmProjection
          } else if (sourceLower.includes('dfs') && dfsProjection > 0) {
            selectedProjection = dfsProjection
          } else if (sourceLower.includes('hfrc') && hfrcProjection > 0) {
            selectedProjection = hfrcProjection
          } else if (sourceLower.includes('sld') && sldProjection > 0) {
            selectedProjection = sldProjection
          } else {
            // Use the first available projection and update source accordingly
            if (pprProjection > 0) {
              selectedProjection = pprProjection
              source = projectionSource || 'PPR Projections'
            } else if (stdProjection > 0) {
              selectedProjection = stdProjection
              source = projectionSource || 'STD Projections'
            } else if (projStats > 0) {
              selectedProjection = projStats
              source = projectionSource || 'Proj Stats'
            } else if (dfsProjection > 0) {
              selectedProjection = dfsProjection
              source = projectionSource || 'DFS Projections'
            } else if (dkmProjection > 0) {
              selectedProjection = dkmProjection
              source = projectionSource || 'DKM'
            } else if (hfrcProjection > 0) {
              selectedProjection = hfrcProjection
              source = projectionSource || 'HFRC Projections'
            } else if (sldProjection > 0) {
              selectedProjection = sldProjection
              source = projectionSource || 'SLD Projections'
            }
          }
          
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
            projRank: projStatsIndex >= 0 ? parseInt(values[projStatsIndex]) || undefined : undefined,
            actualStats: actualStatsIndex >= 0 ? parseFloat(values[actualStatsIndex]) || undefined : undefined,
            dkmProjection,
            dfsProjection,
            hfrcProjection,
            sldProjection,
            actuals: actualsIndex >= 0 ? parseFloat(values[actualsIndex]) || undefined : undefined,
            selectedProjection,
            projectionSource: source,
            // Add the individual projection values for debugging
            pprProjection: pprProjection,
            hpprProjection: hpprProjection,
            stdProjection: stdProjection
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
              <strong>Expected CSV format:</strong> Player, Position, Proj Stats, Actual Stats, Date, PPR Projections, HPPR Projections, STD Projections, Actuals
              <br />
              <strong>Example:</strong> Josh Allen BUF, QB, 24.2, 24.1, 2024-01-15, 24.5, 24.3, 24.0, 26.3
              <br />
              <em>Player names can include team codes (e.g., "Josh Allen BUF") or be separate columns. The system will automatically detect and use the best matching projection column based on your source name. HPPR Projections are ignored as requested.</em>
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
