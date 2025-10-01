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

interface OwnershipImportResponse {
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
      ownership: number
    }
    match_confidence: string
    possible_matches?: Array<{
      name: string
      position: string
      team: string
    }>
  }>
}

interface OwnershipImportResultDialogProps {
  isOpen: boolean
  onClose: () => void
  result?: OwnershipImportResponse
  error?: string
  filename: string
  week: string
  source: string
}

export function OwnershipImportResultDialog({
  isOpen,
  onClose,
  result,
  error,
  filename,
  week,
  source
}: OwnershipImportResultDialogProps) {
  

  const isSuccess = !error && result
  const hasWarnings = result && (result.failed_matches > 0 || result.errors.length > 0)

  const handleClose = () => {
    onClose()
  }

  const copyResultsToClipboard = () => {
    if (!result) return
    
    const summary = `Ownership Import Summary - ${filename}
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
      <DialogContent className="sm:max-w-md ml-auto mr-8">
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

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isSuccess && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>{filename}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{week}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Tag className="w-4 h-4" />
              <span>{source}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">Total Processed</span>
                  </div>
                  <div className="text-2xl font-bold">{result.total_processed}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">Successful</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">{result.successful_matches}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium">Failed</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600">{result.failed_matches}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium">Created</span>
                  </div>
                  <div className="text-2xl font-bold">{result.projections_created}</div>
                </CardContent>
              </Card>
            </div>

            {result.projections_updated > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium">Updated</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">{result.projections_updated}</div>
                </CardContent>
              </Card>
            )}

            {result.player_pool_updated > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium">Player Pool Updated</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">{result.player_pool_updated}</div>
                </CardContent>
              </Card>
            )}

            {hasWarnings && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Import completed with warnings. Check the details below.
                </AlertDescription>
              </Alert>
            )}

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Errors:</h4>
                <div className="space-y-1">
                  {result.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.unmatched_players.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Unmatched Players ({result.unmatched_players.length}):</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {result.unmatched_players.map((player, index) => (
                    <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                      <div className="font-medium">{player.csv_data.name}</div>
                      <div className="text-muted-foreground">
                        Ownership: {player.csv_data.ownership}% | Confidence: {player.match_confidence}
                      </div>
                      {player.possible_matches && player.possible_matches.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Possible matches: {player.possible_matches.map(m => m.name).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={copyResultsToClipboard} variant="outline" size="sm">
                Copy Results
              </Button>
              <Button onClick={handleClose} size="sm">
                Close
              </Button>
            </div>
          </div>
        )}

        {!isSuccess && !error && (
          <div className="text-center py-4">
            <p className="text-muted-foreground">No result data available</p>
            <Button onClick={handleClose} className="mt-2" size="sm">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
