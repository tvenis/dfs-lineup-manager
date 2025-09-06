"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { PlayerPropsResponse, PlayerPropBetWithMeta } from "@/types/prd";
import { PlayerService } from "@/lib/playerService";
import { ArrowUpDown, Loader2 } from "lucide-react";
import { Button } from "./ui/button";

type SortKey = keyof Pick<
  PlayerPropBetWithMeta,
  | "week_number"
  | "opponent"
  | "bookmaker"
  | "market"
  | "outcome_name"
  | "outcome_price"
  | "outcome_point"
  | "probability"
  | "updated"
>;

interface Props {
  playerId: number | string;
}

export default function PlayerProps({ playerId }: Props) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PlayerPropsResponse>({ props: [], total: 0 });

  const [weekFilter, setWeekFilter] = useState<string>("All Weeks");
  const [bookmakerFilter, setBookmakerFilter] = useState<string>("All Bookmakers");
  const [marketFilter, setMarketFilter] = useState<string>("All Markets");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("Over");

  const [sortKey, setSortKey] = useState<SortKey>("week_number");
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  useEffect(() => {
    const doFetch = async () => {
      try {
        setLoading(true);
        setError(null);
        // Fetch all props once; we'll filter/paginate client-side
        const resp = await PlayerService.getPlayerProps(Number(playerId));
        setData(resp);
      } catch (e: any) {
        setError(e?.message || "Failed to load props");
      } finally {
        setLoading(false);
      }
    };
    doFetch();
  }, [playerId]);

  // Default week to current active week when data is loaded
  useEffect(() => {
    const setDefaultWeek = async () => {
      try {
        const current = await PlayerService.getCurrentWeek();
        // Only set if the current week exists in data to avoid empty filter
        const hasWeek = data.props.some((p) => p.week_number === current.week_number);
        if (hasWeek) setWeekFilter(String(current.week_number));
      } catch {}
    };
    if (data.props.length > 0 && weekFilter === "All Weeks") {
      setDefaultWeek();
    }
  }, [data.props, weekFilter]);

  const weeks = useMemo(() => {
    const uniq = Array.from(new Set(data.props.map((p) => p.week_number))).sort((a, b) => a - b);
    return uniq;
  }, [data.props]);

  const bookmakers = useMemo(() => {
    return Array.from(new Set(data.props.map((p) => p.bookmaker).filter(Boolean))) as string[];
  }, [data.props]);

  const markets = useMemo(() => {
    return Array.from(new Set(data.props.map((p) => p.market).filter(Boolean))) as string[];
  }, [data.props]);

  const outcomes = useMemo(() => {
    return Array.from(new Set(data.props.map((p) => p.outcome_name).filter(Boolean))) as string[];
  }, [data.props]);

  // Ensure default outcome is "Over" when available; otherwise fallback to All Outcomes
  useEffect(() => {
    if (outcomeFilter === "Over" && outcomes.length > 0 && !outcomes.includes("Over")) {
      setOutcomeFilter("All Outcomes");
    }
    if (outcomeFilter === "All Outcomes" && outcomes.includes("Over")) {
      setOutcomeFilter("Over");
    }
  }, [outcomes]);

  const filteredRows = useMemo(() => {
    return data.props.filter((p) => {
      if (weekFilter !== "All Weeks" && String(p.week_number) !== weekFilter) return false;
      if (bookmakerFilter !== "All Bookmakers" && p.bookmaker !== bookmakerFilter) return false;
      if (marketFilter !== "All Markets" && p.market !== marketFilter) return false;
      if (outcomeFilter !== "All Outcomes" && p.outcome_name !== outcomeFilter) return false;
      return true;
    });
  }, [data.props, weekFilter, bookmakerFilter, marketFilter, outcomeFilter]);

  const sortedRows = useMemo(() => {
    const rows = [...filteredRows];
    rows.sort((a, b) => {
      const va = (a[sortKey] ?? "") as any;
      const vb = (b[sortKey] ?? "") as any;
      if (va === vb) return 0;
      if (va === null || va === undefined) return sortAsc ? 1 : -1;
      if (vb === null || vb === undefined) return sortAsc ? -1 : 1;
      if (typeof va === "number" && typeof vb === "number") return sortAsc ? va - vb : vb - va;
      return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return rows;
  }, [filteredRows, sortKey, sortAsc]);

  // Reset pagination when filters/sort change
  useEffect(() => {
    setPage(1);
  }, [weekFilter, bookmakerFilter, marketFilter, outcomeFilter, sortKey, sortAsc]);

  const totalRows = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page]);

  const setSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Player Props</CardTitle>
        <CardDescription>Betting odds and props data</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Select value={weekFilter} onValueChange={setWeekFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Weeks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Weeks">All Weeks</SelectItem>
              {weeks.map((w) => (
                <SelectItem key={w} value={String(w)}>
                  {`Week ${w}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={bookmakerFilter} onValueChange={setBookmakerFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Bookmakers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Bookmakers">All Bookmakers</SelectItem>
              {bookmakers.map((bk) => (
                <SelectItem key={bk} value={bk}>{bk}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={marketFilter} onValueChange={setMarketFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Markets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Markets">All Markets</SelectItem>
              {markets.map((mk) => (
                <SelectItem key={mk} value={mk}>{mk}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Outcomes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All Outcomes">All Outcomes</SelectItem>
              {outcomes.map((o) => (
                <SelectItem key={o} value={o}>{o}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading props...
          </div>
        ) : error ? (
          <div className="text-destructive">{error}</div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => setSort("week_number")}>
                    Week <ArrowUpDown className="inline ml-1 h-3 w-3" />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => setSort("opponent")}>
                    Opponent <ArrowUpDown className="inline ml-1 h-3 w-3" />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => setSort("bookmaker")}>
                    Bookmaker <ArrowUpDown className="inline ml-1 h-3 w-3" />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => setSort("market")}>
                    Market <ArrowUpDown className="inline ml-1 h-3 w-3" />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => setSort("outcome_name")}>
                    Outcome
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => setSort("outcome_price")}>
                    Price
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => setSort("outcome_point")}>
                    Point
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => setSort("probability")}>
                    Probability
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => setSort("updated")}>
                    Updated
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.map((p, idx) => (
                  <TableRow key={`${p.week_number}-${idx}-${p.bookmaker}-${p.market}-${p.outcome_name}`}>
                    <TableCell>{p.week_number}</TableCell>
                    <TableCell>
                      {p.homeoraway === "H" ? "vs " : p.homeoraway === "A" ? "@ " : ""}
                      {p.opponent || ""}
                    </TableCell>
                    <TableCell>{p.bookmaker}</TableCell>
                    <TableCell>{p.market}</TableCell>
                    <TableCell>{p.outcome_name}</TableCell>
                    <TableCell>{p.outcome_price ?? ''}</TableCell>
                    <TableCell>{p.outcome_point ?? ''}</TableCell>
                    <TableCell>{p.probability != null ? `${p.probability.toFixed(1)}%` : ''}</TableCell>
                    <TableCell>{p.updated ? new Date(p.updated).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {totalRows === 0
              ? "No props"
              : `Showing ${Math.min((page - 1) * pageSize + 1, totalRows)}–${Math.min(
                  page * pageSize,
                  totalRows
                )} of ${totalRows} props`}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


