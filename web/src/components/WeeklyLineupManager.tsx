import { useState, useEffect, useMemo } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Separator } from "./ui/separator";
import { useLineupsStore } from "@/store";
import { LineupService } from "@/lib/lineupService";
import { PlayerService } from "@/lib/playerService";
import { PlayerPoolEntry, Week, Lineup } from "@/types/prd";
import { Search, Filter, Eye, Edit, Trash2, Download } from "lucide-react";

export function WeeklyLineupManager() {
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lineupToDelete, setLineupToDelete] = useState<string | null>(null);
  const [playerPoolEntries, setPlayerPoolEntries] = useState<PlayerPoolEntry[]>([]);

  const { createLineup } = useLineupsStore();

  console.log('WeeklyLineupManager component rendering');

  // Fetch weeks and set current week
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        const weeksData = await PlayerService.getWeeks();
        setWeeks(weeksData.weeks);
        
        // Find the active week (week with status 'Active')
        const activeWeek = weeksData.weeks.find((week: Week) => week.status === 'Active');
        if (activeWeek) {
          setCurrentWeek(activeWeek);
        } else if (weeksData.weeks.length > 0) {
          setCurrentWeek(weeksData.weeks[0]);
        }
      } catch (error) {
        console.error("Error fetching weeks:", error);
        setError("Failed to fetch weeks");
      }
    };

    fetchWeeks();
  }, []);

  // Fetch lineups for the current week
  useEffect(() => {
    const fetchLineups = async () => {
      if (!currentWeek) return;
      
      try {
        setLoading(true);
        const lineupsData = await LineupService.getLineups(currentWeek.id);
        setLineups(lineupsData.lineups || []);
        setError(null);
      } catch (error) {
        console.error("Error fetching lineups:", error);
        setError("Failed to fetch lineups");
        setLineups([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLineups();
  }, [currentWeek]);

  // Fetch player pool for the current week
  useEffect(() => {
    const fetchPlayerPool = async () => {
      if (!currentWeek) return;
      
      try {
        const playerPoolData = await PlayerService.getPlayerPoolEntries(currentWeek.id);
        setPlayerPoolEntries(playerPoolData);
      } catch (error) {
        console.error("Error fetching player pool:", error);
        setPlayerPoolEntries([]);
      }
    };

    fetchPlayerPool();
  }, [currentWeek]);

  // Create a map for quick player lookup
  const playerPoolMap = useMemo(() => {
    const map = new Map<string, PlayerPoolEntry>();
    playerPoolEntries.forEach(entry => {
      if (entry.player?.playerDkId) {
        map.set(entry.player.playerDkId.toString(), entry);
      }
    });
    return map;
  }, [playerPoolEntries]);

  // Filter lineups based on search and tags
  const filteredLineups = useMemo(() => {
    return lineups.filter(lineup => {
      const matchesSearch = searchTerm === "" || 
        lineup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lineup.game_style?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lineup.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesTags = selectedTags.length === 0 || 
        selectedTags.some(tag => lineup.tags?.includes(tag));
      
      return matchesSearch && matchesTags;
    });
  }, [lineups, searchTerm, selectedTags]);

  // Get all unique tags from lineups
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    lineups.forEach(lineup => {
      lineup.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags);
  }, [lineups]);

  const handleCreateLineup = async () => {
    if (!currentWeek) return;

    try {
      const newLineup = await LineupService.createLineup({
        week_id: currentWeek.id,
        name: `Lineup ${lineups.length + 1}`,
        tags: [],
        slots: {},
        game_style: "Classic"
      });

      if (newLineup) {
        setLineups(prev => [...prev, newLineup]);
      }
    } catch (error) {
      console.error("Error creating lineup:", error);
      setError("Failed to create lineup");
    }
  };

  const handleDeleteLineup = async (id: string) => {
    try {
      await LineupService.deleteLineup(id);
      setLineups(prev => prev.filter(lineup => lineup.id !== id));
      setDeleteDialogOpen(false);
      setLineupToDelete(null);
    } catch (error) {
      console.error("Error deleting lineup:", error);
      setError("Failed to delete lineup");
    }
  };

  const handleExportAll = async () => {
    try {
      // Export all lineups for the current week
      const exportData = {
        week: currentWeek,
        lineups: filteredLineups,
        exportDate: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lineups-week-${currentWeek?.week_number}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting lineups:", error);
      setError("Failed to export lineups");
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
    setSearchTerm("");
    setSelectedTags([]);
  };

  const getPlayerInfo = (playerId: string) => {
    return playerPoolMap.get(playerId);
  };

  const formatSalary = (salary: number) => {
    return `$${(salary / 1000).toFixed(0)}k`;
  };

  const formatFullSalary = (salary: number) => {
    return `$${salary.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading lineups...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Weekly Lineup Manager</h1>
          <p className="text-muted-foreground">Manage your lineups for {currentWeek ? `Week ${currentWeek.week_number}` : 'selected week'}</p>
        </div>
        <div className="flex items-center gap-4">
          <Select 
            value={currentWeek ? currentWeek.id.toString() : ""} 
            onValueChange={(value) => {
              const week = weeks.find(w => w.id.toString() === value);
              setCurrentWeek(week || null);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select Week" />
            </SelectTrigger>
            <SelectContent>
              {weeks.map((week) => (
                <SelectItem key={week.id} value={week.id.toString()}>
                  {week.status === 'Active' ? `Week ${week.week_number} (Active)` : `Week ${week.week_number}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleExportAll} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
          <Button onClick={handleCreateLineup}>
            Create New Lineup
          </Button>
        </div>
      </div>

      {/* Search and Filters Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search lineups or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 max-w-md"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            {showFilters ? "Hide" : "Filters"}
          </Button>
        </div>

        {/* Filtered Lineups Count Card */}
        <Card className="w-fit">
          <CardContent className="p-3">
            <div className="text-center">
              <p className="text-sm font-medium">Filtered Lineups</p>
              <p className="text-2xl font-bold text-primary">{filteredLineups.length}</p>
            </div>
          </CardContent>
        </Card>

        {showFilters && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Tags:</span>
              {allTags.map(tag => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
              {selectedTags.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* Lineups Display */}
      {filteredLineups.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Your Lineups</CardTitle>
            <CardDescription>Create and manage your DFS lineups</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {lineups.length === 0 
                  ? "No lineups created yet for this week" 
                  : "No lineups match your current filters"}
              </p>
              <Button onClick={handleCreateLineup}>Create New Lineup</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Lineups</h2>
            <div className="text-sm text-muted-foreground">
              Showing {filteredLineups.length} of {lineups.length} lineups
            </div>
          </div>

          <Carousel className="w-full">
            <CarouselContent>
              {filteredLineups.map((lineup) => (
                <CarouselItem key={lineup.id} className="md:basis-1/2 lg:basis-1/3">
                  <Card className="h-full">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2 mb-2">
                            {lineup.name}
                          </CardTitle>
                          {/* Action Icons */}
                          <div className="flex items-center gap-2 mb-3">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              onClick={() => {
                                setLineupToDelete(lineup.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          {/* Tags */}
                          {lineup.tags && lineup.tags.length > 0 && (
                            <div className="flex gap-1 mb-3">
                              {lineup.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {/* Summary Info */}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Salary Used: {formatFullSalary(lineup.salary_used || 0)} / $50,000
                            </span>
                            <span className="font-medium text-blue-600">
                              Projected Points: {lineup.projected_points || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      {Object.keys(lineup.slots).length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No players added yet</p>
                          <Button variant="outline" size="sm" className="mt-2">
                            Add Players
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm mb-3 text-gray-700">Full Roster</h4>
                          {Object.entries(lineup.slots).map(([position, playerId]) => {
                            const playerPoolEntry = getPlayerInfo(playerId?.toString() || '');
                            return (
                              <div key={position} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-b-0">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs w-10 h-5 text-center bg-gray-50 border-gray-200 text-gray-700">
                                    {position}
                                  </Badge>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {playerPoolEntry ? 
                                        `${playerPoolEntry.player?.displayName || 'Unknown Player'} (${playerPoolEntry.player?.team || 'Unknown'})` :
                                        'Player not found'
                                      }
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right text-sm flex-shrink-0">
                                  <div className="font-medium text-gray-900">
                                    {playerPoolEntry?.salary ? formatFullSalary(playerPoolEntry.salary) : 'N/A'}
                                  </div>
                                  <div className="text-blue-600 font-medium">
                                    {playerPoolEntry?.projectedPoints ? `${playerPoolEntry.projectedPoints.toFixed(1)}pts` : 'N/A'}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lineup</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this lineup? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setLineupToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => lineupToDelete && handleDeleteLineup(lineupToDelete)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
