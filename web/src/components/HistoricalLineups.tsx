import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

export function HistoricalLineups() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Historical Lineups</h1>
        <p className="text-muted-foreground">View your past lineups and performance</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Past Lineups</CardTitle>
          <CardDescription>Review your historical performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No historical lineups found</p>
            <Button>Import History</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
