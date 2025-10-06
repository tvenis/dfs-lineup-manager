import { PlayerPoolEntry, Player, PlayerPropsResponse } from '@/types/prd';
import { buildApiUrl, API_CONFIG } from '@/config/api';

export interface PlayerPoolFilters {
  position?: string;
  team_id?: string;
  excluded?: boolean;
  search?: string;
  skip?: number;
  limit?: number;
  draft_group?: string;
}

export interface PlayerPoolResponse {
  entries: PlayerPoolEntry[];
  total: number;
  week_id: number;  // Updated to Integer
}

export interface WeekAnalysisDataDto {
  opponent_abbr?: string | null;
  homeoraway?: 'H' | 'A' | 'N' | string | null;
  proj_spread?: number | null;
  proj_total?: number | null;
  implied_team_total?: number | null;
}

export interface PlayerPoolEntryWithAnalysisDto {
  entry: PlayerPoolEntry;
  analysis: WeekAnalysisDataDto;
}

export interface PlayerPoolAnalysisResponseDto {
  entries: PlayerPoolEntryWithAnalysisDto[];
  total: number;
  week_id: number;
}

export interface Week {
  id: number;  // Updated to Integer
  week_number: number;
  year: number;
  start_date: string;
  end_date: string;
  game_count: number;
  status: 'Completed' | 'Active' | 'Upcoming';
  notes?: string;
  imported_at: string;
  created_at: string;
  updated_at?: string;
}

export interface WeekListResponse {
  weeks: Week[];
  total: number;
}

export interface PlayerListResponse {
  players: Player[];
  total: number;
  page: number;
  size: number;
}

export interface WeekFilters {
  year?: number;
  status?: 'Completed' | 'Active' | 'Upcoming';
}

export class PlayerService {
  static async getWeeks(filters?: WeekFilters): Promise<WeekListResponse> {
    try {
      const params = new URLSearchParams();
      if (filters?.year) params.append('year', filters.year.toString());
      if (filters?.status) params.append('status', filters.status);
      
      const url = filters && Object.keys(filters).length > 0 
        ? `${buildApiUrl(API_CONFIG.ENDPOINTS.WEEKS)}?${params.toString()}`
        : buildApiUrl(API_CONFIG.ENDPOINTS.WEEKS);
        
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching weeks:', error);
      throw error;
    }
  }

  static async getCurrentWeek(): Promise<Week> {
    try {
      const baseUrl = buildApiUrl(API_CONFIG.ENDPOINTS.WEEKS);
      const url = `${baseUrl}/current`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching current week:', error);
      throw error;
    }
  }

  static async getDefaultDraftGroup(weekId: number): Promise<string> {
    try {
      const baseUrl = buildApiUrl(API_CONFIG.ENDPOINTS.WEEKS);
      const url = `${baseUrl}/${weekId}/default-draft-group`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.draft_group_id.toString();
    } catch (error) {
      console.error('Error fetching default draft group:', error);
      // Fallback to a known working draft group ID
      return '134675';
    }
  }

  static async getPlayerPool(
    weekId: number,  // Updated to Integer
    filters: PlayerPoolFilters = {}
  ): Promise<PlayerPoolResponse> {
    try {
      const params = new URLSearchParams();
      
      // Draft group is required
      if (filters.draft_group) {
        params.append('draft_group', filters.draft_group);
      } else {
        // Get default draft group for this week
        const defaultDraftGroup = await PlayerService.getDefaultDraftGroup(weekId);
        params.append('draft_group', defaultDraftGroup);
      }
      
      if (filters.position) params.append('position', filters.position);
      if (filters.team_id) params.append('team_id', filters.team_id);
      if (filters.excluded !== undefined) params.append('excluded', filters.excluded.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.skip !== undefined) params.append('skip', filters.skip.toString());
      if (filters.limit !== undefined) params.append('limit', filters.limit.toString());

      const baseUrl = buildApiUrl(API_CONFIG.ENDPOINTS.PLAYERS);
      const url = `${baseUrl}/pool/${weekId}?${params.toString()}`;
      
      console.log('🎯 PlayerService.getPlayerPool URL:', url);
      console.log('🎯 PlayerService.getPlayerPool baseUrl:', baseUrl);
      console.log('🎯 PlayerService.getPlayerPool API_CONFIG.BASE_URL:', API_CONFIG.BASE_URL);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching player pool:', error);
      throw error;
    }
  }

  static async getPlayerPoolWithAnalysis(weekId: number, draftGroup?: string): Promise<PlayerPoolAnalysisResponseDto> {
    const baseUrl = buildApiUrl(API_CONFIG.ENDPOINTS.PLAYERS);
    const draftGroupToUse = draftGroup || await PlayerService.getDefaultDraftGroup(weekId);
    const url = `${baseUrl}/pool/${weekId}/analysis?draft_group=${encodeURIComponent(draftGroupToUse)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  static async updatePlayerPoolEntry(
    entryId: number,
    updates: {
      excluded?: boolean;
      status?: string;
      isDisabled?: boolean;
      tier?: number;
    }
  ): Promise<PlayerPoolEntry> {
    try {
      const baseUrl = buildApiUrl(API_CONFIG.ENDPOINTS.PLAYERS);
      const url = `${baseUrl}/pool/${entryId}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating player pool entry:', error);
      throw error;
    }
  }

  static async bulkUpdatePlayerPoolEntries(
    updates: Array<{
      entry_id: number;
      excluded?: boolean;
      status?: string;
    }>
  ): Promise<PlayerPoolEntry[]> {
    try {
      const response = await fetch(`${buildApiUrl(API_CONFIG.ENDPOINTS.PLAYERS)}/pool/bulk-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error bulk updating player pool entries:', error);
      throw error;
    }
  }

  static async getPlayerByDkId(playerDkId: number): Promise<PlayerPoolEntry> {
    try {
      const response = await fetch(`${buildApiUrl(API_CONFIG.ENDPOINTS.PLAYERS)}/${playerDkId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching player:', error);
      throw error;
    }
  }

  static async getPlayerProps(
    playerDkId: number,
    filters: { week_id?: number; bookmaker?: string; market?: string } = {}
  ): Promise<PlayerPropsResponse> {
    const params = new URLSearchParams();
    if (filters.week_id !== undefined) params.append('week_id', String(filters.week_id));
    if (filters.bookmaker) params.append('bookmaker', filters.bookmaker);
    if (filters.market) params.append('market', filters.market);

    const baseUrl = buildApiUrl(API_CONFIG.ENDPOINTS.PLAYERS);
    const url = `${baseUrl}/${playerDkId}/props?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  static async getPlayerProfiles(filters: {
    position?: string;
    team_id?: string;
    search?: string;
    skip?: number;
    limit?: number;
    show_hidden?: boolean;
  } = {}): Promise<PlayerListResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters.position) params.append('position', filters.position);
      if (filters.team_id) params.append('team_id', filters.team_id);
      if (filters.search) params.append('search', filters.search);
      if (filters.skip !== undefined) params.append('skip', filters.skip.toString());
      if (filters.limit !== undefined) params.append('limit', filters.limit.toString());
      if (filters.show_hidden !== undefined) params.append('show_hidden', filters.show_hidden.toString());

      const baseUrl = buildApiUrl(API_CONFIG.ENDPOINTS.PLAYERS);
      const url = `${baseUrl}/profiles?${params.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching player profiles:', error);
      throw error;
    }
  }

  static async getPlayerProfilesWithPoolData(filters: {
    position?: string;
    team_id?: string;
    search?: string;
    skip?: number;
    limit?: number;
    show_hidden?: boolean;
    draft_group?: string;
  } = {}): Promise<PlayerListResponse> {
    try {
      const params = new URLSearchParams();
      
      // Draft group is required
      if (filters.draft_group) {
        params.append('draft_group', filters.draft_group);
      } else {
        // Get default draft group for this week
        const defaultDraftGroup = await PlayerService.getDefaultDraftGroup(weekId);
        params.append('draft_group', defaultDraftGroup);
      }
      
      if (filters.position) params.append('position', filters.position);
      if (filters.team_id) params.append('team_id', filters.team_id);
      if (filters.search) params.append('search', filters.search);
      if (filters.skip !== undefined) params.append('skip', filters.skip.toString());
      if (filters.limit !== undefined) params.append('limit', filters.limit.toString());
      if (filters.show_hidden !== undefined) params.append('show_hidden', filters.show_hidden.toString());

      const baseUrl = buildApiUrl(API_CONFIG.ENDPOINTS.PLAYERS);
      const url = `${baseUrl}/profiles-with-pool-data-optimized?${params.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching player profiles with pool data:', error);
      throw error;
    }
  }

  static async getPlayerPoolEntries(weekId: number): Promise<PlayerPoolEntry[]> {
    try {
      const response = await fetch(`${buildApiUrl(API_CONFIG.ENDPOINTS.PLAYERS)}/pool/${weekId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.entries || [];
    } catch (error) {
      console.error('Error fetching player pool entries:', error);
      throw error;
    }
  }

  // Helper method to format week display
  static formatWeekDisplay(week: Week): string {
    return `Week ${week.week_number} (${week.year})`;
  }

  // Helper method to get week status color
  static getWeekStatusColor(status: Week['status']): string {
    switch (status) {
      case 'Completed': return 'bg-gray-100 text-gray-800';
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Upcoming': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Fetch all player props in a single batch request
   * This replaces 11+ individual API calls with 1 batch call
   */
  static async getPlayerPropsBatch(
    playerIds: number[],
    weekId: number,
    markets: string[] = [
      'player_pass_yds',
      'player_pass_tds', 
      'player_pass_att',
      'player_pass_cmp',
      'player_rush_yds',
      'player_tds_over',
      'player_rush_att',
      'player_reception_yds',
      'player_receptions'
    ]
  ): Promise<Record<number, Record<string, any>>> {
    const params = new URLSearchParams();
    params.append('week_id', String(weekId));
    params.append('player_ids', playerIds.join(','));
    params.append('markets', markets.join(','));
    params.append('bookmakers', 'draftkings,betonlineag');

    const baseUrl = buildApiUrl(API_CONFIG.ENDPOINTS.PLAYERS);
    const url = `${baseUrl}/props/batch?${params.toString()}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Fetch complete player pool data in a single optimized request
   * This replaces 3 separate API calls (pool + analysis + props) with 1 call
   */
  static async getPlayerPoolComplete(
    weekId: number,
    filters: PlayerPoolFilters = {},
    includeProps: boolean = true
  ): Promise<{
    entries: PlayerPoolEntryWithAnalysisDto[];
    total: number;
    week_id: number;
    games_map: Record<string, any>;
    props_data: Record<number, Record<string, any>>;
    meta: {
      skip: number;
      limit: number;
      has_more: boolean;
      include_props: boolean;
    };
  }> {
    try {
      const params = new URLSearchParams();
      
      // Draft group is required
      if (filters.draft_group) {
        params.append('draft_group', filters.draft_group);
      } else {
        // Get default draft group for this week
        const defaultDraftGroup = await PlayerService.getDefaultDraftGroup(weekId);
        params.append('draft_group', defaultDraftGroup);
      }
      
      if (filters.position) params.append('position', filters.position);
      if (filters.team_id) params.append('team_id', filters.team_id);
      if (filters.excluded !== undefined) params.append('excluded', filters.excluded.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.skip !== undefined) params.append('skip', filters.skip.toString());
      if (filters.limit !== undefined) params.append('limit', filters.limit.toString());
      params.append('include_props', includeProps.toString());

      const baseUrl = buildApiUrl(API_CONFIG.ENDPOINTS.PLAYERS);
      const url = `${baseUrl}/pool/${weekId}/complete?${params.toString()}`;
      
      console.log('🎯 PlayerService.getPlayerPoolComplete URL:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching complete player pool:', error);
      throw error;
    }
  }
}
