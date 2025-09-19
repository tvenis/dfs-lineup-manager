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
import { Edit, Check, X } from "lucide-react";
import { ContestService } from "@/lib/contestService";
import { DraftGroupsSection } from "./DraftGroupsSection";

export function DraftKingsSettings() {
  const [contestTypes, setContestTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Load contest types from API
  useEffect(() => {
    const loadContestTypes = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await ContestService.getContestTypes();
        setContestTypes(response.contest_types);
      } catch (err) {
        console.error('Error loading contest types:', err);
        setError('Failed to load contest types');
      } finally {
        setLoading(false);
      }
    };

    loadContestTypes();
  }, []);

  const handleModifyContestType = (index: number, contestType: string) => {
    setEditingIndex(index);
    setEditValue(contestType);
  };

  const handleSaveEdit = async (index: number, originalValue: string) => {
    if (editValue.trim() === "" || editValue === originalValue) {
      handleCancelEdit();
      return;
    }

    try {
      // Update via API (currently simulated)
      await ContestService.updateContestType(originalValue, editValue.trim());
      
      // Update local state
      const updatedContestTypes = [...contestTypes];
      updatedContestTypes[index] = editValue.trim();
      setContestTypes(updatedContestTypes);
      
      // Reset editing state
      setEditingIndex(null);
      setEditValue("");
    } catch (error) {
      console.error('Failed to update contest type:', error);
      setError('Failed to update contest type');
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent, index: number, originalValue: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(index, originalValue);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Contest Types</CardTitle>
            <CardDescription className="text-sm">
              Loading contest types...
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-center py-6">
              <div className="text-muted-foreground text-sm">Loading...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Contest Types</CardTitle>
            <CardDescription className="text-sm">
              Error loading contest types.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-center py-6">
              <div className="text-red-500 text-sm">{error}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contest Types Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Contest Types</CardTitle>
          <CardDescription className="text-sm">
            View and manage contest types.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {contestTypes.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No contest types found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Contest Type</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700 w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contestTypes.map((contestType, index) => (
                    <tr key={contestType} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="py-2 px-3">
                        {editingIndex === index ? (
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => handleKeyPress(e, index, contestType)}
                            className="font-medium text-sm h-8"
                            autoFocus
                          />
                        ) : (
                          <span className="font-medium text-gray-900">{contestType}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {editingIndex === index ? (
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSaveEdit(index, contestType)}
                              className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelEdit}
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleModifyContestType(index, contestType)}
                            className="h-7 w-7 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Draft Groups Section */}
      <DraftGroupsSection />
    </div>
  );
}
