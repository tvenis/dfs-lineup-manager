import { create } from "zustand";
import type { PlayerCsvRow, Lineup, RosterConfig, LineupSlotId } from "@/types/prd";

type DatasetState = {
  rows: PlayerCsvRow[];
  setRows: (rows: PlayerCsvRow[]) => void;
};

type SettingsState = {
  roster: RosterConfig;
  setCap: (cap: number) => void;
};

type LineupsState = {
  lineups: Lineup[];
  createLineup: () => void;
  setSlot: (lineupId: string, slot: LineupSlotId, playerId: string | null) => void;
};

export const useDatasetStore = create<DatasetState>((set) => ({
  rows: [],
  setRows: (rows: PlayerCsvRow[]) => set({ rows }),
}));

export const useSettingsStore = create<SettingsState>((set) => ({
  roster: {
    cap: 50000,
    positions: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, DST: 1 },
    flexEligibility: ["RB", "WR", "TE"],
  },
  setCap: (cap) => set((s) => ({ roster: { ...s.roster, cap } })),
}));

export const useLineupsStore = create<LineupsState>((set) => ({
  lineups: [],
  createLineup: () =>
    set((s) => ({
      lineups: [
        ...s.lineups,
        {
          id: crypto.randomUUID(),
          week_id: 1,
          name: "New Lineup",
          tags: [],
          slots: {},
          salary_used: 0,
          game_style: "Classic",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
      ],
    })),
  setSlot: (lineupId, slot, playerId) =>
    set((s) => ({
      lineups: s.lineups.map((l) =>
        l.id === lineupId
          ? {
              ...l,
              slots: {
                ...l.slots,
                [slot]: playerId ?? undefined,
              },
            }
          : l
      ),
    })),
}));


