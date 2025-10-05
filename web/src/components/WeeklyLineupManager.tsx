"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Separator } from "./ui/separator";
// import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";
import { PlusCircle, Download, Edit, Trash2, Search, Filter, X } from "lucide-react";
import { WeekService } from "@/lib/weekService";
import { LineupService } from "@/lib/lineupService";
import { LineupDisplayData, LineupStatus } from "@/types/prd";
import { buildApiUrl, API_CONFIG } from "@/config/api";
import { getPositionBadgeClasses } from "@/lib/positionColors";

// Helper function to populate roster from lineup slots
// Function to fetch player pool data and create a lookup map
async function fetchPlayerPool(weekId: number): Promise<Map<number, {
  name: string;
  team: string;
  position: string;
  salary: number;
  projectedPoints: number;
  ownership: number;
  actuals: number;
}>> {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/players/pool/${weekId}?excluded=false&limit=1000`);
    if (!response.ok) {
      throw new Error(`Failed to fetch player pool: ${response.status}`);
    }
    const data = await response.json();
    
    const playerMap = new Map();
    data.entries.forEach((entry: {
      playerDkId: number;
      player: {
        displayName: string;
        team: string;
        position: string;
      };
      salary: number;
      projectedPoints?: number;
      ownership?: number;
      actuals?: number;
    }) => {
      playerMap.set(entry.playerDkId, {
        name: entry.player.displayName,
        team: entry.player.team,
        position: entry.player.position,
        salary: entry.salary,
        projectedPoints: entry.projectedPoints || 0,
        ownership: entry.ownership || 0,
        actuals: entry.actuals || 0
      });
    });
    
    return playerMap;
  } catch (error) {
    console.error('Error fetching player pool:', error);
    return new Map();
  }
}

// Function to populate roster from real slots data
function populateRosterFromSlots(slots: Record<string, number>, playerMap: Map<number, {
  name: string;
  team: string;
  position: string;
  salary: number;
  projectedPoints: number;
  ownership: number;
  actuals: number;
}>): Array<{
  position: string;
  name: string;
  team: string;
  salary: number;
  projectedPoints: number;
  ownership: number;
  actuals: number;
}> {
  console.log('🎯 populateRosterFromSlots called with slots:', slots, 'playerMap size:', playerMap.size);
  const roster: Array<{
    position: string;
    name: string;
    team: string;
    salary: number;
    projectedPoints: number;
    ownership: number;
    actuals: number;
  }> = [];
  
  // Define the order of positions to display
  const positionOrder = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'FLEX', 'DST'];
  
  positionOrder.forEach(position => {
    const playerId = slots[position];
    console.log('🎯 Processing position:', position, 'playerId:', playerId);
    if (playerId && playerMap.has(playerId)) {
      const player = playerMap.get(playerId);
      if (player) {
        console.log('🎯 Found player for', position, ':', player.name);
        roster.push({
          position: position,
          name: player.name,
          team: player.team,
          salary: player.salary,
          projectedPoints: player.projectedPoints,
          ownership: player.ownership,
          actuals: player.actuals
        });
      } else {
        console.log('🎯 Player data is undefined for', position, 'playerId:', playerId);
        // If player data is undefined, add placeholder
        roster.push({
          position: position,
          name: "Unknown Player",
          team: "N/A",
          salary: 0,
          projectedPoints: 0,
          ownership: 0,
          actuals: 0
        });
      }
    } else {
      console.log('🎯 Player not found for', position, 'playerId:', playerId);
      // If player not found, add placeholder
      roster.push({
        position: position,
        name: "Unknown Player",
        team: "N/A",
        salary: 0,
          projectedPoints: 0,
          ownership: 0,
          actuals: 0
      });
    }
  });
  
  console.log('🎯 populateRosterFromSlots returning roster with', roster.length, 'players');
  return roster;
}

export function WeeklyLineupManager({ selectedWeek: _selectedWeek }: { selectedWeek?: string }) {
  const router = useRouter();
  const [lineups, setLineups] = useState<LineupDisplayData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [currentWeekId, setCurrentWeekId] = useState<number | null>(1); // Default to week 1
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<{ [key: string]: boolean }>({});
  const [statusUpdating, setStatusUpdating] = useState<{ [key: string]: boolean }>({});

  const STATUS_FLOW: LineupStatus[] = ['created', 'exported', 'uploaded', 'submitted'];
  const getNextStatus = (current: LineupStatus): LineupStatus => {
    const idx = STATUS_FLOW.indexOf(current);
    return STATUS_FLOW[(idx + 1) % STATUS_FLOW.length];
  };
  const handleAdvanceStatus = async (id: string, current: LineupStatus) => {
    try {
      setStatusUpdating(prev => ({ ...prev, [id]: true }));
      const next = getNextStatus(current);
      await LineupService.updateLineup(id, { status: next });
      setLineups(prev => prev.map(l => l.id === id ? { ...l, status: next } : l));
    } catch (e) {
      console.error('Failed to update lineup status', e);
    } finally {
      setStatusUpdating(prev => ({ ...prev, [id]: false }));
    }
  };

  // Load weeks and lineups from API
  useEffect(() => {
    console.log('🎯 useEffect for loadData triggered');
    
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('🎯 Loading weeks from API...');
        console.log('🎯 API URL:', buildApiUrl(API_CONFIG.ENDPOINTS.WEEKS));
        
        // Test API connectivity first
        console.log('🎯 Testing API connectivity...');
        const testResponse = await fetch(`${API_CONFIG.BASE_URL}/api/weeks?skip=0&limit=100`);
        console.log('🎯 Test API response status:', testResponse.status);
        if (!testResponse.ok) {
          throw new Error(`API test failed: ${testResponse.status}`);
        }
        

        
        // Load weeks
        const weeksResponse = await WeekService.getWeeks();
        console.log('🎯 Weeks API response:', weeksResponse);
        
        // Find and set the Active Week as default
        const activeWeek = weeksResponse.weeks.find(week => week.status === 'Active');
        if (activeWeek) {
          setCurrentWeekId(activeWeek.id);
          console.log('🎯 Set default week to Active Week:', activeWeek.week_number, activeWeek.year, 'ID:', activeWeek.id);
          
          // Load lineups for the active week
          try {
            console.log('🎯 Loading lineups for week:', activeWeek.id);
            const lineupsResponse = await LineupService.getLineups(activeWeek.id);
            console.log('🎯 Lineups API response:', lineupsResponse);
            
            // Fetch player pool data for this week
            console.log('🎯 Fetching player pool for week:', activeWeek.id);
            const playerMap = await fetchPlayerPool(activeWeek.id);
            console.log('🎯 Player pool loaded, found', playerMap.size, 'players');
            
            // Convert LineupListResponse to LineupDisplayData format with real player data
            console.log('🎯 Processing lineups:', lineupsResponse.lineups.length);
            const displayLineups = lineupsResponse.lineups.map(lineup => {
              console.log('🎯 Processing lineup:', lineup.name, 'with slots:', lineup.slots);
              const roster = populateRosterFromSlots(lineup.slots, playerMap);
              console.log('🎯 Generated roster for', lineup.name, ':', roster.length, 'players');
              const totalProjectedPoints = roster.reduce((sum, player) => sum + player.projectedPoints, 0);
              
              const displayLineup = {
                id: lineup.id,
                name: lineup.name,
                tags: lineup.tags || [],
                status: (lineup as any).status || 'created',
                salaryUsed: lineup.salary_used,
                salaryCap: 50000,
                projectedPoints: totalProjectedPoints,
                roster: roster
              };
              console.log('🎯 Created display lineup:', displayLineup.name);
              return displayLineup;
            });
            console.log('🎯 Setting lineups state with', displayLineups.length, 'lineups');
            setLineups(displayLineups);
            console.log('🎯 Lineups state set successfully');
          } catch (lineupError) {
            console.error('❌ Failed to load lineups:', lineupError);
            console.error('❌ Lineup error details:', lineupError);
            setLineups([]);
          }
        } else if (weeksResponse.weeks.length > 0) {
          // If no Active Week, use the first week
          const firstWeek = weeksResponse.weeks[0];
          setCurrentWeekId(firstWeek.id);
          console.log('🎯 No Active Week found, using first week:', firstWeek.week_number, firstWeek.year, 'ID:', firstWeek.id);
          
          // Load lineups for the first week
          try {
            const lineupsResponse = await LineupService.getLineups(firstWeek.id);
            
            // Fetch player pool data for this week
            console.log('🎯 Fetching player pool for first week:', firstWeek.id);
            const playerMap = await fetchPlayerPool(firstWeek.id);
            console.log('🎯 Player pool loaded, found', playerMap.size, 'players');
            
            // Convert LineupListResponse to LineupDisplayData format with real player data
            const displayLineups = lineupsResponse.lineups.map(lineup => {
              const roster = populateRosterFromSlots(lineup.slots, playerMap);
              const totalProjectedPoints = roster.reduce((sum, player) => sum + player.projectedPoints, 0);
              
              return {
                id: lineup.id,
                name: lineup.name,
                tags: lineup.tags || [],
                status: (lineup as any).status || 'created',
                salaryUsed: lineup.salary_used,
                salaryCap: 50000,
                projectedPoints: totalProjectedPoints,
                roster: roster
              };
            });
            setLineups(displayLineups);
          } catch (lineupError) {
            console.error('❌ Failed to load lineups:', lineupError);
            setLineups([]);
          }
        } else {
          // No weeks found, set empty state
          console.log('🎯 No weeks found in database');
          setCurrentWeekId(null);
          setLineups([]);
        }
      } catch (error) {
          console.error('❌ Failed to load weeks from API:', error);
          console.log('🔄 Using fallback data...');
          // Fallback to mock data
          setCurrentWeekId(1);
          // Add fallback lineup data with empty player map
          const emptyPlayerMap = new Map();
          setLineups([
            {
              id: "fallback-1",
              name: "Lineup 8/26/2025",
              tags: ["Cash"],
              status: 'created',
              salaryUsed: 50000,
              salaryCap: 50000,
              projectedPoints: 125.4,
              roster: populateRosterFromSlots({}, emptyPlayerMap)
            },
            {
              id: "fallback-2",
              name: "Lineup 9/1/2025",
              tags: ["GPP"],
              status: 'created',
              salaryUsed: 49900,
              salaryCap: 50000,
              projectedPoints: 130.2,
              roster: populateRosterFromSlots({}, emptyPlayerMap)
            },
            {
              id: "fallback-3",
              name: "OPRK Based Lineup",
              tags: ["H2H"],
              status: 'created',
              salaryUsed: 49600,
              salaryCap: 50000,
              projectedPoints: 128.7,
              roster: populateRosterFromSlots({}, emptyPlayerMap)
            },
            {
              id: "fallback-4",
              name: "OPRK Based Lineup",
              tags: ["H2H"],
              status: 'created',
              salaryUsed: 49600,
              salaryCap: 50000,
              projectedPoints: 128.7,
              roster: populateRosterFromSlots({}, emptyPlayerMap)
            },
            {
              id: "fallback-5",
              name: "Projection Based Lineup",
              tags: ["Cash"],
              status: 'created',
              salaryUsed: 50000,
              salaryCap: 50000,
              projectedPoints: 132.1,
              roster: populateRosterFromSlots({}, emptyPlayerMap)
            }
          ]);
        } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Remove mounted state logic

  // Extract all unique tags from lineups
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    lineups.forEach(lineup => {
      lineup.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [lineups]);

  // Filter lineups based on search term and selected tags
  const filteredLineups = useMemo(() => {
    return lineups.filter(lineup => {
      // Search term filter (name or tags)
      const matchesSearch = searchTerm === '' || 
        lineup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lineup.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

      // Tag filter
      const matchesTags = selectedTags.length === 0 || 
        selectedTags.every(selectedTag => lineup.tags.includes(selectedTag));

      return matchesSearch && matchesTags;
    });
  }, [lineups, searchTerm, selectedTags]);

  const handleDeleteLineup = async (id: string) => {
    try {
      // Check if this is a mock/debug lineup
      if (id.startsWith('debug-') || id.startsWith('fallback-') || id.startsWith('test-')) {
        // For mock data, just remove from state without API call
        setLineups(prev => prev.filter(lineup => lineup.id !== id));
        console.log('Deleted mock lineup:', id);
      } else {
        // For real lineups, make API call
        await LineupService.deleteLineup(id);
        setLineups(prev => prev.filter(lineup => lineup.id !== id));
        console.log('Deleted real lineup:', id);
      }
      
      // Close the dialog
      setDeleteDialogOpen(prev => ({ ...prev, [id]: false }));
    } catch (error) {
      console.error('Failed to delete lineup:', error);
    }
  };

  const openDeleteDialog = (id: string) => {
    setDeleteDialogOpen(prev => ({ ...prev, [id]: true }));
  };

  const closeDeleteDialog = (id: string) => {
    setDeleteDialogOpen(prev => ({ ...prev, [id]: false }));
  };

  const handleExportLineup = async (lineup: LineupDisplayData) => {
    try {
      console.log('Exporting lineup:', lineup);
      console.log('Lineup ID:', lineup.id);
      console.log('Lineup name:', lineup.name);
      
      const blob = await LineupService.exportLineup(lineup.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lineup-${lineup.name}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      // Optimistically update status to exported
      setLineups(prev => prev.map(l => l.id === lineup.id ? { ...l, status: 'exported' } : l));
    } catch (error) {
      console.error('Failed to export lineup:', error);
    }
  };

  const handleExportAllLineups = async () => {
    if (!currentWeekId) {
      console.error('No active week selected');
      return;
    }

    try {
      const blob = await LineupService.exportAllLineups(currentWeekId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all-lineups-week-${currentWeekId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export all lineups:', error);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTags([]);
  };





  // Remove mounted check since we're using timeout instead

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading lineups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="space-y-1">
            <h2>Weekly Lineup Manager</h2>
            <p className="text-muted-foreground">
              Manage your lineups for {
                currentWeekId === 1 ? "Week 1" :
                currentWeekId === 2 ? "Week 2" :
                currentWeekId === 3 ? "Week 3" :
                currentWeekId ? `Week ${currentWeekId}` : "Loading..."
              }
            </p>

          </div>
        </div>
        
        <div className="flex gap-2">

          <Button variant="outline" className="gap-2" onClick={handleExportAllLineups}>
            <Download className="w-4 h-4" />
            Export All
          </Button>
          <Button className="gap-2" onClick={() => router.push('/builder')}>
            <PlusCircle className="w-4 h-4" />
            Create New Lineup
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search lineups or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            {selectedTags.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {selectedTags.length}
              </Badge>
            )}
          </Button>
          {(searchTerm || selectedTags.length > 0) && (
            <Button variant="ghost" onClick={clearFilters} className="gap-2">
              <X className="w-4 h-4" />
              Clear
            </Button>
          )}
        </div>

        {/* Tag Filters */}
        {showFilters && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filter by Tags</CardTitle>
              <CardDescription>Select tags to filter your lineups</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    {selectedTags.includes(tag) && <X className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Filtered Lineups</CardDescription>
            <CardTitle className="text-2xl">{filteredLineups.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Lineups Carousel */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3>Your Lineups</h3>
          {filteredLineups.length === 0 && lineups.length > 0 && (
            <p className="text-sm text-muted-foreground">
              No lineups match your current filters
            </p>
          )}
        </div>

        {filteredLineups.length > 0 ? (
          <div className="w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">
                Showing {filteredLineups.length} of {lineups.length} lineups
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLineups.map((lineup) => (
                <div key={lineup.id} className="w-full">
                  <Card className="hover:shadow-md transition-shadow h-full w-fit">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{lineup.name}</CardTitle>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className={
                              `hover:bg-gray-100 ` +
                              (lineup.status === 'submitted'
                                ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
                                : (lineup.status === 'exported' || lineup.status === 'uploaded')
                                  ? 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200'
                                  : '')
                            }
                            onClick={() => handleAdvanceStatus(lineup.id, lineup.status)}
                            disabled={statusUpdating[lineup.id]}
                            title="Advance status"
                          >
                            {statusUpdating[lineup.id] ? 'Updating...' : `Status: ${lineup.status}`}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="hover:bg-gray-100"
                            onClick={() => router.push(`/builder?lineupId=${lineup.id}`)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="hover:bg-red-50 hover:text-red-600" onClick={() => openDeleteDialog(lineup.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Dialog open={deleteDialogOpen[lineup.id] || false} onOpenChange={(open) => {
                            if (!open) {
                              closeDeleteDialog(lineup.id);
                            }
                          }}>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete Lineup</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete &quot;{lineup.name}&quot;? This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => closeDeleteDialog(lineup.id)}>Cancel</Button>
                                <Button variant="destructive" onClick={() => handleDeleteLineup(lineup.id)}>
                                  Delete
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {lineup.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 w-fit">
                      {/* Salary and Projected Points Summary */}
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Salary Used</span>
                          <span>${lineup.salaryUsed.toLocaleString()} / $50,000</span>
                        </div>
                        <div className="bg-muted rounded-full h-2 sm:w-[41ch] w-full">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${(lineup.salaryUsed / lineup.salaryCap) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Projected Points</span>
                          <span>{lineup.projectedPoints.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Actual Points</span>
                          <span>{(lineup.roster?.reduce((sum, p) => sum + (p.actuals ?? 0), 0) || 0).toFixed(1)}</span>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      {/* Full Roster Display */}
                      <div className="space-y-3">
                        {/* Header handled by sticky row inside scroll area for sm+ */}
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {/* Sticky header inside scroll area for sm+ */}
                          <div className="hidden sm:grid sticky top-0 z-10 bg-white/80 backdrop-blur grid-cols-[16ch_7ch_6ch_6ch_6ch] items-center gap-3 py-1 w-fit">
                            <div className="text-sm font-medium">Full Roster</div>
                            <span className="text-[10px] font-semibold text-right uppercase tracking-wide text-muted-foreground">Salary</span>
                            <span className="text-[10px] font-semibold text-right uppercase tracking-wide text-muted-foreground">Proj.</span>
                            <span className="text-[10px] font-semibold text-right uppercase tracking-wide text-muted-foreground">% Own.</span>
                            <span className="text-[10px] font-semibold text-right uppercase tracking-wide text-muted-foreground">Act.</span>
                          </div>
                          {lineup.roster && lineup.roster.length > 0 ? (
                            lineup.roster.map((player, index) => (
                              <div key={`${player.position}-${index}`} className="text-sm odd:bg-muted/20 hover:bg-muted/30 rounded px-2 sm:px-0 py-1">
                                {/* Desktop/tablet grid */}
                                <div className="hidden sm:grid grid-cols-[16ch_7ch_6ch_6ch_6ch] items-center gap-3 w-fit">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={`${getPositionBadgeClasses(player.position)} min-w-[2.25rem] text-center`}>
                                      {player.position}
                                    </span>
                                    <div className="truncate">
                                      <span className="font-medium">{player.name}</span>
                                      <span className="text-muted-foreground ml-1">· {player.team?.toUpperCase?.()}</span>
                                    </div>
                                  </div>
                                  <span className="text-xs text-muted-foreground text-right pl-3 border-l border-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>${Math.round(player.salary).toLocaleString()}</span>
                                  <span className="text-xs text-muted-foreground text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{player.projectedPoints !== undefined ? player.projectedPoints.toFixed(1) : '—'}</span>
                                  <span className="text-xs text-muted-foreground text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{player.ownership !== undefined ? `${player.ownership.toFixed(1)}%` : '—'}</span>
                                  <span className="text-xs text-muted-foreground text-right" style={{ fontVariantNumeric: 'tabular-nums' }}>{player.actuals !== undefined ? player.actuals.toFixed(1) : '—'}</span>
                                </div>

                                {/* Mobile stacked layout */}
                                <div className="sm:hidden flex flex-col gap-1">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={`${getPositionBadgeClasses(player.position)} min-w-[2.25rem] text-center`}>
                                      {player.position}
                                    </span>
                                    <div className="truncate">
                                      <span className="font-medium">{player.name}</span>
                                      <span className="text-muted-foreground ml-1">· {player.team?.toUpperCase?.()}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between text-xs text-muted-foreground" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                    <span className="pr-3 border-r border-muted">${Math.round(player.salary).toLocaleString()}</span>
                                    <span>{player.projectedPoints !== undefined ? player.projectedPoints.toFixed(1) : '—'}</span>
                                    <span>{player.ownership !== undefined ? `${player.ownership.toFixed(1)}%` : '—'}</span>
                                    <span>{player.actuals !== undefined ? player.actuals.toFixed(1) : '—'}</span>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-muted-foreground text-center py-4">
                              No roster data available
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleExportLineup(lineup)}>
                          Export
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => router.push(`/builder?lineupId=${lineup.id}`)}
                        >
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        ) : lineups.length === 0 ? (
          <Card className="p-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                <PlusCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3>No lineups yet</h3>
                <p className="text-muted-foreground">Create your first lineup to get started with your weekly strategy.</p>
              </div>
              <Button className="gap-2" onClick={() => router.push('/builder')}>
                <PlusCircle className="w-4 h-4" />
                Create Your First Lineup
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3>No lineups match your filters</h3>
                <p className="text-muted-foreground">Try adjusting your search terms or clearing the filters.</p>
              </div>
              <Button variant="outline" onClick={clearFilters} className="gap-2">
                <X className="w-4 h-4" />
                Clear Filters
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
