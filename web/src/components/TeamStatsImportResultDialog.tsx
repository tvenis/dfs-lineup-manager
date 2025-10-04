import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, AlertTriangle, FileText, Calendar, Database, TrendingUp, Shield } from 'lucide-react';
import { useState } from 'react';

interface ImportResult {
  status: string;
  nflverse_stats: {
    exact: number;
    none: number;
  };
  total_nflverse_teams: number;
  auto_imported?: {
    total_processed: number;
    successful_matches: number;
    stats_created: number;
    stats_updated: number;
  };
  matched_teams?: Array<{
    team_name: string;
    opponent_name: string;
    match_confidence: string;
    dk_defense_score: number;
  }>;
  unmatched_teams?: Array<{
    team: string;
    opponent_team: string;
    stats: any;
  }>;
  message?: string;
}

interface TeamStatsImportResultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  result: ImportResult | null;
  error: string | null;
  week: string;
}

export function TeamStatsImportResultDialog({
  isOpen,
  onClose,
  result,
  error,
  week
}: TeamStatsImportResultDialogProps) {
  
  const isSuccess = !error && result && result.status === 'success';
  const [showUnmatched, setShowUnmatched] = useState(false);

  // Get unmatched teams
  const unmatchedTeams = result?.unmatched_teams || [];
  const hasIssues = unmatchedTeams.length > 0;

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
            <Shield className="w-4 h-4" />
            <span>Team Stats Import</span>
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
                  Successfully imported team statistics from NFLVerse!
                </AlertDescription>
              </Alert>

              {/* Import Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">Teams Found</span>
                    </div>
                    <div className="text-2xl font-bold">{result.total_nflverse_teams}</div>
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
                          {result.auto_imported.stats_created}
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
                          {result.auto_imported.stats_updated}
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
                      {unmatchedTeams.length > 0 && (
                        <div>{unmatchedTeams.length} unmatched team(s)</div>
                      )}
                      <div className="mt-1">Click the number above to view details.</div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Unmatched Teams List */}
              {showUnmatched && unmatchedTeams.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium mb-3">Unmatched Teams</div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {unmatchedTeams.map((team, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm p-2 bg-red-50 rounded">
                          <div>
                            <span className="font-medium">{team.team}</span>
                            <span className="text-muted-foreground ml-2">
                              vs {team.opponent_team}
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
                        These teams may not exist in your database or have different abbreviations.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}

              {/* DK Defense Scores Preview */}
              {result.matched_teams && result.matched_teams.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium mb-3">DK Defense Scores (Sample)</div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {result.matched_teams.slice(0, 5).map((team, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm p-2 bg-blue-50 rounded">
                          <div>
                            <span className="font-medium">{team.team_name}</span>
                            <span className="text-muted-foreground ml-2">
                              vs {team.opponent_name}
                            </span>
                          </div>
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                            {team.dk_defense_score} pts
                          </Badge>
                        </div>
                      ))}
                      {result.matched_teams.length > 5 && (
                        <div className="text-xs text-muted-foreground text-center">
                          ... and {result.matched_teams.length - 5} more teams
                        </div>
                      )}
                    </div>
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
