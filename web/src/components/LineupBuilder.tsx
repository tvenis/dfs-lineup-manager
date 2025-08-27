import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'

import { Progress } from './ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

// Temporary mock interfaces to get build working
interface Player {
  id: string;
  name: string;
  team: string;
  salary: number;
  position: string;
  projectedPoints?: number;
  playerDkId: string;
}

interface PlayerPoolEntry {
  id: string;
  player: Player;
  salary: number;
  projectedPoints?: number;
}

type LineupSlotId = 'QB' | 'RB1' | 'RB2' | 'WR1' | 'WR2' | 'WR3' | 'TE' | 'FLEX' | 'DST';

type RosterSlot = {
  position: LineupSlotId
  player: Player | null
  eligiblePositions: string[]
}

export function LineupBuilder() {
  const SALARY_CAP = 50000
  
  const [lineupName, setLineupName] = useState('')
  const [tags, setTags] = useState('')
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

  // Mock data for testing
  const mockPlayerPool = useMemo<PlayerPoolEntry[]>(() => [
    {
      id: "1",
      player: {
        id: "1",
        name: "Patrick Mahomes",
        team: "KC",
        salary: 8500,
        position: "QB",
        projectedPoints: 25.5,
        playerDkId: "1"
      },
      salary: 8500,
      projectedPoints: 25.5
    },
    {
      id: "2",
      player: {
        id: "2",
        name: "Christian McCaffrey",
        team: "SF",
        salary: 9200,
        position: "RB",
        projectedPoints: 22.8,
        playerDkId: "2"
      },
      salary: 9200,
      projectedPoints: 22.8
    }
  ], []);

  // Use mock data for now
  useEffect(() => {
    setPlayerPool(mockPlayerPool);
    setLoading(false);
  }, [mockPlayerPool]);

  const totalSalary = roster.reduce((sum, slot) => {
    if (!slot.player) return sum
    const playerEntry = playerPool.find(entry => entry.player.playerDkId === slot.player!.playerDkId)
    return sum + (playerEntry?.salary || 0)
  }, 0)
  
  const remainingSalary = SALARY_CAP - totalSalary
  const filledSlots = roster.filter(slot => slot.player).length

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Lineup Builder</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lineup Configuration */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lineup Details</CardTitle>
              <CardDescription>Configure your lineup settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="lineup-name">Lineup Name</Label>
                <Input
                  id="lineup-name"
                  value={lineupName}
                  onChange={(e) => setLineupName(e.target.value)}
                  placeholder="My Lineup"
                />
              </div>
              
              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="gpp, cash, etc."
                />
              </div>
            </CardContent>
          </Card>

          {/* Salary Cap Info */}
          <Card>
            <CardHeader>
              <CardTitle>Salary Cap</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Used:</span>
                <span>${totalSalary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Remaining:</span>
                <span className={remainingSalary < 0 ? 'text-red-600' : 'text-green-600'}>
                  ${remainingSalary.toLocaleString()}
                </span>
              </div>
              <Progress value={(totalSalary / SALARY_CAP) * 100} />
            </CardContent>
          </Card>
        </div>

        {/* Roster */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Roster ({filledSlots}/9)</CardTitle>
              <CardDescription>Build your lineup by selecting players</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {roster.map((slot, index) => (
                  <div key={slot.position} className="border rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-500 mb-2">
                      {slot.position}
                    </div>
                    {slot.player ? (
                      <div className="space-y-2">
                        <div className="font-medium">{slot.player.name}</div>
                        <div className="text-sm text-gray-600">{slot.player.team}</div>
                        <div className="text-sm text-gray-600">${slot.player.salary.toLocaleString()}</div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newRoster = [...roster];
                            newRoster[index].player = null;
                            setRoster(newRoster);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">
                        No player selected
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Player Pool */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Available Players</CardTitle>
              <CardDescription>Select players to add to your lineup</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading players...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Salary</TableHead>
                      <TableHead>Projected</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {playerPool.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.player.name}</TableCell>
                        <TableCell>{entry.player.team}</TableCell>
                        <TableCell>{entry.player.position}</TableCell>
                        <TableCell>${entry.salary.toLocaleString()}</TableCell>
                        <TableCell>{entry.projectedPoints || 'N/A'}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => {
                              // Find an empty slot for this position
                              const slotIndex = roster.findIndex(slot => 
                                !slot.player && slot.eligiblePositions.includes(entry.player.position)
                              );
                              if (slotIndex !== -1) {
                                const newRoster = [...roster];
                                newRoster[slotIndex].player = entry.player;
                                setRoster(newRoster);
                              }
                            }}
                          >
                            Add
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

