import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Separator } from './ui/separator'
import { Badge } from './ui/badge'
import { Settings, Zap, Calculator } from 'lucide-react'

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
}

interface LineupOptimizerProps {
  isOpen: boolean
  onClose: () => void
  onOptimize: (settings: OptimizerSettings) => void
}

export function LineupOptimizer({ isOpen, onClose, onOptimize }: LineupOptimizerProps) {
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
    enforceBringBack: false
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
      enforceBringBack: false
    })
  }

  const totalPositionsRequired = settings.qbMin + settings.rbMin + settings.wrMin + settings.teMin + settings.dstMin + settings.flexMin
  const isValidRoster = totalPositionsRequired === settings.rosterSize

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
            disabled={!isValidRoster || isOptimizing}
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
