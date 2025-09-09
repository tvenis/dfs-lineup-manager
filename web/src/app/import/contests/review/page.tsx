"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, RefreshCw, Upload } from 'lucide-react'

interface Row {
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

export default function ContestReviewPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [weekId, setWeekId] = useState<string>('')
  const [filename, setFilename] = useState<string>('contests.csv')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('contestImportReview')
    if (!stored) {
      router.push('/import')
      return
    }
    const data = JSON.parse(stored)
    setRows(data.rows || [])
    setWeekId(data.week_id?.toString() || '')
    setFilename(data.filename || 'contests.csv')
  }, [router])

  const total = useMemo(() => rows.length, [rows])

  const updateRow = (i: number, key: keyof Row, value: any) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: value } : r))
  }

  const saveAll = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('http://localhost:8000/api/contests/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_id: weekId, filename, rows })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Failed to save contests')
      }
      const result = await res.json()
      // Clear staged data
      sessionStorage.removeItem('contestImportReview')
      // Redirect back to import with success
      router.push('/import?success=true')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push('/import')} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Import
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Review Contests</h1>
          <p className="text-muted-foreground">Edit any fields, then save all rows to the database.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staged Rows</CardTitle>
          <CardDescription>{total} rows staged from {filename}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto border rounded-md max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contest ID</TableHead>
                  <TableHead>Sport</TableHead>
                  <TableHead>Game Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Opponent</TableHead>
                  <TableHead>Date (UTC)</TableHead>
                  <TableHead>Place</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Entries</TableHead>
                  <TableHead>Places Paid</TableHead>
                  <TableHead>Entry Fee</TableHead>
                  <TableHead>Prize Pool</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={`${r.contest_id}-${i}`}>
                    <TableCell className="min-w-28">{r.contest_id}</TableCell>
                    <TableCell className="min-w-24">
                      <Input value={r.sport_code} onChange={e => updateRow(i, 'sport_code', e.target.value)} />
                    </TableCell>
                    <TableCell className="min-w-28">
                      <Input value={r.game_type_code} onChange={e => updateRow(i, 'game_type_code', e.target.value)} />
                    </TableCell>
                    <TableCell className="min-w-64">
                      <Input value={r.contest_description || ''} onChange={e => updateRow(i, 'contest_description', e.target.value)} />
                    </TableCell>
                    <TableCell className="min-w-44">
                      <Input value={r.contest_opponent || ''} onChange={e => updateRow(i, 'contest_opponent', e.target.value)} />
                    </TableCell>
                    <TableCell className="min-w-56">
                      <Input value={r.contest_date_utc} onChange={e => updateRow(i, 'contest_date_utc', e.target.value)} />
                    </TableCell>
                    <TableCell className="min-w-20">
                      <Input type="number" value={r.contest_place ?? 0} onChange={e => updateRow(i, 'contest_place', Number(e.target.value))} />
                    </TableCell>
                    <TableCell className="min-w-24">
                      <Input type="number" value={r.contest_points ?? 0} step="0.01" onChange={e => updateRow(i, 'contest_points', Number(e.target.value))} />
                    </TableCell>
                    <TableCell className="min-w-24">
                      <Input type="number" value={r.contest_entries} onChange={e => updateRow(i, 'contest_entries', Number(e.target.value))} />
                    </TableCell>
                    <TableCell className="min-w-24">
                      <Input type="number" value={r.places_paid} onChange={e => updateRow(i, 'places_paid', Number(e.target.value))} />
                    </TableCell>
                    <TableCell className="min-w-28">
                      <Input type="number" step="0.01" value={r.entry_fee_usd} onChange={e => updateRow(i, 'entry_fee_usd', Number(e.target.value))} />
                    </TableCell>
                    <TableCell className="min-w-28">
                      <Input type="number" step="0.01" value={r.prize_pool_usd} onChange={e => updateRow(i, 'prize_pool_usd', Number(e.target.value))} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveAll} disabled={isSaving} className="gap-2">
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Save All ({total})
            </>
          )}
        </Button>
      </div>
    </div>
  )
}


