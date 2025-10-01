import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, AlertTriangle, FileText, Calendar, Database, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';

interface ImportResult {
  status: string;
  nflverse_stats: {
    exact: number;
    high: number;
    medium: number;
    low: number;
    none: number;
  };
  total_nflverse_players: number;
  auto_imported?: {
    total_processed: number;
    successful_matches: number;
    actuals_created: number;
    actuals_updated: number;
  };
  matched_players?: Array<{
    name: string;
    team: string;
    position: string;
    match_confidence: string;
  }>;
  unmatched_players?: Array<{
    name: string;
    team: string;
    position: string;
  }>;
  message?: string;
}

interface PlayerActualsImportResultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  result: ImportResult | null;
  error: string | null;
  week: string;
}

export function PlayerActualsImportResultDialog({
  isOpen,
  onClose,
  result,
  error,
  week
}: PlayerActualsImportResultDialogProps) {
  
  const isSuccess = !error && result && result.status === 'success';
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [showLowConfidence, setShowLowConfidence] = useState(false);

  // Get low confidence and unmatched players
  const lowConfidencePlayers = result?.matched_players?.filter(
    p => ['low', 'medium'].includes(p.match_confidence)
  ) || [];
  const unmatchedPlayers = result?.unmatched_players || [];
  const hasIssues = lowConfidencePlayers.length > 0 || unmatchedPlayers.length > 0;

  const handleClose = () => {
    setShowUnmatched(false);
    setShowLowConfidence(false);
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
            <span>NFLVerse Import</span>
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
                  Successfully imported player actuals from NFLVerse!
                </AlertDescription>
              </Alert>

              {/* Import Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">Players Found</span>
                    </div>
                    <div className="text-2xl font-bold">{result.total_nflverse_players}</div>
                  </CardContent>
                </Card>

                {result.auto_imported && (
                  <>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium">Matched</span>
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          {result.auto_imported.successful_matches}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-orange-500" />
                          <span className="text-sm font-medium">Created</span>
                        </div>
                        <div className="text-2xl font-bold text-orange-600">
                          {result.auto_imported.actuals_created}
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
                          {result.auto_imported.actuals_updated}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              {/* Match Quality */}
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm font-medium mb-3">Match Quality</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Exact Match:</span>
                      <span className="font-semibold text-green-600">{result.nflverse_stats.exact}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">High Confidence:</span>
                      <span className="font-semibold text-blue-600">{result.nflverse_stats.high}</span>
                    </div>
                    {result.nflverse_stats.medium > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Medium Confidence:</span>
                        <button
                          onClick={() => setShowLowConfidence(!showLowConfidence)}
                          className="font-semibold text-yellow-600 hover:underline"
                        >
                          {result.nflverse_stats.medium}
                        </button>
                      </div>
                    )}
                    {result.nflverse_stats.low > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Low Confidence:</span>
                        <button
                          onClick={() => setShowLowConfidence(!showLowConfidence)}
                          className="font-semibold text-orange-600 hover:underline"
                        >
                          {result.nflverse_stats.low}
                        </button>
                      </div>
                    )}
                    {result.nflverse_stats.none > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Unmatched:</span>
                        <button
                          onClick={() => setShowUnmatched(!showUnmatched)}
                          className="font-semibold text-red-600 hover:underline"
                        >
                          {result.nflverse_stats.none}
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Warning for issues */}
              {hasIssues && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    <div className="font-medium">Matching Issues Detected</div>
                    <div className="text-sm mt-1">
                      {lowConfidencePlayers.length > 0 && (
                        <div>{lowConfidencePlayers.length} low/medium confidence match(es)</div>
                      )}
                      {unmatchedPlayers.length > 0 && (
                        <div>{unmatchedPlayers.length} unmatched player(s)</div>
                      )}
                      <div className="mt-1">Click the numbers above to view details.</div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Low Confidence Players List */}
              {showLowConfidence && lowConfidencePlayers.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium mb-3">Low/Medium Confidence Matches</div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {lowConfidencePlayers.map((player, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm p-2 bg-yellow-50 rounded">
                          <div>
                            <span className="font-medium">{player.name}</span>
                            <span className="text-muted-foreground ml-2">
                              {player.team} - {player.position}
                            </span>
                          </div>
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            {player.match_confidence}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Unmatched Players List */}
              {showUnmatched && unmatchedPlayers.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium mb-3">Unmatched Players</div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {unmatchedPlayers.map((player, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm p-2 bg-red-50 rounded">
                          <div>
                            <span className="font-medium">{player.name}</span>
                            <span className="text-muted-foreground ml-2">
                              {player.team} - {player.position}
                            </span>
                          </div>
                          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                            No Match
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <Alert className="mt-3 border-blue-200 bg-blue-50">
                      <AlertDescription className="text-blue-800 text-xs">
                        These players may not exist in your DraftKings database or have different names/teams.
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

