import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Calendar, Database, Trophy, Target } from 'lucide-react';
import { useState } from 'react';

interface GameResultsImportResponse {
  status?: string;
  total_processed?: number;
  total_nflverse_games?: number;
  successful_matches: number;
  failed_matches: number;
  games_created: number;
  games_updated: number;
  errors: string[];
  unmatched_games: any[];
  match_stats?: {
    exact: number;
    none: number;
  };
  nflverse_stats?: {
    exact: number;
    none: number;
  };
  auto_imported?: {
    total_processed: number;
    successful_matches: number;
    games_created: number;
    games_updated: number;
  };
}

interface GameResultsImportResultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  result: GameResultsImportResponse | null;
  error: string | null;
  week: string;
}

export function GameResultsImportResultDialog({
  isOpen,
  onClose,
  result,
  error,
  week
}: GameResultsImportResultDialogProps) {
  
  const isSuccess = !error && result && (
    result.status === 'success' || 
    (result.total_processed && result.total_processed > 0) ||
    (result.total_nflverse_games && result.total_nflverse_games > 0)
  );
  const [showUnmatched, setShowUnmatched] = useState(false);

  // Get unmatched games
  const unmatchedGames = result?.unmatched_games || [];
  const hasIssues = unmatchedGames.length > 0 || (result?.errors && result.errors.length > 0);

  const handleClose = () => {
    setShowUnmatched(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSuccess ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            {isSuccess ? 'Import Complete' : 'Import Failed'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Week Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{week}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Database className="w-4 h-4" />
            <span>NFLVerse Game Results</span>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Result */}
          {isSuccess && result && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Successfully imported game results from NFLVerse!
                </AlertDescription>
              </Alert>

              {/* Import Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">Games Found</span>
                    </div>
                    <div className="text-2xl font-bold">{result.total_nflverse_games || result.total_processed || 0}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">Matched</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {result.successful_matches}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium">Created</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                      {result.auto_imported?.games_created || result.games_created || 0}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium">Updated</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                      {result.auto_imported?.games_updated || result.games_updated || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Match Quality */}
              {(result.match_stats || result.nflverse_stats) && (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium mb-3">Match Quality</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Exact Match:</span>
                        <span className="font-semibold text-green-600">
                          {(result.nflverse_stats?.exact || result.match_stats?.exact) || 0}
                        </span>
                      </div>
                      {((result.nflverse_stats?.none || result.match_stats?.none) || 0) > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Unmatched:</span>
                          <button
                            onClick={() => setShowUnmatched(!showUnmatched)}
                            className="font-semibold text-red-600 hover:underline"
                          >
                            {result.nflverse_stats?.none || result.match_stats?.none}
                          </button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Errors */}
              {result.errors && result.errors.length > 0 && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <div className="font-medium">Import Errors</div>
                    <div className="text-sm mt-1">
                      <ul className="list-disc list-inside space-y-1">
                        {result.errors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Warning for issues */}
              {hasIssues && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    <div className="font-medium">Matching Issues Detected</div>
                    <div className="text-sm mt-1">
                      {unmatchedGames.length > 0 && (
                        <div>{unmatchedGames.length} unmatched game(s)</div>
                      )}
                      {result.errors && result.errors.length > 0 && (
                        <div>{result.errors.length} error(s) during import</div>
                      )}
                      {unmatchedGames.length > 0 && (
                        <div className="mt-1">Click the number above to view unmatched games.</div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Unmatched Games List */}
              {showUnmatched && unmatchedGames.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium mb-3">Unmatched Games</div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {unmatchedGames.map((game, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm p-2 bg-red-50 rounded">
                          <div>
                            <span className="font-medium">{game.away_team} @ {game.home_team}</span>
                          </div>
                          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                            {!game.away_matched && !game.home_matched ? 'Both Teams' : 
                             !game.away_matched ? 'Away Team' : 'Home Team'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <Alert className="mt-3 border-blue-200 bg-blue-50">
                      <AlertDescription className="text-blue-800 text-xs">
                        These games could not be matched because the team names in NFLVerse don't match your database.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button onClick={handleClose} variant={isSuccess ? "default" : "outline"}>
              {isSuccess ? 'Done' : 'Close'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
