"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DKDefenseScoreCardProps {
  dkDefenseScore: number | null;
  pointsAllowed: number | null;
  defSacks: number | null;
  defInterceptions: number | null;
  defTds: number | null;
  specialTeamsTds: number | null;
  defSafeties: number | null;
  className?: string;
}

export function DKDefenseScoreCard({
  dkDefenseScore,
  pointsAllowed,
  defSacks,
  defInterceptions,
  defTds,
  specialTeamsTds,
  defSafeties,
  className = ""
}: DKDefenseScoreCardProps) {
  // Calculate score breakdown
  const getScoreBreakdown = () => {
    const breakdown = [];
    
    if (defSacks && defSacks > 0) {
      breakdown.push({ label: 'Sacks', value: defSacks, points: defSacks * 1 });
    }
    
    if (defInterceptions && defInterceptions > 0) {
      breakdown.push({ label: 'INTs', value: defInterceptions, points: defInterceptions * 2 });
    }
    
    if (defTds && defTds > 0) {
      breakdown.push({ label: 'Def TDs', value: defTds, points: defTds * 6 });
    }
    
    if (specialTeamsTds && specialTeamsTds > 0) {
      breakdown.push({ label: 'ST TDs', value: specialTeamsTds, points: specialTeamsTds * 6 });
    }
    
    if (defSafeties && defSafeties > 0) {
      breakdown.push({ label: 'Safeties', value: defSafeties, points: defSafeties * 2 });
    }
    
    // Points allowed bonus
    if (pointsAllowed !== null && pointsAllowed !== undefined) {
      let pointsAllowedBonus = 0;
      if (pointsAllowed === 0) pointsAllowedBonus = 10;
      else if (pointsAllowed >= 1 && pointsAllowed <= 6) pointsAllowedBonus = 7;
      else if (pointsAllowed >= 7 && pointsAllowed <= 13) pointsAllowedBonus = 4;
      else if (pointsAllowed >= 14 && pointsAllowed <= 20) pointsAllowedBonus = 1;
      else if (pointsAllowed >= 21 && pointsAllowed <= 27) pointsAllowedBonus = 0;
      else if (pointsAllowed >= 28 && pointsAllowed <= 34) pointsAllowedBonus = -1;
      else if (pointsAllowed >= 35) pointsAllowedBonus = -4;
      
      if (pointsAllowedBonus !== 0) {
        breakdown.push({ 
          label: 'Pts Allowed', 
          value: pointsAllowed, 
          points: pointsAllowedBonus 
        });
      }
    }
    
    return breakdown;
  };

  const breakdown = getScoreBreakdown();
  
  // Get color for DK score
  const getScoreColor = (score: number | null) => {
    if (score === null || score === undefined) return 'text-gray-500';
    if (score >= 10) return 'text-green-600 font-semibold';
    if (score >= 5) return 'text-yellow-600';
    if (score >= 0) return 'text-orange-600';
    return 'text-red-600';
  };

  // Get color for points allowed
  const getPointsAllowedColor = (points: number | null) => {
    if (points === null || points === undefined) return 'text-gray-500';
    if (points <= 6) return 'text-green-600 font-semibold';
    if (points <= 13) return 'text-yellow-600';
    if (points <= 20) return 'text-orange-600';
    return 'text-red-600';
  };

  if (dkDefenseScore === null && pointsAllowed === null) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">DK Defense Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500">No data available</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">DK Defense Score</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Total Score */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Total Score:</span>
          <span className={`text-lg font-bold ${getScoreColor(dkDefenseScore)}`}>
            {dkDefenseScore?.toFixed(1) || 'N/A'}
          </span>
        </div>

        {/* Points Allowed */}
        {pointsAllowed !== null && (
          <div className="flex items-center justify-between">
            <span className="text-sm">Points Allowed:</span>
            <Badge variant="outline" className={getPointsAllowedColor(pointsAllowed)}>
              {pointsAllowed}
            </Badge>
          </div>
        )}

        {/* Score Breakdown */}
        {breakdown.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-600">Breakdown:</div>
            <div className="space-y-1">
              {breakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">
                    {item.label} ({item.value})
                  </span>
                  <span className={`font-medium ${
                    item.points > 0 ? 'text-green-600' : 
                    item.points < 0 ? 'text-red-600' : 
                    'text-gray-600'
                  }`}>
                    {item.points > 0 ? '+' : ''}{item.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No stats message */}
        {breakdown.length === 0 && (
          <div className="text-xs text-gray-500">
            No defensive stats recorded
          </div>
        )}
      </CardContent>
    </Card>
  );
}
