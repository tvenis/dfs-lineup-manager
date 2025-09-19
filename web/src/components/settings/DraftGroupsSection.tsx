import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Plus } from "lucide-react";
import { DraftGroupService, DraftGroup, DraftGroupCreate, DraftGroupUpdate } from "@/lib/draftGroupService";
import { WeekService } from "@/lib/weekService";
import { Week } from "@/types/prd";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const draftGroupSchema = z.object({
  draftGroup: z.number().min(1, "Draft Group ID must be at least 1"),
  week_id: z.number().min(1, "Week is required"),
  draftGroup_description: z.string().optional(),
  games: z.number().min(0, "Games must be 0 or more").optional(),
});

type DraftGroupFormData = z.infer<typeof draftGroupSchema>;

export function DraftGroupsSection() {
  const [draftGroups, setDraftGroups] = useState<DraftGroup[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDraftGroup, setEditingDraftGroup] = useState<DraftGroup | null>(null);

  const createForm = useForm<DraftGroupFormData>({
    resolver: zodResolver(draftGroupSchema),
    defaultValues: {
      draftGroup: 0,
      week_id: 0,
      draftGroup_description: "",
      games: 0,
    },
  });

  const editForm = useForm<DraftGroupFormData>({
    resolver: zodResolver(draftGroupSchema),
    defaultValues: {
      draftGroup: 0,
      week_id: 0,
      draftGroup_description: "",
      games: 0,
    },
  });

  // Load draft groups and weeks from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load both draft groups and weeks in parallel
        const [draftGroupsResponse, weeksResponse] = await Promise.all([
          DraftGroupService.getDraftGroups(),
          WeekService.getWeeks()
        ]);
        
        setDraftGroups(draftGroupsResponse);
        setWeeks(weeksResponse.weeks);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load draft groups and weeks');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCreateDraftGroup = async (data: DraftGroupFormData) => {
    try {
      const createData: DraftGroupCreate = {
        draftGroup: data.draftGroup,
        week_id: data.week_id,
        draftGroup_description: data.draftGroup_description || undefined,
        games: data.games || 0,
      };

      const newDraftGroup = await DraftGroupService.createDraftGroup(createData);
      setDraftGroups(prev => [...prev, newDraftGroup]);
      setIsCreateDialogOpen(false);
      createForm.reset();
    } catch (err) {
      console.error('Error creating draft group:', err);
      setError(err instanceof Error ? err.message : 'Failed to create draft group');
    }
  };

  const handleEditDraftGroup = async (data: DraftGroupFormData) => {
    if (!editingDraftGroup) return;

    try {
      const updateData: DraftGroupUpdate = {
        draftGroup: data.draftGroup,
        week_id: data.week_id,
        draftGroup_description: data.draftGroup_description || undefined,
        games: data.games || 0,
      };

      const updatedDraftGroup = await DraftGroupService.updateDraftGroup(editingDraftGroup.id, updateData);
      setDraftGroups(prev => 
        prev.map(dg => dg.id === editingDraftGroup.id ? updatedDraftGroup : dg)
      );
      setIsEditDialogOpen(false);
      setEditingDraftGroup(null);
      editForm.reset();
    } catch (err) {
      console.error('Error updating draft group:', err);
      setError(err instanceof Error ? err.message : 'Failed to update draft group');
    }
  };

  const openEditDialog = (draftGroup: DraftGroup) => {
    setEditingDraftGroup(draftGroup);
    editForm.reset({
      draftGroup: draftGroup.draftGroup,
      week_id: draftGroup.week_id,
      draftGroup_description: draftGroup.draftGroup_description || "",
      games: draftGroup.games || 0,
    });
    setIsEditDialogOpen(true);
  };

  const getWeekLabel = (weekId: number) => {
    const week = weeks.find(w => w.id === weekId);
    return week ? `Week ${week.week_number} (${week.year})` : `Week ID: ${weekId}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Draft Groups</CardTitle>
          <CardDescription className="text-sm">
            Loading draft groups from database...
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center py-6">
            <div className="text-muted-foreground text-sm">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Draft Groups</CardTitle>
          <CardDescription className="text-sm">
            Error loading draft groups
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center py-6">
            <div className="text-red-500 text-sm">{error}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg">Draft Groups</CardTitle>
          <CardDescription className="text-sm">
            View and manage draft groups from the database
          </CardDescription>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Draft Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Draft Group</DialogTitle>
              <DialogDescription>
                Add a new draft group to the database.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreateDraftGroup)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="draftGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Draft Group ID</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        The unique Draft Group ID from DraftKings
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="week_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Week</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a week" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {weeks.map((week) => (
                            <SelectItem key={week.id} value={week.id.toString()}>
                              Week {week.week_number} ({week.year}) - {week.status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="draftGroup_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormDescription>
                        Optional description for this draft group
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="games"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Games</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of games in this draft group
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="pt-0">
        {draftGroups.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No draft groups found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-sm">Draft Group ID</th>
                  <th className="text-left py-2 px-3 font-medium text-sm">Week</th>
                  <th className="text-left py-2 px-3 font-medium text-sm">Description</th>
                  <th className="text-left py-2 px-3 font-medium text-sm">Games</th>
                  <th className="text-right py-2 px-3 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {draftGroups.map((draftGroup) => (
                  <tr key={draftGroup.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium text-sm">{draftGroup.draftGroup}</td>
                    <td className="py-2 px-3 text-sm">{getWeekLabel(draftGroup.week_id)}</td>
                    <td className="py-2 px-3 text-sm">{draftGroup.draftGroup_description || '-'}</td>
                    <td className="py-2 px-3 text-sm">{draftGroup.games}</td>
                    <td className="py-2 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(draftGroup)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Draft Group</DialogTitle>
            <DialogDescription>
              Modify the selected draft group.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditDraftGroup)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="draftGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Draft Group ID</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      The unique Draft Group ID from DraftKings
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="week_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Week</FormLabel>
                    <Select 
                      value={field.value.toString()} 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a week" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {weeks.map((week) => (
                          <SelectItem key={week.id} value={week.id.toString()}>
                            Week {week.week_number} ({week.year}) - {week.status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="draftGroup_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional description for this draft group
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="games"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Games</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Number of games in this draft group
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
