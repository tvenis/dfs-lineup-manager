'use client'

import { useState, useEffect, useLayoutEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { 
  Lightbulb, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle,
  Users,
  TrendingUp,
  Target,
  DollarSign,
  Trophy,
  Shield,
  Zap
} from 'lucide-react'
import { tipsService, TipsConfigData } from '@/lib/tipsService'

// Default tips configuration (same as in TipsSettings)
const defaultTipsConfig = {
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
            'Monitor injury reports for backfield competition'
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
            'Look for WRs likely to see single coverage'
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
            'Check snap count - 70%+ indicates heavy usage'
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
            'Check if opposing offense is short-handed'
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
        }
      ]
    }
  }
}

interface PlayerPoolTipsProps {
  selectedWeek: number
}

function PlayerPoolTips({ selectedWeek }: PlayerPoolTipsProps) {
  console.log('PlayerPoolTips: Component rendered with selectedWeek:', selectedWeek)
  console.log('PlayerPoolTips: tipsService available:', typeof tipsService)
  console.log('PlayerPoolTips: useState available:', typeof useState)
  console.log('PlayerPoolTips: useEffect available:', typeof useEffect)
  
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<TipsConfigData>(defaultTipsConfig)
  const [isLoading, setIsLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Force client-side mounting with useState callback
  useEffect(() => {
    console.log('PlayerPoolTips: Mount effect running')
    
    // Use useState callback to ensure this runs after hydration
    setMounted(prev => {
      console.log('PlayerPoolTips: setMounted callback triggered')
      
      // Load data immediately after mounting
      const loadConfig = async () => {
        try {
          console.log('PlayerPoolTips: Calling tipsService.getActiveConfiguration()')
          const activeConfig = await tipsService.getActiveConfiguration()
          console.log('PlayerPoolTips: Raw API response:', activeConfig)
          
          const configData = tipsService.parseConfigurationData(activeConfig.configuration_data)
          console.log('PlayerPoolTips: Parsed config data:', configData)
          console.log('PlayerPoolTips: QB tips count:', configData.positionTips?.QB?.tips?.length)
          
          setConfig(configData)
          setIsLoading(false)
        } catch (error) {
          console.error('PlayerPoolTips: Failed to load tips config:', error)
          console.log('PlayerPoolTips: Falling back to default config')
          setConfig(defaultTipsConfig)
          setIsLoading(false)
        }
      }
      
      loadConfig()
      return true
    })
  }, []) // Empty dependency array

  const loadActiveConfiguration = async () => {
    try {
      console.log('PlayerPoolTips: Starting loadActiveConfiguration')
      setIsLoading(true)
      console.log('PlayerPoolTips: Loading configuration for week', selectedWeek)
      console.log('PlayerPoolTips: API URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
      
      console.log('PlayerPoolTips: About to call tipsService.getActiveConfiguration()')
      const activeConfig = await tipsService.getActiveConfiguration()
      console.log('PlayerPoolTips: Raw API response received:', activeConfig)
      
      console.log('PlayerPoolTips: About to parse configuration data')
      const configData = tipsService.parseConfigurationData(activeConfig.configuration_data)
      
      console.log('PlayerPoolTips: Loaded config from API:', configData)
      console.log('PlayerPoolTips: QB tips count:', configData.positionTips?.QB?.tips?.length)
      
      console.log('PlayerPoolTips: Setting config state')
      setConfig(configData)
      console.log('PlayerPoolTips: Config state set successfully')
    } catch (error) {
      console.error('PlayerPoolTips: Error in loadActiveConfiguration:', error)
      console.error('PlayerPoolTips: Error type:', typeof error)
      if (error instanceof Error) {
        console.error('PlayerPoolTips: Error message:', error.message)
        console.error('PlayerPoolTips: Error stack:', error.stack)
      }
      console.log('PlayerPoolTips: Falling back to default config')
      console.log('PlayerPoolTips: Default QB tips count:', defaultTipsConfig.positionTips.QB.tips.length)
      setConfig(defaultTipsConfig)
    } finally {
      console.log('PlayerPoolTips: Setting isLoading to false')
      setIsLoading(false)
      console.log('PlayerPoolTips: loadActiveConfiguration completed')
    }
  }

  const getIconComponent = (iconName: string) => {
    const iconMap = {
      'AlertTriangle': AlertTriangle,
      'Lightbulb': Lightbulb,
      'Users': Users,
      'TrendingUp': TrendingUp,
      'Target': Target,
      'DollarSign': DollarSign,
      'Trophy': Trophy,
      'Shield': Shield,
      'Zap': Zap
    }
    return iconMap[iconName as keyof typeof iconMap] || Lightbulb
  }

  const getColorClasses = (color: string) => {
    const colorMap = {
      'red': 'bg-red-100 text-red-600',
      'yellow': 'bg-yellow-100 text-yellow-600',
      'blue': 'bg-blue-100 text-blue-600',
      'green': 'bg-green-100 text-green-600',
      'purple': 'bg-purple-100 text-purple-600',
      'orange': 'bg-orange-100 text-orange-600'
    }
    return colorMap[color as keyof typeof colorMap] || 'bg-gray-100 text-gray-600'
  }

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="tracking-tight text-lg font-semibold">Player Evaluation Tips & Strategy</h3>
                <p className="text-sm text-muted-foreground">Loading tips...</p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-dashed">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Lightbulb className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">
                    Player Evaluation Tips & Strategy
                  </CardTitle>
                  <CardDescription>
                    Position-specific guidance and game type strategies for Week {selectedWeek}
                  </CardDescription>
                </div>
              </div>
              {isOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-6">
              {/* Weekly Reminders */}
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-3">Weekly Reminders</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {config.weeklyReminders.map((reminder, index) => {
                    const IconComponent = getIconComponent(reminder.icon)
                    return (
                      <div
                        key={index}
                        className={`flex items-center gap-3 p-4 rounded-lg ${getColorClasses(reminder.color)}`}
                      >
                        <IconComponent className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-800">{reminder.text}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Tabbed Interface */}
              <Tabs defaultValue="position" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-100">
                  <TabsTrigger value="position" className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    By Position
                  </TabsTrigger>
                  <TabsTrigger value="cash" className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Cash Games
                  </TabsTrigger>
                  <TabsTrigger value="tournament" className="flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Tournaments
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="position" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(config.positionTips).map(([position, positionData]) => {
                      const IconComponent = getIconComponent(positionData.icon)
                      return (
                        <div key={position} className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <IconComponent className={`w-4 h-4 text-${positionData.color}-600`} />
                            <h5 className="font-medium text-sm">{position}</h5>
                          </div>
                          <div className="space-y-2">
                            {positionData.tips.slice(0, 2).map((category, categoryIndex) => (
                              <div key={categoryIndex}>
                                <h6 className="text-xs font-medium text-gray-600 mb-1">
                                  {category.category}
                                </h6>
                                <ul className="space-y-1">
                                  {category.items.slice(0, 2).map((item, itemIndex) => (
                                    <li key={itemIndex} className="text-xs text-gray-600">
                                      • {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="cash" className="mt-4">
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <h5 className="font-medium text-sm">Cash Game Strategy</h5>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">Focus on consistency and high floors</p>
                      <div className="space-y-3">
                        {config.gameTypeTips.cash.tips.map((category, categoryIndex) => (
                          <div key={categoryIndex}>
                            <h6 className="text-xs font-medium text-gray-600 mb-2">
                              {category.category}
                            </h6>
                            <ul className="space-y-1">
                              {category.items.map((item, itemIndex) => (
                                <li key={itemIndex} className="text-xs text-gray-600">
                                  • {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="tournament" className="mt-4">
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Trophy className="w-4 h-4 text-purple-600" />
                        <h5 className="font-medium text-sm">Tournament Strategy</h5>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">Focus on ceiling and differentiation</p>
                      <div className="space-y-3">
                        {config.gameTypeTips.tournament.tips.map((category, categoryIndex) => (
                          <div key={categoryIndex}>
                            <h6 className="text-xs font-medium text-gray-600 mb-2">
                              {category.category}
                            </h6>
                            <ul className="space-y-1">
                              {category.items.map((item, itemIndex) => (
                                <li key={itemIndex} className="text-xs text-gray-600">
                                  • {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Settings Link */}
              <div className="pt-4 border-t">
                <p className="text-xs text-gray-500 text-center">
                  Customize these tips in{' '}
                  <a 
                    href="/settings" 
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Settings → Player Pool Tips
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

export { PlayerPoolTips }
