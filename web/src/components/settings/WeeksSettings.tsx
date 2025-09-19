import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Calendar, Clock, Edit, Trash2, Loader2 } from "lucide-react";
import { WeekService } from "@/lib/weekService";
import type { Week } from "@/types/prd";

export function WeeksSettings() {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Edit modal state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingWeek, setEditingWeek] = useState<Week | null>(null);
  const [editForm, setEditForm] = useState({
    week_number: 0,
    year: 0,
    start_date: "",
    end_date: "",
    game_count: 0,
    status: "" as "Completed" | "Active" | "Upcoming",
    notes: "",
  });

  // Add modal state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    week_number: 0,
    year: new Date().getFullYear(),
    start_date: "",
    end_date: "",
    game_count: 16,
    status: "Upcoming" as "Completed" | "Active" | "Upcoming",
    notes: "",
  });

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [weekToDelete, setWeekToDelete] = useState<Week | null>(null);

  // Get unique years from weeks data and sort them
  const seasons = Array.from(new Set(weeks.map(week => week.year.toString())))
    .sort((a, b) => parseInt(b) - parseInt(a)); // Sort newest first
  
  const filteredWeeks = weeks.filter(week => week.year.toString() === selectedSeason);

  // Fetch weeks data on component mount
  useEffect(() => {
    const fetchWeeks = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await WeekService.getWeeks();
        setWeeks(data.weeks || []);
        
        // Auto-select the current year or first available year
        if (data.weeks && data.weeks.length > 0) {
          const currentYear = new Date().getFullYear().toString();
          const availableYears: string[] = Array.from(new Set(data.weeks.map((w: Week) => w.year.toString())));
          
          if (availableYears.includes(currentYear)) {
            setSelectedSeason(currentYear);
          } else {
            const sortedYears = availableYears.sort((a: string, b: string) => parseInt(b) - parseInt(a));
            if (sortedYears.length > 0) {
              setSelectedSeason(sortedYears[0]);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching weeks:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch weeks');
      } finally {
        setLoading(false);
      }
    };

    fetchWeeks();
  }, []);

  const getStatusBadge = (status: Week["status"]) => {
    switch (status) {
      case "Upcoming":
        return <Badge variant="outline">Upcoming</Badge>;
      case "Active":
        return <Badge variant="default">Active</Badge>;
      case "Completed":
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return null;
    }
  };

  const confirmDeleteWeek = (week: Week) => {
    setWeekToDelete(week);
    setDeleteDialogOpen(true);
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setWeekToDelete(null);
  };

  const executeDelete = async () => {
    if (!weekToDelete) return;

    try {
      await WeekService.deleteWeek(weekToDelete.id);

      // Remove from local state
      setWeeks(prev => prev.filter(week => week.id !== weekToDelete.id));
      
      cancelDelete();
    } catch (err) {
      console.error('Error deleting week:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete week');
      cancelDelete();
    }
  };

  const openEditDialog = (week: Week) => {
    setEditingWeek(week);
    setEditForm({
      week_number: week.week_number,
      year: week.year,
      start_date: week.start_date,
      end_date: week.end_date,
      game_count: week.game_count,
      status: week.status,
      notes: week.notes || "",
    });
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingWeek(null);
    setEditForm({
      week_number: 0,
      year: 0,
      start_date: "",
      end_date: "",
      game_count: 0,
      status: "" as "Completed" | "Active" | "Upcoming",
      notes: "",
    });
  };

  const saveWeekChanges = async () => {
    if (!editingWeek) return;

    try {
      const updatedWeek = await WeekService.updateWeek(editingWeek.id, editForm);
      
      // Update the local state
      setWeeks(prev => prev.map(week => 
        week.id === editingWeek.id ? { ...week, ...editForm } : week
      ));
      
      closeEditDialog();
    } catch (err) {
      console.error('Error updating week:', err);
      setError(err instanceof Error ? err.message : 'Failed to update week');
    }
  };

  const openAddDialog = () => {
    // Calculate next week number based on existing weeks for current year
    const currentYear = new Date().getFullYear();
    const currentYearWeeks = weeks.filter(w => w.year === currentYear);
    const nextWeekNumber = currentYearWeeks.length > 0 
      ? Math.max(...currentYearWeeks.map(w => w.week_number)) + 1 
      : 1;

    setAddForm({
      week_number: nextWeekNumber,
      year: currentYear,
      start_date: "",
      end_date: "",
      game_count: 16,
      status: "Upcoming",
      notes: "",
    });
    setAddDialogOpen(true);
  };

  const closeAddDialog = () => {
    setAddDialogOpen(false);
    setAddForm({
      week_number: 0,
      year: new Date().getFullYear(),
      start_date: "",
      end_date: "",
      game_count: 16,
      status: "Upcoming",
      notes: "",
    });
  };

  const saveNewWeek = async () => {
    try {
      console.log('Creating week with data:', addForm);
      const newWeek = await WeekService.createWeek(addForm);
      console.log('Successfully created week:', newWeek);
      
      // Add to local state
      setWeeks(prev => [...prev, newWeek]);
      
      // Update selected season to the new week's year if needed
      if (!selectedSeason || selectedSeason !== newWeek.year.toString()) {
        setSelectedSeason(newWeek.year.toString());
      }
      
      closeAddDialog();
    } catch (err) {
      console.error('Error creating week:', err);
      console.error('Form data that failed:', addForm);
      
      // Show more detailed error message
      let errorMessage = 'Failed to create week';
      if (err instanceof Error) {
        errorMessage = err.message;
        // If it's a 500 error, add more context
        if (err.message.includes('500')) {
          errorMessage = 'Server error while creating week. Please check if the week number already exists or if there are validation issues.';
        }
      }
      setError(errorMessage);
    }
  };

  // Calculate statistics from real data
  const totalWeeks = weeks.length;
  const totalGames = weeks.reduce((sum, week) => sum + (week.game_count || 0), 0);
  const activeWeek = weeks.find(week => week.status === 'Active'); // Get the single active week
  const completedWeeks = weeks.filter(week => week.status === 'Completed').length;
  const upcomingWeeks = weeks.filter(week => week.status === 'Upcoming').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading weeks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 border border-red-200 rounded-lg bg-red-50">
        <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Weeks</h3>
        <p className="text-red-600">{error}</p>
        <Button 
          variant="outline" 
          className="mt-4" 
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weeks Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Season Schedule</CardTitle>
          <CardDescription>
            Manage NFL season weeks and game schedules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">
                {activeWeek ? `Week ${activeWeek.week_number}` : 'None'}
              </div>
              <div className="text-sm text-muted-foreground">Active Week</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{totalWeeks}</div>
              <div className="text-sm text-muted-foreground">Total Weeks</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{totalGames}</div>
              <div className="text-sm text-muted-foreground">Total Games</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{completedWeeks}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Week Management */}
      <Card>
        <CardHeader>
          <CardTitle>Week Management</CardTitle>
          <CardDescription>
            Add, edit, or remove weeks from the schedule
          </CardDescription>
          <CardAction>
            <Button onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Add Week
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Filter by Season</label>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              {seasons.map(season => (
                <option key={season} value={season}>
                  {season} Season
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {filteredWeeks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No weeks found for the selected season.
              </div>
            ) : (
              filteredWeeks.map((week) => (
                <div
                  key={week.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-lg">
                      {week.week_number}
                    </div>
                    <div>
                      <div className="font-medium">Week {week.week_number}, {week.year}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {week.start_date} - {week.end_date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {week.game_count} games
                        </span>
                      </div>
                      {week.notes && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {week.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(week.status)}
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openEditDialog(week)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {week.status === "Upcoming" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDeleteWeek(week)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Week Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Week</DialogTitle>
            <DialogDescription>
              Make changes to the week details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="week_number" className="text-right">
                Week Number
              </Label>
              <Input
                id="week_number"
                type="number"
                value={editForm.week_number}
                onChange={(e) => setEditForm(prev => ({ ...prev, week_number: parseInt(e.target.value) || 0 }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="year" className="text-right">
                Year
              </Label>
              <Input
                id="year"
                type="number"
                value={editForm.year}
                onChange={(e) => setEditForm(prev => ({ ...prev, year: parseInt(e.target.value) || 0 }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start_date" className="text-right">
                Start Date
              </Label>
              <Input
                id="start_date"
                type="date"
                value={editForm.start_date}
                onChange={(e) => setEditForm(prev => ({ ...prev, start_date: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="end_date" className="text-right">
                End Date
              </Label>
              <Input
                id="end_date"
                type="date"
                value={editForm.end_date}
                onChange={(e) => setEditForm(prev => ({ ...prev, end_date: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="game_count" className="text-right">
                Game Count
              </Label>
              <Input
                id="game_count"
                type="number"
                value={editForm.game_count}
                onChange={(e) => setEditForm(prev => ({ ...prev, game_count: parseInt(e.target.value) || 0 }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value as "Completed" | "Active" | "Upcoming" }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Upcoming">Upcoming</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                className="col-span-3"
                placeholder="Optional notes about this week"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              Cancel
            </Button>
            <Button onClick={saveWeekChanges}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Week Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Week</DialogTitle>
            <DialogDescription>
              Create a new week for the NFL schedule.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add_week_number" className="text-right">
                Week Number
              </Label>
              <Input
                id="add_week_number"
                type="number"
                value={addForm.week_number}
                onChange={(e) => setAddForm(prev => ({ ...prev, week_number: parseInt(e.target.value) || 0 }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add_year" className="text-right">
                Year
              </Label>
              <Input
                id="add_year"
                type="number"
                value={addForm.year}
                onChange={(e) => setAddForm(prev => ({ ...prev, year: parseInt(e.target.value) || 0 }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add_start_date" className="text-right">
                Start Date
              </Label>
              <Input
                id="add_start_date"
                type="date"
                value={addForm.start_date}
                onChange={(e) => setAddForm(prev => ({ ...prev, start_date: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add_end_date" className="text-right">
                End Date
              </Label>
              <Input
                id="add_end_date"
                type="date"
                value={addForm.end_date}
                onChange={(e) => setAddForm(prev => ({ ...prev, end_date: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add_game_count" className="text-right">
                Game Count
              </Label>
              <Input
                id="add_game_count"
                type="number"
                value={addForm.game_count}
                onChange={(e) => setAddForm(prev => ({ ...prev, game_count: parseInt(e.target.value) || 0 }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add_status" className="text-right">
                Status
              </Label>
              <Select
                value={addForm.status}
                onValueChange={(value) => setAddForm(prev => ({ ...prev, status: value as "Completed" | "Active" | "Upcoming" }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Upcoming">Upcoming</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="add_notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="add_notes"
                value={addForm.notes}
                onChange={(e) => setAddForm(prev => ({ ...prev, notes: e.target.value }))}
                className="col-span-3"
                placeholder="Optional notes about this week"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAddDialog}>
              Cancel
            </Button>
            <Button onClick={saveNewWeek}>
              Create Week
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this week? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {weekToDelete && (
            <div className="py-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="font-medium">
                  Week {weekToDelete.week_number}, {weekToDelete.year}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {weekToDelete.start_date} - {weekToDelete.end_date}
                </div>
                <div className="text-sm text-muted-foreground">
                  {weekToDelete.game_count} games • {weekToDelete.status}
                </div>
                {weekToDelete.notes && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Notes: {weekToDelete.notes}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={cancelDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={executeDelete}>
              Delete Week
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
