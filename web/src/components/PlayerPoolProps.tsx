"use client";

import { Button } from "./ui/button";
import { BarChart3 } from "lucide-react";
import type { PlayerPoolEntry } from "@/types/prd";

interface PlayerPoolPropsProps {
  player: PlayerPoolEntry;
  propsData: Record<number, Record<string, any>>;
  position: string;
  selectedWeek: number;
}

export function PlayerPoolProps({ player, propsData, position, selectedWeek }: PlayerPoolPropsProps) {
  
  // Get player props for this specific player
  const playerId = player.player?.playerDkId;
  const playerProps = (playerId && propsData[playerId]) || (playerId && (propsData as any)[String(playerId)]) || {};
  
  // Check if player has any props available (works with new {market}_{bookmaker} structure)
  const hasProps = playerProps && Object.keys(playerProps).length > 0 && 
    Object.values(playerProps).some((prop: any) => prop && typeof prop === 'object');
  
  
  if (!hasProps) {
    return (
      <div className="text-xs text-gray-400">
        No props available
      </div>
    );
  }

  // For now, let's use a simple button and implement modal later
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 px-2 text-xs"
      onClick={() => {
        console.log('Props button clicked for player:', playerId);
        // TODO: Implement modal functionality
        alert(`Props for ${player.player?.displayName} - ${Object.keys(playerProps).length} props available`);
      }}
    >
      <BarChart3 className="h-3 w-3 mr-1" />
      Props ({Object.keys(playerProps).length})
    </Button>
  );
}