"use client";

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, Search } from 'lucide-react';
import type { Week } from '@/types/prd';
import { PlayerPoolEntryWithAnalysisDto } from '@/lib/playerService';

interface PlayerPoolFiltersProps {
  // Week selection
  weeks: Week[];
  selectedWeek: number | null;
  onWeekChange: (weekId: number) => void;
  activeWeekId?: number | null;
  
  // Search and filters
  searchTerm: string;
  onSearchChange: (term: string) => void;
  hideExcluded: boolean;
  onHideExcludedChange: (hide: boolean) => void;
  
  // Draft group filter
  draftGroupFilter: string;
  onDraftGroupChange: (draftGroup: string) => void;
  uniqueDraftGroups: Array<{
    id: string;
    label: string;
    description: string;
    draftGroup: string;
    is_default: boolean;
  }>;
  
  
  // Tier filter
  tierFilter: number | 'all';
  onTierFilterChange: (tier: number | 'all') => void;
  
  // Position tabs
  activeTab: string;
  onTabChange: (position: string) => void;
  playersByPosition: Record<string, PlayerPoolEntryWithAnalysisDto[]>;
  flexPlayers: PlayerPoolEntryWithAnalysisDto[];
}

export function PlayerPoolFilters({
  weeks,
  selectedWeek,
  onWeekChange,
  activeWeekId,
  searchTerm,
  onSearchChange,
  hideExcluded,
  onHideExcludedChange,
  draftGroupFilter,
  onDraftGroupChange,
  uniqueDraftGroups,
  // tierFilter and onTierFilterChange are defined in the interface for future use but not currently used
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tierFilter,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onTierFilterChange,
  activeTab,
  onTabChange,
  playersByPosition,
  flexPlayers
}: PlayerPoolFiltersProps) {
  // Ensure weeks is always an array
  const safeWeeks = Array.isArray(weeks) ? weeks : [];
  return (
    <>
      {/* Header with Search and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Search className="h-8 w-8 text-blue-600" />
            Player Pool
          </h1>
          <p className="text-gray-600 mt-1">
            Managing player exclusions for Week {safeWeeks.length > 0 ? safeWeeks.find(w => w.id === selectedWeek)?.week_number || 'Loading...' : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={hideExcluded ? "default" : "outline"}
            onClick={() => onHideExcludedChange(!hideExcluded)}
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
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

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
              onChange={(e) => onWeekChange(Number(e.target.value))}
              className="block w-auto min-w-[200px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={safeWeeks.length === 0}
            >
              {safeWeeks.length === 0 ? (
                <option value="">Loading weeks...</option>
              ) : (
                safeWeeks.map((week) => (
                  <option key={week.id} value={week.id}>
                    Week {week.week_number} - {week.year}{week.id === activeWeekId ? ' (Active)' : ''}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="flex-shrink-0">
            <label htmlFor="draft-group-select" className="block text-sm font-medium text-gray-700 mb-2">
              Draft Group:
            </label>
            <Select value={draftGroupFilter} onValueChange={onDraftGroupChange}>
              <SelectTrigger className="w-auto min-w-[200px]">
                <SelectValue placeholder="All Draft Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Draft Groups</SelectItem>
                {uniqueDraftGroups.map((draftGroup) => (
                  <SelectItem key={draftGroup.id} value={draftGroup.draftGroup}>
                    {draftGroup.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Position Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            {(['QB', 'RB', 'WR', 'TE', 'FLEX', 'DST'] as string[]).map((position) => {
              const count = position === 'FLEX' ? flexPlayers.length : playersByPosition[position]?.length || 0;
              
              return (
                <button
                  key={position}
                  onClick={() => onTabChange(position)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium border-r last:border-r-0 transition-colors ${
                    activeTab === position
                      ? 'bg-background text-foreground border-b-2 border-blue-500'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <span className="font-medium">{position}</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
