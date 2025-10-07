import { buildApiUrl, API_CONFIG } from '@/config/api';
import { Lineup, LineupSlotId, LineupDisplayData, LineupStatus } from '@/types/prd';

export interface LineupCreate {
  week_id: number;
  name: string;
  tags: string[];
  game_style?: string;
  slots: Partial<Record<LineupSlotId, number>>; // playerDkId per slot
}

export interface LineupCreateWithDraftGroup extends LineupCreate {
  draftGroup: string;
}

export interface LineupUpdate {
  name?: string;
  tags?: string[];
  game_style?: string;
  slots?: Partial<Record<LineupSlotId, number>>;
  status?: LineupStatus;
}

export interface LineupValidationRequest {
  week_id: number;
  slots: Partial<Record<LineupSlotId, number>>;
}

export interface LineupValidationResponse {
  valid: boolean;
  errors: string[];
  salary_used: number;
  salary_remaining: number;
  projected_points?: number;
}

export interface LineupListResponse {
  lineups: Lineup[];
  total: number;
  page: number;
  size: number;
}

export class LineupService {
  static async getLineups(
    weekId?: number,
    skip: number = 0,
    limit: number = 100
  ): Promise<LineupListResponse> {
    try {
      const params = new URLSearchParams();
      if (weekId) params.append('week_id', weekId.toString());
      if (skip !== undefined) params.append('skip', skip.toString());
      if (limit !== undefined) params.append('limit', limit.toString());

      // Build the base URL with trailing slash, then add query parameters
      const baseUrl = buildApiUrl(API_CONFIG.ENDPOINTS.LINEUPS);
      const url = params.toString() 
        ? `${baseUrl}?${params.toString()}`
        : baseUrl;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching lineups:', error);
      throw error;
    }
  }

  static async getLineup(lineupId: string): Promise<Lineup> {
    try {
      const baseUrl = buildApiUrl(API_CONFIG.ENDPOINTS.LINEUPS);
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const response = await fetch(`${cleanBaseUrl}/${lineupId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching lineup:', error);
      throw error;
    }
  }

  static async createLineup(lineup: LineupCreateWithDraftGroup): Promise<Lineup> {
    try {
      const { draftGroup, ...lineupData } = lineup;
      const url = new URL(buildApiUrl(API_CONFIG.ENDPOINTS.LINEUPS));
      url.searchParams.set('draftGroup', draftGroup);
      
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(lineupData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating lineup:', error);
      throw error;
    }
  }

  static async updateLineup(lineupId: string, updates: LineupUpdate): Promise<Lineup> {
    try {
      const baseUrl = buildApiUrl(API_CONFIG.ENDPOINTS.LINEUPS);
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const response = await fetch(`${cleanBaseUrl}/${lineupId}`, {
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
      console.error('Error updating lineup:', error);
      throw error;
    }
  }

  static async deleteLineup(lineupId: string): Promise<void> {
    try {
      const baseUrl = buildApiUrl(API_CONFIG.ENDPOINTS.LINEUPS);
      // Remove trailing slash from baseUrl to avoid double slash
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const deleteUrl = `${cleanBaseUrl}/${lineupId}`;
      console.log('🎯 Delete URL:', deleteUrl);
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting lineup:', error);
      throw error;
    }
  }

  static async validateLineup(validation: LineupValidationRequest): Promise<LineupValidationResponse> {
    try {
      const response = await fetch(`${buildApiUrl(API_CONFIG.ENDPOINTS.LINEUPS)}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validation),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error validating lineup:', error);
      throw error;
    }
  }

  static async exportLineup(lineupId: string, format: 'csv' | 'json' = 'csv'): Promise<Blob> {
    try {
      if (format === 'csv') {
        // Use the new backend CSV export endpoint that includes draftableId
        const baseUrl = buildApiUrl(API_CONFIG.ENDPOINTS.LINEUPS);
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const exportUrl = `${cleanBaseUrl}/${lineupId}/export/csv`;
        
        console.log('=== EXPORT DEBUG ===');
        console.log('API_CONFIG.BASE_URL:', API_CONFIG.BASE_URL);
        console.log('API_CONFIG.ENDPOINTS.LINEUPS:', API_CONFIG.ENDPOINTS.LINEUPS);
        console.log('Base URL:', baseUrl);
        console.log('Clean base URL:', cleanBaseUrl);
        console.log('Export URL:', exportUrl);
        console.log('Lineup ID:', lineupId);
        console.log('==================');
        
        const response = await fetch(exportUrl);
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        return await response.blob();
      } else {
        // For JSON format, use the existing endpoint
        const baseUrl = buildApiUrl(API_CONFIG.ENDPOINTS.LINEUPS);
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const response = await fetch(`${cleanBaseUrl}/${lineupId}/export?format=${format}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.blob();
      }
    } catch (error) {
      console.error('Error exporting lineup:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  static async getLineupsWithDetails(
    weekId?: number,
    skip: number = 0,
    limit: number = 100
  ): Promise<LineupDisplayData[]> {
    try {
      // First get the lineups
      const lineupsResponse = await this.getLineups(weekId, skip, limit);
      
      // Then get detailed analysis for each lineup
      const detailedLineups: LineupDisplayData[] = [];
      
      for (const lineup of lineupsResponse.lineups) {
        try {
          const analysis = await this.analyzeLineup(lineup.id);
          
          // Convert the analysis to LineupDisplayData format
          const roster = Object.entries(analysis.slots)
            .filter(([, player]) => player !== null)
            .map(([position, player]) => ({
              position: position,
              name: player!.name,
              team: player!.team,
              salary: player!.salary,
              projectedPoints: player!.projected_points || 0
            }))
            .sort((a, b) => {
              // Sort by position order: QB, RB1, RB2, WR1, WR2, WR3, TE, FLEX, DST
              const positionOrder = { QB: 0, RB1: 1, RB2: 2, WR1: 3, WR2: 4, WR3: 5, TE: 6, FLEX: 7, DST: 8 };
              return (positionOrder[a.position as keyof typeof positionOrder] || 9) - (positionOrder[b.position as keyof typeof positionOrder] || 9);
            });

          const totalProjectedPoints = roster.reduce((sum, player) => sum + player.projectedPoints, 0);
          
          detailedLineups.push({
            id: lineup.id,
            name: lineup.name,
            tags: lineup.tags || [],
            status: lineup.status || 'created',
            salaryUsed: analysis.total_salary,
            salaryCap: 50000,
            projectedPoints: totalProjectedPoints,
            roster: roster
          });
        } catch (error) {
          console.error(`Error getting details for lineup ${lineup.id}:`, error);
          // Skip this lineup if we can't get details
          continue;
        }
      }
      
      return detailedLineups;
    } catch (error) {
      console.error('Error fetching lineups with details:', error);
      throw error;
    }
  }

  static async analyzeLineup(lineupId: string): Promise<{
    slots: { [position: string]: { name: string; team: string; salary: number; projected_points?: number } | null };
    total_salary: number;
  }> {
    try {
      const baseUrl = buildApiUrl(API_CONFIG.ENDPOINTS.LINEUPS);
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const response = await fetch(`${cleanBaseUrl}/${lineupId}/analysis`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error analyzing lineup:', error);
      throw error;
    }
  }

  static async exportAllLineups(weekId?: number): Promise<Blob> {
    try {
      // Use the new backend endpoint to export all lineups
      const params = weekId ? `?week_id=${weekId}` : '';
      const baseUrl = buildApiUrl(API_CONFIG.ENDPOINTS.LINEUPS);
      // Remove trailing slash from baseUrl to avoid double slash
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const response = await fetch(`${cleanBaseUrl}/export-all/csv${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.blob();
    } catch (error) {
      console.error('Error exporting all lineups:', error);
      throw error;
    }
  }
}
