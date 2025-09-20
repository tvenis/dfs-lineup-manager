import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Users, 
  UserPlus, 
  RefreshCw, 
  Database,
  FileText,
  Calendar,
  Tag
} from 'lucide-react'

interface ProjectionImportResponse {
  total_processed: number
  successful_matches: number
  failed_matches: number
  projections_created: number
  projections_updated: number
  player_pool_updated: number
  errors: string[]
  unmatched_players: Array<{
    csv_data: {
      name: string
      position: string
      team?: string
      pprProjections?: number
    }
    match_confidence: string
    possible_matches?: Array<{
      name: string
      position: string
      team: string
    }>
  }>
}

interface ImportResultDialogProps {
  isOpen: boolean
  onClose: () => void
  result?: ProjectionImportResponse
  error?: string
  filename: string
  week: string
  source: string
}

export function ImportResultDialog({
  isOpen,
  onClose,
  result,
  error,
  filename,
  week,
  source
}: ImportResultDialogProps) {
  if (!isOpen) return null

  const isSuccess = !error && result
  const hasWarnings = result && (result.failed_matches > 0 || result.errors.length > 0)

  const handleClose = () => {
    onClose()
  }

  const copyResultsToClipboard = () => {
    if (!result) return
    
    const summary = `Import Summary - ${filename}
Week: ${week}
Source: ${source}
Total Processed: ${result.total_processed}
Successful Matches: ${result.successful_matches}
Failed Matches: ${result.failed_matches}
Projections Created: ${result.projections_created}
Projections Updated: ${result.projections_updated}
Player Pool Updated: ${result.player_pool_updated}
${result.errors.length > 0 ? `Errors: ${result.errors.join(', ')}` : ''}
${result.unmatched_players.length > 0 ? `Unmatched Players: ${result.unmatched_players.length}` : ''}`

    navigator.clipboard.writeText(summary)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSuccess ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            {isSuccess ? 'Import Complete' : 'Import Failed'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">{filename}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{week}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Tag className="w-4 h-4" />
                  <span>{source}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="font-medium">Import Failed</div>
                <div className="text-sm mt-1">{error}</div>
              </AlertDescription>
            </Alert>
          )}

          {/* Success Summary */}
          {result && (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold">{result.total_processed}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="text-2xl font-bold text-green-600">{result.successful_matches}</div>
                    <div className="text-sm text-muted-foreground">Matched</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <UserPlus className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-blue-600">{result.projections_created}</div>
                    <div className="text-sm text-muted-foreground">Created</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <RefreshCw className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="text-2xl font-bold text-orange-600">{result.projections_updated}</div>
                    <div className="text-sm text-muted-foreground">Updated</div>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Stats */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Player Pool Updated</span>
                    </div>
                    <Badge variant="outline">{result.player_pool_updated}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Warnings Section */}
              {hasWarnings && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    <div className="font-medium">Import Completed with Warnings</div>
                    {result.failed_matches > 0 && (
                      <div className="text-sm mt-1">
                        {result.failed_matches} player{result.failed_matches !== 1 ? 's' : ''} could not be matched
                      </div>
                    )}
                    {result.errors.length > 0 && (
                      <div className="text-sm mt-1">
                        {result.errors.length} error{result.errors.length !== 1 ? 's' : ''} encountered
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Unmatched Players */}
              {result.unmatched_players.length > 0 && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <span className="font-medium text-sm">Unmatched Players ({result.unmatched_players.length})</span>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {result.unmatched_players.slice(0, 10).map((player, index) => (
                        <div key={index} className="flex items-center justify-between text-xs p-2 bg-muted rounded">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{player.csv_data.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {player.csv_data.position}
                            </Badge>
                            {player.csv_data.team && (
                              <Badge variant="outline" className="text-xs">
                                {player.csv_data.team}
                              </Badge>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {player.match_confidence.replace('_', ' ')}
                          </Badge>
                        </div>
                      ))}
                      {result.unmatched_players.length > 10 && (
                        <div className="text-xs text-muted-foreground text-center pt-2">
                          ... and {result.unmatched_players.length - 10} more
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Errors */}
              {result.errors.length > 0 && (
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="font-medium text-sm">Errors ({result.errors.length})</span>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {result.errors.map((error, index) => (
                        <div key={index} className="text-xs p-2 bg-red-50 text-red-800 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <div>
              {result && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyResultsToClipboard}
                >
                  Copy Summary
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              {isSuccess && (
                <Button onClick={handleClose}>
                  Import Another
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
