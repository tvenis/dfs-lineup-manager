import { PlayerPoolEntry, Player } from '@/types/prd';
import { buildApiUrl, API_CONFIG } from '@/config/api';

export interface PlayerPoolFilters {
  position?: string;
  team_id?: string;
  excluded?: boolean;
  search?: string;
  skip?: number;
  limit?: number;
}

export interface PlayerPoolResponse {
  entries: PlayerPoolEntry[];
  total: number;
  week_id: number;  // Updated to Integer
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
      const url = `${baseUrl.slice(0, -1)}/current`;
      
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

  static async getPlayerPool(
    weekId: number,  // Updated to Integer
    filters: PlayerPoolFilters = {}
  ): Promise<PlayerPoolResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters.position) params.append('position', filters.position);
      if (filters.team_id) params.append('team_id', filters.team_id);
      if (filters.excluded !== undefined) params.append('excluded', filters.excluded.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.skip !== undefined) params.append('skip', filters.skip.toString());
      if (filters.limit !== undefined) params.append('limit', filters.limit.toString());

      const baseUrl = buildApiUrl(API_CONFIG.ENDPOINTS.PLAYERS);
      const url = `${baseUrl.slice(0, -1)}/pool/${weekId}?${params.toString()}`;
      
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

  static async updatePlayerPoolEntry(
    entryId: number,
    updates: {
      excluded?: boolean;
      status?: string;
      isDisabled?: boolean;
    }
  ): Promise<PlayerPoolEntry> {
    try {
      const baseUrl = buildApiUrl(API_CONFIG.ENDPOINTS.PLAYERS);
      const url = `${baseUrl.slice(0, -1)}/pool/${entryId}`;
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
      const url = `${baseUrl.slice(0, -1)}/profiles?${params.toString()}`;
      
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
}
