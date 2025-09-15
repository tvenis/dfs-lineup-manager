"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { BarChart3, X } from "lucide-react";
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
  
  
  if (!hasProps) {
    return (
      <div className="text-xs text-gray-400">
        No props available
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-2 text-xs"
        onClick={() => setIsModalOpen(true)}
      >
        <BarChart3 className="h-3 w-3 mr-1" />
        Props ({Object.keys(playerProps).length})
      </Button>

      {/* Custom Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setIsModalOpen(false)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[80vh] mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                Props for {player.player?.displayName} - Week {selectedWeek}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <PlayerProps 
                playerId={player.player?.playerDkId} 
                preFilteredWeek={selectedWeek}
                preFilteredBookmaker="draftkings"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}