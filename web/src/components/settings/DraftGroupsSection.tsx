import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Edit, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { DraftGroupService, DraftGroup, DraftGroupCreate, DraftGroupUpdate } from "@/lib/draftGroupService";
import { WeekService } from "@/lib/weekService";
import { Week } from "@/types/prd";

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
      const newDraftGroup = await DraftGroupService.createDraftGroup({
        draftGroup: data.draftGroup,
        week_id: data.week_id,
        draftGroup_description: data.draftGroup_description || "",
        games: data.games || 0,
      });
      
      setDraftGroups(prev => [...prev, newDraftGroup]);
      setIsCreateDialogOpen(false);
      createForm.reset();
    } catch (error) {
      console.error('Error creating draft group:', error);
      setError(error instanceof Error ? error.message : 'Failed to create draft group');
    }
  };

  const handleEditDraftGroup = (draftGroup: DraftGroup) => {
    setEditingDraftGroup(draftGroup);
    editForm.reset({
      draftGroup: draftGroup.draftGroup,
      week_id: draftGroup.week_id,
      draftGroup_description: draftGroup.draftGroup_description || "",
      games: draftGroup.games,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateDraftGroup = async (data: DraftGroupFormData) => {
    if (!editingDraftGroup) return;

    try {
      const updatedDraftGroup = await DraftGroupService.updateDraftGroup(editingDraftGroup.id, {
        draftGroup: data.draftGroup,
        week_id: data.week_id,
        draftGroup_description: data.draftGroup_description,
        games: data.games,
      });
      
      setDraftGroups(prev => 
        prev.map(dg => dg.id === editingDraftGroup.id ? updatedDraftGroup : dg)
      );
      setIsEditDialogOpen(false);
      setEditingDraftGroup(null);
      editForm.reset();
    } catch (error) {
      console.error('Error updating draft group:', error);
      setError(error instanceof Error ? error.message : 'Failed to update draft group');
    }
  };

  const getWeekDisplay = (weekId: number) => {
    const week = weeks.find(w => w.id === weekId);
    return week ? `Week ${week.week_number} (${week.year}) - ${week.status}` : `Week ID: ${weekId}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Draft Groups</CardTitle>
          <CardDescription className="text-sm">
            Loading draft groups...
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
            Error loading draft groups.
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
      <CardHeader className="pb-4">
        <div className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-lg">Draft Groups</CardTitle>
            <CardDescription className="text-sm">
              To add a Draft Group, go to DraftKings and find a Contest ID for the Main Slate (or desired slate). Once you find an appropriate Contest, hit Enter. The Contest ID will be in the URL of the lineup builder page. Take this Contest ID and substitute it into this API: https://api.draftkings.com/contests/v1/contests/{CONTEST_ID}?format=json. The Draft Group ID will be towards the bottom of the JSON for the contest.
            </CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
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
                        <FormLabel>Description</FormLabel>
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
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {draftGroups.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No draft groups found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Draft Group ID</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Week</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Description</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">Games</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700 w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {draftGroups.map((draftGroup) => (
                  <tr key={draftGroup.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-2 px-3 font-medium text-gray-900">{draftGroup.draftGroup}</td>
                    <td className="py-2 px-3 text-gray-700">{getWeekDisplay(draftGroup.week_id)}</td>
                    <td className="py-2 px-3 text-gray-700">{draftGroup.draftGroup_description || '-'}</td>
                    <td className="py-2 px-3 text-gray-700">{draftGroup.games}</td>
                    <td className="py-2 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditDraftGroup(draftGroup)}
                        className="h-7 w-7 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      >
                        <Edit className="w-3.5 h-3.5" />
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
              Update the draft group information.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateDraftGroup)} className="space-y-4">
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
                          <SelectValue />
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
                    <FormLabel>Description</FormLabel>
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
