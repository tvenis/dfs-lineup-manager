'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle, XCircle, AlertTriangle, User, Upload, RefreshCw, ArrowLeft } from 'lucide-react'

interface Player {
  id: number
  playerDkId: number
  displayName: string
  team: string
  position: string
}

interface MatchedPlayer {
  csvIndex: number
  name: string
  team: string
  position: string
  selectedProjection: number
  projectionSource: string
  matchedPlayerId?: number
  matchConfidence?: 'exact' | 'partial' | 'none'
  possibleMatches?: Player[]
}

export default function ImportReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [matchedPlayers, setMatchedPlayers] = useState<MatchedPlayer[]>([])
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importData, setImportData] = useState<any>(null)

  useEffect(() => {
    // Get data from sessionStorage (passed from the import page)
    const storedData = sessionStorage.getItem('importReviewData')
    if (storedData) {
      const data = JSON.parse(storedData)
      setMatchedPlayers(data.matchedPlayers || [])
      setImportData(data.importData || {})
    } else {
      // No data found, redirect back to import
      router.push('/import')
    }
  }, [router])

  useEffect(() => {
    // Fetch all players for manual matching
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

    fetchAllPlayers()
  }, [])

  const handleManualMatch = (csvIndex: number, playerId: number | null) => {
    setMatchedPlayers(prev => prev.map(p => 
      p.csvIndex === csvIndex 
        ? { ...p, matchedPlayerId: playerId, matchConfidence: playerId ? 'exact' : 'none' }
        : p
    ))
  }

  const createCSVFromData = (csvData: any[]) => {
    if (!csvData || csvData.length === 0) return ''
    
    // Get headers from the first row
    const headers = Object.keys(csvData[0])
    
    // Create CSV content
    const csvRows = [headers.join(',')]
    
    csvData.forEach(row => {
      const values = headers.map(header => {
        const value = row[header]
        // Handle values that might contain commas by wrapping in quotes
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`
        }
        return value || ''
      })
      csvRows.push(values.join(','))
    })
    
    return csvRows.join('\n')
  }

  const handleImport = async () => {
    setIsImporting(true)
    
    try {
            console.log('Starting import with data:', importData)

      // Send matched players directly instead of reconstructing CSV
      const matchedPlayersToImport = matchedPlayers.filter(p => p.matchedPlayerId)
      console.log(`Sending ${matchedPlayersToImport.length} matched players to backend`)
      
                  // Debug: Check if JSON fields are present in the first few players
            console.log('First player JSON fields:', {
                name: matchedPlayersToImport[0]?.name,
                projStatsJson: matchedPlayersToImport[0]?.projStatsJson,
                actualStatsJson: matchedPlayersToImport[0]?.actualStatsJson,
                projStatsType: typeof matchedPlayersToImport[0]?.projStatsJson,
                actualStatsType: typeof matchedPlayersToImport[0]?.actualStatsJson
            })
            
            // Debug: Show first few players' data being sent
            console.log('First 3 players data being sent:', matchedPlayersToImport.slice(0, 3).map(p => ({
                name: p.name,
                projStatsJson: p.projStatsJson,
                actualStatsJson: p.actualStatsJson
            })))
      
      const response = await fetch('http://localhost:8000/api/projections/import-matched', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week_id: importData.week,
          projection_source: importData.projectionSource || 'Custom Projections',
          matched_players: matchedPlayersToImport.map(p => ({
            playerDkId: p.matchedPlayerId,
            name: p.name,
            team: p.team,
            position: p.position,
            selectedProjection: p.selectedProjection,
            projectionSource: p.projectionSource,
            // Add the actual projection values from the CSV
            // CSV structure: name, position, proj stats, date, PPR Projections, HPPR Projections, STD Projections, Actuals
            pprProjection: p.pprProjection || p.selectedProjection || 0,
            actuals: p.actuals || 0,
            // Add the JSON fields
            projStatsJson: p.projStatsJson,
            actualStatsJson: p.actualStatsJson
          }))
        })
      })
      
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      if (!response.ok) {
        let errorMessage = 'Import failed'
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorData.message || 'Import failed'
        } catch (parseError) {
          // If we can't parse the error response, use the status text
          errorMessage = `Import failed: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      
      // Clear session storage
      sessionStorage.removeItem('importReviewData')
      
      // Navigate back to import page with success
      router.push('/import?success=true')
      
    } catch (error) {
      console.error('Import failed:', error)
      console.error('Error type:', typeof error)
      console.error('Error constructor:', error?.constructor?.name)
      
      // Better error message handling
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        errorMessage = error.message
        console.log('Error message:', error.message)
        console.log('Error stack:', error.stack)
      } else if (typeof error === 'object' && error !== null) {
        console.log('Error object keys:', Object.keys(error))
        // Try to extract meaningful error information
        if ('message' in error) {
          errorMessage = String(error.message)
        } else if ('detail' in error) {
          errorMessage = String(error.detail)
        } else if ('error' in error) {
          errorMessage = String(error.error)
        } else {
          errorMessage = JSON.stringify(error, null, 2)
        }
      } else {
        errorMessage = String(error)
      }
      
      console.log('Final error message:', errorMessage)
      alert('Import failed: ' + errorMessage)
    } finally {
      setIsImporting(false)
    }
  }

  const getMatchStatusIcon = (confidence?: string) => {
    switch (confidence) {
      case 'exact': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'partial': return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case 'none': return <XCircle className="w-4 h-4 text-red-600" />
      default: return <User className="w-4 h-4 text-gray-600" />
    }
  }

  const unmatchedPlayers = matchedPlayers.filter(p => p.matchConfidence === 'none')
  const matchedCount = matchedPlayers.filter(p => p.matchedPlayerId).length

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          onClick={() => router.push('/import')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Import
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Review Player Matches</h1>
          <p className="text-muted-foreground">
            Review and manually resolve any player matching issues before importing
          </p>
        </div>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Import Summary</CardTitle>
          <CardDescription>
            {matchedPlayers.filter(p => p.matchConfidence === 'exact').length} exact matches (auto-approved), {' '}
            {matchedPlayers.filter(p => p.matchConfidence === 'partial').length} partial matches (auto-approved), {' '}
            <span className="font-medium text-orange-600">{unmatchedPlayers.length} unmatched (need review)</span>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Review Table */}
      <Card>
        <CardHeader>
          <CardTitle>Unmatched Players</CardTitle>
          <CardDescription>
            Only unmatched players are shown below. Matched players will be automatically imported. 
            Select the correct player for each unmatched entry or choose "No match" to skip.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {unmatchedPlayers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
              <h3 className="text-lg font-medium mb-2">All Players Matched!</h3>
              <p>All players were successfully matched automatically. No manual review needed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>CSV Player</TableHead>
                    <TableHead>Matched Player</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unmatchedPlayers.map((player) => (
                    <TableRow key={player.csvIndex}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getMatchStatusIcon(player.matchConfidence)}
                          <Badge variant="outline" className="bg-red-50 text-red-700">
                            {player.matchConfidence}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{player.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {player.team || 'N/A'} - {player.position} - {player.selectedProjection.toFixed(1)} pts ({player.projectionSource})
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {player.matchedPlayerId ? (
                          <div>
                            <div className="font-medium">
                              {allPlayers.find(p => p.playerDkId === player.matchedPlayerId)?.displayName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {allPlayers.find(p => p.playerDkId === player.matchedPlayerId)?.team} - {' '}
                              {allPlayers.find(p => p.playerDkId === player.matchedPlayerId)?.position}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No match</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={player.matchedPlayerId?.toString() || 'none'} 
                          onValueChange={(value) => handleManualMatch(player.csvIndex, value === 'none' ? null : parseInt(value))}
                        >
                          <SelectTrigger className="w-60">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No match</SelectItem>
                            {allPlayers
                              .filter(p => p.position === player.position)
                              .sort((a, b) => a.displayName.localeCompare(b.displayName))
                              .map((match) => (
                                <SelectItem key={match.playerDkId} value={match.playerDkId.toString()}>
                                  {match.displayName} ({match.team} - {match.position})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <Button 
          variant="outline" 
          onClick={() => router.push('/import')}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleImport}
          disabled={isImporting}
          className="gap-2"
        >
          {isImporting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Import Projections ({matchedCount} players)
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
