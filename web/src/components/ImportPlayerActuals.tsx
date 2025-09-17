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
import { buildApiUrl } from '@/config/api'

interface ImportPlayerActualsProps {
  onImportComplete: (importData: {
    filename: string;
    timestamp: string;
    failedImports: number;
    successfulImports: number;
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
  playerDkId: number
  firstName: string
  lastName: string
  displayName: string
  position: string
  team: string
}

interface CSVPlayer {
  name: string
  team: string
  position: string
  completions?: number
  attempts?: number
  pass_yds?: number
  pass_tds?: number
  interceptions?: number
  rush_att?: number
  rush_yds?: number
  rush_tds?: number
  rec_tgt?: number
  receptions?: number
  rec_yds?: number
  rec_tds?: number
  fumbles?: number
  fumbles_lost?: number
  total_tds?: number
  two_pt_md?: number
  two_pt_pass?: number
  dk_actuals?: number
  vbd?: number
  pos_rank?: number
  ov_rank?: number
}

interface MatchedPlayer extends CSVPlayer {
  csvIndex: number
  matchedPlayerId?: number
  matchConfidence: 'exact' | 'high' | 'medium' | 'low' | 'none'
  possibleMatches?: Player[]
}

export function ImportPlayerActuals({ }: ImportPlayerActualsProps) {
  const router = useRouter()
  const [weeks, setWeeks] = useState<Week[]>([])
  const [selectedWeek, setSelectedWeek] = useState<string>('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<CSVPlayer[]>([])
  const [, setMatchedPlayers] = useState<MatchedPlayer[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])

  // Fetch weeks and players on component mount
  useEffect(() => {
    fetchWeeks()
    fetchAllPlayers()
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
    const result: string[] = []
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

  const parseCSV = async (file: File) => {
    setIsParsing(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header and one data row')
      }

      const headers = parseCSVLine(lines[0])
      console.log('CSV Headers:', headers)

      // Expected headers for player actuals
      const expectedHeaders = [
        'Player', 'Team', 'Position', 'Completions', 'Attempts', 'Pass_Yds', 'Pass_TDs', 
        'Interceptions', 'Rush_Att', 'Rush_Yds', 'Rush_TDs', 'Rec_Tgt', 'Receptions', 
        'Rec_Yds', 'Rec_TDs', 'Fumbles', 'Fumbles_lost', 'Total_TDs', '2PtMd', '2PtPass', 
        'DkActuals', 'VBD', 'PosRank', 'OvRank'
      ]

      // Check if headers match expected format
      const hasRequiredHeaders = expectedHeaders.every(header => 
        headers.some(h => h.toLowerCase().replace(/[_\s]/g, '') === header.toLowerCase().replace(/[_\s]/g, ''))
      )

      if (!hasRequiredHeaders) {
        throw new Error(`CSV headers don't match expected format. Expected: ${expectedHeaders.join(', ')}`)
      }

      const players: CSVPlayer[] = []
      
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i])
        if (values.length < 3) continue // Skip incomplete rows

        const player: CSVPlayer = {
          name: values[0]?.trim() || '',
          team: values[1]?.trim() || '',
          position: values[2]?.trim() || '',
          completions: parseFloat(values[3]) || 0,
          attempts: parseFloat(values[4]) || 0,
          pass_yds: parseFloat(values[5]) || 0,
          pass_tds: parseFloat(values[6]) || 0,
          interceptions: parseFloat(values[7]) || 0,
          rush_att: parseFloat(values[8]) || 0,
          rush_yds: parseFloat(values[9]) || 0,
          rush_tds: parseFloat(values[10]) || 0,
          rec_tgt: parseFloat(values[11]) || 0,
          receptions: parseFloat(values[12]) || 0,
          rec_yds: parseFloat(values[13]) || 0,
          rec_tds: parseFloat(values[14]) || 0,
          fumbles: parseFloat(values[15]) || 0,
          fumbles_lost: parseFloat(values[16]) || 0,
          total_tds: parseFloat(values[17]) || 0,
          two_pt_md: parseFloat(values[18]) || 0,
          two_pt_pass: parseFloat(values[19]) || 0,
          dk_actuals: parseFloat(values[20]) || 0,
          vbd: parseFloat(values[21]) || 0,
          pos_rank: parseInt(values[22]) || 0,
          ov_rank: parseInt(values[23]) || 0
        }

        players.push(player)
      }

      setCsvData(players)
      console.log(`Parsed ${players.length} players from CSV`)
    } catch (error) {
      console.error('Error parsing CSV:', error)
      alert(`Error parsing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsParsing(false)
    }
  }

  const findPlayerMatches = (csvPlayer: CSVPlayer): { player: Player | null, confidence: 'exact' | 'high' | 'medium' | 'low' | 'none', possibleMatches: Player[] } => {
    const possibleMatches = allPlayers.filter(player => {
      const nameMatch = player.displayName.toLowerCase().includes(csvPlayer.name.toLowerCase()) ||
                       player.firstName.toLowerCase().includes(csvPlayer.name.split(' ')[0]?.toLowerCase() || '') ||
                       player.lastName.toLowerCase().includes(csvPlayer.name.split(' ').slice(1).join(' ').toLowerCase() || '')
      
      const teamMatch = player.team === csvPlayer.team
      const positionMatch = player.position === csvPlayer.position
      
      return nameMatch && teamMatch && positionMatch
    })

    if (possibleMatches.length === 0) {
      return { player: null, confidence: 'none' as const, possibleMatches: [] }
    }

    if (possibleMatches.length === 1) {
      const match = possibleMatches[0]
      const exactNameMatch = match.displayName.toLowerCase() === csvPlayer.name.toLowerCase()
      return { 
        player: match, 
        confidence: exactNameMatch ? 'exact' as const : 'high' as const, 
        possibleMatches 
      }
    }

    // Multiple matches - find the best one
    const bestMatch = possibleMatches.find(p => p.displayName.toLowerCase() === csvPlayer.name.toLowerCase())
    if (bestMatch) {
      return { player: bestMatch, confidence: 'exact' as const, possibleMatches }
    }

    return { player: possibleMatches[0], confidence: 'medium' as const, possibleMatches }
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
          csvFileName: csvFile?.name || 'unknown.csv',
          csvData: csvData
        }
      }
      
      sessionStorage.setItem('importActualsReviewData', JSON.stringify(reviewData))
      router.push('/import/actuals-review')
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
            <FileText className="h-5 w-5" />
            Import Player Actuals
          </CardTitle>
          <CardDescription>
            Upload a CSV file with player actual performance data for the selected week.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Week Selection */}
          <div className="space-y-2">
            <Label htmlFor="week-select">Select Week</Label>
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger>
                <SelectValue placeholder="Select a week" />
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

          {/* File Upload */}
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
              {csvFile && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {csvFile.name}
                </Badge>
              )}
            </div>
          </div>

          {/* CSV Format Info */}
          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Expected CSV format:</p>
                <p className="text-sm text-muted-foreground">
                  Player, Team, Position, Completions, Attempts, Pass_Yds, Pass_TDs, Interceptions, 
                  Rush_Att, Rush_Yds, Rush_TDs, Rec_Tgt, Receptions, Rec_Yds, Rec_TDs, Fumbles, 
                  Fumbles_lost, Total_TDs, 2PtMd, 2PtPass, DkActuals, VBD, PosRank, OvRank
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Processing Status */}
          {isParsing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Parsing CSV file...
            </div>
          )}

          {/* Data Preview */}
          {csvData.length > 0 && (
            <div className="space-y-2">
              <Label>Data Preview ({csvData.length} players found)</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Player</th>
                      <th className="p-2 text-left">Team</th>
                      <th className="p-2 text-left">Position</th>
                      <th className="p-2 text-left">DK Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(0, 5).map((player, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">{player.name}</td>
                        <td className="p-2">{player.team}</td>
                        <td className="p-2">{player.position}</td>
                        <td className="p-2">{player.dk_actuals || 0}</td>
                      </tr>
                    ))}
                    {csvData.length > 5 && (
                      <tr>
                        <td colSpan={4} className="p-2 text-center text-muted-foreground">
                          ... and {csvData.length - 5} more players
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Process Button */}
          <Button
            onClick={processMatching}
            disabled={!selectedWeek || !csvFile || csvData.length === 0 || isProcessing || isParsing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Processing Matches...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Process Player Matches
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
