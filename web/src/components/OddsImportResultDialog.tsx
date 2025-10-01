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
  Database,
  FileText,
  Calendar,
  Tag,
  Globe,
  TrendingUp
} from 'lucide-react'

interface OddsImportResponse {
  message: string
  events_processed?: number
  games_updated?: number
  odds_imported?: number
  participants_imported?: number
  player_props_imported?: number
  [key: string]: any
}

interface OddsImportResultDialogProps {
  isOpen: boolean
  onClose: () => void
  result: OddsImportResponse | null
  error: string | null
  endpoint: string
  week: string
}

export function OddsImportResultDialog({
  isOpen,
  onClose,
  result,
  error,
  endpoint,
  week
}: OddsImportResultDialogProps) {
  
  const isSuccess = !error && result
  
  const handleClose = () => {
    onClose()
  }

  const getEndpointLabel = () => {
    switch(endpoint) {
      case 'participants': return 'Participants Import'
      case 'events': return 'Events Import'
      case 'odds': return 'Odds Import'
      case 'player-props': return 'Player Props Import'
      default: return 'Odds-API Import'
    }
  }

  const copyResultsToClipboard = () => {
    if (!result) return
    
    const summary = `${getEndpointLabel()} - ${endpoint}
Week: ${week}
${result.message}
${JSON.stringify(result, null, 2)}`

    navigator.clipboard.writeText(summary)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSuccess ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>{getEndpointLabel()} - Success</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-500" />
                <span>{getEndpointLabel()} - Failed</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Week and Endpoint Info */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Week:</span>
              <Badge variant="outline">{week}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Endpoint:</span>
              <Badge variant="outline">{endpoint}</Badge>
            </div>
          </div>

          {/* Success Result */}
          {isSuccess && result && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {result.message || 'Import completed successfully!'}
                </AlertDescription>
              </Alert>

              {/* Import Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {result.events_processed !== undefined && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium">Events Processed</span>
                      </div>
                      <div className="text-2xl font-bold">{result.events_processed}</div>
                    </CardContent>
                  </Card>
                )}

                {result.games_updated !== undefined && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium">Games Updated</span>
                      </div>
                      <div className="text-2xl font-bold text-green-600">{result.games_updated}</div>
                    </CardContent>
                  </Card>
                )}

                {result.odds_imported !== undefined && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-medium">Odds Imported</span>
                      </div>
                      <div className="text-2xl font-bold">{result.odds_imported}</div>
                    </CardContent>
                  </Card>
                )}

                {result.participants_imported !== undefined && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium">Participants</span>
                      </div>
                      <div className="text-2xl font-bold">{result.participants_imported}</div>
                    </CardContent>
                  </Card>
                )}

                {result.player_props_imported !== undefined && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium">Player Props</span>
                      </div>
                      <div className="text-2xl font-bold">{result.player_props_imported}</div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Additional Details */}
              {Object.keys(result).length > 2 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm font-medium mb-2">Additional Details:</div>
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto max-h-40">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Error Result */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {isSuccess && (
              <Button 
                variant="outline" 
                onClick={copyResultsToClipboard}
              >
                Copy to Clipboard
              </Button>
            )}
            <Button onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

