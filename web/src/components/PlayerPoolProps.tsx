"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { BarChart3 } from "lucide-react";
import PlayerProps from "./PlayerProps";
import type { PlayerPoolEntry } from "@/types/prd";

interface PlayerPoolPropsProps {
  player: PlayerPoolEntry;
  propsData: Record<number, Record<string, any>>;
  position: string;
  selectedWeek: number;
}

export function PlayerPoolProps({ player, propsData, position, selectedWeek }: PlayerPoolPropsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Get player props for this specific player
  const playerId = player.player?.playerDkId;
  const playerProps = (playerId && propsData[playerId]) || (playerId && (propsData as any)[String(playerId)]) || {};
  
  // Check if player has any props available (works with new {market}_{bookmaker} structure)
  const hasProps = playerProps && Object.keys(playerProps).length > 0 && 
    Object.values(playerProps).some((prop: any) => prop && typeof prop === 'object');
  
  // Always render something for debugging
  console.log('PlayerPoolProps render:', { playerId, hasProps, playerPropsLength: Object.keys(playerProps).length });
  
  if (!hasProps) {
    return (
      <div className="text-xs text-gray-400">
        No props available
      </div>
    );
  }

  // Simple test - just return a basic button first
  return (
    <div className="text-xs">
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-2 text-xs"
        onClick={() => console.log('Button clicked for player:', playerId)}
      >
        <BarChart3 className="h-3 w-3 mr-1" />
        Props ({Object.keys(playerProps).length})
      </Button>
    </div>
  );
}