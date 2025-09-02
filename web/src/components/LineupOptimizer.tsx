import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Separator } from './ui/separator'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Settings, Zap, Calculator, Users, X } from 'lucide-react'

type Player = {
  id: number
  name: string
  team: string
  opponent: string
  salary: number
  projectedPoints: number
  oprk: number
  excluded: boolean
}

type AvailablePlayers = {
  QB: Player[]
  RB: Player[]
  WR: Player[]
  TE: Player[]
  DST: Player[]
}

type DefaultPlayers = {
  QB: Player | null
  RB1: Player | null
  RB2: Player | null
  WR1: Player | null
  WR2: Player | null
  WR3: Player | null
  TE: Player | null
  FLEX: Player | null
  DST: Player | null
}

type OptimizerSettings = {
  salaryCapValue: number
  rosterSize: number
  qbMin: number
  rbMin: number
  wrMin: number
  teMin: number
  dstMin: number
  flexMin: number
  maxFromSingleTeam: number | null
  enforceQBStack: boolean
  enforceBringBack: boolean
  defaultPlayers: DefaultPlayers
}

interface LineupOptimizerProps {
  isOpen: boolean
  onClose: () => void
  onOptimize: (settings: OptimizerSettings) => void
  availablePlayers: AvailablePlayers
}

export function LineupOptimizer({ isOpen, onClose, onOptimize, availablePlayers }: LineupOptimizerProps) {
  const [settings, setSettings] = useState<OptimizerSettings>({
    salaryCapValue: 50000,
    rosterSize: 9,
    qbMin: 1,
    rbMin: 2,
    wrMin: 3,
    teMin: 1,
    dstMin: 1,
    flexMin: 1,
    maxFromSingleTeam: 4,
    enforceQBStack: true,
    enforceBringBack: false,
    defaultPlayers: {
      QB: null,
      RB1: null,
      RB2: null,
      WR1: null,
      WR2: null,
      WR3: null,
      TE: null,
      FLEX: null,
      DST: null
    }
  })

  const [isOptimizing, setIsOptimizing] = useState(false)

  const handleOptimize = async () => {
    setIsOptimizing(true)
    
    // Simulate optimization process
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setIsOptimizing(false)
    onOptimize(settings)
    onClose()
  }

  const handleReset = () => {
    setSettings({
      salaryCapValue: 50000,
      rosterSize: 9,
      qbMin: 1,
      rbMin: 2,
      wrMin: 3,
      teMin: 1,
      dstMin: 1,
      flexMin: 1,
      maxFromSingleTeam: 4,
      enforceQBStack: true,
      enforceBringBack: false,
      defaultPlayers: {
        QB: null,
        RB1: null,
        RB2: null,
        WR1: null,
        WR2: null,
        WR3: null,
        TE: null,
        FLEX: null,
        DST: null
      }
    })
  }

  const totalPositionsRequired = settings.qbMin + settings.rbMin + settings.wrMin + settings.teMin + settings.dstMin + settings.flexMin
  const isValidRoster = totalPositionsRequired === settings.rosterSize

  // Get available players for each position, filtering out excluded players
  const getPlayersForPosition = (position: keyof AvailablePlayers) => {
    return availablePlayers[position]?.filter(p => !p.excluded) || []
  }

  // Get FLEX eligible players (RB, WR, TE)
  const getFlexPlayers = () => {
    return [
      ...getPlayersForPosition('RB'),
      ...getPlayersForPosition('WR'),
      ...getPlayersForPosition('TE')
    ].sort((a, b) => a.name.localeCompare(b.name))
  }

  // Handle default player selection
  const handleDefaultPlayerChange = (position: keyof DefaultPlayers, playerId: string) => {
    if (playerId === 'none') {
      setSettings(prev => ({
        ...prev,
        defaultPlayers: {
          ...prev.defaultPlayers,
          [position]: null
        }
      }))
      return
    }

    let player: Player | null = null
    
    if (position === 'FLEX') {
      const flexPlayers = getFlexPlayers()
      player = flexPlayers.find(p => p.id === parseInt(playerId)) || null
    } else {
      const positionKey = position.replace(/\d+$/, '') as keyof AvailablePlayers
      const players = getPlayersForPosition(positionKey)
      player = players.find(p => p.id === parseInt(playerId)) || null
    }

    if (player) {
      setSettings(prev => ({
        ...prev,
        defaultPlayers: {
          ...prev.defaultPlayers,
          [position]: player
        }
      }))
    }
  }

  // Calculate total salary of default players
  const defaultPlayersSalary = Object.values(settings.defaultPlayers)
    .filter(player => player !== null)
    .reduce((sum, player) => sum + (player?.salary || 0), 0)

  const remainingSalaryAfterDefaults = settings.salaryCapValue - defaultPlayersSalary

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Lineup Optimizer
          </DialogTitle>
          <DialogDescription>
            Configure optimization settings to automatically generate your optimal lineup
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Constraints Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="w-4 h-4" />
                Constraints
              </CardTitle>
              <CardDescription>Basic lineup requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salary-cap">Salary Cap</Label>
                  <Input
                    id="salary-cap"
                    type="number"
                    value={settings.salaryCapValue}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      salaryCapValue: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roster-size">Roster Size</Label>
                  <Input
                    id="roster-size"
                    type="number"
                    value={settings.rosterSize}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      rosterSize: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Positional Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Positional Requirements</CardTitle>
              <CardDescription>Minimum players required at each position</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="qb-min">QB Minimum</Label>
                  <Input
                    id="qb-min"
                    type="number"
                    min="0"
                    max="2"
                    value={settings.qbMin}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      qbMin: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rb-min">RB Minimum</Label>
                  <Input
                    id="rb-min"
                    type="number"
                    min="0"
                    max="4"
                    value={settings.rbMin}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      rbMin: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wr-min">WR Minimum</Label>
                  <Input
                    id="wr-min"
                    type="number"
                    min="0"
                    max="4"
                    value={settings.wrMin}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      wrMin: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="te-min">TE Minimum</Label>
                  <Input
                    id="te-min"
                    type="number"
                    min="0"
                    max="2"
                    value={settings.teMin}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      teMin: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dst-min">DST Minimum</Label>
                  <Input
                    id="dst-min"
                    type="number"
                    min="0"
                    max="2"
                    value={settings.dstMin}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      dstMin: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="flex-min">FLEX Minimum</Label>
                  <Input
                    id="flex-min"
                    type="number"
                    min="0"
                    max="3"
                    value={settings.flexMin}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      flexMin: parseInt(e.target.value) || 0
                    }))}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">Total positions: {totalPositionsRequired}/9</span>
                {!isValidRoster && (
                  <Badge variant="destructive" className="text-xs">
                    Must equal {settings.rosterSize}
                  </Badge>
                )}
                {isValidRoster && (
                  <Badge variant="secondary" className="text-xs">
                    Valid
                  </Badge>
                )}
              </div>
              
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• FLEX can be filled with RB, WR, or TE</p>
                <p>• Adjust minimums to create different lineup strategies</p>
              </div>
            </CardContent>
          </Card>

          {/* Default Players Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-4 h-4" />
                Default Player Selections
              </CardTitle>
              <CardDescription>Lock in specific players for your optimized lineup</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* QB */}
                <div className="space-y-2">
                  <Label htmlFor="default-qb">Quarterback</Label>
                  <Select
                    value={settings.defaultPlayers.QB?.id.toString() || 'none'}
                    onValueChange={(value) => handleDefaultPlayerChange('QB', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select QB..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {getPlayersForPosition('QB').map((player) => (
                        <SelectItem key={player.id} value={player.id.toString()}>
                          <div className="flex justify-between items-center w-full">
                            <span>{player.name} ({player.team})</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ${player.salary.toLocaleString()}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* RB1 */}
                <div className="space-y-2">
                  <Label htmlFor="default-rb1">Running Back 1</Label>
                  <Select
                    value={settings.defaultPlayers.RB1?.id.toString() || 'none'}
                    onValueChange={(value) => handleDefaultPlayerChange('RB1', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select RB1..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {getPlayersForPosition('RB').map((player) => (
                        <SelectItem key={player.id} value={player.id.toString()}>
                          <div className="flex justify-between items-center w-full">
                            <span>{player.name} ({player.team})</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ${player.salary.toLocaleString()}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* RB2 */}
                <div className="space-y-2">
                  <Label htmlFor="default-rb2">Running Back 2</Label>
                  <Select
                    value={settings.defaultPlayers.RB2?.id.toString() || 'none'}
                    onValueChange={(value) => handleDefaultPlayerChange('RB2', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select RB2..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {getPlayersForPosition('RB').map((player) => (
                        <SelectItem key={player.id} value={player.id.toString()}>
                          <div className="flex justify-between items-center w-full">
                            <span>{player.name} ({player.team})</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ${player.salary.toLocaleString()}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* WR1 */}
                <div className="space-y-2">
                  <Label htmlFor="default-wr1">Wide Receiver 1</Label>
                  <Select
                    value={settings.defaultPlayers.WR1?.id.toString() || 'none'}
                    onValueChange={(value) => handleDefaultPlayerChange('WR1', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select WR1..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {getPlayersForPosition('WR').map((player) => (
                        <SelectItem key={player.id} value={player.id.toString()}>
                          <div className="flex justify-between items-center w-full">
                            <span>{player.name} ({player.team})</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ${player.salary.toLocaleString()}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* WR2 */}
                <div className="space-y-2">
                  <Label htmlFor="default-wr2">Wide Receiver 2</Label>
                  <Select
                    value={settings.defaultPlayers.WR2?.id.toString() || 'none'}
                    onValueChange={(value) => handleDefaultPlayerChange('WR2', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select WR2..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {getPlayersForPosition('WR').map((player) => (
                        <SelectItem key={player.id} value={player.id.toString()}>
                          <div className="flex justify-between items-center w-full">
                            <span>{player.name} ({player.team})</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ${player.salary.toLocaleString()}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* WR3 */}
                <div className="space-y-2">
                  <Label htmlFor="default-wr3">Wide Receiver 3</Label>
                  <Select
                    value={settings.defaultPlayers.WR3?.id.toString() || 'none'}
                    onValueChange={(value) => handleDefaultPlayerChange('WR3', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select WR3..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {getPlayersForPosition('WR').map((player) => (
                        <SelectItem key={player.id} value={player.id.toString()}>
                          <div className="flex justify-between items-center w-full">
                            <span>{player.name} ({player.team})</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ${player.salary.toLocaleString()}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* TE */}
                <div className="space-y-2">
                  <Label htmlFor="default-te">Tight End</Label>
                  <Select
                    value={settings.defaultPlayers.TE?.id.toString() || 'none'}
                    onValueChange={(value) => handleDefaultPlayerChange('TE', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select TE..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {getPlayersForPosition('TE').map((player) => (
                        <SelectItem key={player.id} value={player.id.toString()}>
                          <div className="flex justify-between items-center w-full">
                            <span>{player.name} ({player.team})</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ${player.salary.toLocaleString()}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* FLEX */}
                <div className="space-y-2">
                  <Label htmlFor="default-flex">FLEX (RB/WR/TE)</Label>
                  <Select
                    value={settings.defaultPlayers.FLEX?.id.toString() || 'none'}
                    onValueChange={(value) => handleDefaultPlayerChange('FLEX', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select FLEX..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {getFlexPlayers().map((player) => (
                        <SelectItem key={player.id} value={player.id.toString()}>
                          <div className="flex justify-between items-center w-full">
                            <span>{player.name} ({player.team})</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {Object.keys(availablePlayers).find(pos =>
                                  availablePlayers[pos as keyof typeof availablePlayers].some(p => p.id === player.id)
                                )}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                ${player.salary.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* DST */}
                <div className="space-y-2">
                  <Label htmlFor="default-dst">Defense/Special Teams</Label>
                  <Select
                    value={settings.defaultPlayers.DST?.id.toString() || 'none'}
                    onValueChange={(value) => handleDefaultPlayerChange('DST', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select DST..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {getPlayersForPosition('DST').map((player) => (
                        <SelectItem key={player.id} value={player.id.toString()}>
                          <div className="flex justify-between items-center w-full">
                            <span>{player.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ${player.salary.toLocaleString()}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Default Players Summary */}
              {defaultPlayersSalary > 0 && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-center text-sm">
                    <span>Default Players Salary:</span>
                    <span className="font-medium">${defaultPlayersSalary.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Remaining for Optimization:</span>
                    <span className={remainingSalaryAfterDefaults < 0 ? 'text-destructive' : ''}>
                      ${remainingSalaryAfterDefaults.toLocaleString()}
                    </span>
                  </div>
                  {remainingSalaryAfterDefaults < 0 && (
                    <p className="text-xs text-destructive mt-1">
                      Default players exceed salary cap
                    </p>
                  )}
                </div>
              )}

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Selected players will be locked into the optimized lineup</p>
                <p>• The optimizer will fill remaining positions with optimal choices</p>
                <p>• Clear selections by choosing "None" from the dropdown</p>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Advanced Options</CardTitle>
              <CardDescription>Additional constraints and strategy settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="max-team">Maximum Players from Single Team</Label>
                <Input
                  id="max-team"
                  type="number"
                  min="1"
                  max="8"
                  value={settings.maxFromSingleTeam || ''}
                  placeholder="No limit"
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    maxFromSingleTeam: e.target.value ? parseInt(e.target.value) : null
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for no team stacking limit
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="qb-stack">Enforce QB Stack</Label>
                    <p className="text-xs text-muted-foreground">
                      Include at least one receiver from the same team as your QB
                    </p>
                  </div>
                  <Switch
                    id="qb-stack"
                    checked={settings.enforceQBStack}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      enforceQBStack: checked
                    }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="bring-back">Enforce Bring-back</Label>
                    <p className="text-xs text-muted-foreground">
                      Include players from the opposing team when stacking
                    </p>
                  </div>
                  <Switch
                    id="bring-back"
                    checked={settings.enforceBringBack}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      enforceBringBack: checked
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleOptimize} 
            disabled={!isValidRoster || isOptimizing || remainingSalaryAfterDefaults < 0}
            className="gap-2"
          >
            {isOptimizing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Generate Optimal Lineup
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}