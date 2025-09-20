import { buildApiUrl, API_CONFIG } from '@/config/api';

export interface DraftGroup {
  id: number;
  draftGroup: number;
  week_id: number;
  draftGroup_description?: string;
  games: number;
  created_at: string;
  updated_at?: string;
}

export interface DraftGroupCreate {
  draftGroup: number;
  week_id: number;
  draftGroup_description?: string;
  games: number;
}

export interface DraftGroupUpdate {
  draftGroup?: number;
  week_id?: number;
  draftGroup_description?: string;
  games?: number;
}

export class DraftGroupService {
  static async getDraftGroups(weekId?: number): Promise<DraftGroup[]> {
    try {
      const url = weekId 
        ? `${buildApiUrl(API_CONFIG.ENDPOINTS.DRAFTGROUPS)}/?week_id=${weekId}`
        : `${buildApiUrl(API_CONFIG.ENDPOINTS.DRAFTGROUPS)}/`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching draft groups:', error);
      throw error;
    }
  }

  static async createDraftGroup(draftGroup: DraftGroupCreate): Promise<DraftGroup> {
    try {
      const response = await fetch(`${buildApiUrl(API_CONFIG.ENDPOINTS.DRAFTGROUPS)}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draftGroup),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating draft group:', error);
      throw error;
    }
  }

  static async updateDraftGroup(id: number, draftGroup: DraftGroupUpdate): Promise<DraftGroup> {
    try {
      const response = await fetch(`${buildApiUrl(API_CONFIG.ENDPOINTS.DRAFTGROUPS)}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draftGroup),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating draft group:', error);
      throw error;
    }
  }
}