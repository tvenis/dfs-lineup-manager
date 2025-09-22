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

interface ContestImportResponse {
  total_processed: number
  created: number
  updated: number
  errors: string[]
}

interface ContestImportResultDialogProps {
  isOpen: boolean
  onClose: () => void
  result?: ContestImportResponse
  error?: string
  filename: string
  week: string
}

export function ContestImportResultDialog({
  isOpen,
  onClose,
  result,
  error,
  filename,
  week
}: ContestImportResultDialogProps) {
  if (!isOpen) return null

  const isSuccess = !error && result
  const hasWarnings = result && (result.errors.length > 0)

  const handleClose = () => {
    onClose()
  }

  const copyResultsToClipboard = () => {
    if (!result) return
    
    const summary = `Contest Import Summary - ${filename}
Week: ${week}
Total Processed: ${result.total_processed}
Created: ${result.created}
Updated: ${result.updated}
${result.errors.length > 0 ? `Errors: ${result.errors.join(', ')}` : ''}`

    navigator.clipboard.writeText(summary)
  }

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

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isSuccess && (
          <div className="space-y-4">
            {/* File info card */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{filename}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {week}
                    </div>
                    <div className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Contest Import
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold text-gray-900">{result.total_processed}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold text-green-600">{result.updated}</div>
                  <div className="text-sm text-muted-foreground">Updated</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <UserPlus className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold text-blue-600">{result.created}</div>
                  <div className="text-sm text-muted-foreground">Created</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <Database className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                  <div className="text-2xl font-bold text-purple-600">{result.total_processed}</div>
                  <div className="text-sm text-muted-foreground">Processed</div>
                </CardContent>
              </Card>
            </div>

            {/* Errors section */}
            {hasWarnings && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>Import completed with {result.errors.length} error(s):</p>
                    <div className="max-h-32 overflow-y-auto">
                      {result.errors.map((error, index) => (
                        <div key={index} className="text-sm text-muted-foreground">
                          • {error}
                        </div>
                      ))}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={copyResultsToClipboard} className="flex-1">
                Copy Summary
              </Button>
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Close
              </Button>
              <Button onClick={handleClose} className="flex-1">
                Import Another
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
