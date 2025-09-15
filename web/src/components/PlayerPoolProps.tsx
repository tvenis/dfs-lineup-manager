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
    
    // Helper function to find prop by market name (handles new data structure)
    const findProp = (marketName: string) => {
      return Object.values(filteredProps).find((prop: any) => prop.market === marketName);
    };
    
    switch (position) {
      case 'QB':
        const passYds = findProp('player_pass_yds');
        if (passYds) {
          props.push({
            label: 'Pass Yds',
            value: passYds.point,
            likelihood: passYds.likelihood,
            price: passYds.price,
            bookmaker: passYds.bookmaker
          });
        }
        
        const passTds = findProp('player_pass_tds');
        if (passTds) {
          props.push({
            label: 'Pass TDs',
            value: passTds.point,
            likelihood: passTds.likelihood,
            price: passTds.price,
            bookmaker: passTds.bookmaker
          });
        }
        
        const passAtt = findProp('player_pass_attempts');
        if (passAtt) {
          props.push({
            label: 'Pass Att',
            value: passAtt.point,
            likelihood: passAtt.likelihood,
            price: passAtt.price,
            bookmaker: passAtt.bookmaker
          });
        }
        
        const passCmp = findProp('player_pass_completions');
        if (passCmp) {
          props.push({
            label: 'Pass Cmp',
            value: passCmp.point,
            likelihood: passCmp.likelihood,
            price: passCmp.price,
            bookmaker: passCmp.bookmaker
          });
        }
        
        const rushYds = findProp('player_rush_yds');
        if (rushYds) {
          props.push({
            label: 'Rush Yds',
            value: rushYds.point,
            likelihood: rushYds.likelihood,
            price: rushYds.price,
            bookmaker: rushYds.bookmaker
          });
        }
        
        const tdsOver = findProp('player_tds_over');
        if (tdsOver) {
          props.push({
            label: 'TDs Over',
            value: tdsOver.point,
            likelihood: tdsOver.likelihood,
            price: tdsOver.price,
            bookmaker: tdsOver.bookmaker
          });
        }
        break;
        
      case 'RB':
        const rbRushYds = findProp('player_rush_yds');
        if (rbRushYds) {
          props.push({
            label: 'Rush Yds',
            value: rbRushYds.point,
            likelihood: rbRushYds.likelihood,
            price: rbRushYds.price,
            bookmaker: rbRushYds.bookmaker
          });
        }
        
        const rushAtt = findProp('player_rush_attempts');
        if (rushAtt) {
          props.push({
            label: 'Rush Att',
            value: rushAtt.point,
            likelihood: rushAtt.likelihood,
            price: rushAtt.price,
            bookmaker: rushAtt.bookmaker
          });
        }
        
        const rbTdsOver = findProp('player_tds_over');
        if (rbTdsOver) {
          props.push({
            label: 'TDs Over',
            value: rbTdsOver.point,
            likelihood: rbTdsOver.likelihood,
            price: rbTdsOver.price,
            bookmaker: rbTdsOver.bookmaker
          });
        }
        break;
        
      case 'WR':
      case 'TE':
        const receptions = findProp('player_receptions');
        if (receptions) {
          props.push({
            label: 'Receptions',
            value: receptions.point,
            likelihood: receptions.likelihood,
            price: receptions.price,
            bookmaker: receptions.bookmaker
          });
        }
        
        const recYds = findProp('player_reception_yds');
        if (recYds) {
          props.push({
            label: 'Rec Yds',
            value: recYds.point,
            likelihood: recYds.likelihood,
            price: recYds.price,
            bookmaker: recYds.bookmaker
          });
        }
        
        const wrTdsOver = findProp('player_tds_over');
        if (wrTdsOver) {
          props.push({
            label: 'TDs Over',
            value: wrTdsOver.point,
            likelihood: wrTdsOver.likelihood,
            price: wrTdsOver.price,
            bookmaker: wrTdsOver.bookmaker
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
