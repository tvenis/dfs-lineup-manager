"use client";

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Upload, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface MatchedPlayer {
  name: string
  team: string
  position: string
  csvIndex: number
  matchedPlayerId?: number
  matchConfidence: 'exact' | 'high' | 'medium' | 'low' | 'none'
  possibleMatches?: Array<{
    playerDkId: number
    firstName: string
    lastName: string
    displayName: string
    position: string
    team: string
  }>
  // Actuals data
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

interface ImportData {
  week: string
  csvFileName: string
  csvData: MatchedPlayer[]
}

function ImportActualsReviewContent() {
  const router = useRouter()
  const [matchedPlayers, setMatchedPlayers] = useState<MatchedPlayer[]>([])
  const [importData, setImportData] = useState<ImportData | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [selectedPlayers, setSelectedPlayers] = useState<Set<number>>(new Set())

  useEffect(() => {
    const reviewData = sessionStorage.getItem('importActualsReviewData')
    if (reviewData) {
      const parsed = JSON.parse(reviewData)
      setMatchedPlayers(parsed.matchedPlayers || [])
      setImportData(parsed.importData || null)
      
      // Auto-select all players with matches
      const playersWithMatches = parsed.matchedPlayers
        .map((p: MatchedPlayer, index: number) => p.matchedPlayerId ? index : null)
        .filter((index: number | null) => index !== null)
      setSelectedPlayers(new Set(playersWithMatches))
    } else {
      router.push('/import')
    }
  }, [router])

  const handlePlayerToggle = (index: number) => {
    const newSelected = new Set(selectedPlayers)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedPlayers(newSelected)
  }

  const handleSelectAll = () => {
    const allWithMatches = matchedPlayers
      .map((p, index) => p.matchedPlayerId ? index : null)
      .filter(index => index !== null)
    setSelectedPlayers(new Set(allWithMatches))
  }

  const handleSelectNone = () => {
    setSelectedPlayers(new Set())
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'exact': return 'bg-green-100 text-green-800'
      case 'high': return 'bg-blue-100 text-blue-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-orange-100 text-orange-800'
      case 'none': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'exact': return <CheckCircle className="h-4 w-4" />
      case 'high': return <CheckCircle className="h-4 w-4" />
      case 'medium': return <AlertTriangle className="h-4 w-4" />
      case 'low': return <AlertTriangle className="h-4 w-4" />
      case 'none': return <XCircle className="h-4 w-4" />
      default: return <XCircle className="h-4 w-4" />
    }
  }

  const handleImport = async () => {
    setIsImporting(true)
    
    try {
      const playersToImport = matchedPlayers.filter((_, index) => selectedPlayers.has(index))
      
      console.log('Players to import:', playersToImport)
      console.log('Week ID:', importData?.week)
      
      const response = await fetch('http://localhost:8000/api/actuals/import-matched', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          week_id: importData?.week,
          matched_players: playersToImport.map(p => ({
            playerDkId: p.matchedPlayerId,
            name: p.name,
            team: p.team,
            position: p.position,
            completions: p.completions,
            attempts: p.attempts,
            pass_yds: p.pass_yds,
            pass_tds: p.pass_tds,
            interceptions: p.interceptions,
            rush_att: p.rush_att,
            rush_yds: p.rush_yds,
            rush_tds: p.rush_tds,
            rec_tgt: p.rec_tgt,
            receptions: p.receptions,
            rec_yds: p.rec_yds,
            rec_tds: p.rec_tds,
            fumbles: p.fumbles,
            fumbles_lost: p.fumbles_lost,
            total_tds: p.total_tds,
            two_pt_md: p.two_pt_md,
            two_pt_pass: p.two_pt_pass,
            dk_actuals: p.dk_actuals,
            vbd: p.vbd,
            pos_rank: p.pos_rank,
            ov_rank: p.ov_rank
          }))
        })
      })
      
      if (!response.ok) {
        let errorMessage = 'Import failed'
        try {
          const errorData = await response.json()
          console.error('Import error response:', errorData)
          errorMessage = errorData.detail || errorData.message || `Import failed: ${response.status} ${response.statusText}`
        } catch (parseError) {
          console.error('Error parsing response:', parseError)
          errorMessage = `Import failed: ${response.status} ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      
      // Clear session storage
      sessionStorage.removeItem('importActualsReviewData')
      
      // Navigate back to import page with success
      router.push('/import?success=true')
      
    } catch (error) {
      console.error('Import failed:', error)
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsImporting(false)
    }
  }

  const stats = {
    total: matchedPlayers.length,
    exact: matchedPlayers.filter(p => p.matchConfidence === 'exact').length,
    high: matchedPlayers.filter(p => p.matchConfidence === 'high').length,
    medium: matchedPlayers.filter(p => p.matchConfidence === 'medium').length,
    low: matchedPlayers.filter(p => p.matchConfidence === 'low').length,
    none: matchedPlayers.filter(p => p.matchConfidence === 'none').length,
    selected: selectedPlayers.size
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Review Player Actuals Import</h1>
          <p className="text-muted-foreground">
            {importData?.csvFileName} • {stats.total} players found
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.exact}</div>
            <div className="text-sm text-muted-foreground">Exact Matches</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.high}</div>
            <div className="text-sm text-muted-foreground">High Confidence</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.medium + stats.low}</div>
            <div className="text-sm text-muted-foreground">Low Confidence</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.none}</div>
            <div className="text-sm text-muted-foreground">No Matches</div>
          </CardContent>
        </Card>
      </div>

      {/* Selection Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Select Players to Import</CardTitle>
          <CardDescription>
            {stats.selected} of {stats.total} players selected
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              Select All Matched
            </Button>
            <Button variant="outline" size="sm" onClick={handleSelectNone}>
              Select None
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Player List */}
      <Card>
        <CardHeader>
          <CardTitle>Player Matches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {matchedPlayers.map((player, index) => (
              <div
                key={index}
                className={`flex items-center gap-4 p-3 border rounded-lg ${
                  selectedPlayers.has(index) ? 'bg-blue-50 border-blue-200' : 'bg-white'
                }`}
              >
                <Checkbox
                  checked={selectedPlayers.has(index)}
                  onCheckedChange={() => handlePlayerToggle(index)}
                  disabled={!player.matchedPlayerId}
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{player.name}</span>
                    <Badge variant="outline">{player.team}</Badge>
                    <Badge variant="outline">{player.position}</Badge>
                    <Badge className={getConfidenceColor(player.matchConfidence)}>
                      {getConfidenceIcon(player.matchConfidence)}
                      <span className="ml-1 capitalize">{player.matchConfidence}</span>
                    </Badge>
                  </div>
                  
                  {player.matchedPlayerId ? (
                    <div className="text-sm text-muted-foreground">
                      Matched to: {player.possibleMatches?.[0]?.displayName}
                    </div>
                  ) : (
                    <div className="text-sm text-red-600">
                      No matching player found
                    </div>
                  )}
                  
                  <div className="text-sm text-muted-foreground">
                    DK Points: {player.dk_actuals || 0} • 
                    Pass: {player.pass_yds || 0}yds {player.pass_tds || 0}TD • 
                    Rush: {player.rush_yds || 0}yds {player.rush_tds || 0}TD • 
                    Rec: {player.rec_yds || 0}yds {player.rec_tds || 0}TD
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Import Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleImport}
          disabled={stats.selected === 0 || isImporting}
          size="lg"
        >
          {isImporting ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Import {stats.selected} Players
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export default function ImportActualsReviewPage() {
  return <ImportActualsReviewContent />
}
