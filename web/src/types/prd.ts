export type PlayerCsvRow = {
  player_id: string;
  name: string;
  team?: string;
  opponent?: string;
  position: "QB" | "RB" | "WR" | "TE" | "DST" | string;
  salary: string | number;
  game?: string;
};

export type CsvRow = Record<string, string> & Partial<PlayerCsvRow>;

export type LineupSlotId =
  | "QB"
  | "RB1"
  | "RB2"
  | "WR1"
  | "WR2"
  | "WR3"
  | "TE"
  | "FLEX"
  | "DST";

export type LineupStatus = 'created' | 'exported' | 'uploaded' | 'submitted';

export interface Lineup {
  id: string;
  week_id: number;
  name: string;
  tags: string[];
  game_style?: string;
  slots: Partial<Record<LineupSlotId, number>>; // playerDkId per slot
  salary_used: number;
  status?: LineupStatus;
  created_at: string;
  updated_at: string;
  week?: Week;
}

// Interface for the lineup display data used in WeeklyLineupManager
export interface LineupDisplayData {
  id: string;
  name: string;
  tags: string[];
  status: LineupStatus;
  salaryUsed: number;
  salaryCap: number;
  projectedPoints: number;
  roster: LineupPlayer[];
}

export interface LineupPlayer {
  position: string;
  name: string;
  team: string;
  salary: number;
  projectedPoints: number;
}

export type RosterConfig = {
  cap: number;
  positions: {
    QB: 1;
    RB: 2;
    WR: 3;
    TE: 1;
    FLEX: 1;
    DST: 1;
  };
  flexEligibility: Array<"RB" | "WR" | "TE">;
};

// Database types for Player Pool
export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  created_at: string;
  updated_at?: string;
}

export interface Player {
  playerDkId: number;
  firstName: string;
  lastName: string;
  suffix?: string;
  displayName: string;
  shortName?: string;
  position: string;
  team: string; // team abbreviation
  playerImage50?: string;  // URL to 50x50 player image
  playerImage160?: string; // URL to 160x160 player image
  hidden: boolean; // Whether to hide player from Player Profile list
  opponentRank?: { value: number; sortValue: number; quality: string };  // Opponent rank value, sortValue, and quality from draftStatAttributes
  created_at: string;
  updated_at?: string;
}

export interface Week {
  id: number;  // Updated to Integer
  week_number: number;
  year: number;
  start_date: string;  // ISO date string
  end_date: string;    // ISO date string
  game_count: number;
  status: 'Completed' | 'Active' | 'Upcoming';
  notes?: string;
  imported_at: string;
  created_at: string;
  updated_at?: string;
}

export interface PlayerPoolEntry {
  id: number;
  week_id: number;
  draftGroup: string;
  playerDkId: number;
  draftableId?: string;  // DraftKings draftable ID for this player pool entry
  projectedPoints?: number;  // Extracted projection value from draftStatAttributes
  ownership?: number;  // Ownership percentage from CSV imports (0.00-100.00)
  salary: number;
  status: string;
  isDisabled: boolean;
  excluded: boolean;
  tier: number;
  playerGameHash?: string;
  competitions?: Record<string, unknown>;
  draftStatAttributes?: Record<string, unknown>;
  playerAttributes?: Record<string, unknown>;
  teamLeagueSeasonAttributes?: Record<string, unknown>;
  playerGameAttributes?: Record<string, unknown>;
  draftAlerts?: Record<string, unknown>;
  externalRequirements?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
  week: Week;
  player: Player;
}


// Player Props
export interface PlayerPropBetWithMeta {
  week_number: number;
  opponent?: string | null;
  homeoraway?: 'H' | 'A' | 'N' | string | null;
  bookmaker?: string | null;
  market?: string | null;
  outcome_name?: string | null;
  outcome_price?: number | null;
  outcome_point?: number | null;
  probability?: number | null; // percentage 0-100 if provided
  updated?: string | null; // ISO date
}

export interface PlayerPropsResponse {
  props: PlayerPropBetWithMeta[];
  total: number;
}

