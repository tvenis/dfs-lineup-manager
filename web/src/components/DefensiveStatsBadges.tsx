"use client";

import React from "react";

export interface DefensiveStatsProps {
  teamAbbr?: string;
  pointsAllowed?: number | null;
  defSacks?: number | null;
  defInterceptions?: number | null;
  defTds?: number | null;
  specialTeamsTds?: number | null;
  defSafeties?: number | null;
  fumbleRecoveryOpp?: number | null;
  blockedKicks?: number | null;
  dense?: boolean;
  showZeros?: boolean;
}

const Badge: React.FC<{ className?: string; title?: string; children: React.ReactNode }> = ({ className = "", title, children }) => (
  <span className={`px-1.5 py-0.5 rounded text-xs ${className}`} title={title}>{children}</span>
);

export const DefensiveStatsBadges: React.FC<DefensiveStatsProps> = ({
  teamAbbr,
  pointsAllowed,
  defSacks,
  defInterceptions,
  defTds,
  specialTeamsTds,
  defSafeties,
  fumbleRecoveryOpp,
  blockedKicks,
  dense = false,
  showZeros = false,
}) => {
  const base = dense ? "gap-1" : "gap-2";
  const shouldShow = (v?: number | null) => (showZeros ? v !== undefined && v !== null : !!v && v > 0);

  const items: React.ReactNode[] = [];

  const getDKPointsForPointsAllowed = (pa: number): number => {
    if (pa === 0) return 10.0;
    if (pa >= 1 && pa <= 6) return 7.0;
    if (pa >= 7 && pa <= 13) return 4.0;
    if (pa >= 14 && pa <= 20) return 1.0;
    if (pa >= 21 && pa <= 27) return 0.0;
    if (pa >= 28 && pa <= 34) return -1.0;
    return -4.0; // 35+
  };

  const getPointsAllowedClasses = (pa: number): string => {
    if (pa === 0) return "bg-green-200 text-green-900";
    if (pa >= 1 && pa <= 6) return "bg-green-100 text-green-700";
    if (pa >= 7 && pa <= 13) return "bg-green-50 text-green-700";
    if (pa >= 14 && pa <= 20) return "bg-yellow-100 text-yellow-800";
    if (pa >= 21 && pa <= 27) return "bg-gray-100 text-gray-700";
    if (pa >= 28 && pa <= 34) return "bg-orange-100 text-orange-700";
    return "bg-red-100 text-red-700"; // 35+
  };

  if (pointsAllowed !== undefined && pointsAllowed !== null) {
    items.push(
      <Badge
        key="pts"
        className={getPointsAllowedClasses(pointsAllowed)}
        title={`${teamAbbr ? teamAbbr + ' ' : ''}${pointsAllowed} points allowed • DK ${getDKPointsForPointsAllowed(pointsAllowed) >= 0 ? '+' : ''}${getDKPointsForPointsAllowed(pointsAllowed)} pts`}
      >
        {pointsAllowed} pts allowed
      </Badge>
    );
  }

  if (shouldShow(defSacks)) {
    items.push(
      <Badge key="sacks" className="bg-blue-100 text-blue-700" title={`${defSacks} sack${defSacks !== 1 ? 's' : ''}`}>{defSacks} sack{defSacks !== 1 ? 's' : ''}</Badge>
    );
  }
  if (shouldShow(defInterceptions)) {
    items.push(
      <Badge key="ints" className="bg-green-100 text-green-700" title={`${defInterceptions} interception${defInterceptions !== 1 ? 's' : ''}`}>{defInterceptions} INT{defInterceptions !== 1 ? 's' : ''}</Badge>
    );
  }
  if (shouldShow(fumbleRecoveryOpp)) {
    items.push(
      <Badge key="fumrec" className="bg-teal-100 text-teal-700" title={`${fumbleRecoveryOpp} fumble recover${fumbleRecoveryOpp !== 1 ? 'ies' : 'y'}`}>{fumbleRecoveryOpp} Fumble Rec</Badge>
    );
  }
  if (shouldShow(defTds)) {
    items.push(
      <Badge key="deftd" className="bg-purple-100 text-purple-700" title={`${defTds} defensive touchdown${defTds !== 1 ? 's' : ''}`}>{defTds} Def TD{defTds !== 1 ? 's' : ''}</Badge>
    );
  }
  if (shouldShow(specialTeamsTds)) {
    items.push(
      <Badge key="sttd" className="bg-orange-100 text-orange-700" title={`${specialTeamsTds} special teams touchdown${specialTeamsTds !== 1 ? 's' : ''}`}>{specialTeamsTds} ST TD{specialTeamsTds !== 1 ? 's' : ''}</Badge>
    );
  }
  if (shouldShow(defSafeties)) {
    items.push(
      <Badge key="safeties" className="bg-red-100 text-red-700" title={`${defSafeties} safet${defSafeties !== 1 ? 'ies' : 'y'}`}>{defSafeties} safet{defSafeties !== 1 ? 'ies' : 'y'}</Badge>
    );
  }
  if (shouldShow(blockedKicks)) {
    items.push(
      <Badge key="blocked" className="bg-indigo-100 text-indigo-700" title={`${blockedKicks} blocked kick${blockedKicks !== 1 ? 's' : ''}`}>{blockedKicks} blocked</Badge>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className={`flex flex-wrap ${base}`}>
      {items}
    </div>
  );
};

export default DefensiveStatsBadges;


