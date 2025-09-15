"use client";

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { PlayerPoolEntry } from '@/types/prd';

interface PlayerPoolPropsProps {
  player: PlayerPoolEntry;
  propsData: Record<number, Record<string, any>>;
  position: string;
  selectedBookmaker?: string;
}

export function PlayerPoolProps({ player, propsData, position, selectedBookmaker }: PlayerPoolPropsProps) {
  const playerProps = propsData[player.player?.playerDkId] || propsData[String(player.player?.playerDkId)];
  
  if (!playerProps) {
    return (
      <div className="text-xs text-gray-400">
        No props available (ID: {player.player?.playerDkId})
      </div>
    );
  }

  // Filter props by selected bookmaker if specified
  const filteredProps = selectedBookmaker 
    ? Object.fromEntries(
        Object.entries(playerProps).filter(([_, propData]) => 
          propData.bookmaker === selectedBookmaker
        )
      )
    : playerProps;


  const getPropsForPosition = () => {
    const props = [];
    
    switch (position) {
      case 'QB':
        if (filteredProps['player_pass_yds']) {
          props.push({
            label: 'Pass Yds',
            value: filteredProps['player_pass_yds'].point,
            likelihood: filteredProps['player_pass_yds'].likelihood,
            price: filteredProps['player_pass_yds'].price,
            bookmaker: filteredProps['player_pass_yds'].bookmaker
          });
        }
        if (filteredProps['player_pass_tds']) {
          props.push({
            label: 'Pass TDs',
            value: filteredProps['player_pass_tds'].point,
            likelihood: filteredProps['player_pass_tds'].likelihood,
            price: filteredProps['player_pass_tds'].price,
            bookmaker: filteredProps['player_pass_tds'].bookmaker
          });
        }
        if (filteredProps['player_pass_attempts']) {
          props.push({
            label: 'Pass Att',
            value: filteredProps['player_pass_attempts'].point,
            likelihood: filteredProps['player_pass_attempts'].likelihood,
            price: filteredProps['player_pass_attempts'].price,
            bookmaker: filteredProps['player_pass_attempts'].bookmaker
          });
        }
        if (filteredProps['player_pass_completions']) {
          props.push({
            label: 'Pass Cmp',
            value: filteredProps['player_pass_completions'].point,
            likelihood: filteredProps['player_pass_completions'].likelihood,
            price: filteredProps['player_pass_completions'].price,
            bookmaker: filteredProps['player_pass_completions'].bookmaker
          });
        }
        if (filteredProps['player_rush_yds']) {
          props.push({
            label: 'Rush Yds',
            value: filteredProps['player_rush_yds'].point,
            likelihood: filteredProps['player_rush_yds'].likelihood,
            price: filteredProps['player_rush_yds'].price,
            bookmaker: filteredProps['player_rush_yds'].bookmaker
          });
        }
        if (filteredProps['player_tds_over']) {
          props.push({
            label: 'TDs Over',
            value: filteredProps['player_tds_over'].point,
            likelihood: filteredProps['player_tds_over'].likelihood,
            price: filteredProps['player_tds_over'].price,
            bookmaker: filteredProps['player_tds_over'].bookmaker
          });
        }
        break;
        
      case 'RB':
        if (filteredProps['player_rush_yds']) {
          props.push({
            label: 'Rush Yds',
            value: filteredProps['player_rush_yds'].point,
            likelihood: filteredProps['player_rush_yds'].likelihood,
            price: filteredProps['player_rush_yds'].price,
            bookmaker: filteredProps['player_rush_yds'].bookmaker
          });
        }
        if (filteredProps['player_rush_attempts']) {
          props.push({
            label: 'Rush Att',
            value: filteredProps['player_rush_attempts'].point,
            likelihood: filteredProps['player_rush_attempts'].likelihood,
            price: filteredProps['player_rush_attempts'].price,
            bookmaker: filteredProps['player_rush_attempts'].bookmaker
          });
        }
        if (filteredProps['player_tds_over']) {
          props.push({
            label: 'TDs Over',
            value: filteredProps['player_tds_over'].point,
            likelihood: filteredProps['player_tds_over'].likelihood,
            price: filteredProps['player_tds_over'].price,
            bookmaker: filteredProps['player_tds_over'].bookmaker
          });
        }
        break;
        
      case 'WR':
      case 'TE':
        if (filteredProps['player_receptions']) {
          props.push({
            label: 'Receptions',
            value: filteredProps['player_receptions'].point,
            likelihood: filteredProps['player_receptions'].likelihood,
            price: filteredProps['player_receptions'].price,
            bookmaker: filteredProps['player_receptions'].bookmaker
          });
        }
        if (filteredProps['player_reception_yds']) {
          props.push({
            label: 'Rec Yds',
            value: filteredProps['player_reception_yds'].point,
            likelihood: filteredProps['player_reception_yds'].likelihood,
            price: filteredProps['player_reception_yds'].price,
            bookmaker: filteredProps['player_reception_yds'].bookmaker
          });
        }
        if (filteredProps['player_tds_over']) {
          props.push({
            label: 'TDs Over',
            value: filteredProps['player_tds_over'].point,
            likelihood: filteredProps['player_tds_over'].likelihood,
            price: filteredProps['player_tds_over'].price,
            bookmaker: filteredProps['player_tds_over'].bookmaker
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
                <span className="text-xs text-gray-500">
                  {prop.likelihood !== undefined && prop.likelihood !== null 
                    ? `${(prop.likelihood * 100).toFixed(0)}%`
                    : prop.price 
                      ? `${prop.price > 0 ? '+' : ''}${prop.price}`
                      : 'N/A'
                  }
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <div className="font-medium">{prop.label}</div>
                <div>Line: {prop.value}</div>
                {prop.likelihood !== undefined && prop.likelihood !== null ? (
                  <div>Likelihood: {(prop.likelihood * 100).toFixed(1)}%</div>
                ) : prop.price && (
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
