import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Label } from './ui/label'

import { Save, Trash2, Download, RotateCcw, User, DollarSign, ArrowUpDown, Plus } from 'lucide-react'
import { Progress } from './ui/progress'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { PlayerService } from '../lib/playerService'
import { LineupService, LineupCreate } from '../lib/lineupService'
import { Player, LineupSlotId, PlayerPoolEntry } from '../types/prd'


type RosterSlot = {
  position: LineupSlotId
  player: Player | null
  eligiblePositions: string[]
}

type SortField = 'name' | 'team' | 'opponent' | 'salary' | 'projectedPoints' | 'opponentRank' | 'value'
type SortDirection = 'asc' | 'desc'

interface LineupBuilderProps {
  onPlayerSelect?: (player: Player) => void;
  selectedWeek?: string;
}

export function LineupBuilder({ 
  onPlayerSelect, 
  selectedWeek = "1" 
}: LineupBuilderProps) {
  const SALARY_CAP = 50000
  
  const [lineupName, setLineupName] = useState('')
  const [tags, setTags] = useState('')
  const [selectedPosition, setSelectedPosition] = useState<string>('QB')
  const [sortField, setSortField] = useState<SortField>('projectedPoints')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [roster, setRoster] = useState<RosterSlot[]>([
    { position: 'QB', player: null, eligiblePositions: ['QB'] },
    { position: 'RB1', player: null, eligiblePositions: ['RB'] },
    { position: 'RB2', player: null, eligiblePositions: ['RB'] },
    { position: 'WR1', player: null, eligiblePositions: ['WR'] },
    { position: 'WR2', player: null, eligiblePositions: ['WR'] },
    { position: 'WR3', player: null, eligiblePositions: ['WR'] },
    { position: 'TE', player: null, eligiblePositions: ['TE'] },
    { position: 'FLEX', player: null, eligiblePositions: ['RB', 'WR', 'TE'] },
    { position: 'DST', player: null, eligiblePositions: ['DST'] },
  ])

  // State for player pool data
  const [playerPool, setPlayerPool] = useState<PlayerPoolEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalSalary = roster.reduce((sum, slot) => {
    if (!slot.player) return sum
    const playerEntry = playerPool.find(entry => entry.playerDkId === slot.player!.playerDkId)
    return sum + (playerEntry?.salary || 0)
  }, 0)
  
  const totalProjected = roster.reduce((sum, slot) => {
    // Extract projected points from player attributes if available
    const playerEntry = playerPool.find(entry => entry.playerDkId === slot.player?.playerDkId)
    if (playerEntry?.projectedPoints) {
      return sum + (playerEntry.projectedPoints || 0)
    }
    return sum
  }, 0)

  const remainingSalary = SALARY_CAP - totalSalary
  const filledSlots = roster.filter(slot => slot.player).length

  // Fetch player pool data when component mounts or week changes
  useEffect(() => {
    const fetchPlayerPool = async () => {
      if (!selectedWeek) return
      
      setLoading(true)
      setError(null)
      
      try {
        const weekId = parseInt(selectedWeek)
        if (isNaN(weekId)) return
        
        const response = await PlayerService.getPlayerPool(weekId, {
          limit: 1000, // Get all players for the week
          excluded: false // Only get available players
        })
        
        setPlayerPool(response.entries)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch player pool')
        console.error('Error fetching player pool:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPlayerPool()
  }, [selectedWeek])

  const getAvailablePlayersForSlot = (slot: RosterSlot) => {
    const usedPlayerIds = roster
      .filter(r => r.player && r !== slot)
      .map(r => r.player!.playerDkId)

    return playerPool.filter(entry => 
      slot.eligiblePositions.includes(entry.player.position) &&
      !usedPlayerIds.includes(entry.playerDkId) &&
      entry.salary <= remainingSalary + (slot.player ? 0 : 0) &&
      !entry.excluded &&
      !entry.isDisabled
    )
  }

  const handlePlayerSelect = (slotIndex: number, playerId: string) => {
    if (playerId === 'none') {
      setRoster(prev => prev.map((slot, i) => 
        i === slotIndex ? { ...slot, player: null } : slot
      ))
      return
    }

    const slot = roster[slotIndex]
    const availablePlayers_flat = getAvailablePlayersForSlot(slot)
    
    const playerEntry = availablePlayers_flat.find(p => p.playerDkId === parseInt(playerId))
    
    if (playerEntry) {
      setRoster(prev => prev.map((slot, i) => 
        i === slotIndex ? { ...slot, player: playerEntry.player } : slot
      ))
    }
  }

  const clearLineup = () => {
    setRoster(roster.map(slot => ({ ...slot, player: null })))
    setLineupName('')
    setTags('')
  }

  const isLineupComplete = roster.every(slot => slot.player !== null)
  const isOverSalaryCap = totalSalary > SALARY_CAP

  // Get all players for table display
  const getAllPlayers = () => {
    const usedPlayerIds = roster
      .filter(slot => slot.player)
      .map(slot => slot.player!.playerDkId)

    const allPositions = selectedPosition === 'FLEX' ? 
      ['RB', 'WR', 'TE'] : 
      [selectedPosition]

    return playerPool
      .filter(entry => allPositions.includes(entry.player.position))
      .map(entry => {
        const projectedPoints = entry.projectedPoints || 0
        
        // Calculate value (projected points per $1000 of salary)
        const value = projectedPoints > 0 ? (projectedPoints / (entry.salary / 1000)).toFixed(2) : '0.00'
        
        return {
          ...entry,
          projectedPoints,
          value,
          isUsed: usedPlayerIds.includes(entry.playerDkId),
          canAfford: entry.salary <= remainingSalary || usedPlayerIds.includes(entry.playerDkId)
        }
      })
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      // Set appropriate default sort direction based on field type
      if (field === 'salary' || field === 'projectedPoints' || field === 'value') {
        setSortDirection('desc') // Higher values first for numeric fields
      } else if (field === 'opponentRank') {
        setSortDirection('asc') // Lower rank numbers first (better matchup)
      } else {
        setSortDirection('asc') // Alphabetical order for text fields
      }
    }
  }

  const sortedPlayers = getAllPlayers().sort((a, b) => {
    let aValue: string | number
    let bValue: string | number
    
    switch (sortField) {
      case 'name':
        aValue = a.player.displayName
        bValue = b.player.displayName
        break
      case 'team':
        aValue = a.player.team
        bValue = b.player.team
        break

      case 'salary':
        aValue = a.salary
        bValue = b.salary
        break
      case 'projectedPoints':
        aValue = a.projectedPoints
        bValue = b.projectedPoints
        break
      case 'opponentRank':
        // Extract opponent rank value from draftStatAttributes array
        const aRankValue = (() => {
          if (a.draftStatAttributes && Array.isArray(a.draftStatAttributes)) {
            for (const attr of a.draftStatAttributes) {
              if (typeof attr === 'object' && attr !== null && attr.id === -2) {
                // Parse sortValue as number, fallback to value, then to 0
                const sortValue = typeof attr.sortValue === 'string' ? parseInt(attr.sortValue, 10) : attr.sortValue;
                return sortValue || 0;
              }
            }
          }
          return 0;
        })();
        const bRankValue = (() => {
          if (b.draftStatAttributes && Array.isArray(b.draftStatAttributes)) {
            for (const attr of b.draftStatAttributes) {
              if (typeof attr === 'object' && attr !== null && attr.id === -2) {
                // Parse sortValue as number, fallback to value, then to 0
                const sortValue = typeof attr.sortValue === 'string' ? parseInt(attr.sortValue, 10) : attr.sortValue;
                return sortValue || 0;
              }
            }
          }
          return 0;
        })();
        aValue = aRankValue;
        bValue = bRankValue;
        break
      case 'value':
        aValue = parseFloat(a.value)
        bValue = parseFloat(b.value)
        break
      default:
        aValue = a.salary
        bValue = b.salary
    }

    if (sortField === 'name') {
      aValue = a.player.displayName.toLowerCase()
      bValue = b.player.displayName.toLowerCase()
    }

    if (sortField === 'team') {
      aValue = a.player.team.toLowerCase()
      bValue = b.player.team.toLowerCase()
    }

    if (sortField === 'opponent') {
      // Extract opponent from competitions data if available
      aValue = (a.competitions?.opponent && typeof a.competitions.opponent === 'string') ? a.competitions.opponent.toLowerCase() : ''
      bValue = (b.competitions?.opponent && typeof b.competitions.opponent === 'string') ? b.competitions.opponent.toLowerCase() : ''
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }

    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const handleAddPlayer = (playerEntry: PlayerPoolEntry) => {
    // Find first available slot for this player
    const eligibleSlots = roster.filter(slot => 
      !slot.player && 
      slot.eligiblePositions.includes(playerEntry.player.position)
    )

    if (eligibleSlots.length > 0) {
      const slotIndex = roster.indexOf(eligibleSlots[0])
      handlePlayerSelect(slotIndex, playerEntry.playerDkId.toString())
    }
  }

  const handleSaveLineup = async () => {
    if (!selectedWeek || !isLineupComplete || isOverSalaryCap) return

    try {
      const weekId = parseInt(selectedWeek)
      if (isNaN(weekId)) return

      const slots: Partial<Record<LineupSlotId, number>> = {}
      roster.forEach(slot => {
        if (slot.player) {
          slots[slot.position] = slot.player.playerDkId
        }
      })

      const lineupData: LineupCreate = {
        week_id: weekId,
        name: lineupName || `Lineup ${new Date().toLocaleDateString()}`,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        slots,
        game_style: 'Classic'
      }

      const response = await LineupService.createLineup(lineupData)
      
      // Show success message
      console.log("Lineup saved successfully!")
      
      // Set the saved lineup ID for export
      setSavedLineupId(response.id)
      
      // Clear the lineup after saving
      clearLineup()
      
      return response.id
    } catch (err) {
      console.error('Error saving lineup:', err)
      console.error("Failed to save lineup. Please try again.")
      return null // Indicate failure
    }
  }

  const [savedLineupId, setSavedLineupId] = useState<string | null>(null)

  const handleExportLineup = async () => {
    try {
      // First save the lineup if it hasn't been saved yet
      if (!savedLineupId) {
        const newSavedLineupId = await handleSaveLineup()
        if (newSavedLineupId) {
          setSavedLineupId(newSavedLineupId)
          // Wait a moment for the lineup to be saved and get the ID
          await new Promise(resolve => setTimeout(resolve, 1000))
        } else {
          console.error("Failed to save lineup before export")
          return
        }
      }
      
      if (!savedLineupId) {
        console.error("Failed to save lineup before export")
        return
      }
      
      // Use the backend export endpoint that includes draftableId
      const blob = await LineupService.exportLineup(savedLineupId, 'csv')
      
      // Create and download file
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lineup-${lineupName || 'export'}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      console.log("Lineup exported successfully with draftableId")
    } catch (err) {
      console.error('Error exporting lineup:', err)
      // Fallback to frontend export if backend fails
      console.log("Falling back to frontend export...")
      
      // Create CSV content in the simple DraftKings format
      const csvContent = [
        ['QB', 'RB', 'RB2', 'WR', 'WR2', 'WR3', 'TE', 'FLEX', 'DST'],
        roster
          .filter(slot => slot.player)
          .map(slot => {
            const playerEntry = playerPool.find(entry => entry.playerDkId === slot.player!.playerDkId)
            // Use draftableId if available, otherwise use playerDkId as fallback
            const playerId = playerEntry?.draftableId || slot.player!.playerDkId
            return playerId
          })
      ].map(row => row.join(',')).join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lineup-${lineupName || 'export'}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading player pool...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive">Error: {error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2>Lineup Builder</h2>
          <p className="text-muted-foreground">
            Build your DraftKings lineup for {
              selectedWeek === "1" ? "Week 1" :
              selectedWeek === "wc" ? "Wild Card" :
              selectedWeek === "div" ? "Divisional" :
              selectedWeek === "conf" ? "Conference Championship" :
              selectedWeek === "sb" ? "Super Bowl" :
              `Week ${selectedWeek}`
            }
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearLineup} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Clear Lineup
          </Button>
          <Button 
            variant="outline" 
            disabled={!isLineupComplete} 
            onClick={handleExportLineup}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button 
            disabled={!isLineupComplete || isOverSalaryCap} 
            onClick={handleSaveLineup}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Save Lineup
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roster Builder */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lineup Info */}
          <Card>
            <CardHeader>
              <CardTitle>Lineup Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lineup-name">Lineup Name</Label>
                  <Input
                    id="lineup-name"
                    placeholder="Enter lineup name..."
                    value={lineupName}
                    onChange={(e) => setLineupName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    placeholder="GPP, Cash, Stack..."
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                  />
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Player Pool */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Player Pool ({playerPool.length} players)
              </CardTitle>
              <CardDescription>Select players to add to your lineup</CardDescription>
              <p className="text-sm text-muted-foreground mt-1">Note: Excluded players not available in Player Pool.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Position Filters */}
              <Tabs value={selectedPosition} onValueChange={setSelectedPosition}>
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="QB">QB</TabsTrigger>
                  <TabsTrigger value="RB">RB</TabsTrigger>
                  <TabsTrigger value="WR">WR</TabsTrigger>
                  <TabsTrigger value="TE">TE</TabsTrigger>
                  <TabsTrigger value="FLEX">FLEX</TabsTrigger>
                  <TabsTrigger value="DST">DST</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Player Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Player
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('team')}
                      >
                        <div className="flex items-center gap-1">
                          Team
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('opponent')}
                      >
                        <div className="flex items-center gap-1">
                          Opponent
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('salary')}
                      >
                        <div className="flex items-center gap-1">
                          Salary
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('projectedPoints')}
                      >
                        <div className="flex items-center gap-1">
                          Projection
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('opponentRank')}
                      >
                        <div className="flex items-center gap-1">
                          OPRK
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('value')}
                      >
                        <div className="flex items-center gap-1">
                          Value
                          <ArrowUpDown className="w-3 h-1" />
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPlayers.map((playerEntry) => (
                      <TableRow 
                        key={playerEntry.id} 
                        className={`
                          ${playerEntry.isUsed ? 'bg-muted/50' : ''} 
                          ${!playerEntry.canAfford ? 'opacity-50' : ''}
                        `}
                      >
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAddPlayer(playerEntry)}
                            disabled={playerEntry.isUsed || !playerEntry.canAfford}
                            className="h-6 w-6 p-0"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => onPlayerSelect?.(playerEntry.player)}
                            className="text-primary hover:underline text-left"
                          >
                            {playerEntry.player.displayName}
                          </button>
                        </TableCell>
                        <TableCell>{playerEntry.player.team}</TableCell>
                        <TableCell>
                          {(playerEntry.competitions?.opponent && typeof playerEntry.competitions.opponent === 'string') ? playerEntry.competitions.opponent : 'TBD'}
                        </TableCell>
                        <TableCell>${playerEntry.salary.toLocaleString()}</TableCell>
                        <TableCell>
                          {playerEntry.projectedPoints ? playerEntry.projectedPoints.toFixed(1) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            // Search through draftStatAttributes array for opponent rank (id: -2)
                            if (playerEntry.draftStatAttributes && Array.isArray(playerEntry.draftStatAttributes)) {
                              for (const attr of playerEntry.draftStatAttributes) {
                                if (typeof attr === 'object' && attr !== null && attr.id === -2) {
                                  const value = attr.value || 0;
                                  const quality = attr.quality || 'Medium';
                                  
                                  let colorClass = '';
                                  if (quality === 'High') colorClass = 'text-green-600';
                                  else if (quality === 'Low') colorClass = 'text-red-600';
                                  else colorClass = 'text-black';
                                  
                                  return (
                                    <span className={colorClass}>
                                      {value}
                                    </span>
                                  );
                                }
                              }
                            }
                            return 'N/A';
                          })()}
                        </TableCell>
                        <TableCell>{playerEntry.value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Salary Tracker */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Salary Cap
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Used</span>
                  <span className={isOverSalaryCap ? 'text-destructive' : ''}>
                    ${totalSalary.toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={(totalSalary / SALARY_CAP) * 100} 
                  className={isOverSalaryCap ? '[&>div]:bg-destructive' : ''}
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Remaining</span>
                  <span className={remainingSalary < 0 ? 'text-destructive' : ''}>
                    ${remainingSalary.toLocaleString()}
                  </span>
                </div>
              </div>
              
              {/* Separator */}
              <div className="h-px bg-muted-foreground/20 my-4"></div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Projected Points</span>
                  <span className="text-lg">{totalProjected.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Lineup Progress</span>
                  <span className="text-sm">{filledSlots}/9 players</span>
                </div>
              </div>

              {isOverSalaryCap && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">
                    Over salary cap by ${(totalSalary - SALARY_CAP).toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lineup Summary */}
          {filledSlots > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Current Lineup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {roster
                  .filter(slot => slot.player)
                  .map((slot) => {
                    const originalIndex = roster.findIndex(r => r === slot)
                    const playerEntry = playerPool.find(entry => entry.playerDkId === slot.player!.playerDkId)
                    return (
                      <div key={slot.position} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Badge variant="outline" className="text-xs">
                            {slot.position}
                          </Badge>
                          <button
                            onClick={() => onPlayerSelect?.(slot.player!)}
                            className="text-primary hover:underline truncate"
                          >
                            {slot.player!.displayName}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            ${playerEntry?.salary.toLocaleString() || 'N/A'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePlayerSelect(originalIndex, 'none')}
                            className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
              </CardContent>
            </Card>
          )}

          {/* Quick Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• FLEX position can be filled with RB, WR, or TE</p>
              <p>• Consider stacking QB with WRs from same team</p>
              <p>• Balance high-floor and high-ceiling players</p>
              <p>• Check for weather and injury updates</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

