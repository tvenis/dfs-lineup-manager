import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, Download, RefreshCw, Search } from "lucide-react";

export function PlayersSettings() {
  const [totalPlayers, setTotalPlayers] = useState(1250);
  const [lastUpdated, setLastUpdated] = useState("2024-01-15");

  return (
    <div className="space-y-6">
      {/* Database Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Player Database</CardTitle>
          <CardDescription>
            Manage player database and import/export operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{totalPlayers.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Players</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">1,180</div>
              <div className="text-sm text-muted-foreground">Active Players</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">70</div>
              <div className="text-sm text-muted-foreground">Inactive Players</div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="text-sm text-muted-foreground">
              Last updated: {lastUpdated}
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import/Export Operations */}
      <Card>
        <CardHeader>
          <CardTitle>Data Operations</CardTitle>
          <CardDescription>
            Import new player data or export existing data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Import Players
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Players
              </Button>
            </div>
            
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Supported Formats</h4>
              <div className="flex gap-2">
                <Badge variant="secondary">CSV</Badge>
                <Badge variant="secondary">JSON</Badge>
                <Badge variant="secondary">Excel</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player Management */}
      <Card>
        <CardHeader>
          <CardTitle>Player Management</CardTitle>
          <CardDescription>
            Add, edit, or remove players from the database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Player
              </Button>
              <div className="flex-1 max-w-sm">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search players..."
                    className="w-full pl-10 pr-4 py-2 border rounded-md"
                  />
                </div>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Use the search above to find and manage specific players, or add new players to the database.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
