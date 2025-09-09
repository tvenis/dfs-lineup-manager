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
  entry_key: number
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
  result?: number | boolean
}

export default function ContestReviewPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])
  const [weekId, setWeekId] = useState<string>('')
  const [filename, setFilename] = useState<string>('contests.csv')
  const [isSaving, setIsSaving] = useState(false)
  const [lineups, setLineups] = useState<{id: string, name: string}[]>([])

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

  useEffect(() => {
    const fetchLineups = async () => {
      if (!weekId) return
      try {
        const res = await fetch(`http://localhost:8000/api/lineups?week_id=${weekId}&limit=1000`)
        if (!res.ok) return
        const data = await res.json()
        const items = (data.lineups || []).map((l: any) => ({ id: l.id, name: l.name }))
        setLineups(items)
      } catch (e) {
        console.error('Failed to fetch lineups', e)
      }
    }
    fetchLineups()
  }, [weekId])

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
                  <TableHead>Entry Key</TableHead>
                  <TableHead>Contest ID</TableHead>
                  <TableHead>Sport</TableHead>
                  <TableHead>Game Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Opponent</TableHead>
                  <TableHead>Lineup</TableHead>
                  <TableHead>Entry Fee</TableHead>
                  <TableHead>Net Profit</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={`${r.entry_key}-${i}`}>
                    <TableCell className="min-w-28">{r.entry_key}</TableCell>
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
                    <TableCell className="min-w-64">
                      <Select value={r.lineup_id ?? 'none'} onValueChange={(v) => updateRow(i, 'lineup_id', v === 'none' ? null : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select lineup (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No lineup</SelectItem>
                          {lineups.map(l => (
                            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="min-w-28">
                      <Input type="number" step="0.01" value={r.entry_fee_usd} onChange={e => updateRow(i, 'entry_fee_usd', Number(e.target.value))} />
                    </TableCell>
                    <TableCell className="min-w-28">
                      {((r.winnings_non_ticket || 0) + (r.winnings_ticket || 0) - (r.entry_fee_usd || 0)).toFixed(2)}
                    </TableCell>
                    <TableCell className="min-w-20">
                      <input
                        type="checkbox"
                        checked={Boolean(r.result)}
                        onChange={(e) => updateRow(i, 'result', e.target.checked ? 1 : 0)}
                      />
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


