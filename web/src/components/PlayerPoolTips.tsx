'use client'

import { useState, useEffect } from 'react'
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
    { icon: 'AlertTriangle', text: 'Check final injury reports 90 minutes before kickoff', color: 'red' },
    { icon: 'Lightbulb', text: 'Monitor weather forecasts for outdoor games', color: 'yellow' },
    { icon: 'Users', text: 'Review ownership projections before lineups lock', color: 'blue' },
    { icon: 'TrendingUp', text: 'Late-week line movement can signal sharp money', color: 'green' },
  ],
  positionTips: {
    QB: {
      icon: 'Target',
      color: 'blue',
      tips: [
        { category: 'Core Evaluation', items: ['Prioritize high implied team totals (24+ points)', 'Look for QBs with rushing upside (5+ carries projected)'] },
        { category: 'Weather & Environment', items: ['Avoid QBs in games with 15+ mph winds', 'Dome games typically boost passing volume'] },
      ],
    },
    RB: {
      icon: 'TrendingUp',
      color: 'green',
      tips: [
        { category: 'Usage & Opportunity', items: ['Prioritize bellcow backs with 15+ carries + targets', 'Check snap count trends - 70%+ is elite territory'] },
        { category: 'Matchup Analysis', items: ['Target RBs vs bottom-12 run defenses', 'Check receiving work vs pass-funnel defenses'] },
      ],
    },
    WR: {
      icon: 'DollarSign',
      color: 'purple',
      tips: [
        { category: 'Volume & Targets', items: ['Target WRs with 8+ targets projected', 'Look for slot receivers in PPR formats'] },
        { category: 'Air Yards & Red Zone', items: ['Prioritize WRs with high air yards share', 'Red zone targets are crucial for TD upside'] },
      ],
    },
    TE: {
      icon: 'Trophy',
      color: 'orange',
      tips: [
        { category: 'Target Share & Red Zone', items: ['Target TEs with 15%+ target share', 'Look for TEs with high red zone target volume'] },
        { category: 'Matchup & Usage', items: ['Exploit matchups vs defenses weak to TEs', 'Consider TEs in games with high implied totals'] },
      ],
    },
    FLEX: {
      icon: 'Zap',
      color: 'indigo',
      tips: [
        { category: 'Position Flexibility', items: ['Consider RBs in pass-heavy game scripts', 'Look for WRs with rushing upside in creative offenses'] },
        { category: 'Value & Leverage', items: ['Target lower-owned players in good matchups', 'Consider TEs in high-scoring games for FLEX spots'] },
        { category: 'Game Script Analysis', items: ['Favor pass-catchers in shootout games', 'Target RBs in games with positive game script'] },
      ],
    },
    DEF: {
      icon: 'Shield',
      color: 'gray',
      tips: [
        { category: 'Turnover & Sack Upside', items: ['Target defenses vs turnover-prone QBs', 'Look for defenses with high sack rates'] },
        { category: 'Game Script & Vegas', items: ['Prioritize defenses as home favorites', 'Target defenses vs low implied team totals'] },
      ],
    },
  },
  gameTypeTips: {
    cash: {
      icon: 'DollarSign',
      title: 'Cash Game Strategy',
      color: 'green',
      description: 'Focus on consistency and high floors',
      tips: [
        { category: 'Strategy', items: ['Prioritize high floor players', 'Focus on consistent volume and safe matchups'] },
        { category: 'Player Selection', items: ['Avoid highly volatile players', 'Look for players with secure roles'] },
      ],
    },
    tournament: {
      icon: 'Trophy',
      title: 'Tournament Strategy',
      color: 'purple',
      description: 'Focus on ceiling and differentiation',
      tips: [
        { category: 'Strategy', items: ['Embrace calculated risk', 'Look for leverage spots and lower-owned players'] },
        { category: 'Player Selection', items: ['Target high ceiling players', 'Consider game stacks and correlation plays'] },
      ],
    },
  },
}

interface PlayerPoolTipsProps {
  // No props needed - tips are static and not week-dependent
}

function PlayerPoolTips({}: PlayerPoolTipsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<TipsConfigData>(defaultTipsConfig)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Load tips configuration once on mount - no dependencies needed
  useEffect(() => {
    let isMounted = true

    const loadConfig = async () => {
      try {
        console.log('PlayerPoolTips: Starting data load...')
        
        const activeConfig = await tipsService.getActiveConfiguration()
        console.log('PlayerPoolTips: API response received:', activeConfig)
        
        if (!isMounted) return

        const configData = tipsService.parseConfigurationData(activeConfig.configuration_data)
        console.log('PlayerPoolTips: Parsed config data:', configData)
        
        if (!isMounted) return

        setConfig(configData)
        setIsLoading(false)
        setHasError(false)
        console.log('PlayerPoolTips: Data loaded successfully')
      } catch (error) {
        console.error('PlayerPoolTips: Error loading config:', error)
        if (isMounted) {
          setConfig(defaultTipsConfig)
          setIsLoading(false)
          setHasError(true)
        }
      }
    }

    // Load configuration immediately
    loadConfig()

    return () => {
      isMounted = false
    }
  }, []) // No dependencies - tips are static

  // Icon mapping
  const iconMap = {
    Lightbulb,
    AlertTriangle,
    Users,
    TrendingUp,
    Target,
    DollarSign,
    Trophy,
    Shield,
    Zap
  }

  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName as keyof typeof iconMap] || Lightbulb
    return <IconComponent className="h-4 w-4" />
  }

  const getColorClasses = (color: string) => {
    const colorMap = {
      red: 'bg-red-100 text-red-800 border-red-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      gray: 'bg-gray-100 text-gray-800 border-gray-200',
      gold: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    }
    return colorMap[color as keyof typeof colorMap] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Player Evaluation Tips & Strategy
          </CardTitle>
          <CardDescription>
            Loading tips and reminders...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (hasError) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Player Evaluation Tips & Strategy
          </CardTitle>
          <CardDescription>
            Using default tips (unable to load custom configuration)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-gray-500">
            <p>Failed to load custom tips. Using default configuration.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Player Evaluation Tips & Strategy
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </CardTitle>
            <CardDescription>
              Expert insights and reminders to optimize your player selection
            </CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Weekly Reminders */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Weekly Reminders</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {config.weeklyReminders.map((reminder, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${getColorClasses(reminder.color)}`}
                  >
                    <div className="flex items-start gap-3">
                      {getIcon(reminder.icon)}
                      <p className="text-sm font-medium">{reminder.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs for Position and Game Type Tips */}
            <Tabs defaultValue="position" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="position">By Position</TabsTrigger>
                <TabsTrigger value="cash">Cash Games</TabsTrigger>
                <TabsTrigger value="tournament">Tournaments</TabsTrigger>
              </TabsList>

              <TabsContent value="position" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(config.positionTips).map(([position, positionData]) => (
                    <div key={position} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        {getIcon(positionData.icon)}
                        <h4 className="font-semibold">{position}</h4>
                        <Badge className={getColorClasses(positionData.color)}>
                          {position}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        {positionData.tips.map((tip, tipIndex) => (
                          <div key={tipIndex}>
                            <h5 className="font-medium text-sm mb-2">{tip.category}</h5>
                            <ul className="space-y-1">
                              {tip.items.map((item, itemIndex) => (
                                <li key={itemIndex} className="text-xs text-gray-600 flex items-start gap-2">
                                  <span className="text-blue-500 mt-1">•</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="cash" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {config.gameTypeTips.cash.tips.map((tip, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        {getIcon(config.gameTypeTips.cash.icon)}
                        <h4 className="font-semibold">{tip.category}</h4>
                        <Badge className={getColorClasses(config.gameTypeTips.cash.color)}>
                          Cash
                        </Badge>
                      </div>
                      <ul className="space-y-1">
                        {tip.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-green-500 mt-1">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="tournament" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {config.gameTypeTips.tournament.tips.map((tip, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        {getIcon(config.gameTypeTips.tournament.icon)}
                        <h4 className="font-semibold">{tip.category}</h4>
                        <Badge className={getColorClasses(config.gameTypeTips.tournament.color)}>
                          Tournament
                        </Badge>
                      </div>
                      <ul className="space-y-1">
                        {tip.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-yellow-500 mt-1">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

export { PlayerPoolTips }