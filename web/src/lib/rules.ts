import type { CsvRow, Lineup, LineupSlotId, RosterConfig } from "@/types/prd";

export function isEligibleForSlot(player: CsvRow, slot: LineupSlotId): boolean {
  const pos = (player.position || "").toUpperCase();
  if (slot === "QB") return pos === "QB";
  if (slot.startsWith("RB")) return pos === "RB";
  if (slot.startsWith("WR")) return pos === "WR";
  if (slot === "TE") return pos === "TE";
  if (slot === "FLEX") return pos === "RB" || pos === "WR" || pos === "TE";
  return false;
}

export function computeSalaryUsed(lineup: Lineup, rows: CsvRow[]): number {
  const idToRow = new Map(rows.map((r) => [r.player_id, r] as const));
  let total = 0;
  for (const pid of Object.values(lineup.slots)) {
    if (!pid) continue;
    const r = idToRow.get(pid.toString());
    if (!r) continue;
    const s = Number(r.salary ?? 0);
    total += Number.isFinite(s) ? s : 0;
  }
  return total;
}

export function validateLineup(lineup: Lineup, rows: CsvRow[], roster: RosterConfig) {
  const salaryUsed = computeSalaryUsed(lineup, rows);
  const playerIds = Object.values(lineup.slots).filter(Boolean).map(id => id.toString());
  const unique = new Set(playerIds);
  const hasDuplicates = unique.size !== playerIds.length;
  const complete = [
    "QB",
    "RB1",
    "RB2",
    "WR1",
    "WR2",
    "WR3",
    "TE",
    "FLEX",
  ].every((k) => lineup.slots[k as LineupSlotId]);
  const underCap = salaryUsed <= roster.cap;
  return {
    salaryUsed,
    valid: complete && underCap && !hasDuplicates,
    issues: {
      hasDuplicates,
      overCap: !underCap,
      incomplete: !complete,
    },
  };
}


