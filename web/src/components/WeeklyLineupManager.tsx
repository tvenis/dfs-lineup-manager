"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Separator } from "./ui/separator";
// import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";
import { PlusCircle, Download, Edit, Trash2, Eye, Search, Filter, X } from "lucide-react";
import { WeekService } from "@/lib/weekService";
import { LineupService } from "@/lib/lineupService";
import { Week, LineupDisplayData } from "@/types/prd";
import { buildApiUrl, API_CONFIG } from "@/config/api";

export function WeeklyLineupManager({ selectedWeek: _selectedWeek }: { selectedWeek?: string }) {
  const [lineups, setLineups] = useState<LineupDisplayData[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [currentWeekId, setCurrentWeekId] = useState<number | null>(1); // Default to week 1
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<{ [key: string]: boolean }>({});
  const [lineupToDelete, setLineupToDelete] = useState<string | null>(null);

  // Load weeks and lineups from API
  useEffect(() => {
    console.log('🎯 useEffect for loadData triggered');
    
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('🎯 Loading weeks from API...');
        console.log('🎯 API URL:', buildApiUrl(API_CONFIG.ENDPOINTS.WEEKS));
        
        // Load weeks
        const weeksResponse = await WeekService.getWeeks();
        console.log('🎯 Weeks API response:', weeksResponse);
        setWeeks(weeksResponse.weeks);
        
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
            // Convert LineupListResponse to LineupDisplayData format
            const displayLineups = lineupsResponse.lineups.map(lineup => ({
              id: lineup.id,
              name: lineup.name,
              tags: lineup.tags || [],
              salaryUsed: lineup.salary_used,
              salaryCap: 50000,
              projectedPoints: 0, // Will be calculated later
              roster: [] // Will be populated later
            }));
            setLineups(displayLineups);
          } catch (lineupError) {
            console.error('❌ Failed to load lineups:', lineupError);
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
            // Convert LineupListResponse to LineupDisplayData format
            const displayLineups = lineupsResponse.lineups.map(lineup => ({
              id: lineup.id,
              name: lineup.name,
              tags: lineup.tags || [],
              salaryUsed: lineup.salary_used,
              salaryCap: 50000,
              projectedPoints: 0, // Will be calculated later
              roster: [] // Will be populated later
            }));
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
        setWeeks([{
          id: 1,
          week_number: 1,
          year: 2025,
          start_date: "2025-09-04",
          end_date: "2025-09-08",
          game_count: 0,
          status: "Active",
          imported_at: "2025-08-20T19:52:03",
          created_at: "2025-08-20T19:52:03"
        }]);
        setCurrentWeekId(1);
        setLineups([]);
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
      await LineupService.deleteLineup(id);
      setLineups(prev => prev.filter(lineup => lineup.id !== id));
      // Close the dialog and clear the lineup to delete
      setDeleteDialogOpen(prev => ({ ...prev, [id]: false }));
      setLineupToDelete(null);
    } catch (error) {
      console.error('Failed to delete lineup:', error);
    }
  };

  const openDeleteDialog = (id: string) => {
    setLineupToDelete(id);
    setDeleteDialogOpen(prev => ({ ...prev, [id]: true }));
  };

  const closeDeleteDialog = (id: string) => {
    setDeleteDialogOpen(prev => ({ ...prev, [id]: false }));
    setLineupToDelete(null);
  };

  const handleExportLineup = async (lineup: LineupDisplayData) => {
    try {
      const blob = await LineupService.exportLineup(lineup.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lineup-${lineup.name}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export lineup:', error);
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

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'QB': return 'bg-blue-100 text-blue-800';
      case 'RB': return 'bg-green-100 text-green-800';
      case 'WR': return 'bg-purple-100 text-purple-800';
      case 'TE': return 'bg-orange-100 text-orange-800';
      case 'FLEX': return 'bg-gray-100 text-gray-800';
      case 'DST': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  console.log('🎯 WeeklyLineupManager render - currentWeekId:', currentWeekId, 'loading:', loading, 'lineups:', lineups.length);

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
            <p className="text-xs text-gray-500">
              Debug: currentWeekId={currentWeekId}, loading={loading ? 'true' : 'false'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => {
            console.log('🎯 Manual API test...');
            fetch('http://localhost:8000/api/weeks/')
              .then(response => response.json())
              .then(data => console.log('🎯 Manual API response:', data))
              .catch(error => console.error('🎯 Manual API error:', error));
          }}>
            Test API
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export All
          </Button>
          <Button className="gap-2">
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
                  <Card className="hover:shadow-md transition-shadow h-full">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{lineup.name}</CardTitle>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Dialog open={deleteDialogOpen[lineup.id] || false} onOpenChange={(open) => {
                            if (!open) {
                              closeDeleteDialog(lineup.id);
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(lineup.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
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
                    <CardContent className="space-y-4">
                      {/* Salary and Projected Points Summary */}
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Salary Used</span>
                          <span>${lineup.salaryUsed.toLocaleString()} / $50,000</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${(lineup.salaryUsed / lineup.salaryCap) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Projected Points</span>
                          <span>{lineup.projectedPoints.toFixed(1)}</span>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      {/* Full Roster Display */}
                      <div className="space-y-3">
                        <div className="text-sm">Full Roster</div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {lineup.roster.map((player, index) => (
                            <div key={`${player.position}-${index}`} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Badge variant="outline" className={`text-xs px-1.5 py-0.5 ${getPositionColor(player.position)} border-0`}>
                                  {player.position}
                                </Badge>
                                <div className="truncate">
                                  <span>{player.name}</span>
                                  <span className="text-muted-foreground ml-1">({player.team})</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>${player.salary.toLocaleString()}</span>
                                <span>{player.projectedPoints}pts</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handleExportLineup(lineup)}>
                          Export
                        </Button>
                        <Button size="sm" className="flex-1">
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
              <Button className="gap-2">
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
