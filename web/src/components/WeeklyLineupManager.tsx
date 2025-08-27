import { useState, useEffect, useMemo } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Separator } from "./ui/separator";

// Temporary mock interfaces to get build working
interface PlayerPoolEntry {
  id: string;
  name: string;
  team: string;
  salary: number;
  position: string;
  status: string;
  excluded: boolean;
  projectedPoints?: number;
  game_info?: string;
  avg_points?: number;
  entry_id: number;
  opponentRank: { value: number; sortValue: number; quality: string };
  player?: {
    name: string;
    team: string;
    position: string;
    player_dk_id: string;
  };
  draftStatAttributes?: {
    value?: number;
    quality?: string;
  };
}

interface Week {
  id: number;
  week_number: number;
  year: number;
  start_date: string;
  end_date: string;
  game_count: number;
  status: 'Completed' | 'Active' | 'Upcoming';
  notes?: string;
  imported_at: string;
  created_at: string;
  updated_at?: string;
}

interface Lineup {
  id: string;
  name: string;
  week_id: number;
  created_at: string;
  updated_at?: string;
  tags?: string;
  slots: Record<string, any>;
}

// Temporary mock store
const useLineupsStore = () => {
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [loading, setLoading] = useState(false);
  
  return {
    lineups,
    loading,
    setLineups,
    setLoading
  };
};

// Temporary mock services
class MockLineupService {
  static async getLineups(weekId?: number): Promise<Lineup[]> {
    return [];
  }
  
  static async deleteLineup(lineupId: string): Promise<void> {
    // Mock implementation
  }
  
  static async exportLineup(lineupId: string, format: string): Promise<Blob> {
    return new Blob(['mock data'], { type: 'text/plain' });
  }
}

class MockPlayerService {
  static async getWeeks(): Promise<{ weeks: Week[]; total: number }> {
    return { weeks: [], total: 0 };
  }
  
  static async getPlayerPool(weekId: number): Promise<{ entries: PlayerPoolEntry[]; total: number; week_id: number }> {
    return { entries: [], total: 0, week_id: weekId };
  }
}

import { Search, Filter, Eye, Edit, Trash2, Download } from "lucide-react";

export function WeeklyLineupManager() {
  const { lineups, loading, setLineups, setLoading } = useLineupsStore();
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLineup, setSelectedLineup] = useState<Lineup | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [lineupToDelete, setLineupToDelete] = useState<Lineup | null>(null);

  // Mock data for testing
  const mockWeeks: Week[] = [
    {
      id: 1,
      week_number: 1,
      year: 2024,
      start_date: "2024-09-05",
      end_date: "2024-09-09",
      game_count: 16,
      status: "Active",
      imported_at: "2024-09-05T00:00:00Z",
      created_at: "2024-09-05T00:00:00Z"
    }
  ];

  const mockLineups: Lineup[] = [
    {
      id: "1",
      name: "My First Lineup",
      week_id: 1,
      created_at: "2024-09-05T00:00:00Z",
      tags: "gpp,cash",
      slots: {
        QB: "Patrick Mahomes",
        RB1: "Christian McCaffrey",
        RB2: "Saquon Barkley"
      }
    }
  ];

  // Use mock data for now
  useEffect(() => {
    setWeeks(mockWeeks);
    setLineups(mockLineups);
    setSelectedWeek(1);
    setLoading(false);
  }, []);

  const filteredLineups = useMemo(() => {
    return lineups.filter(lineup => {
      const matchesSearch = lineup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (lineup.tags && lineup.tags.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesWeek = !selectedWeek || lineup.week_id === selectedWeek;
      return matchesSearch && matchesWeek;
    });
  }, [lineups, searchTerm, selectedWeek]);

  const handleDeleteLineup = async (lineup: Lineup) => {
    setLineupToDelete(lineup);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!lineupToDelete) return;
    
    try {
      await MockLineupService.deleteLineup(lineupToDelete.id);
      setLineups(prev => prev.filter(l => l.id !== lineupToDelete.id));
      setShowDeleteDialog(false);
      setLineupToDelete(null);
    } catch (error) {
      console.error('Failed to delete lineup:', error);
    }
  };

  const handleExportLineup = async (lineup: Lineup) => {
    try {
      const blob = await MockLineupService.exportLineup(lineup.id, 'csv');
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

  const getWeekStatusColor = (status: string): string => {
    if (status === 'Active') return 'bg-green-100 text-green-800 border-green-200';
    if (status === 'Upcoming') return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Weekly Lineup Manager</h1>
      
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search lineups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={selectedWeek?.toString() || ""} onValueChange={(value) => setSelectedWeek(parseInt(value))}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select Week" />
              </SelectTrigger>
              <SelectContent>
                {weeks.map((week) => (
                  <SelectItem key={week.id} value={week.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>Week {week.week_number}</span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getWeekStatusColor(week.status)}`}
                      >
                        {week.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lineups Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading lineups...</p>
          </div>
        ) : filteredLineups.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">No lineups found</p>
            <p className="text-gray-400">Create your first lineup to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLineups.map((lineup) => (
              <Card key={lineup.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{lineup.name}</CardTitle>
                      <CardDescription className="text-sm">
                        Week {lineup.week_id} • {new Date(lineup.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLineup(lineup)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExportLineup(lineup)}
                        className="h-8 w-8 p-0"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteLineup(lineup)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {lineup.tags && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {lineup.tags.split(',').map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(lineup.slots).slice(0, 3).map(([position, player]) => (
                      <div key={position} className="flex justify-between text-sm">
                        <span className="text-gray-600">{position}:</span>
                        <span className="font-medium truncate ml-2">{player}</span>
                      </div>
                    ))}
                    {Object.keys(lineup.slots).length > 3 && (
                      <div className="text-sm text-gray-500">
                        +{Object.keys(lineup.slots).length - 3} more players
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Lineup Detail Dialog */}
      <Dialog open={!!selectedLineup} onOpenChange={() => setSelectedLineup(null)}>
        <DialogContent className="max-w-2xl">
          {selectedLineup && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedLineup.name}</DialogTitle>
                <DialogDescription>
                  Week {selectedLineup.week_id} • Created {new Date(selectedLineup.created_at).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {lineup.tags && (
                  <div>
                    <h4 className="font-medium mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {lineup.tags.split(',').map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-2">Lineup</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(selectedLineup.slots).map(([position, player]) => (
                      <div key={position} className="flex justify-between p-2 bg-gray-50 rounded">
                        <span className="font-medium">{position}:</span>
                        <span>{player}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lineup</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{lineupToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
