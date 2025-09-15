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
  
  // Debug logging
  console.log('PlayerPoolProps Debug:', {
    playerId,
    playerProps,
    propsDataKeys: Object.keys(propsData),
    hasPlayerProps: !!playerProps,
    playerPropsKeys: Object.keys(playerProps),
    playerPropsLength: Object.keys(playerProps).length
  });
  
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

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 text-xs"
        >
          <BarChart3 className="h-3 w-3 mr-1" />
          Props
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Props for {player.player?.displayName} - Week {selectedWeek}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <PlayerProps 
            playerId={player.player?.playerDkId} 
            preFilteredWeek={selectedWeek}
            preFilteredBookmaker="draftkings"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}