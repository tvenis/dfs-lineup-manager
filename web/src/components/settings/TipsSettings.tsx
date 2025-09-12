import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'
import { Alert, AlertDescription } from '../ui/alert'
import { 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw, 
  Download, 
  Upload, 
  Target, 
  DollarSign, 
  Trophy,
  CheckCircle,
  AlertTriangle,
  Lightbulb
} from 'lucide-react'
import { toast } from 'sonner'
import { tipsService, TipsConfigData } from '@/lib/tipsService'

// Default tips configuration
export const defaultTipsConfig = {
  weeklyReminders: [
    {
      icon: 'AlertTriangle',
      text: 'Check final injury reports 90 minutes before kickoff',
      color: 'red'
    },
    {
      icon: 'Lightbulb',
      text: 'Monitor weather forecasts for outdoor games',
      color: 'yellow'
    },
    {
      icon: 'Users',
      text: 'Review ownership projections before lineups lock',
      color: 'blue'
    },
    {
      icon: 'TrendingUp',
      text: 'Late-week line movement can signal sharp money',
      color: 'green'
    }
  ],
  positionTips: {
    QB: {
      icon: 'Target',
      color: 'blue',
      tips: [
        {
          category: 'Core Evaluation',
          items: [
            'Prioritize high implied team totals (24+ points)',
            'Look for QBs with rushing upside (5+ carries projected)',
            'Target favorable matchups vs bottom-10 pass defenses',
            'Consider game script - avoid heavy underdogs in blowout spots'
          ]
        },
        {
          category: 'Weather & Environment',
          items: [
            'Avoid QBs in games with 15+ mph winds',
            'Dome games typically boost passing volume',
            'Cold weather favors running QBs over pocket passers'
          ]
        },
        {
          category: 'Advanced Metrics',
          items: [
            'Target QBs with 35+ pass attempts projected',
            'Red zone efficiency matters - look for goal line rushing TDs',
            'Check pace of play - faster teams = more opportunities'
          ]
        }
      ]
    },
    RB: {
      icon: 'TrendingUp',
      color: 'green',
      tips: [
        {
          category: 'Usage & Opportunity',
          items: [
            'Prioritize bellcow backs with 15+ carries + targets',
            'Check snap count trends - 70%+ is elite territory',
            'Target RBs in positive game scripts (favorites)',
            'Look for goal line backs in high-scoring games'
          ]
        },
        {
          category: 'Matchup Analysis',
          items: [
            'Target RBs vs bottom-12 run defenses',
            'Check receiving work vs pass-funnel defenses',
            'Monitor injury reports for backfield competition',
            'Weather favors ground games - target in bad conditions'
          ]
        },
        {
          category: 'Game Theory',
          items: [
            'Lower-owned backs in good spots = GPP leverage',
            'Stacking RBs with their QBs creates correlation',
            'Avoid RBs in potential negative game scripts'
          ]
        }
      ]
    },
    WR: {
      icon: 'Zap',
      color: 'purple',
      tips: [
        {
          category: 'Target Share & Routes',
          items: [
            'Target WRs with 20%+ target share',
            'Look for 7+ targets projected consistently',
            'Slot receivers safer in PPR formats',
            'Red zone targets are crucial for TD upside'
          ]
        },
        {
          category: 'Matchup Evaluation',
          items: [
            'Target WRs vs bottom-10 pass defenses',
            'Check coverage matchups - avoid elite shutdown corners',
            'Look for WRs likely to see single coverage',
            'Pace-up spots increase target opportunity'
          ]
        },
        {
          category: 'Correlation & Stacking',
          items: [
            'Stack WRs with their QBs for ceiling games',
            'Bring-back stacks work in shootout scenarios',
            'Multiple WRs from same team risky but high ceiling'
          ]
        }
      ]
    },
    TE: {
      icon: 'Shield',
      color: 'orange',
      tips: [
        {
          category: 'Usage Patterns',
          items: [
            'Target TEs with 6+ targets projected',
            'Red zone usage more important than yardage',
            'Look for TEs in pass-heavy offenses',
            'Check if TE is primary safety valve for QB'
          ]
        },
        {
          category: 'Matchup Identification',
          items: [
            'Target TEs vs LB coverage (easier matchups)',
            'Look for TEs vs teams allowing 8+ TE fantasy points',
            'Check snap count - 70%+ indicates heavy usage',
            'Injury to WRs boosts TE target share'
          ]
        },
        {
          category: 'Strategy Notes',
          items: [
            'TE is often the contrarian play in tournaments',
            'Pay up for elite TEs in cash games',
            'Lower-priced TEs need touchdown upside to be viable'
          ]
        }
      ]
    },
    DEF: {
      icon: 'Shield',
      color: 'red',
      tips: [
        {
          category: 'Sack & Pressure Upside',
          items: [
            'Target defenses vs mobile QBs who take sacks',
            'Look for defenses vs poor offensive lines',
            'Check injury reports for O-line availability',
            'Weather can increase sack opportunities'
          ]
        },
        {
          category: 'Turnover Opportunities',
          items: [
            'Target defenses vs turnover-prone QBs',
            'Road QBs more likely to turn ball over',
            'Check if opposing offense is short-handed',
            'Pace-down games limit defensive opportunities'
          ]
        },
        {
          category: 'Game Script',
          items: [
            'Avoid defenses in potential shootouts',
            'Target defenses as moderate favorites',
            'Check implied team totals - under 21 points ideal',
            'Consider punt/kick return upside'
          ]
        }
      ]
    }
  },
  gameTypeTips: {
    cash: {
      icon: 'DollarSign',
      title: 'Cash Game Strategy',
      color: 'green',
      description: 'Focus on consistency and high floors',
      tips: [
        {
          category: 'Player Selection',
          items: [
            'Prioritize players with 15+ point floors',
            'Target players in positive game scripts',
            'Avoid boom-or-bust players',
            'Pay up for consistent, high-volume players'
          ]
        },
        {
          category: 'Roster Construction',
          items: [
            'Build around 1-2 studs, fill with consistent value',
            'Avoid stacking unless both players have high floors',
            'Minimize exposure to weather-dependent games',
            'Use players with safe workloads over upside plays'
          ]
        },
        {
          category: 'Game Theory',
          items: [
            'Ownership matters less - play the best plays',
            'Avoid players with significant injury risk',
            'Target dome games for consistent conditions',
            'Use proven veterans over rookies/inexperienced players'
          ]
        }
      ]
    },
    tournament: {
      icon: 'Trophy',
      title: 'Tournament Strategy',
      color: 'purple',
      description: 'Focus on ceiling and differentiation',
      tips: [
        {
          category: 'Leverage & Ownership',
          items: [
            'Target players projected for <10% ownership',
            'Fade chalk in favor of similar-priced alternatives',
            'Use game theory to find contrarian angles',
            'Consider narrative-driven ownership patterns'
          ]
        },
        {
          category: 'Ceiling Plays',
          items: [
            'Target players with 30+ point upside',
            'Prioritize TD-dependent players in good spots',
            'Use players in potential shootout games',
            'Consider boom-or-bust players with leverage'
          ]
        },
        {
          category: 'Stacking Strategy',
          items: [
            'QB + 2 WRs from same team for ceiling',
            'Bring-back stacks in high-total games',
            'Consider game stacks (players from both teams)',
            'Use correlated lineups for tournament leverage'
          ]
        },
        {
          category: 'Risk Management',
          items: [
            'Enter multiple lineups with different approaches',
            'Balance some safety with ceiling plays',
            'Consider late-swap based on ownership reveals',
            'Don\'t chase ownership - focus on process'
          ]
        }
      ]
    }
  }
}

// Custom hook for managing tips configuration
export function useTipsConfig() {
  const [config, setConfig] = useState<TipsConfigData>(defaultTipsConfig)
  const [isLoading, setIsLoading] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)
  const [currentConfigId, setCurrentConfigId] = useState<number | null>(null)

  useEffect(() => {
    loadActiveConfiguration()
  }, [])

  const loadActiveConfiguration = async () => {
    try {
      setIsLoading(true)
      const activeConfig = await tipsService.getActiveConfiguration()
      const configData = tipsService.parseConfigurationData(activeConfig.configuration_data)
      setConfig(configData)
      setCurrentConfigId(activeConfig.id)
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to load active tips config:', error)
      toast.error('Failed to load tips configuration')
      // Fall back to default config
      setConfig(defaultTipsConfig)
    } finally {
      setIsLoading(false)
    }
  }

  const saveConfig = async (newConfig: TipsConfigData) => {
    try {
      const configDataString = tipsService.stringifyConfigurationData(newConfig)
      
      if (currentConfigId) {
        // Update existing configuration
        await tipsService.updateConfiguration(currentConfigId, {
          configuration_data: configDataString
        })
      } else {
        // Create new configuration
        const newConfigRecord = await tipsService.createConfiguration({
          name: 'Custom Configuration',
          description: 'User-created tips configuration',
          is_active: true,
          configuration_data: configDataString
        })
        setCurrentConfigId(newConfigRecord.id)
      }
      
      setConfig(newConfig)
      setHasChanges(false)
      toast.success('Tips configuration saved successfully')
    } catch (error) {
      console.error('Failed to save tips config:', error)
      toast.error('Failed to save tips configuration')
    }
  }

  const resetToDefaults = () => {
    setConfig(defaultTipsConfig)
    setHasChanges(true)
    toast.info('Configuration reset to defaults (not saved yet)')
  }

  const exportConfig = async () => {
    try {
      if (currentConfigId) {
        const exportData = await tipsService.exportConfiguration(currentConfigId)
        const dataStr = JSON.stringify(exportData, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `dfs-tips-config-${exportData.name}.json`
        link.click()
        URL.revokeObjectURL(url)
        toast.success('Configuration exported successfully')
      } else {
        // Export current config as JSON
        const dataStr = JSON.stringify(config, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'dfs-tips-config.json'
        link.click()
        URL.revokeObjectURL(url)
        toast.success('Configuration exported successfully')
      }
    } catch (error) {
      console.error('Failed to export config:', error)
      toast.error('Failed to export configuration')
    }
  }

  const importConfig = (file: File) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string)
        
        // Check if it's a full export (with metadata) or just config data
        let configData: TipsConfigData
        if (importedData.configuration_data) {
          configData = importedData.configuration_data
        } else {
          configData = importedData
        }
        
        setConfig(configData)
        setHasChanges(true)
        toast.success('Configuration imported successfully (not saved yet)')
      } catch (error) {
        console.error('Failed to import config:', error)
        toast.error('Failed to import configuration file')
      }
    }
    reader.readAsText(file)
  }

  return {
    config,
    setConfig,
    saveConfig,
    resetToDefaults,
    exportConfig,
    importConfig,
    isLoading,
    hasChanges,
    setHasChanges
  }
}

export function TipsSettings() {
  const {
    config,
    setConfig,
    saveConfig,
    resetToDefaults,
    exportConfig,
    importConfig,
    isLoading,
    hasChanges,
    setHasChanges
  } = useTipsConfig()

  const handleSave = () => {
    saveConfig(config)
  }

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      importConfig(file)
    }
  }

  const updateWeeklyReminder = (index: number, field: string, value: string) => {
    const newReminders = [...config.weeklyReminders]
    newReminders[index] = { ...newReminders[index], [field]: value }
    setConfig({ ...config, weeklyReminders: newReminders })
    setHasChanges(true)
  }

  const addWeeklyReminder = () => {
    const newReminder = { icon: 'Lightbulb', text: 'New reminder', color: 'blue' }
    setConfig({
      ...config,
      weeklyReminders: [...config.weeklyReminders, newReminder]
    })
    setHasChanges(true)
  }

  const removeWeeklyReminder = (index: number) => {
    const newReminders = config.weeklyReminders.filter((_, i) => i !== index)
    setConfig({ ...config, weeklyReminders: newReminders })
    setHasChanges(true)
  }

  const updatePositionTip = (position: string, categoryIndex: number, itemIndex: number, value: string) => {
    const newConfig = { ...config }
    newConfig.positionTips[position as keyof typeof config.positionTips].tips[categoryIndex].items[itemIndex] = value
    setConfig(newConfig)
    setHasChanges(true)
  }

  const addPositionTipItem = (position: string, categoryIndex: number) => {
    const newConfig = { ...config }
    newConfig.positionTips[position as keyof typeof config.positionTips].tips[categoryIndex].items.push('New tip')
    setConfig(newConfig)
    setHasChanges(true)
  }

  const removePositionTipItem = (position: string, categoryIndex: number, itemIndex: number) => {
    const newConfig = { ...config }
    newConfig.positionTips[position as keyof typeof config.positionTips].tips[categoryIndex].items = 
      newConfig.positionTips[position as keyof typeof config.positionTips].tips[categoryIndex].items.filter((_, i) => i !== itemIndex)
    setConfig(newConfig)
    setHasChanges(true)
  }

  const updateGameTypeTip = (gameType: string, categoryIndex: number, itemIndex: number, value: string) => {
    const newConfig = { ...config }
    newConfig.gameTypeTips[gameType as keyof typeof config.gameTypeTips].tips[categoryIndex].items[itemIndex] = value
    setConfig(newConfig)
    setHasChanges(true)
  }

  if (isLoading) {
    return <div className="p-6">Loading tips configuration...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2>Player Pool Tips Configuration</h2>
          <p className="text-muted-foreground">
            Customize the tips and strategy guidance shown in the Player Pool
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="gap-1">
              <AlertTriangle className="w-3 h-3" />
              Unsaved Changes
            </Badge>
          )}
          
          <Button variant="outline" size="sm" onClick={exportConfig}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          </div>
          
          <Button variant="outline" size="sm" onClick={resetToDefaults}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </Button>
          
          <Button onClick={handleSave} disabled={!hasChanges}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {hasChanges && (
        <Alert>
          <CheckCircle className="w-4 h-4" />
          <AlertDescription>
            You have unsaved changes. Click "Save Changes" to persist your modifications.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="reminders" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="reminders">Weekly Reminders</TabsTrigger>
          <TabsTrigger value="positions">Position Tips</TabsTrigger>
          <TabsTrigger value="cash">Cash Strategy</TabsTrigger>
          <TabsTrigger value="tournament">Tournament Strategy</TabsTrigger>
        </TabsList>

        <TabsContent value="reminders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Weekly Reminders
              </CardTitle>
              <CardDescription>
                Quick reminder cards shown at the top of the tips section
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.weeklyReminders.map((reminder, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <Input
                    value={reminder.icon}
                    onChange={(e) => updateWeeklyReminder(index, 'icon', e.target.value)}
                    placeholder="Icon name"
                    className="w-32"
                  />
                  <Input
                    value={reminder.text}
                    onChange={(e) => updateWeeklyReminder(index, 'text', e.target.value)}
                    placeholder="Reminder text"
                    className="flex-1"
                  />
                  <Input
                    value={reminder.color}
                    onChange={(e) => updateWeeklyReminder(index, 'color', e.target.value)}
                    placeholder="Color"
                    className="w-24"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeWeeklyReminder(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button onClick={addWeeklyReminder} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Weekly Reminder
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <Accordion type="single" collapsible className="w-full">
            {Object.entries(config.positionTips).map(([position, positionData]) => (
              <AccordionItem key={position} value={position}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    <span>{position} Position Tips</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4">
                  {positionData.tips.map((category, categoryIndex) => (
                    <Card key={categoryIndex}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{category.category}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {category.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex items-center gap-2">
                            <Textarea
                              value={item}
                              onChange={(e) => updatePositionTip(position, categoryIndex, itemIndex, e.target.value)}
                              className="flex-1 min-h-[60px]"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removePositionTipItem(position, categoryIndex, itemIndex)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          onClick={() => addPositionTipItem(position, categoryIndex)}
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Tip
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>

        <TabsContent value="cash" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Cash Game Strategy Tips
              </CardTitle>
              <CardDescription>
                Strategy guidance for cash games (50/50s, double-ups, head-to-heads)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.gameTypeTips.cash.tips.map((category, categoryIndex) => (
                <div key={categoryIndex} className="space-y-2">
                  <h4 className="font-medium">{category.category}</h4>
                  {category.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center gap-2">
                      <Textarea
                        value={item}
                        onChange={(e) => updateGameTypeTip('cash', categoryIndex, itemIndex, e.target.value)}
                        className="flex-1 min-h-[60px]"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newConfig = { ...config }
                          newConfig.gameTypeTips.cash.tips[categoryIndex].items = 
                            newConfig.gameTypeTips.cash.tips[categoryIndex].items.filter((_, i) => i !== itemIndex)
                          setConfig(newConfig)
                          setHasChanges(true)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tournament" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Tournament Strategy Tips
              </CardTitle>
              <CardDescription>
                Strategy guidance for tournaments (GPPs, contests with large fields)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.gameTypeTips.tournament.tips.map((category, categoryIndex) => (
                <div key={categoryIndex} className="space-y-2">
                  <h4 className="font-medium">{category.category}</h4>
                  {category.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center gap-2">
                      <Textarea
                        value={item}
                        onChange={(e) => updateGameTypeTip('tournament', categoryIndex, itemIndex, e.target.value)}
                        className="flex-1 min-h-[60px]"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newConfig = { ...config }
                          newConfig.gameTypeTips.tournament.tips[categoryIndex].items = 
                            newConfig.gameTypeTips.tournament.tips[categoryIndex].items.filter((_, i) => i !== itemIndex)
                          setConfig(newConfig)
                          setHasChanges(true)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}