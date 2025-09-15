"use client";

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { PlayerPoolEntry } from '@/types/prd';

interface PlayerPoolPropsProps {
  player: PlayerPoolEntry;
  propsData: Record<number, Record<string, any>>;
  position: string;
}

export function PlayerPoolProps({ player, propsData, position }: PlayerPoolPropsProps) {
  const playerProps = propsData[player.player.playerDkId];
  
  if (!playerProps) {
    return (
      <div className="text-xs text-gray-400">
        No props available
      </div>
    );
  }

  const getPropsForPosition = () => {
    const props = [];
    
    switch (position) {
      case 'QB':
        if (playerProps['player_pass_yds']) {
          props.push({
            label: 'Pass Yds',
            value: playerProps['player_pass_yds'].point,
            price: playerProps['player_pass_yds'].price,
            bookmaker: playerProps['player_pass_yds'].bookmaker
          });
        }
        if (playerProps['player_pass_tds']) {
          props.push({
            label: 'Pass TDs',
            value: playerProps['player_pass_tds'].point,
            price: playerProps['player_pass_tds'].price,
            bookmaker: playerProps['player_pass_tds'].bookmaker
          });
        }
        if (playerProps['player_pass_attempts']) {
          props.push({
            label: 'Pass Att',
            value: playerProps['player_pass_attempts'].point,
            price: playerProps['player_pass_attempts'].price,
            bookmaker: playerProps['player_pass_attempts'].bookmaker
          });
        }
        if (playerProps['player_pass_completions']) {
          props.push({
            label: 'Pass Cmp',
            value: playerProps['player_pass_completions'].point,
            price: playerProps['player_pass_completions'].price,
            bookmaker: playerProps['player_pass_completions'].bookmaker
          });
        }
        if (playerProps['player_rush_yds']) {
          props.push({
            label: 'Rush Yds',
            value: playerProps['player_rush_yds'].point,
            price: playerProps['player_rush_yds'].price,
            bookmaker: playerProps['player_rush_yds'].bookmaker
          });
        }
        if (playerProps['player_tds_over']) {
          props.push({
            label: 'TDs Over',
            value: playerProps['player_tds_over'].point,
            price: playerProps['player_tds_over'].price,
            bookmaker: playerProps['player_tds_over'].bookmaker
          });
        }
        break;
        
      case 'RB':
        if (playerProps['player_rush_yds']) {
          props.push({
            label: 'Rush Yds',
            value: playerProps['player_rush_yds'].point,
            price: playerProps['player_rush_yds'].price,
            bookmaker: playerProps['player_rush_yds'].bookmaker
          });
        }
        if (playerProps['player_rush_attempts']) {
          props.push({
            label: 'Rush Att',
            value: playerProps['player_rush_attempts'].point,
            price: playerProps['player_rush_attempts'].price,
            bookmaker: playerProps['player_rush_attempts'].bookmaker
          });
        }
        if (playerProps['player_tds_over']) {
          props.push({
            label: 'TDs Over',
            value: playerProps['player_tds_over'].point,
            price: playerProps['player_tds_over'].price,
            bookmaker: playerProps['player_tds_over'].bookmaker
          });
        }
        break;
        
      case 'WR':
      case 'TE':
        if (playerProps['player_receptions']) {
          props.push({
            label: 'Receptions',
            value: playerProps['player_receptions'].point,
            price: playerProps['player_receptions'].price,
            bookmaker: playerProps['player_receptions'].bookmaker
          });
        }
        if (playerProps['player_reception_yds']) {
          props.push({
            label: 'Rec Yds',
            value: playerProps['player_reception_yds'].point,
            price: playerProps['player_reception_yds'].price,
            bookmaker: playerProps['player_reception_yds'].bookmaker
          });
        }
        if (playerProps['player_tds_over']) {
          props.push({
            label: 'TDs Over',
            value: playerProps['player_tds_over'].point,
            price: playerProps['player_tds_over'].price,
            bookmaker: playerProps['player_tds_over'].bookmaker
          });
        }
        break;
        
      case 'DST':
        // DST props would go here if available
        break;
    }
    
    return props;
  };

  const props = getPropsForPosition();
  
  if (props.length === 0) {
    return (
      <div className="text-xs text-gray-400">
        No props available
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {props.map((prop, index) => (
        <TooltipProvider key={index}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1">
                <Badge 
                  variant="outline" 
                  className="text-xs cursor-help"
                >
                  {prop.label}: {prop.value}
                </Badge>
                {prop.price && (
                  <span className="text-xs text-gray-500">
                    {prop.price > 0 ? '+' : ''}{prop.price}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <div className="font-medium">{prop.label}</div>
                <div>Line: {prop.value}</div>
                {prop.price && (
                  <div>Price: {prop.price > 0 ? '+' : ''}{prop.price}</div>
                )}
                {prop.bookmaker && (
                  <div>Book: {prop.bookmaker}</div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}
