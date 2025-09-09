"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Alert, AlertDescription } from './ui/alert'
import { FileText, RefreshCw, Upload } from 'lucide-react'

interface Week {
  id: number
  label: string
  week_number: number
  year: number
  status: string
}

interface StagedContestRow {
  contest_id: number
  week_id: number
  sport_code: string
  game_type_code: string
  lineup_id?: string | null
  contest_description?: string
  contest_opponent?: string
  contest_date_utc: string
  contest_place?: number
  contest_points?: number
  winnings_non_ticket?: number
  winnings_ticket?: number
  contest_entries: number
  places_paid: number
  entry_fee_usd: number
  prize_pool_usd: number
}

export function ImportContests() {
  const router = useRouter()
  const [weeks, setWeeks] = useState<Week[]>([])
  const [selectedWeek, setSelectedWeek] = useState<string>('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [parsedCount, setParsedCount] = useState<number>(0)
  const [isParsing, setIsParsing] = useState(false)

  useEffect(() => {
    fetchWeeks()
  }, [])

  const fetchWeeks = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/contests/weeks')
      if (response.ok) {
        const data = await response.json()
        setWeeks(data.weeks)
        if (data.weeks.length > 0) {
          setSelectedWeek(data.weeks[0].id.toString())
        }
      }
    } catch (e) {
      console.error('Failed to fetch weeks', e)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
    }
  }

  const handleProcess = async () => {
    if (!csvFile || !selectedWeek) return
    setIsParsing(true)
    try {
      const form = new FormData()
      form.append('file', csvFile)
      form.append('week_id', selectedWeek)

      const res = await fetch('http://localhost:8000/api/contests/parse', {
        method: 'POST',
        body: form,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Failed to parse contests CSV')
      }
      const data = await res.json()
      setParsedCount(data.count)

      sessionStorage.setItem('contestImportReview', JSON.stringify({
        week_id: selectedWeek,
        filename: csvFile.name,
        rows: data.staged,
      }))
      router.push('/import/contests/review')
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Failed to parse CSV')
    } finally {
      setIsParsing(false)
    }
  }

  const getWeekLabel = (week: Week) => `Week ${week.week_number} (${week.year}) - ${week.status}`

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Import Contests
          </CardTitle>
          <CardDescription>
            Import DraftKings contest results from CSV, review all rows, and save
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Week Selection */}
          <div className="space-y-2">
            <Label>Target Week</Label>
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger>
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent>
                {weeks.map((w) => (
                  <SelectItem key={w.id} value={w.id.toString()}>
                    {getWeekLabel(w)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Selection */}
          <div className="space-y-2">
            <Label>CSV File</Label>
            <Input type="file" accept=".csv" onChange={handleFileSelect} className="cursor-pointer" />
            {csvFile && (
              <div className="text-sm text-muted-foreground">Selected: {csvFile.name}</div>
            )}
          </div>

          <Alert>
            <AlertDescription>
              Upload the DraftKings contest results CSV. All rows will be staged for review and editing before saving.
            </AlertDescription>
          </Alert>

          <Button onClick={handleProcess} disabled={!csvFile || !selectedWeek || isParsing} className="w-full gap-2">
            {isParsing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Parsing CSV...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Process & Review Contests
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}


