import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { Label } from './ui/label'
import { Separator } from './ui/separator'
import { Save, Trash2, Download, RotateCcw, User, DollarSign, ArrowUpDown, Plus, Zap } from 'lucide-react'
import { Progress } from './ui/progress'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { PlayerService } from '@/lib/playerService'
import { LineupService } from '@/lib/lineupService'
import { WeekService } from '@/lib/weekService'
import { LineupDisplayData, LineupPlayer } from '@/types/prd'
import { PlayerPoolEntry, Player, Week, LineupSlotId } from '@/types/prd'
import { getPositionBadgeClasses } from '@/lib/positionColors'
import { LineupOptimizer } from './LineupOptimizer'

type RosterSlot = {
  position: LineupSlotId
  player: Player | null
  eligiblePositions: string[]
}

type SortField = 'name' | 'team' | 'opponent' | 'salary' | 'projectedPoints' | 'oprk' | 'value'
type SortDirection = 'asc' | 'desc'

export function LineupBuilder({ 
  onPlayerSelect: _onPlayerSelect,
  lineupId
}: { 
  onPlayerSelect?: (player: Player) => void;
  lineupId?: string;
}) {
  console.log('🚀 LineupBuilder component rendered - NEW VERSION')
  console.log('🔍 Component version check - should see this log')
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

  // State for data
  const [playerPool, setPlayerPool] = useState<PlayerPoolEntry[]>([])
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [savedLineup, setSavedLineup] = useState<LineupDisplayData | null>(null)
  const [showOptimizer, setShowOptimizer] = useState(false)

  // Always use the active week
  const weekId = useMemo(() => {
    const id = currentWeek?.id || 1
    console.log('🎯 weekId calculated:', id, 'from currentWeek:', currentWeek)
    console.log('🎯 currentWeek.id:', currentWeek?.id)
    console.log('🎯 currentWeek.status:', currentWeek?.status)
    console.log('🎯 currentWeek.week_number:', currentWeek?.week_number)
    return id
  }, [currentWeek])

  // Debug logging
  console.log('LineupBuilder - currentWeek:', currentWeek, 'weekId:', weekId)
  console.log('LineupBuilder - playerPool length:', playerPool.length)

  // Load weeks and current week
  console.log('🔍 Defining useEffect for loadWeeks')
  useEffect(() => {
    console.log('🔄 useEffect for loadWeeks triggered')
    
    const loadWeeks = async () => {
      console.log('🚀 loadWeeks function started')
      try {
        console.log('📡 Testing direct fetch to backend...')
        try {
          const directResponse = await fetch('http://localhost:8000/api/weeks/')
          console.log('✅ Direct fetch response status:', directResponse.status)
          const directData = await directResponse.json()
          console.log('✅ Direct fetch data:', directData)
          
          // If direct fetch works, use that data instead
          if (directData && directData.weeks) {
            console.log('🎯 Using direct fetch data')
            const activeWeek = directData.weeks.find((w: { status: string }) => w.status === 'Active')
            const current = activeWeek || directData.weeks[0]
            console.log('🎯 Active week found:', activeWeek)
            console.log('🎯 Setting currentWeek to:', current)
            console.log('🎯 current.id:', current.id)
            console.log('🎯 current.status:', current.status)
            setCurrentWeek(current)
            return
          }
        } catch (directError) {
          console.error('❌ Direct fetch failed:', directError)
        }
        
        console.log('📡 Trying WeekService.getWeeks()...')
        const weeksResponse = await WeekService.getWeeks()
        console.log('✅ Weeks response received:', weeksResponse)
        console.log('✅ Weeks response.weeks:', weeksResponse.weeks)
        console.log('✅ Weeks response.weeks.length:', weeksResponse.weeks?.length)
        
        if (!weeksResponse || !weeksResponse.weeks) {
          console.error('❌ Invalid weeks response structure:', weeksResponse)
          return
        }
        
        // Find the active week (status = 'Active')
        const activeWeek = weeksResponse.weeks.find(w => w.status === 'Active')
        console.log('🎯 Active week found:', activeWeek)
        console.log('🎯 All weeks statuses:', weeksResponse.weeks?.map(w => ({ id: w.id, status: w.status })))
        
        const current = activeWeek || weeksResponse.weeks[0]
        console.log('🎯 Active week:', activeWeek, 'Current week:', current)
        console.log('🎯 Setting currentWeek to:', current)
        setCurrentWeek(current)
      } catch (error) {
        console.error('❌ Error loading weeks:', error)
        console.error('❌ Error details:', error)
        console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      }
    }
    
    loadWeeks()
  }, []) // No dependencies - only run once on mount

  // Load player pool for selected week
  useEffect(() => {
    const loadPlayerPool = async () => {
      if (!weekId) {
        console.log('No weekId, skipping player pool load')
        return
      }
      
      console.log('Loading player pool for weekId:', weekId)
      setLoading(true)
      try {
        const response = await PlayerService.getPlayerPool(weekId, { limit: 1000 })
        console.log('Player pool response:', response)
        console.log('Player pool entries count:', response.entries?.length || 0)
        console.log('Player pool entries sample:', response.entries?.slice(0, 3))
        setPlayerPool(response.entries || [])
      } catch (error) {
        console.error('Error loading player pool:', error)
        console.error('Error details:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadPlayerPool()
  }, [weekId])

  // Load existing lineup if lineupId is provided (after player pool is loaded)
  useEffect(() => {
    const loadExistingLineup = async () => {
      if (!lineupId || playerPool.length === 0) {
        console.log('⏳ Waiting for lineupId or player pool to load...', { lineupId, playerPoolLength: playerPool.length });
        return;
      }
      
      try {
        console.log('🔄 Loading existing lineup:', lineupId);
        const lineup = await LineupService.getLineup(lineupId);
        console.log('✅ Loaded lineup:', lineup);
        
        // Set lineup name and tags
        setLineupName(lineup.name || '');
        setTags(lineup.tags?.join(', ') || '');
        
        // Parse slots and populate roster
        if (lineup.slots) {
          const slots = typeof lineup.slots === 'string' ? JSON.parse(lineup.slots) : lineup.slots;
          console.log('🎯 Parsed slots:', slots);
          
          // Create a map of player ID to player object from player pool
          const playerMap = new Map();
          playerPool.forEach(entry => {
            playerMap.set(entry.player.playerDkId, entry.player);
          });
          
          console.log('🎯 Player pool size:', playerPool.length);
          console.log('🎯 Player map size:', playerMap.size);
          console.log('🎯 Available player IDs:', Array.from(playerMap.keys()).slice(0, 10));
          
          // Update roster with existing players
          const loadPlayerDetails = async (playerId: number) => {
            try {
              const response = await fetch(`http://localhost:8000/api/players/${playerId}`);
              if (response.ok) {
                const player = await response.json();
                console.log(`✅ Fetched player details for ${playerId}:`, player.displayName);
                
                // Try to find salary from player pool if available
                const playerEntry = playerPool.find(entry => entry.player.playerDkId === playerId);
                if (playerEntry) {
                  console.log(`✅ Found salary ${playerEntry.salary} for ${player.displayName} in player pool`);
                  return {
                    ...player,
                    salary: playerEntry.salary,
                    projectedPoints: playerEntry.projectedPoints
                  };
                } else {
                  console.log(`⚠️ No salary found for ${player.displayName} in player pool`);
                  return player;
                }
              }
            } catch (error) {
              console.error(`❌ Failed to fetch player ${playerId}:`, error);
            }
            return null;
          };

          // Process each slot
          const updatedRoster = await Promise.all(roster.map(async (slot) => {
            const playerId = slots[slot.position];
            console.log(`🎯 Checking ${slot.position} for player ID: ${playerId}`);
            
            if (playerId && playerMap.has(playerId)) {
              const player = playerMap.get(playerId);
              console.log(`✅ Mapping ${slot.position} to player from pool:`, player?.displayName);
              return {
                ...slot,
                player: player
              };
            } else if (playerId) {
              console.log(`❌ Player ID ${playerId} not found in player pool for ${slot.position}, fetching directly...`);
              const player = await loadPlayerDetails(playerId);
              if (player) {
                console.log(`✅ Mapping ${slot.position} to player from direct fetch:`, player.displayName);
                return {
                  ...slot,
                  player: player
                };
              }
            }
            return slot;
          }));

          setRoster(updatedRoster);
        }
      } catch (error) {
        console.error('❌ Failed to load existing lineup:', error);
      }
    };
    
    loadExistingLineup();
  }, [lineupId, playerPool]);

  // Group players by position for easy access
  const availablePlayers = useMemo(() => {
    const grouped: Record<string, PlayerPoolEntry[]> = {}
    
    console.log('Grouping players by position. Total playerPool entries:', playerPool.length)
    
    playerPool.forEach(entry => {
      if (!entry.excluded && !entry.isDisabled) {
        const pos = entry.player.position
        if (!grouped[pos]) grouped[pos] = []
        grouped[pos].push(entry)
      }
    })
    
    console.log('Grouped players by position:', grouped)
    return grouped
  }, [playerPool])

  const totalSalary = roster.reduce((sum, slot) => {
    if (!slot.player) return sum
    // Look in player pool for salary
    const playerEntry = playerPool.find(entry => entry.player.playerDkId === slot.player!.playerDkId)
    return sum + (playerEntry?.salary || 0)
  }, 0)
  
  const totalProjected = roster.reduce((sum, slot) => {
    if (!slot.player) return sum
    // Look in player pool for projected points
    const playerEntry = playerPool.find(entry => entry.player.playerDkId === slot.player!.playerDkId)
    return sum + (playerEntry?.projectedPoints || 0)
  }, 0)

  const remainingSalary = SALARY_CAP - totalSalary
  const filledSlots = roster.filter(slot => slot.player).length



  const handlePlayerSelect = (slotIndex: number, playerId: string) => {
    if (playerId === 'none') {
      setRoster(prev => prev.map((slot, i) => 
        i === slotIndex ? { ...slot, player: null } : slot
      ))
      return
    }

    const slot = roster[slotIndex]
    const availablePlayers_flat = slot.eligiblePositions.flatMap(pos => 
      availablePlayers[pos] || []
    )
    
    const playerEntry = availablePlayers_flat.find(p => p.id === parseInt(playerId))
    
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

  const handleCloseConfirmation = () => {
    setShowConfirmation(false)
    setSavedLineup(null)
    clearLineup()
  }

  const isLineupComplete = roster.every(slot => slot.player !== null)
  const isOverSalaryCap = totalSalary > SALARY_CAP
  
  // Validation logic for lineup name and tags
  const hasLineupName = lineupName.trim().length > 0
  const hasTags = tags.trim().length > 0
  const isLineupValid = isLineupComplete && !isOverSalaryCap && hasLineupName && hasTags

  // Get all players for table display
  const getAllPlayers = () => {
    const usedPlayerIds = roster
      .filter(slot => slot.player)
      .map(slot => slot.player!.playerDkId)

    let allPositions: string[]
    if (selectedPosition === 'FLEX') {
      allPositions = ['RB', 'WR', 'TE']
    } else {
      allPositions = [selectedPosition]
    }

    console.log('getAllPlayers - selectedPosition:', selectedPosition, 'allPositions:', allPositions)
    console.log('availablePlayers:', availablePlayers)

    const players = allPositions.flatMap(pos => 
      availablePlayers[pos] || []
    )
    .filter(player => !player.excluded) // Always filter out excluded players
    .map(player => ({
      ...player,
      value: player.projectedPoints ? (player.projectedPoints / (player.salary / 1000)).toFixed(2) : '0.00',
      isUsed: usedPlayerIds.includes(player.player.playerDkId),
      canAfford: player.salary <= remainingSalary || usedPlayerIds.includes(player.player.playerDkId),
      // Add opponent rank if available - extract from draftStatAttributes where id = -2
      oprk: (() => {
        const draftStatAttributes = player.draftStatAttributes;
        if (draftStatAttributes && Array.isArray(draftStatAttributes)) {
          const opponentRankAttr = draftStatAttributes.find((attr: { id: number; value?: number; quality?: string }) => attr.id === -2);
          return opponentRankAttr?.value || 0;
        }
        return 0;
      })(),
      oprkQuality: (() => {
        const draftStatAttributes = player.draftStatAttributes;
        if (draftStatAttributes && Array.isArray(draftStatAttributes)) {
          const opponentRankAttr = draftStatAttributes.find((attr: { id: number; value?: number; quality?: string }) => attr.id === -2);
          return opponentRankAttr?.quality || 'Medium';
        }
        return 'Medium';
      })()
    }))

    console.log('getAllPlayers - final players count:', players.length)
    return players
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      // Set default sort direction based on field type
      if (field === 'oprk') {
        setSortDirection('asc'); // Lower opponent rank (better matchup) first
      } else {
        setSortDirection('desc')
      }
    }
  }

  const sortedPlayers = getAllPlayers().sort((a, b) => {
    let aValue: string | number = a[sortField as keyof typeof a] as string | number
    let bValue: string | number = b[sortField as keyof typeof b] as string | number

    if (sortField === 'value') {
      aValue = parseFloat(a.value)
      bValue = parseFloat(b.value)
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
      // Sort by position
      aValue = a.player.position.toLowerCase()
      bValue = b.player.position.toLowerCase()
    }

    if (sortField === 'salary') {
      aValue = a.salary || 0
      bValue = b.salary || 0
    }

    if (sortField === 'projectedPoints') {
      aValue = a.projectedPoints || 0
      bValue = b.projectedPoints || 0
    }

    if (sortField === 'oprk') {
      // Extract opponent rank sortValue from draftStatAttributes where id = -2
      const aDraftStats = Array.isArray(a.draftStatAttributes) ? a.draftStatAttributes : [];
      const bDraftStats = Array.isArray(b.draftStatAttributes) ? b.draftStatAttributes : [];
      const aOpponentRank = aDraftStats.find((attr: { id: number; sortValue?: number | string }) => attr.id === -2)?.sortValue || 0;
      const bOpponentRank = bDraftStats.find((attr: { id: number; sortValue?: number | string }) => attr.id === -2)?.sortValue || 0;
      aValue = typeof aOpponentRank === 'string' ? parseFloat(aOpponentRank) : aOpponentRank;
      bValue = typeof bOpponentRank === 'string' ? parseFloat(bOpponentRank) : bOpponentRank;
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

  const handleAddPlayer = (player: PlayerPoolEntry) => {
    // Find first available slot for this player
    const eligibleSlots = roster.filter(slot => 
      !slot.player && 
      slot.eligiblePositions.some(pos => pos === player.player.position)
    )

    if (eligibleSlots.length > 0) {
      const slotIndex = roster.indexOf(eligibleSlots[0])
      handlePlayerSelect(slotIndex, player.id.toString())
    }
  }

  const handleSaveLineup = async () => {
    // Validate all requirements before saving
    if (!currentWeek) {
      console.error("No week selected")
      return
    }
    
    if (!isLineupComplete) {
      console.error("Lineup is not complete")
      return
    }
    
    if (isOverSalaryCap) {
      console.error("Lineup is over salary cap")
      return
    }
    
    if (!hasLineupName) {
      console.error("Lineup name is required")
      return
    }
    
    if (!hasTags) {
      console.error("At least one tag is required")
      return
    }
    
    setSaving(true)
    try {
      // Convert roster to lineup format
      const slots: Partial<Record<LineupSlotId, number>> = {}
      roster.forEach(slot => {
        if (slot.player) {
          slots[slot.position] = slot.player.playerDkId
        }
      })

      const lineupData = {
        week_id: currentWeek.id,
        name: lineupName.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
        slots
      }

      await LineupService.createLineup(lineupData)
      
      // Store the saved lineup data for confirmation screen
      const confirmationData: LineupDisplayData = {
        id: 'temp-' + Date.now(), // Temporary ID for display
        name: lineupName.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
        salaryUsed: totalSalary,
        salaryCap: SALARY_CAP,
        projectedPoints: totalProjected,
        roster: roster.filter(slot => slot.player).map(slot => {
          const playerEntry = playerPool.find(entry => entry.player.playerDkId === slot.player!.playerDkId)
          return {
            position: slot.position,
            name: slot.player!.displayName,
            team: slot.player!.team,
            salary: playerEntry?.salary || 0,
            projectedPoints: playerEntry?.projectedPoints || 0
          }
        })
      }
      
      setSavedLineup(confirmationData)
      setShowConfirmation(true)
      
      console.log('Lineup saved successfully!')
    } catch (error) {
      console.error('Error saving lineup:', error)
      // You could add an error notification here
    } finally {
      setSaving(false)
    }
  }

  const handleExportLineup = async () => {
    if (!isLineupComplete || isOverSalaryCap) return
    
    try {
      // Create a temporary lineup for export
      const slots: Partial<Record<LineupSlotId, number>> = {}
      roster.forEach(slot => {
        if (slot.player) {
          slots[slot.position] = slot.player.playerDkId
        }
      })

      // For now, we'll create a CSV manually since we don't have a saved lineup ID
      const csvData = [
        ['Position', 'Name', 'Team', 'Salary', 'Projected Points'],
        ...roster
          .filter(slot => slot.player)
          .map(slot => [
            slot.position,
            slot.player!.displayName,
            slot.player!.team,
            playerPool.find(entry => entry.player.playerDkId === slot.player!.playerDkId)?.salary?.toString() || '0',
            playerPool.find(entry => entry.player.playerDkId === slot.player!.playerDkId)?.projectedPoints?.toString() || '0'
          ])
      ]

      const csvContent = csvData.map(row => row.join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lineup-${lineupName || 'export'}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting lineup:', error)
    }
  }

  const handleOptimize = (settings: any) => {
    console.log('Optimization settings received:', settings)
    // TODO: Implement actual optimization logic
    // For now, just log the settings and show a placeholder message
    alert(`Optimization completed with settings: ${JSON.stringify(settings, null, 2)}`)
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2>Lineup Builder</h2>
          <p className="text-muted-foreground">
            Build your DraftKings lineup for {
              currentWeek ? `Week ${currentWeek.week_number} (${currentWeek.year})` : 'the active week'
            }
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowOptimizer(true)}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Zap className="w-4 h-4" />
            Lineup Optimizer
          </Button>
          <Button variant="outline" onClick={clearLineup} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Clear Lineup
          </Button>
          <Button 
            variant="outline" 
            disabled={!isLineupComplete} 
            onClick={handleExportLineup}
            className="gap-2"
            title="Export lineup to CSV (doesn't require name/tags)"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button 
            disabled={!isLineupValid || saving} 
            onClick={handleSaveLineup}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Lineup'}
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
                  <Label htmlFor="lineup-name">Lineup Name *</Label>
                  <Input
                    id="lineup-name"
                    placeholder="Enter lineup name..."
                    value={lineupName}
                    onChange={(e) => setLineupName(e.target.value)}
                    className={!hasLineupName && lineupName.length > 0 ? 'border-destructive' : ''}
                  />
                  {!hasLineupName && lineupName.length > 0 && (
                    <p className="text-sm text-destructive">Lineup name is required</p>
                  )}
                  <p className="text-xs text-muted-foreground">Give your lineup a descriptive name</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma separated) *</Label>
                  <Input
                    id="tags"
                    placeholder="GPP, Cash, Stack..."
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className={!hasTags && tags.length > 0 ? 'border-destructive' : ''}
                  />
                  {!hasTags && tags.length > 0 && (
                    <p className="text-sm text-destructive">At least one tag is required</p>
                  )}
                  <p className="text-xs text-muted-foreground">Use tags like GPP, Cash, Stack, etc.</p>
                </div>
              </div>
              
              {/* Validation Summary */}
              {!isLineupValid && (
                <div className="p-3 bg-muted/50 border rounded-lg">
                  <p className="text-sm font-medium mb-2">Required to save lineup:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {!isLineupComplete && <li>• Complete all roster positions</li>}
                    {isOverSalaryCap && <li>• Stay under $50,000 salary cap</li>}
                    {!hasLineupName && <li>• Enter a lineup name</li>}
                    {!hasTags && <li>• Add at least one tag</li>}
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    Note: You can still export your lineup without saving
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Player Pool */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Player Pool
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
                {sortedPlayers.length === 0 ? (
                  <div className="p-8 text-center">
                    {loading ? (
                      <div className="space-y-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p>Loading players...</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-lg font-medium text-muted-foreground">No players found</p>
                        <p className="text-sm text-muted-foreground">
                          {playerPool.length === 0 
                            ? 'No player pool data loaded. Please check your database connection and ensure there are players for the selected week.'
                            : 'No players match the current position filter.'
                          }
                        </p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>Debug info:</p>
                          <p>• Week ID: {weekId}</p>
                          <p>• Player Pool Count: {playerPool.length}</p>
                          <p>• Selected Position: {selectedPosition}</p>
                          <p>• Available Players: {Object.keys(availablePlayers).join(', ') || 'None'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
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
                            Position
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
                          onClick={() => handleSort('oprk')}
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
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedPlayers.map((player) => (
                        <TableRow 
                          key={player.id} 
                          className={`
                            ${player.isUsed ? 'bg-muted/50' : ''} 
                            ${!player.canAfford ? 'opacity-50' : ''}
                          `}
                        >
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAddPlayer(player)}
                              disabled={player.isUsed || !player.canAfford}
                              className="h-6 w-6 p-0"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/profile/${player.player.playerDkId}`}
                                className="text-primary hover:underline text-left"
                              >
                                {player.player.displayName}
                              </Link>
                              {selectedPosition === 'FLEX' && (
                                <span className={getPositionBadgeClasses(player.player.position)}>
                                  {player.player.position}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{player.player.team}</TableCell>
                          <TableCell>{player.player.position}</TableCell>
                          <TableCell>${player.salary.toLocaleString()}</TableCell>
                          <TableCell>{player.projectedPoints || 'N/A'}</TableCell>
                          <TableCell>
                            <span className={`${
                              player.oprkQuality === 'High' ? 'text-green-600' : 
                              player.oprkQuality === 'Low' ? 'text-red-600' : 
                              'text-foreground'
                            }`}>
                              {player.oprk}
                            </span>
                          </TableCell>
                          <TableCell>{player.value}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
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
              
              <Separator />
              
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
          <Card>
            <CardHeader>
              <CardTitle>Current Lineup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {roster.map((slot, index) => {
                const playerEntry = slot.player ? playerPool.find(entry => entry.player.playerDkId === slot.player!.playerDkId) : null
                return (
                  <div key={slot.position} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={getPositionBadgeClasses(slot.position)}>
                        {slot.position}
                      </span>
                      {slot.player ? (
                        <Link
                          href={`/profile/${slot.player.playerDkId}`}
                          className="text-primary hover:underline truncate"
                        >
                          {slot.player.displayName}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground italic">
                          Empty
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {slot.player ? (
                        <>
                          <span className="text-muted-foreground">
                            ${playerEntry?.salary.toLocaleString() || '0'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePlayerSelect(index, 'none')}
                            className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          Select player
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

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

      {/* Confirmation Screen */}
      {showConfirmation && savedLineup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Save className="w-5 h-5 text-green-600" />
                Lineup Saved Successfully!
              </CardTitle>
              <CardDescription>
                Your lineup has been saved and is ready to use.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Lineup Summary */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Lineup Details</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Name:</span> {savedLineup.name}</p>
                      <p><span className="font-medium">Week:</span> Week {currentWeek?.week_number} ({currentWeek?.year})</p>
                      <p><span className="font-medium">Tags:</span> {savedLineup.tags.join(', ')}</p>
                      <p><span className="font-medium">Saved:</span> {new Date().toLocaleString()}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Lineup Stats</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-medium">Total Salary:</span> ${savedLineup.salaryUsed.toLocaleString()}</p>
                      <p><span className="font-medium">Remaining:</span> ${(savedLineup.salaryCap - savedLineup.salaryUsed).toLocaleString()}</p>
                      <p><span className="font-medium">Projected Points:</span> {savedLineup.projectedPoints.toFixed(1)}</p>
                      <p><span className="font-medium">Players:</span> {savedLineup.roster.length}/9</p>
                    </div>
                  </div>
                </div>

                {/* Roster */}
                <div>
                  <h4 className="font-medium mb-3">Roster</h4>
                  <div className="space-y-2">
                    {savedLineup.roster.map((slot: LineupPlayer) => (
                      <div key={slot.position} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                        <div className="flex items-center gap-2">
                          <span className={getPositionBadgeClasses(slot.position)}>
                            {slot.position}
                          </span>
                          <span className="font-medium">{slot.name}</span>
                          <span className="text-muted-foreground">({slot.team})</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span>${slot.salary.toLocaleString()}</span>
                          <span className="text-muted-foreground">{slot.projectedPoints.toFixed(1)} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowConfirmation(false)} className="flex-1">
                  Edit Current Lineup
                </Button>
                <Button onClick={handleCloseConfirmation} className="flex-1">
                  Create Another Lineup
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lineup Optimizer Dialog */}
      <LineupOptimizer
        isOpen={showOptimizer}
        onClose={() => setShowOptimizer(false)}
        onOptimize={handleOptimize}
      />
    </div>
  )
}

