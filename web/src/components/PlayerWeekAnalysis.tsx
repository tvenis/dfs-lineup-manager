import React from 'react'

export type WeekAnalysisData = {
  opponent?: {
    opponentAbbr?: string | null
    homeOrAway?: 'H' | 'A' | 'N'
  }
  spread?: number | null
  total?: number | null
  implied?: number | null
  oprk?: {
    value?: number
    quality?: 'High' | 'Medium' | 'Low'
  }
}

export function PlayerWeekAnalysis({ weekAnalysis, column }: { weekAnalysis: WeekAnalysisData; column: 'opponent' | 'spread' | 'total' | 'implied' | 'oprk' }) {
  if (!weekAnalysis) return null

  if (column === 'opponent') {
    const indicator = weekAnalysis.opponent?.homeOrAway === 'A' ? '@' : weekAnalysis.opponent?.homeOrAway === 'H' ? '•' : ''
    return <span className="text-sm">{indicator} {weekAnalysis.opponent?.opponentAbbr || '-'}</span>
  }

  if (column === 'spread') {
    const val = weekAnalysis.spread
    const color = typeof val === 'number' ? (val < 0 ? 'text-green-600' : val > 0 ? 'text-red-600' : 'text-foreground') : 'text-muted-foreground'
    return <span className={`text-sm ${color}`}>{typeof val === 'number' ? (val > 0 ? `+${val}` : val) : '-'}</span>
  }

  if (column === 'total') {
    return <span className="text-sm">{weekAnalysis.total ?? '-'}</span>
  }

  if (column === 'implied') {
    return <span className="text-sm">{weekAnalysis.implied ?? '-'}</span>
  }

  if (column === 'oprk') {
    const { value, quality } = weekAnalysis.oprk || {}
    const color = quality === 'High' ? 'text-green-600' : quality === 'Low' ? 'text-red-600' : 'text-foreground'
    return <span className={`text-sm ${color}`}>{value ?? '-'}</span>
  }

  return null
}


