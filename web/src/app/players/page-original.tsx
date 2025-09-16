"use client";

import { useState, useEffect, useMemo } from 'react';
import { PlayerService } from '@/lib/playerService';
import { WeekService } from '@/lib/weekService';
import type { PlayerPoolEntry, Week } from '@/types/prd';
import { PlayerWeekAnalysis, WeekAnalysisData } from '@/components/PlayerWeekAnalysis';
import { PlayerPoolTips } from '@/components/PlayerPoolTips';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, Search, X, User, UserX, ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Minimal tooltip shim to avoid new dependency; optional
import Link from 'next/link';

export default function PlayerPoolPage() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [playerPool, setPlayerPool] = useState<PlayerPoolEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [hideExcluded, setHideExcluded] = useState(true);
  // Removed excludedPlayers state since we're using database exclusions directly
  const [activeTab, setActiveTab] = useState<string>('QB');
  const [sortField, setSortField] = useState<string>('projection');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [tierFilter, setTierFilter] = useState<number | 'all'>('all');
  const [draftGroupFilter, setDraftGroupFilter] = useState<string>('all');
  const [gamesMap, setGamesMap] = useState<Record<string, { opponentAbbr: string | null; homeOrAway: 'H' | 'A' | 'N'; proj_spread?: number | null; proj_total?: number | null; implied_team_total?: number | null }>>({});
  const [qbPassYardsProps, setQbPassYardsProps] = useState<Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }>>({});
  const [qbPassingTdsProps, setQbPassingTdsProps] = useState<Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }>>({});
  const [qbPassAttemptsProps, setQbPassAttemptsProps] = useState<Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }>>({});
  const [qbPassCompletionsProps, setQbPassCompletionsProps] = useState<Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }>>({});
  const [qbRushYardsProps, setQbRushYardsProps] = useState<Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }>>({});
  const [qbTdsOverProps, setQbTdsOverProps] = useState<Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }>>({});
  const [rbRushAttemptsProps, setRbRushAttemptsProps] = useState<Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }>>({});
  const [rbRushYardsProps, setRbRushYardsProps] = useState<Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }>>({});
  const [rbTdsOverProps, setRbTdsOverProps] = useState<Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }>>({});
  const [wrTdsOverProps, setWrTdsOverProps] = useState<Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }>>({});
  const [teTdsOverProps, setTeTdsOverProps] = useState<Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }>>({});
  const [wrReceptionsProps, setWrReceptionsProps] = useState<Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }>>({});
  const [teReceptionsProps, setTeReceptionsProps] = useState<Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }>>({});
  const [wrRecYdsProps, setWrRecYdsProps] = useState<Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }>>({});
  const [teRecYdsProps, setTeRecYdsProps] = useState<Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }>>({});

  // Unified function to fetch ALL QB props using batch API
  // This replaces 5+ individual API calls with 2 batch calls for performance
  const fetchAllQbProps = async (entries: PlayerPoolEntry[], weekId: number) => {
    const startTime = performance.now();
    
    try {
      const qbPlayers = entries.filter(entry => entry.player.position === 'QB');
      
      if (qbPlayers.length === 0) {
        // Reset all QB prop states
        setQbPassYardsProps({});
        setQbPassingTdsProps({});
        setQbPassAttemptsProps({});
        setQbPassCompletionsProps({});
        setQbRushYardsProps({});
        setQbTdsOverProps({});
        return;
      }

      console.log(`🚀 [BATCH] Starting ALL QB props fetch for ${qbPlayers.length} QBs`);
      
      const playerIds = qbPlayers.map(qb => qb.player.playerDkId);
      console.log(`📡 [BATCH] Making batch API calls for ${playerIds.length} QBs:`, playerIds);
      
      // Make single batch call for all props (includes both DraftKings and BetOnlineAG)
      const allProps = await PlayerService.getPlayerPropsBatch(
        playerIds,
        weekId,
        ['player_pass_yds', 'player_pass_tds', 'player_pass_attempts', 'player_pass_completions', 'player_rush_yds', 'player_tds_over']
      );
      
      // Use the same props data for both variables (since the service already includes all bookmakers)
      const dkProps = allProps;
      const betOnlineProps = allProps;
      
      console.log(`📡 [BATCH] Received DK response for ${Object.keys(dkProps).length} players`);
      console.log(`📡 [BATCH] Received BetOnlineAG response for ${Object.keys(betOnlineProps).length} players`);
      
      // Initialize all prop maps
      const passYardsMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      const passTdsMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      const passAttemptsMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      const passCompletionsMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      const rushYardsMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      const tdsOverMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      
      // Process the batch results
      for (const qb of qbPlayers) {
        const playerId = qb.player.playerDkId;
        const dkPlayerProps = dkProps[playerId] || {};
        const betOnlinePlayerProps = betOnlineProps[playerId] || {};
        
        // Process DraftKings props
        if (dkPlayerProps['player_pass_yds']) {
          const prop = dkPlayerProps['player_pass_yds'];
          passYardsMap[playerId] = {
            point: prop.point || undefined,
            price: prop.price || undefined,
            bookmaker: prop.bookmaker || undefined,
            likelihood: prop.likelihood || undefined
          };
        }
        
        if (dkPlayerProps['player_pass_tds']) {
          const prop = dkPlayerProps['player_pass_tds'];
          passTdsMap[playerId] = {
            point: prop.point || undefined,
            price: prop.price || undefined,
            bookmaker: prop.bookmaker || undefined,
            likelihood: prop.likelihood || undefined
          };
        }
        
        if (dkPlayerProps['player_pass_attempts']) {
          const prop = dkPlayerProps['player_pass_attempts'];
          passAttemptsMap[playerId] = {
            point: prop.point || undefined,
            price: prop.price || undefined,
            bookmaker: prop.bookmaker || undefined,
            likelihood: prop.likelihood || undefined
          };
        }
        
        if (dkPlayerProps['player_pass_completions']) {
          const prop = dkPlayerProps['player_pass_completions'];
          passCompletionsMap[playerId] = {
            point: prop.point || undefined,
            price: prop.price || undefined,
            bookmaker: prop.bookmaker || undefined,
            likelihood: prop.likelihood || undefined
          };
        }
        
        if (dkPlayerProps['player_rush_yds']) {
          const prop = dkPlayerProps['player_rush_yds'];
          rushYardsMap[playerId] = {
            point: prop.point || undefined,
            price: prop.price || undefined,
            bookmaker: prop.bookmaker || undefined,
            likelihood: prop.likelihood || undefined
          };
        }
        
        // Process TDs Over with BetOnlineAG preference logic
        let chosenTdProp = null;
        
        // Prefer BetOnlineAG Over 0.5
        if (betOnlinePlayerProps['player_tds_over']) {
          const prop = betOnlinePlayerProps['player_tds_over'];
          if (prop.point === 0.5) {
            chosenTdProp = prop;
          }
        }
        
        // Fallback: any BetOnlineAG Over
        if (!chosenTdProp && betOnlinePlayerProps['player_tds_over']) {
          chosenTdProp = betOnlinePlayerProps['player_tds_over'];
        }
        
        // Fallback: DraftKings Over 0.5
        if (!chosenTdProp && dkPlayerProps['player_tds_over']) {
          const prop = dkPlayerProps['player_tds_over'];
          if (prop.point === 0.5) {
            chosenTdProp = prop;
          }
        }
        
        // Fallback: any DraftKings Over
        if (!chosenTdProp && dkPlayerProps['player_tds_over']) {
          chosenTdProp = dkPlayerProps['player_tds_over'];
        }
        
        if (chosenTdProp) {
          tdsOverMap[playerId] = {
            point: chosenTdProp.point || undefined,
            price: chosenTdProp.price || undefined,
            bookmaker: chosenTdProp.bookmaker || undefined,
            likelihood: chosenTdProp.likelihood || undefined
          };
        }
      }
      
      // Update all state variables
      setQbPassYardsProps(passYardsMap);
      setQbPassingTdsProps(passTdsMap);
      setQbPassAttemptsProps(passAttemptsMap);
      setQbPassCompletionsProps(passCompletionsMap);
      setQbRushYardsProps(rushYardsMap);
      setQbTdsOverProps(tdsOverMap);
      
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      console.log(`🎯 [BATCH] Fetched ALL QB props for ${qbPlayers.length} QBs in ${duration}ms`);
      console.log(`   - Passing Yards: ${Object.keys(passYardsMap).length} QBs`);
      console.log(`   - Passing TDs: ${Object.keys(passTdsMap).length} QBs`);
      console.log(`   - Pass Attempts: ${Object.keys(passAttemptsMap).length} QBs`);
      console.log(`   - Pass Completions: ${Object.keys(passCompletionsMap).length} QBs`);
      console.log(`   - Rush Yards: ${Object.keys(rushYardsMap).length} QBs`);
      console.log(`   - TDs Over: ${Object.keys(tdsOverMap).length} QBs`);
      console.log(`   - (2 API calls vs ${qbPlayers.length * 5} individual calls)`);
      
    } catch (error) {
      console.error('Error fetching ALL QB props (batch):', error);
    }
  };

  // Comprehensive function to fetch ALL props (QB + RB + WR/TE) using batch API
  // This replaces 10+ individual API calls with 2 batch calls for maximum performance
  const fetchAllPropsBatch = async (entries: PlayerPoolEntry[], weekId: number) => {
    const startTime = performance.now();
    
    try {
      const qbPlayers = entries.filter(entry => entry.player.position === 'QB');
      const rbPlayers = entries.filter(entry => entry.player.position === 'RB');
      const wrPlayers = entries.filter(entry => entry.player.position === 'WR');
      const tePlayers = entries.filter(entry => entry.player.position === 'TE');
      
      const totalPlayers = qbPlayers.length + rbPlayers.length + wrPlayers.length + tePlayers.length;
      
      if (totalPlayers === 0) {
        // Reset all prop states
        setQbPassYardsProps({});
        setQbPassingTdsProps({});
        setQbPassAttemptsProps({});
        setQbPassCompletionsProps({});
        setQbRushYardsProps({});
        setQbTdsOverProps({});
        setRbRushAttemptsProps({});
        setRbRushYardsProps({});
        setRbTdsOverProps({});
        setWrTdsOverProps({});
        setTeTdsOverProps({});
        setWrReceptionsProps({});
        setTeReceptionsProps({});
        setWrRecYdsProps({});
        setTeRecYdsProps({});
        return;
      }

      console.log(`🚀 [BATCH] Starting ALL props fetch for ${totalPlayers} players (QB: ${qbPlayers.length}, RB: ${rbPlayers.length}, WR: ${wrPlayers.length}, TE: ${tePlayers.length})`);
      
      // Get all player IDs
      const allPlayerIds = [
        ...qbPlayers.map(qb => qb.player.playerDkId),
        ...rbPlayers.map(rb => rb.player.playerDkId),
        ...wrPlayers.map(wr => wr.player.playerDkId),
        ...tePlayers.map(te => te.player.playerDkId)
      ];
      
      console.log(`📡 [BATCH] Making batch API calls for ${allPlayerIds.length} players`);
      
      // Make single batch call for all props (includes both DraftKings and BetOnlineAG)
      const allProps = await PlayerService.getPlayerPropsBatch(
        allPlayerIds,
        weekId,
        [
          'player_pass_yds', 'player_pass_tds', 'player_pass_attempts', 'player_pass_completions', 'player_rush_yds', 'player_tds_over', // QB
          'player_rush_attempts', 'player_rush_yds', 'player_tds_over', // RB
          'player_tds_over', 'player_receptions', 'player_reception_yds' // WR/TE
        ]
      );
      
      // Use the same props data for both variables (since the service already includes all bookmakers)
      const dkProps = allProps;
      const betOnlineProps = allProps;
      
      console.log(`📡 [BATCH] Received DK response for ${Object.keys(dkProps).length} players`);
      console.log(`📡 [BATCH] Received BetOnlineAG response for ${Object.keys(betOnlineProps).length} players`);
      
      // Initialize all prop maps
      const passYardsMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      const passTdsMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      const passAttemptsMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      const passCompletionsMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      const qbRushYardsMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      const qbTdsOverMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      
      const rbRushAttemptsMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      const rbRushYardsMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      const rbTdsOverMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      
      const wrTdsOverMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      const teTdsOverMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      const wrReceptionsMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      const teReceptionsMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      const wrRecYdsMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      const teRecYdsMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      
      // Process QB props
      for (const qb of qbPlayers) {
        const playerId = qb.player.playerDkId;
        const dkPlayerProps = dkProps[playerId] || {};
        const betOnlinePlayerProps = betOnlineProps[playerId] || {};
        
        // Process DraftKings QB props
        if (dkPlayerProps['player_pass_yds']) {
          const prop = dkPlayerProps['player_pass_yds'];
          passYardsMap[playerId] = {
            point: prop.point || undefined,
            price: prop.price || undefined,
            bookmaker: prop.bookmaker || undefined,
            likelihood: prop.likelihood || undefined
          };
        }
        
        if (dkPlayerProps['player_pass_tds']) {
          const prop = dkPlayerProps['player_pass_tds'];
          passTdsMap[playerId] = {
            point: prop.point || undefined,
            price: prop.price || undefined,
            bookmaker: prop.bookmaker || undefined,
            likelihood: prop.likelihood || undefined
          };
        }
        
        if (dkPlayerProps['player_pass_attempts']) {
          const prop = dkPlayerProps['player_pass_attempts'];
          passAttemptsMap[playerId] = {
            point: prop.point || undefined,
            price: prop.price || undefined,
            bookmaker: prop.bookmaker || undefined,
            likelihood: prop.likelihood || undefined
          };
        }
        
        if (dkPlayerProps['player_pass_completions']) {
          const prop = dkPlayerProps['player_pass_completions'];
          passCompletionsMap[playerId] = {
            point: prop.point || undefined,
            price: prop.price || undefined,
            bookmaker: prop.bookmaker || undefined,
            likelihood: prop.likelihood || undefined
          };
        }
        
        if (dkPlayerProps['player_rush_yds']) {
          const prop = dkPlayerProps['player_rush_yds'];
          qbRushYardsMap[playerId] = {
            point: prop.point || undefined,
            price: prop.price || undefined,
            bookmaker: prop.bookmaker || undefined,
            likelihood: prop.likelihood || undefined
          };
        }
        
        // Process QB TDs Over with BetOnlineAG preference logic
        let chosenTdProp = null;
        
        // Prefer BetOnlineAG Over 0.5
        if (betOnlinePlayerProps['player_tds_over']) {
          const prop = betOnlinePlayerProps['player_tds_over'];
          if (prop.point === 0.5) {
            chosenTdProp = prop;
          }
        }
        
        // Fallback: any BetOnlineAG Over
        if (!chosenTdProp && betOnlinePlayerProps['player_tds_over']) {
          chosenTdProp = betOnlinePlayerProps['player_tds_over'];
        }
        
        // Fallback: DraftKings Over 0.5
        if (!chosenTdProp && dkPlayerProps['player_tds_over']) {
          const prop = dkPlayerProps['player_tds_over'];
          if (prop.point === 0.5) {
            chosenTdProp = prop;
          }
        }
        
        // Fallback: any DraftKings Over
        if (!chosenTdProp && dkPlayerProps['player_tds_over']) {
          chosenTdProp = dkPlayerProps['player_tds_over'];
        }
        
        if (chosenTdProp) {
          qbTdsOverMap[playerId] = {
            point: chosenTdProp.point || undefined,
            price: chosenTdProp.price || undefined,
            bookmaker: chosenTdProp.bookmaker || undefined,
            likelihood: chosenTdProp.likelihood || undefined
          };
        }
      }
      
      // Process RB props
      for (const rb of rbPlayers) {
        const playerId = rb.player.playerDkId;
        const dkPlayerProps = dkProps[playerId] || {};
        const betOnlinePlayerProps = betOnlineProps[playerId] || {};
        
        // Process DraftKings RB props
        if (dkPlayerProps['player_rush_attempts']) {
          const prop = dkPlayerProps['player_rush_attempts'];
          rbRushAttemptsMap[playerId] = {
            point: prop.point || undefined,
            price: prop.price || undefined,
            bookmaker: prop.bookmaker || undefined,
            likelihood: prop.likelihood || undefined
          };
        }
        
        if (dkPlayerProps['player_rush_yds']) {
          const prop = dkPlayerProps['player_rush_yds'];
          rbRushYardsMap[playerId] = {
            point: prop.point || undefined,
            price: prop.price || undefined,
            bookmaker: prop.bookmaker || undefined,
            likelihood: prop.likelihood || undefined
          };
        }
        
        // Process RB TDs Over with BetOnlineAG preference logic
        let chosenTdProp = null;
        
        // Prefer BetOnlineAG Over 0.5
        if (betOnlinePlayerProps['player_tds_over']) {
          const prop = betOnlinePlayerProps['player_tds_over'];
          if (prop.point === 0.5) {
            chosenTdProp = prop;
          }
        }
        
        // Fallback: any BetOnlineAG Over
        if (!chosenTdProp && betOnlinePlayerProps['player_tds_over']) {
          chosenTdProp = betOnlinePlayerProps['player_tds_over'];
        }
        
        // Fallback: DraftKings Over 0.5
        if (!chosenTdProp && dkPlayerProps['player_tds_over']) {
          const prop = dkPlayerProps['player_tds_over'];
          if (prop.point === 0.5) {
            chosenTdProp = prop;
          }
        }
        
        // Fallback: any DraftKings Over
        if (!chosenTdProp && dkPlayerProps['player_tds_over']) {
          chosenTdProp = dkPlayerProps['player_tds_over'];
        }
        
        if (chosenTdProp) {
          rbTdsOverMap[playerId] = {
            point: chosenTdProp.point || undefined,
            price: chosenTdProp.price || undefined,
            bookmaker: chosenTdProp.bookmaker || undefined,
            likelihood: chosenTdProp.likelihood || undefined
          };
        }
      }
      
      // Process WR props
      for (const wr of wrPlayers) {
        const playerId = wr.player.playerDkId;
        const dkPlayerProps = dkProps[playerId] || {};
        const betOnlinePlayerProps = betOnlineProps[playerId] || {};
        
        // Process DraftKings WR props
        if (dkPlayerProps['player_receptions']) {
          const prop = dkPlayerProps['player_receptions'];
          wrReceptionsMap[playerId] = {
            point: prop.point || undefined,
            price: prop.price || undefined,
            bookmaker: prop.bookmaker || undefined,
            likelihood: prop.likelihood || undefined
          };
        }
        
        if (dkPlayerProps['player_reception_yds']) {
          const prop = dkPlayerProps['player_reception_yds'];
          wrRecYdsMap[playerId] = {
            point: prop.point || undefined,
            price: prop.price || undefined,
            bookmaker: prop.bookmaker || undefined,
            likelihood: prop.likelihood || undefined
          };
        }
        
        // Process WR TDs Over with BetOnlineAG preference logic
        let chosenTdProp = null;
        
        // Prefer BetOnlineAG Over 0.5
        if (betOnlinePlayerProps['player_tds_over']) {
          const prop = betOnlinePlayerProps['player_tds_over'];
          if (prop.point === 0.5) {
            chosenTdProp = prop;
          }
        }
        
        // Fallback: any BetOnlineAG Over
        if (!chosenTdProp && betOnlinePlayerProps['player_tds_over']) {
          chosenTdProp = betOnlinePlayerProps['player_tds_over'];
        }
        
        // Fallback: DraftKings Over 0.5
        if (!chosenTdProp && dkPlayerProps['player_tds_over']) {
          const prop = dkPlayerProps['player_tds_over'];
          if (prop.point === 0.5) {
            chosenTdProp = prop;
          }
        }
        
        // Fallback: any DraftKings Over
        if (!chosenTdProp && dkPlayerProps['player_tds_over']) {
          chosenTdProp = dkPlayerProps['player_tds_over'];
        }
        
        if (chosenTdProp) {
          wrTdsOverMap[playerId] = {
            point: chosenTdProp.point || undefined,
            price: chosenTdProp.price || undefined,
            bookmaker: chosenTdProp.bookmaker || undefined,
            likelihood: chosenTdProp.likelihood || undefined
          };
        }
      }
      
      // Process TE props
      for (const te of tePlayers) {
        const playerId = te.player.playerDkId;
        const dkPlayerProps = dkProps[playerId] || {};
        const betOnlinePlayerProps = betOnlineProps[playerId] || {};
        
        // Process DraftKings TE props
        if (dkPlayerProps['player_receptions']) {
          const prop = dkPlayerProps['player_receptions'];
          teReceptionsMap[playerId] = {
            point: prop.point || undefined,
            price: prop.price || undefined,
            bookmaker: prop.bookmaker || undefined,
            likelihood: prop.likelihood || undefined
          };
        }
        
        if (dkPlayerProps['player_reception_yds']) {
          const prop = dkPlayerProps['player_reception_yds'];
          teRecYdsMap[playerId] = {
            point: prop.point || undefined,
            price: prop.price || undefined,
            bookmaker: prop.bookmaker || undefined,
            likelihood: prop.likelihood || undefined
          };
        }
        
        // Process TE TDs Over with BetOnlineAG preference logic
        let chosenTdProp = null;
        
        // Prefer BetOnlineAG Over 0.5
        if (betOnlinePlayerProps['player_tds_over']) {
          const prop = betOnlinePlayerProps['player_tds_over'];
          if (prop.point === 0.5) {
            chosenTdProp = prop;
          }
        }
        
        // Fallback: any BetOnlineAG Over
        if (!chosenTdProp && betOnlinePlayerProps['player_tds_over']) {
          chosenTdProp = betOnlinePlayerProps['player_tds_over'];
        }
        
        // Fallback: DraftKings Over 0.5
        if (!chosenTdProp && dkPlayerProps['player_tds_over']) {
          const prop = dkPlayerProps['player_tds_over'];
          if (prop.point === 0.5) {
            chosenTdProp = prop;
          }
        }
        
        // Fallback: any DraftKings Over
        if (!chosenTdProp && dkPlayerProps['player_tds_over']) {
          chosenTdProp = dkPlayerProps['player_tds_over'];
        }
        
        if (chosenTdProp) {
          teTdsOverMap[playerId] = {
            point: chosenTdProp.point || undefined,
            price: chosenTdProp.price || undefined,
            bookmaker: chosenTdProp.bookmaker || undefined,
            likelihood: chosenTdProp.likelihood || undefined
          };
        }
      }
      
      // Update all state variables
      setQbPassYardsProps(passYardsMap);
      setQbPassingTdsProps(passTdsMap);
      setQbPassAttemptsProps(passAttemptsMap);
      setQbPassCompletionsProps(passCompletionsMap);
      setQbRushYardsProps(qbRushYardsMap);
      setQbTdsOverProps(qbTdsOverMap);
      
      setRbRushAttemptsProps(rbRushAttemptsMap);
      setRbRushYardsProps(rbRushYardsMap);
      setRbTdsOverProps(rbTdsOverMap);
      
      setWrTdsOverProps(wrTdsOverMap);
      setTeTdsOverProps(teTdsOverMap);
      setWrReceptionsProps(wrReceptionsMap);
      setTeReceptionsProps(teReceptionsMap);
      setWrRecYdsProps(wrRecYdsMap);
      setTeRecYdsProps(teRecYdsMap);
      
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      console.log(`🎯 [BATCH] Fetched ALL props for ${totalPlayers} players in ${duration}ms`);
      console.log(`   QB Props: Passing Yards: ${Object.keys(passYardsMap).length}, Passing TDs: ${Object.keys(passTdsMap).length}, Pass Attempts: ${Object.keys(passAttemptsMap).length}, Pass Completions: ${Object.keys(passCompletionsMap).length}, Rush Yards: ${Object.keys(qbRushYardsMap).length}, TDs Over: ${Object.keys(qbTdsOverMap).length}`);
      console.log(`   RB Props: Rush Attempts: ${Object.keys(rbRushAttemptsMap).length}, Rush Yards: ${Object.keys(rbRushYardsMap).length}, TDs Over: ${Object.keys(rbTdsOverMap).length}`);
      console.log(`   WR Props: TDs Over: ${Object.keys(wrTdsOverMap).length}, Receptions: ${Object.keys(wrReceptionsMap).length}, Rec Yards: ${Object.keys(wrRecYdsMap).length}`);
      console.log(`   TE Props: TDs Over: ${Object.keys(teTdsOverMap).length}, Receptions: ${Object.keys(teReceptionsMap).length}, Rec Yards: ${Object.keys(teRecYdsMap).length}`);
      console.log(`   - (2 API calls vs ${totalPlayers * 3} individual calls)`);
      
    } catch (error) {
      console.error('Error fetching ALL props (batch):', error);
    }
  };

  // Function to fetch WR/TE 1+ TD (player_tds_over) props with betonlineag Over 0.5 preference
  const fetchWrTeTdsOverProps = async (entries: PlayerPoolEntry[], weekId: number) => {
    try {
      const wrPlayers = entries.filter(e => e.player.position === 'WR');
      const tePlayers = entries.filter(e => e.player.position === 'TE');
      const wrMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      const teMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};

      const fetchFor = async (playerDkId: number) => {
        // Prefer betonlineag Over 0.5, fallback betonlineag Over any, then DK Over 0.5, then DK Over any
        const betResp = await PlayerService.getPlayerProps(playerDkId, {
          week_id: weekId,
          bookmaker: 'betonlineag',
          market: 'player_tds_over'
        });
        let chosen = betResp.props.find(p => p.outcome_name === 'Over' && p.bookmaker === 'betonlineag' && p.market === 'player_tds_over' && Number(p.outcome_point) === 0.5)
          || betResp.props.find(p => p.outcome_name === 'Over' && p.bookmaker === 'betonlineag' && p.market === 'player_tds_over');
        if (!chosen) {
          const dkResp = await PlayerService.getPlayerProps(playerDkId, {
            week_id: weekId,
            bookmaker: 'draftkings',
            market: 'player_tds_over'
          });
          chosen = dkResp.props.find(p => p.outcome_name === 'Over' && p.bookmaker === 'draftkings' && p.market === 'player_tds_over' && Number(p.outcome_point) === 0.5)
            || dkResp.props.find(p => p.outcome_name === 'Over' && p.bookmaker === 'draftkings' && p.market === 'player_tds_over');
        }
        return chosen ? {
          point: chosen.outcome_point || undefined,
          price: chosen.outcome_price || undefined,
          bookmaker: chosen.bookmaker || undefined,
          likelihood: chosen.probability || undefined
        } : undefined;
      };

      for (const wr of wrPlayers) {
        try {
          const res = await fetchFor(wr.player.playerDkId);
          if (res) wrMap[wr.player.playerDkId] = res;
        } catch (e) {
          console.error(`Error fetching 1+ TD props for WR ${wr.player.displayName}:`, e);
        }
      }
      for (const te of tePlayers) {
        try {
          const res = await fetchFor(te.player.playerDkId);
          if (res) teMap[te.player.playerDkId] = res;
        } catch (e) {
          console.error(`Error fetching 1+ TD props for TE ${te.player.displayName}:`, e);
        }
      }

      setWrTdsOverProps(wrMap);
      setTeTdsOverProps(teMap);
      console.log(`🎯 Fetched 1+ TD props for WR: ${Object.keys(wrMap).length}, TE: ${Object.keys(teMap).length}`);
    } catch (error) {
      console.error('Error fetching WR/TE 1+ TD props:', error);
    }
  };

  // Function to fetch WR/TE receptions (player_receptions) props from DraftKings Over
  const fetchWrTeReceptionsProps = async (entries: PlayerPoolEntry[], weekId: number) => {
    try {
      const wrPlayers = entries.filter(e => e.player.position === 'WR');
      const tePlayers = entries.filter(e => e.player.position === 'TE');
      const wrMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      const teMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};

      const fetchFor = async (playerDkId: number) => {
        const resp = await PlayerService.getPlayerProps(playerDkId, {
          week_id: weekId,
          bookmaker: 'draftkings',
          market: 'player_receptions'
        });
        const over = resp.props.find(p => p.outcome_name === 'Over' && p.bookmaker === 'draftkings' && p.market === 'player_receptions');
        return over ? {
          point: over.outcome_point || undefined,
          price: over.outcome_price || undefined,
          bookmaker: over.bookmaker || undefined,
          likelihood: over.probability || undefined
        } : undefined;
      };

      for (const wr of wrPlayers) {
        try {
          const res = await fetchFor(wr.player.playerDkId);
          if (res) wrMap[wr.player.playerDkId] = res;
        } catch (e) {
          console.error(`Error fetching receptions props for WR ${wr.player.displayName}:`, e);
        }
      }
      for (const te of tePlayers) {
        try {
          const res = await fetchFor(te.player.playerDkId);
          if (res) teMap[te.player.playerDkId] = res;
        } catch (e) {
          console.error(`Error fetching receptions props for TE ${te.player.displayName}:`, e);
        }
      }

      setWrReceptionsProps(wrMap);
      setTeReceptionsProps(teMap);
      console.log(`🎯 Fetched receptions props for WR: ${Object.keys(wrMap).length}, TE: ${Object.keys(teMap).length}`);
    } catch (error) {
      console.error('Error fetching WR/TE receptions props:', error);
    }
  };

  // Function to fetch WR/TE receiving yards (player_reception_yds) props from DraftKings Over
  const fetchWrTeRecYdsProps = async (entries: PlayerPoolEntry[], weekId: number) => {
    try {
      const wrPlayers = entries.filter(e => e.player.position === 'WR');
      const tePlayers = entries.filter(e => e.player.position === 'TE');
      const wrMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      const teMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};

      const fetchFor = async (playerDkId: number) => {
        const resp = await PlayerService.getPlayerProps(playerDkId, {
          week_id: weekId,
          bookmaker: 'draftkings',
          market: 'player_reception_yds'
        });
        const over = resp.props.find(p => p.outcome_name === 'Over' && p.bookmaker === 'draftkings' && p.market === 'player_reception_yds');
        return over ? {
          point: over.outcome_point || undefined,
          price: over.outcome_price || undefined,
          bookmaker: over.bookmaker || undefined,
          likelihood: over.probability || undefined
        } : undefined;
      };

      for (const wr of wrPlayers) {
        try {
          const res = await fetchFor(wr.player.playerDkId);
          if (res) wrMap[wr.player.playerDkId] = res;
        } catch (e) {
          console.error(`Error fetching rec yds props for WR ${wr.player.displayName}:`, e);
        }
      }
      for (const te of tePlayers) {
        try {
          const res = await fetchFor(te.player.playerDkId);
          if (res) teMap[te.player.playerDkId] = res;
        } catch (e) {
          console.error(`Error fetching rec yds props for TE ${te.player.displayName}:`, e);
        }
      }

      setWrRecYdsProps(wrMap);
      setTeRecYdsProps(teMap);
      console.log(`🎯 Fetched rec yds props for WR: ${Object.keys(wrMap).length}, TE: ${Object.keys(teMap).length}`);
    } catch (error) {
      console.error('Error fetching WR/TE rec yds props:', error);
    }
  };

  // Function to fetch RB rush attempts props
  const fetchRbRushAttemptsProps = async (entries: PlayerPoolEntry[], weekId: number) => {
    try {
      const rbPlayers = entries.filter(entry => entry.player.position === 'RB');
      const propsMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};

      for (const rb of rbPlayers) {
        try {
          const propsData = await PlayerService.getPlayerProps(rb.player.playerDkId, {
            week_id: weekId,
            bookmaker: 'draftkings',
            market: 'player_rush_attempts'
          });

          const overProp = propsData.props.find(prop =>
            prop.outcome_name === 'Over' &&
            prop.bookmaker === 'draftkings' &&
            prop.market === 'player_rush_attempts'
          );

          if (overProp) {
            propsMap[rb.player.playerDkId] = {
              point: overProp.outcome_point || undefined,
              price: overProp.outcome_price || undefined,
              bookmaker: overProp.bookmaker || undefined,
              likelihood: overProp.probability || undefined
            };
          }
        } catch (error) {
          console.error(`Error fetching rush attempts props for RB ${rb.player.displayName}:`, error);
        }
      }

      setRbRushAttemptsProps(propsMap);
      console.log(`🎯 Fetched rush attempts props for ${Object.keys(propsMap).length} RBs`);
    } catch (error) {
      console.error('Error fetching RB rush attempts props:', error);
    }
  };

  // Function to fetch RB rush yards props
  const fetchRbRushYardsProps = async (entries: PlayerPoolEntry[], weekId: number) => {
    try {
      const rbPlayers = entries.filter(entry => entry.player.position === 'RB');
      const propsMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};

      for (const rb of rbPlayers) {
        try {
          const propsData = await PlayerService.getPlayerProps(rb.player.playerDkId, {
            week_id: weekId,
            bookmaker: 'draftkings',
            market: 'player_rush_yds'
          });

          const overProp = propsData.props.find(prop =>
            prop.outcome_name === 'Over' &&
            prop.bookmaker === 'draftkings' &&
            prop.market === 'player_rush_yds'
          );

          if (overProp) {
            propsMap[rb.player.playerDkId] = {
              point: overProp.outcome_point || undefined,
              price: overProp.outcome_price || undefined,
              bookmaker: overProp.bookmaker || undefined,
              likelihood: overProp.probability || undefined
            };
          }
        } catch (error) {
          console.error(`Error fetching rush yards props for RB ${rb.player.displayName}:`, error);
        }
      }

      setRbRushYardsProps(propsMap);
      console.log(`🎯 Fetched rush yards props for ${Object.keys(propsMap).length} RBs`);
    } catch (error) {
      console.error('Error fetching RB rush yards props:', error);
    }
  };

  // Function to fetch RB 1+ TD (player_tds_over) props
  const fetchRbTdsOverProps = async (entries: PlayerPoolEntry[], weekId: number) => {
    try {
      const rbPlayers = entries.filter(entry => entry.player.position === 'RB');
      const propsMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};

      for (const rb of rbPlayers) {
        try {
          // Prefer betonlineag Over 0.5
          const propsDataBetOnline = await PlayerService.getPlayerProps(rb.player.playerDkId, {
            week_id: weekId,
            bookmaker: 'betonlineag',
            market: 'player_tds_over'
          });

          let chosen = propsDataBetOnline.props.find(prop =>
            prop.outcome_name === 'Over' &&
            prop.bookmaker === 'betonlineag' &&
            prop.market === 'player_tds_over' &&
            Number(prop.outcome_point) === 0.5
          );

          // Fallback: any Over on betonlineag
          if (!chosen) {
            chosen = propsDataBetOnline.props.find(prop =>
              prop.outcome_name === 'Over' &&
              prop.bookmaker === 'betonlineag' &&
              prop.market === 'player_tds_over'
            );
          }

          // Fallback to DraftKings if nothing on betonlineag
          if (!chosen) {
            const propsDataDK = await PlayerService.getPlayerProps(rb.player.playerDkId, {
              week_id: weekId,
              bookmaker: 'draftkings',
              market: 'player_tds_over'
            });
            chosen = propsDataDK.props.find(prop =>
              prop.outcome_name === 'Over' &&
              prop.bookmaker === 'draftkings' &&
              prop.market === 'player_tds_over' &&
              Number(prop.outcome_point) === 0.5
            ) || propsDataDK.props.find(prop =>
              prop.outcome_name === 'Over' &&
              prop.bookmaker === 'draftkings' &&
              prop.market === 'player_tds_over'
            );
          }

          if (chosen) {
            propsMap[rb.player.playerDkId] = {
              point: chosen.outcome_point || undefined,
              price: chosen.outcome_price || undefined,
              bookmaker: chosen.bookmaker || undefined,
              likelihood: chosen.probability || undefined
            };
          }
        } catch (error) {
          console.error(`Error fetching 1+ TD props for RB ${rb.player.displayName}:`, error);
        }
      }

      setRbTdsOverProps(propsMap);
      console.log(`🎯 Fetched 1+ TD props for ${Object.keys(propsMap).length} RBs`);
    } catch (error) {
      console.error('Error fetching RB 1+ TD props:', error);
    }
  };

  // Function to fetch QB passing TDs props
  const fetchQbPassingTdsProps = async (entries: PlayerPoolEntry[], weekId: number) => {
    try {
      const qbPlayers = entries.filter(entry => entry.player.position === 'QB');
      const propsMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      
      // Fetch props for each QB in the player pool
      for (const qb of qbPlayers) {
        try {
          const propsData = await PlayerService.getPlayerProps(qb.player.playerDkId, { 
            week_id: weekId, 
            bookmaker: 'draftkings',
            market: 'player_pass_tds'
          });
          
          // Find the "Over" prop for passing TDs
          const overProp = propsData.props.find(prop => 
            prop.outcome_name === 'Over' && 
            prop.bookmaker === 'draftkings' &&
            prop.market === 'player_pass_tds'
          );
          
          if (overProp) {
            propsMap[qb.player.playerDkId] = {
              point: overProp.outcome_point || undefined,
              price: overProp.outcome_price || undefined,
              bookmaker: overProp.bookmaker || undefined,
              likelihood: overProp.probability || undefined
            };
          }
        } catch (error) {
          console.error(`Error fetching passing TDs props for QB ${qb.player.displayName}:`, error);
        }
      }
      
      setQbPassingTdsProps(propsMap);
      console.log(`🎯 Fetched passing TDs props for ${Object.keys(propsMap).length} QBs`);
    } catch (error) {
      console.error('Error fetching QB passing TDs props:', error);
    }
  };

  // Function to fetch QB pass attempts and completions props
  const fetchQbPassAttemptsCompletionsProps = async (entries: PlayerPoolEntry[], weekId: number) => {
    try {
      const qbPlayers = entries.filter(entry => entry.player.position === 'QB');
      const attemptsMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      const completionsMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};
      
      // Fetch props for each QB in the player pool
      for (const qb of qbPlayers) {
        try {
          // Fetch pass attempts props
          const attemptsData = await PlayerService.getPlayerProps(qb.player.playerDkId, { 
            week_id: weekId, 
            bookmaker: 'draftkings',
            market: 'player_pass_attempts'
          });
          
          // Find the "Over" prop for pass attempts
          const overAttemptsProp = attemptsData.props.find(prop => 
            prop.outcome_name === 'Over' && 
            prop.bookmaker === 'draftkings' &&
            prop.market === 'player_pass_attempts'
          );
          
          if (overAttemptsProp) {
            attemptsMap[qb.player.playerDkId] = {
              point: overAttemptsProp.outcome_point || undefined,
              price: overAttemptsProp.outcome_price || undefined,
              bookmaker: overAttemptsProp.bookmaker || undefined,
              likelihood: overAttemptsProp.probability || undefined
            };
          }

          // Fetch pass completions props
          const completionsData = await PlayerService.getPlayerProps(qb.player.playerDkId, { 
            week_id: weekId, 
            bookmaker: 'draftkings',
            market: 'player_pass_completions'
          });
          
          // Find the "Over" prop for pass completions
          const overCompletionsProp = completionsData.props.find(prop => 
            prop.outcome_name === 'Over' && 
            prop.bookmaker === 'draftkings' &&
            prop.market === 'player_pass_completions'
          );
          
          if (overCompletionsProp) {
            completionsMap[qb.player.playerDkId] = {
              point: overCompletionsProp.outcome_point || undefined,
              price: overCompletionsProp.outcome_price || undefined,
              bookmaker: overCompletionsProp.bookmaker || undefined,
              likelihood: overCompletionsProp.probability || undefined
            };
          }
        } catch (error) {
          console.error(`Error fetching pass attempts/completions props for QB ${qb.player.displayName}:`, error);
        }
      }
      
      setQbPassAttemptsProps(attemptsMap);
      setQbPassCompletionsProps(completionsMap);
      console.log(`🎯 Fetched pass attempts props for ${Object.keys(attemptsMap).length} QBs`);
      console.log(`🎯 Fetched pass completions props for ${Object.keys(completionsMap).length} QBs`);
    } catch (error) {
      console.error('Error fetching QB pass attempts/completions props:', error);
    }
  };

  // Function to fetch QB rush yards props
  const fetchQbRushYardsProps = async (entries: PlayerPoolEntry[], weekId: number) => {
    try {
      const qbPlayers = entries.filter(entry => entry.player.position === 'QB');
      const propsMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};

      for (const qb of qbPlayers) {
        try {
          const propsData = await PlayerService.getPlayerProps(qb.player.playerDkId, {
            week_id: weekId,
            bookmaker: 'draftkings',
            market: 'player_rush_yds'
          });

          const overProp = propsData.props.find(prop =>
            prop.outcome_name === 'Over' &&
            prop.bookmaker === 'draftkings' &&
            prop.market === 'player_rush_yds'
          );

          if (overProp) {
            propsMap[qb.player.playerDkId] = {
              point: overProp.outcome_point || undefined,
              price: overProp.outcome_price || undefined,
              bookmaker: overProp.bookmaker || undefined,
              likelihood: overProp.probability || undefined
            };
          }
        } catch (error) {
          console.error(`Error fetching rush yards props for QB ${qb.player.displayName}:`, error);
        }
      }

      setQbRushYardsProps(propsMap);
      console.log(`🎯 Fetched rush yards props for ${Object.keys(propsMap).length} QBs`);
    } catch (error) {
      console.error('Error fetching QB rush yards props:', error);
    }
  };

  // Function to fetch QB 1+ TD (player_tds_over) props
  const fetchQbTdsOverProps = async (entries: PlayerPoolEntry[], weekId: number) => {
    try {
      const qbPlayers = entries.filter(entry => entry.player.position === 'QB');
      const propsMap: Record<number, { point?: number; price?: number; bookmaker?: string; likelihood?: number }> = {};

      for (const qb of qbPlayers) {
        try {
          // Prefer betonlineag Over 0.5
          const propsDataBetOnline = await PlayerService.getPlayerProps(qb.player.playerDkId, {
            week_id: weekId,
            bookmaker: 'betonlineag',
            market: 'player_tds_over'
          });

          let chosen = propsDataBetOnline.props.find(prop =>
            prop.outcome_name === 'Over' &&
            prop.bookmaker === 'betonlineag' &&
            prop.market === 'player_tds_over' &&
            Number(prop.outcome_point) === 0.5
          );

          // Fallback: any Over on betonlineag
          if (!chosen) {
            chosen = propsDataBetOnline.props.find(prop =>
              prop.outcome_name === 'Over' &&
              prop.bookmaker === 'betonlineag' &&
              prop.market === 'player_tds_over'
            );
          }

          // Fallback to DraftKings if nothing on betonlineag
          if (!chosen) {
            const propsDataDK = await PlayerService.getPlayerProps(qb.player.playerDkId, {
              week_id: weekId,
              bookmaker: 'draftkings',
              market: 'player_tds_over'
            });
            chosen = propsDataDK.props.find(prop =>
              prop.outcome_name === 'Over' &&
              prop.bookmaker === 'draftkings' &&
              prop.market === 'player_tds_over' &&
              Number(prop.outcome_point) === 0.5
            ) || propsDataDK.props.find(prop =>
              prop.outcome_name === 'Over' &&
              prop.bookmaker === 'draftkings' &&
              prop.market === 'player_tds_over'
            );
          }

          if (chosen) {
            propsMap[qb.player.playerDkId] = {
              point: chosen.outcome_point || undefined,
              price: chosen.outcome_price || undefined,
              bookmaker: chosen.bookmaker || undefined,
              likelihood: chosen.probability || undefined
            };
          }
        } catch (error) {
          console.error(`Error fetching 1+ TD props for QB ${qb.player.displayName}:`, error);
        }
      }

      setQbTdsOverProps(propsMap);
      console.log(`🎯 Fetched 1+ TD props for ${Object.keys(propsMap).length} QBs`);
    } catch (error) {
      console.error('Error fetching QB 1+ TD props:', error);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🎯 Starting to fetch data...');
        setLoading(true);
        
        // Fetch weeks
        console.log('🎯 Fetching weeks from:', `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/weeks/`);

        const weeksData = await PlayerService.getWeeks();
        console.log('🎯 Weeks data received:', weeksData);
        setWeeks(weeksData.weeks);
        
        if (weeksData.weeks.length > 0) {
          // Find Active week specifically, or default to the first week
          const activeWeek = weeksData.weeks.find(w => w.status === 'Active');
          const defaultWeek = activeWeek || weeksData.weeks[0];
          console.log('🎯 Selected week:', defaultWeek);
          setSelectedWeek(defaultWeek.id);
          
          // Fetch player pool for the selected week
          console.log('🎯 Fetching player pool for week:', defaultWeek.id);
          console.log('🎯 PlayerService.getPlayerPool will be called with week ID:', defaultWeek.id);

          const poolData = await PlayerService.getPlayerPool(defaultWeek.id, { limit: 1000 });
          console.log('🎯 Player pool data received:', poolData);
          console.log('🎯 Pool data entries length:', poolData.entries?.length || 'undefined');
          console.log('🎯 Pool data total:', poolData.total || 'undefined');
          setPlayerPool(poolData.entries || []);

          // Fetch QB passing yards, TDs, and attempts/completions props
          // Fetch ALL props in 2 batch calls instead of 10+ individual calls
          await fetchAllPropsBatch(poolData.entries || [], defaultWeek.id);

          // Prefer server-side joined analysis for accuracy
          try {
            const analysis = await PlayerService.getPlayerPoolWithAnalysis(defaultWeek.id);
            const mapByTeam: Record<string, { opponentAbbr: string | null; homeOrAway: 'H' | 'A' | 'N'; proj_spread?: number | null; proj_total?: number | null; implied_team_total?: number | null }> = {};
            (analysis.entries || []).forEach((e: any) => {
              const team = e.entry?.player?.team;
              if (team) {
                mapByTeam[team] = {
                  opponentAbbr: e.analysis?.opponent_abbr ?? null,
                  homeOrAway: (e.analysis?.homeoraway as 'H' | 'A' | 'N') || 'N',
                  proj_spread: e.analysis?.proj_spread ?? null,
                  proj_total: e.analysis?.proj_total ?? null,
                  implied_team_total: e.analysis?.implied_team_total ?? null
                };
              }
            });
            setGamesMap(mapByTeam);
          } catch (e) {
            console.error('Failed to load joined analysis; falling back to games map', e);
            try {
              const gamesResp = await WeekService.getGamesForWeek(defaultWeek.id);
              const fallback: Record<string, { opponentAbbr: string | null; homeOrAway: 'H' | 'A' | 'N'; proj_spread?: number | null; proj_total?: number | null; implied_team_total?: number | null }> = {};
              (gamesResp.games || []).forEach((g: any) => {
                if (g.team_abbr) {
                  fallback[g.team_abbr] = {
                    opponentAbbr: g.opponent_abbr ?? null,
                    homeOrAway: g.homeoraway as 'H' | 'A' | 'N',
                    proj_spread: g.proj_spread ?? null,
                    proj_total: g.proj_total ?? null,
                    implied_team_total: g.implied_team_total ?? null
                  };
                }
              });
              setGamesMap(fallback);
            } catch (e2) {
              console.error('Failed to load games for week', e2);
            }
          }
        }
      } catch (err: unknown) {
        console.error('🎯 Error fetching data:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('🎯 Error details:', {
          message: errorMessage,
          stack: err instanceof Error ? err.stack : undefined,
          name: err instanceof Error ? err.name : undefined
        });
        setError(`Failed to fetch data: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch player pool when week changes
  useEffect(() => {
    if (!selectedWeek) return;

    const fetchPlayerPool = async () => {
      try {
        setLoading(true);
        setError(null);
        const poolData = await PlayerService.getPlayerPool(selectedWeek, { limit: 1000 });
        setPlayerPool(poolData.entries || []);
        
        // Fetch QB passing yards, TDs, and attempts/completions props
        // Fetch ALL props in 2 batch calls instead of 10+ individual calls
        await fetchAllPropsBatch(poolData.entries || [], selectedWeek);
        try {
          const analysis = await PlayerService.getPlayerPoolWithAnalysis(selectedWeek);
          const mapByTeam: Record<string, { opponentAbbr: string | null; homeOrAway: 'H' | 'A' | 'N'; proj_spread?: number | null; proj_total?: number | null; implied_team_total?: number | null }> = {};
          (analysis.entries || []).forEach((e: any) => {
            const team = e.entry?.player?.team;
            if (team) {
              mapByTeam[team] = {
                opponentAbbr: e.analysis?.opponent_abbr ?? null,
                homeOrAway: (e.analysis?.homeoraway as 'H' | 'A' | 'N') || 'N',
                proj_spread: e.analysis?.proj_spread ?? null,
                proj_total: e.analysis?.proj_total ?? null,
                implied_team_total: e.analysis?.implied_team_total ?? null
              };
            }
          });
          setGamesMap(mapByTeam);
        } catch (e) {
          console.error('Failed to load joined analysis; falling back to games map', e);
          try {
            const gamesResp = await WeekService.getGamesForWeek(selectedWeek);
            const map: Record<string, { opponentAbbr: string | null; homeOrAway: 'H' | 'A' | 'N'; proj_spread?: number | null; proj_total?: number | null; implied_team_total?: number | null }> = {};
            (gamesResp.games || []).forEach((g: any) => {
              if (g.team_abbr) {
                map[g.team_abbr] = {
                  opponentAbbr: g.opponent_abbr ?? null,
                  homeOrAway: g.homeoraway as 'H' | 'A' | 'N',
                  proj_spread: g.proj_spread ?? null,
                  proj_total: g.proj_total ?? null,
                  implied_team_total: g.implied_team_total ?? null
                };
              }
            });
            setGamesMap(map);
          } catch (e2) {
            console.error('Failed to load games for week', e2);
          }
        }
      } catch (err: unknown) {
        console.error('Error fetching player pool:', err);
        setError('Failed to fetch player pool');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerPool();
  }, [selectedWeek]);

  // Group players by position
  const playersByPosition = useMemo(() => {
    const grouped: Record<string, PlayerPoolEntry[]> = {
      QB: [],
      RB: [],
      WR: [],
      TE: [],
      DST: []
    };

    playerPool.forEach(entry => {
      const pos = entry.player.position;
      if (grouped[pos]) {
        grouped[pos].push(entry);
      }
    });

    return grouped;
  }, [playerPool]);

  // Get flex players (RB, WR, TE)
  const getFlexPlayers = () => {
    return [
      ...playersByPosition.RB,
      ...playersByPosition.WR,
      ...playersByPosition.TE
    ];
  };

  // Get all players for a position (without filters)
  const getAllPlayersForPosition = (position: string) => {
    if (position === 'FLEX') {
      return getFlexPlayers();
    } else {
      return playersByPosition[position] || [];
    }
  };

  // Get unique draft groups from player pool data
  const getUniqueDraftGroups = useMemo(() => {
    const draftGroups = new Set<string>();
    playerPool.forEach(entry => {
      if (entry.draftGroup) {
        draftGroups.add(entry.draftGroup);
      }
    });
    const uniqueGroups = Array.from(draftGroups).sort();
    console.log('🎯 Unique draft groups found:', uniqueGroups);
    console.log('🎯 Player pool sample:', playerPool.slice(0, 3).map(p => ({ name: p.player.displayName, draftGroup: p.draftGroup })));
    return uniqueGroups;
  }, [playerPool]);

  // Filter players for current tab
  const getFilteredPlayers = (position: string) => {
    let players = getAllPlayersForPosition(position);
    
    console.log(`🎯 getFilteredPlayers for ${position}:`, {
      initialCount: players.length,
      searchTerm,
      hideExcluded,
      tierFilter,
      draftGroupFilter,
      databaseExcludedCount: players.filter(p => p.excluded === true).length
    });

    // Filter out disabled players first (isDisabled = 1)
    players = players.filter(entry => !entry.isDisabled);
    console.log(`🎯 After disabled filter: ${players.length} players`);

    // Apply database exclusion filter based on Hide Excluded button
    if (hideExcluded) {
      // When Hide Excluded is ON: only show players with excluded = false
      players = players.filter(entry => !entry.excluded);
      console.log(`🎯 After database exclusion filter: ${players.length} players`);
    }
    // When Hide Excluded is OFF: show all players (excluded = false and excluded = true)

    // Apply search filter
    if (searchTerm) {
      players = players.filter(entry => 
        entry.player.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.player.team.toLowerCase().includes(searchTerm.toLowerCase())
      );
      console.log(`🎯 After search filter: ${players.length} players`);
    }

    // Apply tier filter
    if (tierFilter !== 'all') {
      players = players.filter(entry => entry.tier === tierFilter);
      console.log(`🎯 After tier filter: ${players.length} players`);
    }

    // Apply draft group filter
    if (draftGroupFilter !== 'all') {
      players = players.filter(entry => entry.draftGroup === draftGroupFilter);
      console.log(`🎯 After draft group filter: ${players.length} players`);
    }

    console.log(`🎯 Final filtered players for ${position}: ${players.length}`);
    
    // Return unsorted players - sorting will be applied within tier groups
    return players;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'questionable':
      case 'q':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'out':
      case 'ir':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get tier configuration
  const getTierConfig = (tier: number) => {
    switch (tier) {
      case 1:
        return {
          label: 'Core/Cash',
          description: 'Must-have foundational plays',
          color: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: '⭐',
          headerColor: 'bg-blue-50/80 border-b border-blue-200',
          headerTextColor: 'text-blue-800'
        };
      case 2:
        return {
          label: 'Strong Plays',
          description: 'Solid complementary pieces',
          color: 'bg-green-100 text-green-800 border-green-300',
          icon: '💪',
          headerColor: 'bg-green-50/80 border-b border-green-200',
          headerTextColor: 'text-green-800'
        };
      case 3:
        return {
          label: 'GPP/Ceiling',
          description: 'High-variance leverage plays',
          color: 'bg-purple-100 text-purple-800 border-purple-300',
          icon: '🚀',
          headerColor: 'bg-purple-50/80 border-b border-purple-200',
          headerTextColor: 'text-purple-800'
        };
      case 4:
        return {
          label: 'Avoids/Thin',
          description: 'Rarely played options',
          color: 'bg-red-100 text-red-800 border-red-300',
          icon: '⚠️',
          headerColor: 'bg-red-50/80 border-b border-red-200',
          headerTextColor: 'text-red-800'
        };
      default:
        return {
          label: 'Unknown',
          description: 'Unknown tier',
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: '❓',
          headerColor: 'bg-gray-50/80 border-b border-gray-200',
          headerTextColor: 'text-gray-800'
        };
    }
  };

  // Sort players
  const sortPlayers = (players: PlayerPoolEntry[]) => {
    return [...players].sort((a, b) => {
      let aValue: string | number, bValue: string | number;
      
      switch (sortField) {
        case 'player':
          aValue = a.player.displayName.toLowerCase();
          bValue = b.player.displayName.toLowerCase();
          break;
        case 'opponent': {
          const aOpp = (gamesMap[a.player.team]?.opponentAbbr || '').toLowerCase();
          const bOpp = (gamesMap[b.player.team]?.opponentAbbr || '').toLowerCase();
          aValue = aOpp;
          bValue = bOpp;
          break;
        }
        case 'spread': {
          const aSpread = gamesMap[a.player.team]?.proj_spread;
          const bSpread = gamesMap[b.player.team]?.proj_spread;
          aValue = aSpread == null ? Number.POSITIVE_INFINITY : aSpread;
          bValue = bSpread == null ? Number.POSITIVE_INFINITY : bSpread;
          break;
        }
        case 'total': {
          const aTotal = gamesMap[a.player.team]?.proj_total;
          const bTotal = gamesMap[b.player.team]?.proj_total;
          aValue = aTotal == null ? Number.POSITIVE_INFINITY : aTotal;
          bValue = bTotal == null ? Number.POSITIVE_INFINITY : bTotal;
          break;
        }
        case 'implied': {
          const aImp = gamesMap[a.player.team]?.implied_team_total;
          const bImp = gamesMap[b.player.team]?.implied_team_total;
          aValue = aImp == null ? Number.POSITIVE_INFINITY : aImp;
          bValue = bImp == null ? Number.POSITIVE_INFINITY : bImp;
          break;
        }
        case 'salary':
          aValue = a.salary || 0;
          bValue = b.salary || 0;
          break;
        case 'projection':
          aValue = a.projectedPoints || 0;
          bValue = b.projectedPoints || 0;
          break;
        case 'opponentRank':
          // Extract opponent rank sortValue from draftStatAttributes where id = -2
          const aDraftStats = Array.isArray(a.draftStatAttributes) ? a.draftStatAttributes : [];
          const bDraftStats = Array.isArray(b.draftStatAttributes) ? b.draftStatAttributes : [];
          const aOpponentRank = aDraftStats.find((attr: { id: number; sortValue?: number | string }) => attr.id === -2)?.sortValue || 0;
          const bOpponentRank = bDraftStats.find((attr: { id: number; sortValue?: number | string }) => attr.id === -2)?.sortValue || 0;
          
          aValue = typeof aOpponentRank === 'string' ? parseFloat(aOpponentRank) : aOpponentRank;
          bValue = typeof bOpponentRank === 'string' ? parseFloat(bOpponentRank) : bOpponentRank;
          break;
        case 'value':
          aValue = a.projectedPoints && a.salary ? (a.projectedPoints / a.salary) * 1000 : 0;
          bValue = b.projectedPoints && b.salary ? (b.projectedPoints / b.salary) * 1000 : 0;
          break;
        case 'status':
          aValue = a.status?.toLowerCase() || '';
          bValue = b.status?.toLowerCase() || '';
          break;
        case 'tier':
          aValue = a.tier || 4;
          bValue = b.tier || 4;
          break;
        case 'exclude':
          aValue = a.excluded === true ? 1 : 0;
          bValue = b.excluded === true ? 1 : 0;
          break;
        case 'passYds': {
          // Sort by passing yards point value (the yardage line)
          const aPassYds = qbPassYardsProps[a.player.playerDkId]?.point;
          const bPassYds = qbPassYardsProps[b.player.playerDkId]?.point;
          aValue = aPassYds || 0;
          bValue = bPassYds || 0;
          break;
        }
        case 'passingTds': {
          // Sort by passing TDs point value (the TD line)
          const aPassingTds = qbPassingTdsProps[a.player.playerDkId]?.point;
          const bPassingTds = qbPassingTdsProps[b.player.playerDkId]?.point;
          aValue = aPassingTds || 0;
          bValue = bPassingTds || 0;
          break;
        }
        case 'passing': {
          // Sort by pass attempts point value (the attempts line)
          const aPassAttempts = qbPassAttemptsProps[a.player.playerDkId]?.point;
          const bPassAttempts = qbPassAttemptsProps[b.player.playerDkId]?.point;
          aValue = aPassAttempts || 0;
          bValue = bPassAttempts || 0;
          break;
        }
        case 'qbRushYds': {
          // Sort by QB rush yards line
          const aRushYds = qbRushYardsProps[a.player.playerDkId]?.point;
          const bRushYds = qbRushYardsProps[b.player.playerDkId]?.point;
          aValue = aRushYds || 0;
          bValue = bRushYds || 0;
          break;
        }
        case 'qbTdsOver': {
          // Sort by QB 1+ TD (prefer point 0.5), then odds
          const aPoint = qbTdsOverProps[a.player.playerDkId]?.point;
          const bPoint = qbTdsOverProps[b.player.playerDkId]?.point;
          const aPrice = qbTdsOverProps[a.player.playerDkId]?.price;
          const bPrice = qbTdsOverProps[b.player.playerDkId]?.price;
          const normalize = (pt?: number, pr?: number) => {
            const pointScore = pt == null ? -1 : pt;
            const priceScore = pr == null ? -99999 : pr;
            return pointScore * 100000 + priceScore;
          };
          aValue = normalize(aPoint, aPrice);
          bValue = normalize(bPoint, bPrice);
          break;
        }
        case 'wrteTdsOver': {
          // Sort WR/TE 1+ TD using preference for point 0.5 then odds
          const resolve = (entry: PlayerPoolEntry) => {
            const map = entry.player.position === 'WR' ? wrTdsOverProps : teTdsOverProps;
            const data = map[entry.player.playerDkId];
            return { pt: data?.point, pr: data?.price };
          };
          const aRes = resolve(a);
          const bRes = resolve(b);
          const normalize = (pt?: number, pr?: number) => {
            const pointScore = pt == null ? -1 : pt;
            const priceScore = pr == null ? -99999 : pr;
            return pointScore * 100000 + priceScore;
          };
          aValue = normalize(aRes.pt, aRes.pr);
          bValue = normalize(bRes.pt, bRes.pr);
          break;
        }
        case 'wrteReceptions': {
          // Sort WR/TE receptions by line, then odds
          const resolve = (entry: PlayerPoolEntry) => {
            const map = entry.player.position === 'WR' ? wrReceptionsProps : teReceptionsProps;
            const data = map[entry.player.playerDkId];
            return { pt: data?.point, pr: data?.price };
          };
          const aRes = resolve(a);
          const bRes = resolve(b);
          const normalize = (pt?: number, pr?: number) => {
            const pointScore = pt == null ? -1 : pt;
            const priceScore = pr == null ? -99999 : pr;
            return pointScore * 100000 + priceScore;
          };
          aValue = normalize(aRes.pt, aRes.pr);
          bValue = normalize(bRes.pt, bRes.pr);
          break;
        }
        case 'wrteRecYds': {
          // Sort WR/TE rec yards by line, then odds
          const resolve = (entry: PlayerPoolEntry) => {
            const map = entry.player.position === 'WR' ? wrRecYdsProps : teRecYdsProps;
            const data = map[entry.player.playerDkId];
            return { pt: data?.point, pr: data?.price };
          };
          const aRes = resolve(a);
          const bRes = resolve(b);
          const normalize = (pt?: number, pr?: number) => {
            const pointScore = pt == null ? -1 : pt;
            const priceScore = pr == null ? -99999 : pr;
            return pointScore * 100000 + priceScore;
          };
          aValue = normalize(aRes.pt, aRes.pr);
          bValue = normalize(bRes.pt, bRes.pr);
          break;
        }
        case 'rushAttmpts': {
          // Sort by rush attempts point value (the attempts line)
          const aRushAttempts = rbRushAttemptsProps[a.player.playerDkId]?.point;
          const bRushAttempts = rbRushAttemptsProps[b.player.playerDkId]?.point;
          aValue = aRushAttempts || 0;
          bValue = bRushAttempts || 0;
          break;
        }
        case 'rushYds': {
          // Sort by rush yards point value (the yards line)
          const aRushYds = rbRushYardsProps[a.player.playerDkId]?.point;
          const bRushYds = rbRushYardsProps[b.player.playerDkId]?.point;
          aValue = aRushYds || 0;
          bValue = bRushYds || 0;
          break;
        }
        case 'rbTdsOver': {
          // Sort by 1+ TD Over odds/point (prefer point 0.5)
          const aPoint = rbTdsOverProps[a.player.playerDkId]?.point;
          const bPoint = rbTdsOverProps[b.player.playerDkId]?.point;
          const aPrice = rbTdsOverProps[a.player.playerDkId]?.price;
          const bPrice = rbTdsOverProps[b.player.playerDkId]?.price;
          // Primary sort: point (0.5 preferred higher than 0 or undefined), Secondary: price
          const normalize = (pt?: number, pr?: number) => {
            const pointScore = pt == null ? -1 : pt; // 0.5 > 0 > undefined
            const priceScore = pr == null ? -99999 : pr;
            return pointScore * 100000 + priceScore;
          };
          aValue = normalize(aPoint, aPrice);
          bValue = normalize(bPoint, bPrice);
          break;
        }
        default:
          return 0;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  // Handle column sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // Set default sort direction based on field type
      if (field === 'opponentRank') {
        setSortDirection('asc'); // Lower opponent rank (better matchup) first
      } else {
        setSortDirection('asc');
      }
    }
  };

  // Calculate tier statistics for current position (excluding excluded players)
  const getTierStats = (position: string) => {
    const players = getAllPlayersForPosition(position).filter(player => !player.excluded);
    return {
      tier1: players.filter(player => player.tier === 1).length,
      tier2: players.filter(player => player.tier === 2).length,
      tier3: players.filter(player => player.tier === 3).length,
      tier4: players.filter(player => player.tier === 4).length
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading player pool...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  const totalPlayers = playerPool.length;
  const totalExcluded = playerPool.filter(p => p.excluded === true).length;

  console.log('🎯 Rendering Player Pool page with:', {
    totalPlayers,
    totalExcluded,
    activeTab,
    searchTerm,
    hideExcluded
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <User className="h-8 w-8 text-blue-600" />
            Player Pool
          </h1>
          <p className="text-gray-600 mt-1">Managing player exclusions for Week {weeks.find(w => w.id === selectedWeek)?.week_number}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={hideExcluded ? "default" : "outline"}
            onClick={() => setHideExcluded(!hideExcluded)}
            className="flex items-center gap-2"
          >
            {hideExcluded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            Hide Excluded
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search players or teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      {/* Player Evaluation Tips & Strategy Section */}
      <PlayerPoolTips selectedWeek={weeks.find(w => w.id === selectedWeek)?.week_number || 1} />

      {/* Week Selection and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-shrink-0">
            <label htmlFor="week-select" className="block text-sm font-medium text-gray-700 mb-2">
              Select Week:
            </label>
            <select
              id="week-select"
              value={selectedWeek || ''}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="block w-auto min-w-[200px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {weeks.map((week) => (
                <option key={week.id} value={week.id}>
                  Week {week.week_number} - {week.year}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-shrink-0">
            <label htmlFor="draft-group-select" className="block text-sm font-medium text-gray-700 mb-2">
              Draft Group:
            </label>
            <Select value={draftGroupFilter} onValueChange={setDraftGroupFilter}>
              <SelectTrigger className="w-auto min-w-[200px]">
                <SelectValue placeholder="All Draft Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Draft Groups</SelectItem>
                {getUniqueDraftGroups.map((draftGroup) => (
                  <SelectItem key={draftGroup} value={draftGroup}>
                    Draft Group {draftGroup}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tier Legend */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Player Tiers</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className={`${getTierConfig(1).headerColor} ${getTierConfig(1).headerTextColor} p-3 rounded-lg flex items-center gap-3`}>
            <span className="text-xl">{getTierConfig(1).icon}</span>
            <div>
              <div className="font-medium">Tier 1</div>
              <div className="text-xs opacity-90">{getTierConfig(1).label}</div>
              <div className="text-xs opacity-75">{getTierConfig(1).description}</div>
            </div>
          </div>
          <div className={`${getTierConfig(2).headerColor} ${getTierConfig(2).headerTextColor} p-3 rounded-lg flex items-center gap-3`}>
            <span className="text-xl">{getTierConfig(2).icon}</span>
            <div>
              <div className="font-medium">Tier 2</div>
              <div className="text-xs opacity-90">{getTierConfig(2).label}</div>
              <div className="text-xs opacity-75">{getTierConfig(2).description}</div>
            </div>
          </div>
          <div className={`${getTierConfig(3).headerColor} ${getTierConfig(3).headerTextColor} p-3 rounded-lg flex items-center gap-3`}>
            <span className="text-xl">{getTierConfig(3).icon}</span>
            <div>
              <div className="font-medium">Tier 3</div>
              <div className="text-xs opacity-90">{getTierConfig(3).label}</div>
              <div className="text-xs opacity-75">{getTierConfig(3).description}</div>
            </div>
          </div>
          <div className={`${getTierConfig(4).headerColor} ${getTierConfig(4).headerTextColor} p-3 rounded-lg flex items-center gap-3`}>
            <span className="text-xl">{getTierConfig(4).icon}</span>
            <div>
              <div className="font-medium">Tier 4</div>
              <div className="text-xs opacity-90">{getTierConfig(4).label}</div>
              <div className="text-xs opacity-75">{getTierConfig(4).description}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Position Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)}>
        <div className="border rounded-lg overflow-hidden">
          <TabsList className="w-full h-auto p-0 bg-muted/30 rounded-none">
            <TabsTrigger 
              value="QB" 
              className="flex-1 gap-2 px-4 py-4 rounded-none data-[state=active]:bg-background data-[state=active]:shadow-sm border-r"
            >
              <span className="font-medium">QB</span>
              <Badge variant="secondary" className="text-xs">
                {playersByPosition.QB.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="RB" 
              className="flex-1 gap-2 px-4 py-4 rounded-none data-[state=active]:bg-background data-[state=active]:shadow-sm border-r"
            >
              <span className="font-medium">RB</span>
              <Badge variant="secondary" className="text-xs">
                {playersByPosition.RB.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="WR" 
              className="flex-1 gap-2 px-4 py-4 rounded-none data-[state=active]:bg-background data-[state=active]:shadow-sm border-r"
            >
              <span className="font-medium">WR</span>
              <Badge variant="secondary" className="text-xs">
                {playersByPosition.WR.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="TE" 
              className="flex-1 gap-2 px-4 py-4 rounded-none data-[state=active]:bg-background data-[state=active]:shadow-sm border-r"
            >
              <span className="font-medium">TE</span>
              <Badge variant="secondary" className="text-xs">
                {playersByPosition.TE.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="FLEX" 
              className="flex-1 gap-2 px-4 py-4 rounded-none data-[state=active]:bg-background data-[state=active]:shadow-sm border-r"
            >
              <span className="font-medium">FLEX</span>
              <Badge variant="secondary" className="text-xs">
                {getFlexPlayers().length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="DST" 
              className="flex-1 gap-2 px-4 py-4 rounded-none data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <span className="font-medium">DST</span>
              <Badge variant="secondary" className="text-xs">
                {playersByPosition.DST.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {(['QB', 'RB', 'WR', 'TE', 'FLEX', 'DST'] as string[]).map((position) => {
            const filteredPlayers = getFilteredPlayers(position);
            const excludedCount = filteredPlayers.filter(player => player.excluded === true).length;
            const tierStats = getTierStats(position);

            return (
              <TabsContent key={position} value={position} className="m-0 border-t">
                {/* Tab Actions */}
                <div className="flex items-center justify-between px-6 py-4 bg-muted/20 border-b">
                  <div className="flex items-center gap-3">
                    {/* Tier Distribution - Interactive Filters */}
                    <div className="flex items-center gap-2">
                      {tierStats.tier1 > 0 && (
                        <button
                          onClick={() => setTierFilter(tierFilter === 1 ? 'all' : 1)}
                          className={`transition-all hover:scale-105 ${
                            tierFilter === 1 
                              ? 'ring-2 ring-blue-400 shadow-md' 
                              : 'hover:shadow-sm'
                          }`}
                        >
                          <Badge 
                            variant="outline" 
                            className={`gap-1 cursor-pointer ${
                              tierFilter === 1 
                                ? 'bg-blue-100 text-blue-900 border-blue-300' 
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            <span>⭐</span>
                            {tierStats.tier1}
                          </Badge>
                        </button>
                      )}
                      {tierStats.tier2 > 0 && (
                        <button
                          onClick={() => setTierFilter(tierFilter === 2 ? 'all' : 2)}
                          className={`transition-all hover:scale-105 ${
                            tierFilter === 2 
                              ? 'ring-2 ring-green-400 shadow-md' 
                              : 'hover:shadow-sm'
                          }`}
                        >
                          <Badge 
                            variant="outline" 
                            className={`gap-1 cursor-pointer ${
                              tierFilter === 2 
                                ? 'bg-green-100 text-green-900 border-green-300' 
                                : 'bg-green-50 text-green-800 border-green-200'
                            }`}
                          >
                            <span>💪</span>
                            {tierStats.tier2}
                          </Badge>
                        </button>
                      )}
                      {tierStats.tier3 > 0 && (
                        <button
                          onClick={() => setTierFilter(tierFilter === 3 ? 'all' : 3)}
                          className={`transition-all hover:scale-105 ${
                            tierFilter === 3 
                              ? 'ring-2 ring-purple-400 shadow-md' 
                              : 'hover:shadow-sm'
                          }`}
                        >
                          <Badge 
                            variant="outline" 
                            className={`gap-1 cursor-pointer ${
                              tierFilter === 3 
                                ? 'bg-purple-100 text-purple-900 border-purple-300' 
                                : 'bg-purple-50 text-purple-800 border-purple-200'
                            }`}
                          >
                            <span>🚀</span>
                            {tierStats.tier3}
                          </Badge>
                        </button>
                      )}
                      {tierStats.tier4 > 0 && (
                        <button
                          onClick={() => setTierFilter(tierFilter === 4 ? 'all' : 4)}
                          className={`transition-all hover:scale-105 ${
                            tierFilter === 4 
                              ? 'ring-2 ring-red-400 shadow-md' 
                              : 'hover:shadow-sm'
                          }`}
                        >
                          <Badge 
                            variant="outline" 
                            className={`gap-1 cursor-pointer ${
                              tierFilter === 4 
                                ? 'bg-red-100 text-red-900 border-red-300' 
                                : 'bg-red-50 text-red-800 border-red-200'
                            }`}
                          >
                            <span>⚠️</span>
                            {tierStats.tier4}
                          </Badge>
                        </button>
                      )}
                    </div>
                    
                    <div className="w-px h-4 bg-border"></div>
                    
                    {tierFilter !== 'all' && (
                      <Badge variant="secondary" className="gap-1">
                        <span>Filtered to Tier {tierFilter}</span>
                        <button 
                          onClick={() => setTierFilter('all')}
                          className="ml-1 hover:bg-destructive/20 rounded-full w-4 h-4 flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )}
                    
                    {draftGroupFilter !== 'all' && (
                      <Badge variant="secondary" className="gap-1">
                        <span>Draft Group {draftGroupFilter}</span>
                        <button 
                          onClick={() => setDraftGroupFilter('all')}
                          className="ml-1 hover:bg-destructive/20 rounded-full w-4 h-4 flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )}
                    
                    <Badge variant="outline" className="gap-1">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground"></span>
                      {excludedCount} of {filteredPlayers.length} excluded
                    </Badge>
                    {excludedCount > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <UserX className="w-3 h-3" />
                        {excludedCount} excluded
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Players Grouped by Tier */}
                <div className="overflow-x-auto">
                  {/* Table Header */}
                  <div className="bg-muted/10 border-b">
                    <div className={`grid gap-2 px-6 py-2.5 text-xs font-medium text-muted-foreground items-center whitespace-nowrap ${position === 'QB' ? 'grid-cols-[1.5fr_repeat(16,_1fr)]' : position === 'RB' ? 'grid-cols-[1.5fr_repeat(14,_1fr)]' : (position === 'WR' || position === 'TE') ? 'grid-cols-[1.5fr_repeat(14,_1fr)]' : position === 'FLEX' ? 'grid-cols-[1.5fr_repeat(16,_1fr)]' : 'grid-cols-[1.5fr_repeat(11,_1fr)]'}`}>
                      <div 
                        className="col-span-1 cursor-pointer hover:bg-muted/20 transition-colors flex items-center gap-1"
                        onClick={() => handleSort('player')}
                      >
                        PLAYER NAME
                        {sortField === 'player' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                      
                      <div 
                        className="col-span-1 text-center cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                        onClick={() => handleSort('opponent')}
                      >
                        OPPONENT
                        {sortField === 'opponent' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                      <div 
                        className="col-span-1 text-center cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                        onClick={() => handleSort('spread')}
                      >
                        SPREAD
                        {sortField === 'spread' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                      <div 
                        className="col-span-1 text-center cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                        onClick={() => handleSort('total')}
                      >
                        O/U
                        {sortField === 'total' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                      <div 
                        className="col-span-1 text-center cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                        onClick={() => handleSort('implied')}
                      >
                        IMPLIED
                        {sortField === 'implied' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                      {position === 'RB' && (
                        <div 
                          className="col-span-1 text-center cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                          onClick={() => handleSort('rushAttmpts')}
                        >
                          <span className="italic">Rush Attmpts</span>
                          {sortField === 'rushAttmpts' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      )}
                      {position === 'RB' && (
                        <div 
                          className="col-span-1 text-center cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                          onClick={() => handleSort('rushYds')}
                        >
                          <span className="italic">Rush Yards</span>
                          {sortField === 'rushYds' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      )}
                      {position === 'RB' && (
                        <div 
                          className="col-span-1 text-center cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                          onClick={() => handleSort('rbTdsOver')}
                        >
                          <span className="italic">1+ TD</span>
                          {sortField === 'rbTdsOver' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      )}
                      {position === 'QB' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div 
                                className="col-span-1 text-center cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                                onClick={() => handleSort('passing')}
                              >
                                <span className="italic">Passing</span>
                                {sortField === 'passing' && (
                                  sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Sorts on attempts. Showing the completion percentage. Based on Player Props.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {position === 'QB' && (
                        <div 
                          className="col-span-1 text-center cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                          onClick={() => handleSort('passYds')}
                        >
                          <span className="italic">Pass Yds</span>
                          {sortField === 'passYds' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      )}
                      {position === 'QB' && (
                        <div 
                          className="col-span-1 text-center cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                          onClick={() => handleSort('passingTds')}
                        >
                          <span className="italic">Passing TDs</span>
                          {sortField === 'passingTds' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      )}
                      {position === 'QB' && (
                        <div 
                          className="col-span-1 text-center cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                          onClick={() => handleSort('qbRushYds')}
                        >
                          <span className="italic">Rush Yards</span>
                          {sortField === 'qbRushYds' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      )}
                      {position === 'QB' && (
                        <div 
                          className="col-span-1 text-center cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                          onClick={() => handleSort('qbTdsOver')}
                        >
                          <span className="italic">1+ TD</span>
                          {sortField === 'qbTdsOver' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      )}
                      {(position === 'WR' || position === 'TE') && (
                        <div 
                          className="col-span-1 text-center cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                          onClick={() => handleSort('wrteRecYds')}
                        >
                          <span className="italic">Rec Yds</span>
                          {sortField === 'wrteRecYds' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      )}
                      {(position === 'WR' || position === 'TE') && (
                        <div 
                          className="col-span-1 text-center cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                          onClick={() => handleSort('wrteReceptions')}
                        >
                          <span className="italic">Receptions</span>
                          {sortField === 'wrteReceptions' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      )}
                      {(position === 'WR' || position === 'TE') && (
                        <div 
                          className="col-span-1 text-center cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                          onClick={() => handleSort('wrteTdsOver')}
                        >
                          <span className="italic">1+ TD</span>
                          {sortField === 'wrteTdsOver' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      )}
                      {position === 'FLEX' && (
                        <div 
                          className="col-span-1 text-center cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                          onClick={() => handleSort('flexRushAttmpts')}
                        >
                          <span className="italic">Rush Attmpts</span>
                          {sortField === 'flexRushAttmpts' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      )}
                      {position === 'FLEX' && (
                        <div 
                          className="col-span-1 text-center cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                          onClick={() => handleSort('flexRushYds')}
                        >
                          <span className="italic">Rush Yards</span>
                          {sortField === 'flexRushYds' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      )}
                      {position === 'FLEX' && (
                        <div 
                          className="col-span-1 text-center cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                          onClick={() => handleSort('flexReceptions')}
                        >
                          <span className="italic">Receptions</span>
                          {sortField === 'flexReceptions' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      )}
                      {position === 'FLEX' && (
                        <div 
                          className="col-span-1 text-center cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                          onClick={() => handleSort('flexRecYds')}
                        >
                          <span className="italic">Rec Yds</span>
                          {sortField === 'flexRecYds' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      )}
                      {position === 'FLEX' && (
                        <div 
                          className="col-span-1 text-center cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                          onClick={() => handleSort('flexTdsOver')}
                        >
                          <span className="italic">1+ TD</span>
                          {sortField === 'flexTdsOver' && (
                            sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                          )}
                        </div>
                      )}
                      <div
                        role="button"
                        tabIndex={0}
                        className="col-span-1 text-center flex items-center justify-center gap-1 cursor-pointer hover:bg-muted/20 transition-colors"
                        onClick={() => handleSort('opponentRank')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSort('opponentRank') }}
                      >
                        OPRK
                        {sortField === 'opponentRank' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                      <div 
                        className="col-span-1 text-right cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-end gap-1"
                        onClick={() => handleSort('salary')}
                      >
                        SALARY
                        {sortField === 'salary' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                      <div 
                        className="col-span-1 text-right cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-end gap-1"
                        onClick={() => handleSort('projection')}
                      >
                        PROJECTION
                        {sortField === 'projection' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                      <div 
                        className="col-span-1 text-right cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-end gap-1"
                        onClick={() => handleSort('value')}
                      >
                        VALUE
                        {sortField === 'value' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                      <div 
                        className="col-span-1 text-center cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                        onClick={() => handleSort('status')}
                      >
                        STATUS
                        {sortField === 'status' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                      <div 
                        className="col-span-1 text-center cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-center gap-1"
                        onClick={() => handleSort('tier')}
                      >
                        TIER
                        {sortField === 'tier' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                        )}
                      </div>
                      <div className="col-span-1 text-center">EXCLUDE</div>
                    </div>
                  </div>

                  {/* All Players Sorted */}
                  {sortPlayers(filteredPlayers).map((player, index) => (
                    <div
                      key={player.id}
                      className={`
                        grid gap-2 px-6 py-3 border-b border-border/50 last:border-b-0 items-center whitespace-nowrap ${position === 'QB' ? 'grid-cols-[1.5fr_repeat(16,_1fr)]' : position === 'RB' ? 'grid-cols-[1.5fr_repeat(14,_1fr)]' : (position === 'WR' || position === 'TE') ? 'grid-cols-[1.5fr_repeat(14,_1fr)]' : position === 'FLEX' ? 'grid-cols-[1.5fr_repeat(16,_1fr)]' : 'grid-cols-[1.5fr_repeat(11,_1fr)]'}
                        ${player.excluded === true ? 'opacity-50 bg-muted/30' : ''} 
                        hover:bg-muted/50 transition-colors
                      `}
                    >
                      <div className="col-span-1">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <button
                            onClick={() => {/* onPlayerSelect(player) */}}
                            className="flex items-center gap-2 text-left hover:text-primary transition-colors group overflow-hidden"
                          >
                            <Link 
                              href={`/profile/${player.player.playerDkId}`}
                              className={`text-sm font-medium ${player.excluded === true ? 'line-through' : ''} group-hover:underline truncate`}
                            >
                              {player.player.displayName} ({player.player.team})
                            </Link>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                          {player.excluded === true && <X className="w-4 h-4 text-destructive ml-1" />}
                          {position === 'FLEX' && (
                            <Badge variant="outline" className="text-xs ml-2">
                              {player.player.position}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Opponent */}
                      <div className="col-span-1 text-center">
                        {(() => {
                          const g = gamesMap[player.player.team];
                          const data: WeekAnalysisData = {
                            opponent: {
                              opponentAbbr: g?.opponentAbbr || null,
                              homeOrAway: g?.homeOrAway || 'N'
                            }
                          };
                          return <PlayerWeekAnalysis weekAnalysis={data} column="opponent" />
                        })()}
                      </div>

                      {/* Spread */}
                      <div className="col-span-1 text-center">
                        {(() => {
                          const g = gamesMap[player.player.team];
                          const data: WeekAnalysisData = { spread: g?.proj_spread ?? null };
                          return <PlayerWeekAnalysis weekAnalysis={data} column="spread" />
                        })()}
                      </div>

                      {/* O/U */}
                      <div className="col-span-1 text-center">
                        {(() => {
                          const g = gamesMap[player.player.team];
                          const data: WeekAnalysisData = { total: g?.proj_total ?? null };
                          return <PlayerWeekAnalysis weekAnalysis={data} column="total" />
                        })()}
                      </div>

                      {/* Implied */}
                      <div className="col-span-1 text-center">
                        {(() => {
                          const g = gamesMap[player.player.team];
                          const data: WeekAnalysisData = { implied: g?.implied_team_total ?? null };
                          return <PlayerWeekAnalysis weekAnalysis={data} column="implied" />
                        })()}
                      </div>
                      {/* Rush Attmpts (RB only) */}
                      {position === 'RB' && (
                        <div className="col-span-1 text-center">
                          {(() => {
                            const rushAttemptsData = rbRushAttemptsProps[player.player.playerDkId];
                            if (rushAttemptsData?.point && rushAttemptsData?.likelihood !== undefined) {
                              return (
                                <div className="text-sm">
                                  <div className="font-medium">O{rushAttemptsData.point}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {rushAttemptsData.likelihood.toFixed(1)}%
                                  </div>
                                </div>
                              );
                            }
                            return <span className="text-sm text-muted-foreground">-</span>;
                          })()}
                        </div>
                      )}
                      {/* Rush Yards (RB only) */}
                      {position === 'RB' && (
                        <div className="col-span-1 text-center">
                          {(() => {
                            const rushYdsData = rbRushYardsProps[player.player.playerDkId];
                            if (rushYdsData?.point && rushYdsData?.likelihood !== undefined) {
                              return (
                                <div className="text-sm">
                                  <div className="font-medium">O{rushYdsData.point}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {rushYdsData.likelihood.toFixed(1)}%
                                  </div>
                                </div>
                              );
                            }
                            return <span className="text-sm text-muted-foreground">-</span>;
                          })()}
                        </div>
                      )}
                      {/* 1+ TD (RB only) */}
                      {position === 'RB' && (
                        <div className="col-span-1 text-center">
                          {(() => {
                            const tdsData = rbTdsOverProps[player.player.playerDkId];
                            if (tdsData?.point && tdsData?.likelihood !== undefined) {
                              return (
                                <div className="text-sm">
                                  <div className="font-medium">O{tdsData.point}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {tdsData.likelihood.toFixed(1)}%
                                  </div>
                                </div>
                              );
                            }
                            return <span className="text-sm text-muted-foreground">-</span>;
                          })()}
                        </div>
                      )}
                      {/* Passing (QB only) */}
                      {position === 'QB' && (
                        <div className="col-span-1 text-center">
                          {(() => {
                            const attemptsData = qbPassAttemptsProps[player.player.playerDkId];
                            const completionsData = qbPassCompletionsProps[player.player.playerDkId];
                            
                            if (attemptsData?.point && completionsData?.point) {
                              const attempts = attemptsData.point;
                              const completions = completionsData.point;
                              const percentage = attempts > 0 ? ((completions / attempts) * 100).toFixed(1) : '0.0';
                              
                              return (
                                <div className="text-sm">
                                  <div className="font-medium">{completions}/{attempts}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {percentage}%
                                  </div>
                                </div>
                              );
                            }
                            return <span className="text-sm text-muted-foreground">-</span>;
                          })()}
                        </div>
                      )}
                      {/* Pass Yds (QB only) */}
                      {position === 'QB' && (
                        <div className="col-span-1 text-center">
                          {(() => {
                            const passYdsData = qbPassYardsProps[player.player.playerDkId];
                            if (passYdsData?.point && passYdsData?.likelihood !== undefined) {
                              return (
                                <div className="text-sm">
                                  <div className="font-medium">O{passYdsData.point}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {passYdsData.likelihood.toFixed(1)}%
                                  </div>
                                </div>
                              );
                            }
                            return <span className="text-sm text-muted-foreground">-</span>;
                          })()}
                        </div>
                      )}
                      {/* Passing TDs (QB only) */}
                      {position === 'QB' && (
                        <div className="col-span-1 text-center">
                          {(() => {
                            const passingTdsData = qbPassingTdsProps[player.player.playerDkId];
                            if (passingTdsData?.point && passingTdsData?.likelihood !== undefined) {
                              return (
                                <div className="text-sm">
                                  <div className="font-medium">O{passingTdsData.point}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {passingTdsData.likelihood.toFixed(1)}%
                                  </div>
                                </div>
                              );
                            }
                            return <span className="text-sm text-muted-foreground">-</span>;
                          })()}
                        </div>
                      )}
                      {/* Rush Yards (QB only) */}
                      {position === 'QB' && (
                        <div className="col-span-1 text-center">
                          {(() => {
                            const qbRushYdsData = qbRushYardsProps[player.player.playerDkId];
                            if (qbRushYdsData?.point && qbRushYdsData?.likelihood !== undefined) {
                              return (
                                <div className="text-sm">
                                  <div className="font-medium">O{qbRushYdsData.point}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {qbRushYdsData.likelihood.toFixed(1)}%
                                  </div>
                                </div>
                              );
                            }
                            return <span className="text-sm text-muted-foreground">-</span>;
                          })()}
                        </div>
                      )}
                      {/* 1+ TD (QB only) */}
                      {position === 'QB' && (
                        <div className="col-span-1 text-center">
                          {(() => {
                            const tdsData = qbTdsOverProps[player.player.playerDkId];
                            if (tdsData?.point && tdsData?.likelihood !== undefined) {
                              return (
                                <div className="text-sm">
                                  <div className="font-medium">O{tdsData.point}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {tdsData.likelihood.toFixed(1)}%
                                  </div>
                                </div>
                              );
                            }
                            return <span className="text-sm text-muted-foreground">-</span>;
                          })()}
                        </div>
                      )}
                      {/* Rec Yds (WR/TE only) */}
                      {(position === 'WR' || position === 'TE') && (
                        <div className="col-span-1 text-center">
                          {(() => {
                            const data = position === 'WR' ? wrRecYdsProps[player.player.playerDkId] : teRecYdsProps[player.player.playerDkId];
                            if (data?.point && data?.likelihood !== undefined) {
                              return (
                                <div className="text-sm">
                                  <div className="font-medium">O{data.point}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {data.likelihood.toFixed(1)}%
                                  </div>
                                </div>
                              );
                            }
                            return <span className="text-sm text-muted-foreground">-</span>;
                          })()}
                        </div>
                      )}
                      {/* Receptions (WR/TE only) */}
                      {(position === 'WR' || position === 'TE') && (
                        <div className="col-span-1 text-center">
                          {(() => {
                            const data = position === 'WR' ? wrReceptionsProps[player.player.playerDkId] : teReceptionsProps[player.player.playerDkId];
                            if (data?.point && data?.likelihood !== undefined) {
                              return (
                                <div className="text-sm">
                                  <div className="font-medium">O{data.point}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {data.likelihood.toFixed(1)}%
                                  </div>
                                </div>
                              );
                            }
                            return <span className="text-sm text-muted-foreground">-</span>;
                          })()}
                        </div>
                      )}
                      {/* 1+ TD (WR/TE only) */}
                      {(position === 'WR' || position === 'TE') && (
                        <div className="col-span-1 text-center">
                          {(() => {
                            const data = position === 'WR' ? wrTdsOverProps[player.player.playerDkId] : teTdsOverProps[player.player.playerDkId];
                            if (data?.point && data?.likelihood !== undefined) {
                              return (
                                <div className="text-sm">
                                  <div className="font-medium">O{data.point}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {data.likelihood.toFixed(1)}%
                                  </div>
                                </div>
                              );
                            }
                            return <span className="text-sm text-muted-foreground">-</span>;
                          })()}
                        </div>
                      )}
                      {/* Rush Attmpts (FLEX only) */}
                      {position === 'FLEX' && (
                        <div className="col-span-1 text-center">
                          {(() => {
                            const rushAttemptsData = rbRushAttemptsProps[player.player.playerDkId];
                            if (rushAttemptsData?.point && rushAttemptsData?.likelihood !== undefined) {
                              return (
                                <div className="text-sm">
                                  <div className="font-medium">O{rushAttemptsData.point}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {rushAttemptsData.likelihood.toFixed(1)}%
                                  </div>
                                </div>
                              );
                            }
                            return <span className="text-sm text-muted-foreground">-</span>;
                          })()}
                        </div>
                      )}
                      {/* Rush Yards (FLEX only) */}
                      {position === 'FLEX' && (
                        <div className="col-span-1 text-center">
                          {(() => {
                            const rushYdsData = rbRushYardsProps[player.player.playerDkId];
                            if (rushYdsData?.point && rushYdsData?.likelihood !== undefined) {
                              return (
                                <div className="text-sm">
                                  <div className="font-medium">O{rushYdsData.point}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {rushYdsData.likelihood.toFixed(1)}%
                                  </div>
                                </div>
                              );
                            }
                            return <span className="text-sm text-muted-foreground">-</span>;
                          })()}
                        </div>
                      )}
                      {/* Receptions (FLEX only) */}
                      {position === 'FLEX' && (
                        <div className="col-span-1 text-center">
                          {(() => {
                            let receptionsData;
                            if (player.player.position === 'WR') {
                              receptionsData = wrReceptionsProps[player.player.playerDkId];
                            } else if (player.player.position === 'TE') {
                              receptionsData = teReceptionsProps[player.player.playerDkId];
                            }
                            
                            if (receptionsData?.point && receptionsData?.likelihood !== undefined) {
                              return (
                                <div className="text-sm">
                                  <div className="font-medium">O{receptionsData.point}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {receptionsData.likelihood.toFixed(1)}%
                                  </div>
                                </div>
                              );
                            }
                            return <span className="text-sm text-muted-foreground">-</span>;
                          })()}
                        </div>
                      )}
                      {/* Rec Yds (FLEX only) */}
                      {position === 'FLEX' && (
                        <div className="col-span-1 text-center">
                          {(() => {
                            let recYdsData;
                            if (player.player.position === 'WR') {
                              recYdsData = wrRecYdsProps[player.player.playerDkId];
                            } else if (player.player.position === 'TE') {
                              recYdsData = teRecYdsProps[player.player.playerDkId];
                            }
                            
                            if (recYdsData?.point && recYdsData?.likelihood !== undefined) {
                              return (
                                <div className="text-sm">
                                  <div className="font-medium">O{recYdsData.point}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {recYdsData.likelihood.toFixed(1)}%
                                  </div>
                                </div>
                              );
                            }
                            return <span className="text-sm text-muted-foreground">-</span>;
                          })()}
                        </div>
                      )}
                      {/* 1+ TD (FLEX only) */}
                      {position === 'FLEX' && (
                        <div className="col-span-1 text-center">
                          {(() => {
                            let tdsData;
                            if (player.player.position === 'RB') {
                              tdsData = rbTdsOverProps[player.player.playerDkId];
                            } else if (player.player.position === 'WR') {
                              tdsData = wrTdsOverProps[player.player.playerDkId];
                            } else if (player.player.position === 'TE') {
                              tdsData = teTdsOverProps[player.player.playerDkId];
                            }
                            
                            if (tdsData?.point && tdsData?.likelihood !== undefined) {
                              return (
                                <div className="text-sm">
                                  <div className="font-medium">O{tdsData.point}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {tdsData.likelihood.toFixed(1)}%
                                  </div>
                                </div>
                              );
                            }
                            return <span className="text-sm text-muted-foreground">-</span>;
                          })()}
                        </div>
                      )}
                      {/* OPRK */}
                      <div className="col-span-1 text-center">
                        {(() => {
                          const attrs = Array.isArray(player.draftStatAttributes) ? (player.draftStatAttributes as any[]) : []
                          const oppRank = attrs.find((a: any) => a.id === -2) || {}
                          const data: WeekAnalysisData = {
                            oprk: {
                              value: oppRank.value ?? 0,
                              quality: (oppRank.quality as 'High' | 'Medium' | 'Low') || 'Medium'
                            }
                          }
                          return <PlayerWeekAnalysis weekAnalysis={data} column="oprk" />
                        })()}
                      </div>

                      <div className="col-span-1 text-right text-sm font-medium">
                        ${player.salary?.toLocaleString() || 'N/A'}
                      </div>

                      <div className="col-span-1 text-right text-sm font-medium">
                        {player.projectedPoints || 'N/A'}
                      </div>

                      <div className="col-span-1 text-right text-sm font-medium text-primary">
                        {player.projectedPoints && player.salary 
                          ? ((player.projectedPoints / player.salary) * 1000).toFixed(1)
                          : 'N/A'
                        }
                      </div>

                      <div className="col-span-1 text-center">
                        <Badge 
                          variant="outline" 
                          className={`${getStatusColor(player.status)} text-xs font-medium`}
                        >
                          {player.status || 'Active'}
                        </Badge>
                      </div>

                      <div className="col-span-1 text-center">
                        <Select 
                          value={player.tier?.toString() || '4'} 
                          onValueChange={(value: string) => {
                            const newTierValue = parseInt(value);
                            // Call API to update the player pool entry
                            PlayerService.updatePlayerPoolEntry(player.id, { tier: newTierValue })
                              .then(() => {
                                // Update local state to reflect the change
                                setPlayerPool(prev => 
                                  prev.map(p => 
                                    p.id === player.id 
                                      ? { ...p, tier: newTierValue }
                                      : p
                                  )
                                );
                              })
                              .catch(err => {
                                console.error('Error updating player tier:', err);
                                // Could add a toast notification here
                              });
                          }}
                        >
                          <SelectTrigger className="w-full h-8 text-xs">
                            <SelectValue>
                              <div className="flex items-center gap-1">
                                <span className="text-sm">{getTierConfig(player.tier || 4).icon}</span>
                                <span className="font-medium">{player.tier || 4}</span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">
                              <div className="flex items-center gap-2">
                                <span>{getTierConfig(1).icon}</span>
                                <span>1</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="2">
                              <div className="flex items-center gap-2">
                                <span>{getTierConfig(2).icon}</span>
                                <span>2</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="3">
                              <div className="flex items-center gap-2">
                                <span>{getTierConfig(3).icon}</span>
                                <span>3</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="4">
                              <div className="flex items-center gap-2">
                                <span>{getTierConfig(4).icon}</span>
                                <span>4</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-1 text-center">
                        <Checkbox
                          checked={player.excluded === true}
                          onCheckedChange={(checked) => {
                            // Update the player's excluded status in the database
                            const newExcludedValue = checked === true;
                            // Call API to update the player pool entry
                            PlayerService.updatePlayerPoolEntry(player.id, { excluded: newExcludedValue })
                              .then(() => {
                                // Update local state to reflect the change
                                setPlayerPool(prev => 
                                  prev.map(p => 
                                    p.id === player.id 
                                      ? { ...p, excluded: newExcludedValue }
                                      : p
                                  )
                                );
                              })
                              .catch(err => {
                                console.error('Error updating player exclusion:', err);
                                // Could add a toast notification here
                              });
                          }}
                          className="w-4 h-4"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {filteredPlayers.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
                    <p>No players found matching your search criteria.</p>
                    <p className="text-sm mt-1">Try adjusting your search terms.</p>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </div>
      </Tabs>
    </div>
  );
}