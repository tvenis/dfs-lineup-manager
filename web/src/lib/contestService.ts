import { buildApiUrl, API_CONFIG } from '@/config/api';

export interface ContestType {
  contest_type_id: number;
  code: string;
}

export interface ContestTypesResponse {
  contest_types: string[];
}

export class ContestService {
  static async getContestTypes(): Promise<ContestTypesResponse> {
    try {
      const response = await fetch(`${buildApiUrl(API_CONFIG.ENDPOINTS.CONTESTS)}/contest-types`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching contest types:', error);
      throw error;
    }
  }

  // Note: This is a placeholder implementation since the backend doesn't have update endpoint yet
  static async updateContestType(oldCode: string, newCode: string): Promise<boolean> {
    try {
      // For now, we'll simulate the update
      // In a real implementation, this would call a PUT endpoint
      console.log(`Updating contest type from "${oldCode}" to "${newCode}"`);
      
      // TODO: Implement actual backend update endpoint
      // const response = await fetch(`${buildApiUrl(API_CONFIG.ENDPOINTS.CONTESTS)}/contest-types`, {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ oldCode, newCode }),
      // });
      
      // Simulate success for now
      return true;
    } catch (error) {
      console.error('Error updating contest type:', error);
      throw error;
    }
  }
}
