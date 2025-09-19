import { buildApiUrl, API_CONFIG } from '@/config/api';
import { Week } from '@/types/prd';

export interface WeekListResponse {
  weeks: Week[];
  total: number;
}

export class WeekService {
  static async getWeeks(): Promise<WeekListResponse> {
    try {
      const response = await fetch(`${buildApiUrl(API_CONFIG.ENDPOINTS.WEEKS)}?skip=0&limit=100`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching weeks:', error);
      throw error;
    }
  }

  static async getWeek(weekId: number): Promise<Week> {
    try {
      const response = await fetch(`${buildApiUrl(API_CONFIG.ENDPOINTS.WEEKS)}/${weekId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching week:', error);
      throw error;
    }
  }

  static async getActiveWeek(): Promise<Week | null> {
    try {
      const response = await fetch(`${buildApiUrl(API_CONFIG.ENDPOINTS.WEEKS)}?status=Active&limit=1`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.weeks && data.weeks.length > 0 ? data.weeks[0] : null;
    } catch (error) {
      console.error('Error fetching active week:', error);
      throw error;
    }
  }

  static async getGamesForWeek(weekId: number): Promise<{ games: Array<{ team_abbr: string; opponent_abbr: string | null; homeoraway: 'H' | 'A' | 'N'; proj_spread?: number | null; proj_total?: number | null; implied_team_total?: number | null }>; total: number; week_id: number }> {
    try {
      const response = await fetch(`${buildApiUrl(API_CONFIG.ENDPOINTS.GAMES)}/week/${weekId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching games for week:', error);
      throw error;
    }
  }
}

