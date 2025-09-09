"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { API_CONFIG, buildApiUrl } from "@/config/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Calendar, TrendingUp, TrendingDown, DollarSign, Target, Trophy, Filter, ArrowUpDown, Eye, Download } from "lucide-react";

type SortOrder = "asc" | "desc";

interface ContestRow {
  entry_key: number | null;
  contest_id: number | null;
  week_id: number | null;
  week_number?: number | null;
  year?: number | null;
  sport: string | null;
  game_type: string | null;
  contest_type: string | null;
  lineup_id: string | null;
  lineup_name?: string | null;
  contest_description: string | null;
  contest_opponent: string | null;
  contest_date_utc: string | null;
  contest_place: number | null;
  contest_points: number | null;
  winnings_non_ticket: number;
  winnings_ticket: number;
  contest_entries: number | null;
  places_paid: number | null;
  entry_fee_usd: number;
  prize_pool_usd: number;
  net_profit_usd: number;
  result?: boolean;
}

// Dynamic options will be fetched from API

export default function ScoreboardPage() {
  const [allContests, setAllContests] = useState<ContestRow[]>([]);
  const [weeks, setWeeks] = useState<{ id: number; week_number: number; year: number; status: string }[]>([]);
  const [contestTypes, setContestTypes] = useState<string[]>([]);
  const [submittedLineups, setSubmittedLineups] = useState<{ id: string; name: string; week_id: number }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [weekFilter, setWeekFilter] = useState<string>("current");
  const [contestTypeFilter, setContestTypeFilter] = useState<string>("all");
  const [lineupFilter, setLineupFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("contest_date_utc");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [opponentFilter, setOpponentFilter] = useState<string>("all");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [feeMinSel, setFeeMinSel] = useState<string>("none");
  const [feeMaxSel, setFeeMaxSel] = useState<string>("none");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [contestsRes, weeksRes, contestTypesRes] = await Promise.all([
          fetch(buildApiUrl("/api/contests")),
          fetch(buildApiUrl("/api/weeks")),
          fetch(buildApiUrl("/api/contests/contest-types")),
        ]);
        if (!contestsRes.ok) {
          const err = await contestsRes.json().catch(() => ({}));
          throw new Error(err.detail || "Failed to load contests");
        }
        if (!weeksRes.ok) {
          const err = await weeksRes.json().catch(() => ({}));
          throw new Error(err.detail || "Failed to load weeks");
        }
        if (!contestTypesRes.ok) {
          const err = await contestTypesRes.json().catch(() => ({}));
          throw new Error(err.detail || "Failed to load contest types");
        }
        const contestsData = await contestsRes.json();
        const weeksData = await weeksRes.json();
        const contestTypesData = await contestTypesRes.json();
        setAllContests(contestsData.contests || []);
        setWeeks(weeksData.weeks || []);
        setContestTypes(contestTypesData.contest_types || []);
      } catch (e: any) {
        setError(e.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Load submitted lineups for the selected week
  useEffect(() => {
    async function loadLineups() {
      try {
        let weekId: number | undefined = undefined;
        const active = weeks.find(w => w.status === "Active");
        if (weekFilter === "current") {
          if (active) weekId = active.id;
        } else if (weekFilter !== "all") {
          const num = parseInt(weekFilter.replace("week-", ""), 10);
          const wk = weeks.find(w => w.week_number === num);
          if (wk) weekId = wk.id;
        }
        const base = `${API_CONFIG.BASE_URL}/api/lineups`;
        const params = new URLSearchParams();
        if (weekId) params.set("week_id", String(weekId));
        params.set("status", "submitted");
        const url = `${base}/?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) {
          setSubmittedLineups([]);
          return;
        }
        const data = await res.json();
        const arr = (data.lineups || []).map((l: any) => ({ id: l.id, name: l.name, week_id: l.week_id }));
        setSubmittedLineups(arr);
      } catch (err) {
        setSubmittedLineups([]);
      }
    }
    if (weeks.length) loadLineups();
  }, [weeks, weekFilter]);

  const lineupOptions = useMemo(() => {
    return [{ value: "all", label: "All Lineups" }, ...submittedLineups.map(l => ({ value: l.name, label: l.name }))];
  }, [submittedLineups]);

  const contestTypeOptions = useMemo(() => {
    return [{ value: "all", label: "All Contest Types" }, ...contestTypes.map(ct => ({ value: ct, label: ct }))];
  }, [contestTypes]);

  const resultOptions = [
    { value: "all", label: "All" },
    { value: "1", label: "Win" },
    { value: "0", label: "Loss" }
  ];

  const opponentOptions = useMemo(() => {
    const opponents = Array.from(
      new Set(
        allContests
          .map(c => (c.contest_opponent || "").trim())
          .filter(v => v.length > 0)
      )
    ) as string[];
    opponents.sort((a, b) => a.localeCompare(b));
    return [{ value: "all", label: "All Opponents" }, ...opponents.map(o => ({ value: o, label: o }))];
  }, [allContests]);

  const feeOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        allContests
          .map(c => Number(c.entry_fee_usd ?? 0))
          .filter(v => Number.isFinite(v))
      )
    ).sort((a, b) => a - b);
    return values;
  }, [allContests]);

  const filteredContests = useMemo(() => {
    let filtered = [...allContests];

    if (weekFilter === "current") {
      const active = weeks.find(w => w.status === "Active");
      if (active) {
        filtered = allContests.filter(c => c.week_number === active.week_number && c.year === active.year);
      }
    } else if (weekFilter !== "all") {
      const num = parseInt(weekFilter.replace("week-", ""), 10);
      filtered = allContests.filter(c => (c.week_number ?? -1) === num);
    }

    if (contestTypeFilter !== "all") {
      filtered = filtered.filter(c => c.contest_type === contestTypeFilter);
    }
    if (lineupFilter !== "all") {
      filtered = filtered.filter(c => c.lineup_name === lineupFilter);
    }

    if (opponentFilter !== "all") {
      filtered = filtered.filter(c => (c.contest_opponent || "") === opponentFilter);
    }

    if (resultFilter !== "all") {
      const targetResult = resultFilter === "1";
      filtered = filtered.filter(c => Boolean(c.result) === targetResult);
    }

    const min = feeMinSel !== "none" ? parseFloat(feeMinSel) : undefined;
    const max = feeMaxSel !== "none" ? parseFloat(feeMaxSel) : undefined;
    if (min !== undefined) filtered = filtered.filter(c => Number(c.entry_fee_usd ?? 0) >= min);
    if (max !== undefined) filtered = filtered.filter(c => Number(c.entry_fee_usd ?? 0) <= max);

    filtered.sort((a: any, b: any) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
      return sortOrder === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

    return filtered;
  }, [allContests, weekFilter, contestTypeFilter, lineupFilter, opponentFilter, resultFilter, feeMinSel, feeMaxSel, sortBy, sortOrder]);

  const metrics = useMemo(() => {
    const totalEntries = filteredContests.length;
    const totalFeesEntered = filteredContests.reduce((sum, c) => sum + (c.entry_fee_usd || 0), 0);
    const totalWinnings = filteredContests.reduce((sum, c) => sum + (c.winnings_non_ticket || 0) + (c.winnings_ticket || 0), 0);
    const totalProfit = filteredContests.reduce((sum, c) => sum + (c.net_profit_usd || 0), 0);
    const roi = totalFeesEntered > 0 ? (totalProfit / totalFeesEntered) * 100 : 0;
    const winRate = totalEntries > 0 ? (filteredContests.filter(c => (c.winnings_non_ticket || 0) + (c.winnings_ticket || 0) > 0).length / totalEntries) * 100 : 0;
    const wins = filteredContests.reduce((sum, c) => sum + (c.result ? 1 : 0), 0);
    const avgPlace = totalEntries > 0 ? filteredContests.reduce((sum, c) => sum + (c.contest_place || 0), 0) / totalEntries : 0;
    return { totalEntries, totalFeesEntered, totalWinnings, totalProfit, roi, winRate, wins, avgPlace };
  }, [filteredContests]);

  const profitChartData = useMemo(() => {
    // Group by week_number
    const byWeek = new Map<string, { weekLabel: string; profit: number }>();
    for (const c of allContests) {
      const wk = `W${c.week_number ?? "?"}`;
      const prev = byWeek.get(wk) || { weekLabel: wk, profit: 0 };
      prev.profit += c.net_profit_usd || 0;
      byWeek.set(wk, prev);
    }
    const rows = Array.from(byWeek.values()).sort((a, b) => a.weekLabel.localeCompare(b.weekLabel));
    let cum = 0;
    return rows.map(r => ({ week: r.weekLabel, profit: r.profit, cumulativeProfit: (cum += r.profit) }));
  }, [allContests]);

  const entryTypeBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of filteredContests) {
      const key = c.game_type || "Unknown";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const colors = ["#3b82f6", "#10b981", "#a855f7", "#f59e0b", "#ef4444"]; // shadcn-ish palette
    return Array.from(counts.entries()).map(([name, value], idx) => ({ name, value, color: colors[idx % colors.length] }));
  }, [filteredContests]);

  const getPlacementColor = (place: number, placesPaid: number) => {
    if (place <= placesPaid) return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
    return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(amount || 0);

  const handleSort = (column: string) => {
    if (sortBy === column) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else { setSortBy(column); setSortOrder("desc"); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2>Scoreboard</h2>
          <p className="text-muted-foreground">Track your DFS contest performance and analyze your results</p>
        </div>
        <div className="flex gap-2" />
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          <Select value={weekFilter} onValueChange={setWeekFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Week" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Week</SelectItem>
              <SelectItem value="all">All Weeks</SelectItem>
              {weeks.map(w => (
                <SelectItem key={w.id} value={`week-${w.week_number}`}>{`Week ${w.week_number}, ${w.year}`}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={contestTypeFilter} onValueChange={setContestTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Contest Type" />
            </SelectTrigger>
            <SelectContent>
              {contestTypeOptions.map(ct => (
                <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={lineupFilter} onValueChange={setLineupFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Lineup" />
            </SelectTrigger>
            <SelectContent>
              {lineupOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={opponentFilter} onValueChange={setOpponentFilter}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Opponent" />
            </SelectTrigger>
            <SelectContent>
              {opponentOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={resultFilter} onValueChange={setResultFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Result" />
            </SelectTrigger>
            <SelectContent>
              {resultOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Entry Fee:</span>
            <Select value={feeMinSel} onValueChange={setFeeMinSel}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Min" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Min</SelectItem>
                {feeOptions.map((v) => (
                  <SelectItem key={`fee-min-${v}`} value={String(v)}>{formatCurrency(v)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">-</span>
            <Select value={feeMaxSel} onValueChange={setFeeMaxSel}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Max" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Max</SelectItem>
                {feeOptions.map((v) => (
                  <SelectItem key={`fee-max-${v}`} value={String(v)}>{formatCurrency(v)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1" />
          <div className="text-sm text-muted-foreground">{filteredContests.length} {filteredContests.length === 1 ? "contest" : "contests"}</div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-blue-700 dark:text-blue-300">Total Entries</CardDescription>
              <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-3xl text-blue-900 dark:text-blue-100">{metrics.totalEntries}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-purple-700 dark:text-purple-300">Fees Paid</CardDescription>
              <DollarSign className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <CardTitle className="text-3xl text-purple-900 dark:text-purple-100">{formatCurrency(metrics.totalFeesEntered)}</CardTitle>
          </CardHeader>
        </Card>

        <Card className={`bg-gradient-to-br ${metrics.totalProfit >= 0 ? "from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800" : "from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-red-200 dark:border-red-800"}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className={metrics.totalProfit >= 0 ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}>Profit/Loss</CardDescription>
              {metrics.totalProfit >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
              )}
            </div>
            <CardTitle className={`text-3xl ${metrics.totalProfit >= 0 ? "text-green-900 dark:text-green-100" : "text-red-900 dark:text-red-100"}`}>{formatCurrency(metrics.totalProfit)}</CardTitle>
          </CardHeader>
        </Card>

        <Card className={`bg-gradient-to-br ${metrics.roi >= 0 ? "from-emerald-50 to-emerald-100 dark:from-emerald-950/20 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800" : "from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800"}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className={metrics.roi >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-orange-700 dark:text-orange-300"}>ROI</CardDescription>
              <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <CardTitle className={`text-3xl ${metrics.roi >= 0 ? "text-emerald-900 dark:text-emerald-100" : "text-orange-900 dark:text-orange-100"}`}>{metrics.roi.toFixed(1)}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Wins</CardDescription>
            <CardTitle className="text-2xl">{metrics.wins}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cash Rate</CardDescription>
            <CardTitle className="text-2xl">{metrics.winRate.toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={metrics.winRate} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Placement</CardDescription>
            <CardTitle className="text-2xl">#{metrics.avgPlace.toFixed(0)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Contest Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cumulative Profit by Week</CardTitle>
                <CardDescription>Track your profit progression over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={profitChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="week" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }} />
                      <Line type="monotone" dataKey="cumulativeProfit" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contest Type Distribution</CardTitle>
                <CardDescription>Breakdown of your contest entries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={entryTypeBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                        {entryTypeBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center space-x-4 mt-4">
                  {entryTypeBreakdown.map((entry, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-sm">{entry.name}: {entry.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contest Performance Details</CardTitle>
              <CardDescription>Detailed breakdown of all your contest entries with sortable columns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('contest_description')} className="h-auto p-0 font-medium">
                          Contest Name
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('game_type')} className="h-auto p-0 font-medium">
                          Game Type
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('entry_fee_usd')} className="h-auto p-0 font-medium">
                          Entry Fee
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('contest_points')} className="h-auto p-0 font-medium">
                          Points
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('contest_place')} className="h-auto p-0 font-medium">
                          Placement
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('net_profit_usd')} className="h-auto p-0 font-medium">
                          Profit/Loss
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('lineup_name')} className="h-auto p-0 font-medium">
                          Lineup Used
                          <ArrowUpDown className="ml-2 h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContests.map((c) => {
                      const winnings = (c.winnings_non_ticket || 0) + (c.winnings_ticket || 0);
                      return (
                        <TableRow key={`${c.entry_key}-${c.contest_id}`}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{c.contest_description || "—"}</div>
                              <div className="text-xs text-muted-foreground">{c.contest_date_utc ? new Date(c.contest_date_utc).toLocaleString() : "—"}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{c.game_type || "—"}</Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(c.entry_fee_usd || 0)}</TableCell>
                          <TableCell>
                            <div className="font-medium">{(c.contest_points ?? 0).toFixed(1)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant="outline" className={getPlacementColor(c.contest_place || 0, c.places_paid || 0)}>#{c.contest_place ?? "—"}</Badge>
                              <div className="text-xs text-muted-foreground">of {(c.contest_entries || 0).toLocaleString()}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={c.net_profit_usd > 0 ? 'text-green-600 dark:text-green-400' : c.net_profit_usd < 0 ? 'text-red-600 dark:text-red-400' : ''}>{formatCurrency(c.net_profit_usd || 0)}</span>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{c.lineup_name || "—"}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm"><Eye className="w-3 h-3" /></Button>
                              <Button variant="ghost" size="sm"><Download className="w-3 h-3" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {!loading && !error && filteredContests.length === 0 && (
        <Card className="p-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3>No contests found</h3>
              <p className="text-muted-foreground">No contests match your current filters. Try adjusting your filter criteria.</p>
            </div>
          </div>
        </Card>
      )}

      {loading && (
        <Card className="p-8">
          <div className="py-8 text-center text-muted-foreground">Loading…</div>
        </Card>
      )}

      {error && (
        <Card className="p-8">
          <div className="py-8 text-center text-red-600">{error}</div>
        </Card>
      )}
    </div>
  );
}


