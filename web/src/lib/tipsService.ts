/**
 * Tips Configuration API Service
 * Handles all API calls for tips configuration management
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface TipsConfiguration {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  configuration_data: string; // JSON string
  created_at: string;
  updated_at?: string;
}

export interface TipsConfigData {
  weeklyReminders: Array<{
    icon: string;
    text: string;
    color: string;
  }>;
  positionTips: {
    [position: string]: {
      icon: string;
      color: string;
      tips: Array<{
        category: string;
        items: string[];
      }>;
    };
  };
  gameTypeTips: {
    [gameType: string]: {
      icon: string;
      title: string;
      color: string;
      description: string;
      tips: Array<{
        category: string;
        items: string[];
      }>;
    };
  };
}

class TipsService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get all tips configurations
   */
  async getConfigurations(activeOnly: boolean = true): Promise<TipsConfiguration[]> {
    return this.request<TipsConfiguration[]>(`/api/tips/?active_only=${activeOnly}`);
  }

  /**
   * Get a specific tips configuration by ID
   */
  async getConfiguration(configId: number): Promise<TipsConfiguration> {
    return this.request<TipsConfiguration>(`/api/tips/${configId}`);
  }

  /**
   * Get the active tips configuration (for Player Pool display)
   */
  async getActiveConfiguration(): Promise<TipsConfiguration> {
    return this.request<TipsConfiguration>('/api/tips/active/default');
  }

  /**
   * Create a new tips configuration
   */
  async createConfiguration(config: {
    name: string;
    description?: string;
    is_active?: boolean;
    configuration_data: string;
  }): Promise<TipsConfiguration> {
    return this.request<TipsConfiguration>('/api/tips/', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  /**
   * Update an existing tips configuration
   */
  async updateConfiguration(
    configId: number,
    updates: {
      name?: string;
      description?: string;
      is_active?: boolean;
      configuration_data?: string;
    }
  ): Promise<TipsConfiguration> {
    return this.request<TipsConfiguration>(`/api/tips/${configId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a tips configuration
   */
  async deleteConfiguration(configId: number): Promise<void> {
    await this.request(`/api/tips/${configId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Activate a tips configuration (deactivates all others)
   */
  async activateConfiguration(configId: number): Promise<void> {
    await this.request(`/api/tips/${configId}/activate`, {
      method: 'POST',
    });
  }

  /**
   * Duplicate an existing tips configuration
   */
  async duplicateConfiguration(configId: number, newName: string): Promise<TipsConfiguration> {
    return this.request<TipsConfiguration>(`/api/tips/${configId}/duplicate?new_name=${encodeURIComponent(newName)}`, {
      method: 'POST',
    });
  }

  /**
   * Export a tips configuration as JSON
   */
  async exportConfiguration(configId: number): Promise<{
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
    configuration_data: TipsConfigData;
  }> {
    return this.request(`/api/tips/export/${configId}`);
  }

  /**
   * Parse configuration data from JSON string
   */
  parseConfigurationData(configData: string): TipsConfigData {
    try {
      return JSON.parse(configData);
    } catch (error) {
      console.error('Failed to parse configuration data:', error);
      throw new Error('Invalid configuration data format');
    }
  }

  /**
   * Stringify configuration data to JSON string
   */
  stringifyConfigurationData(configData: TipsConfigData): string {
    try {
      return JSON.stringify(configData, null, 2);
    } catch (error) {
      console.error('Failed to stringify configuration data:', error);
      throw new Error('Invalid configuration data format');
    }
  }
}

// Export singleton instance
export const tipsService = new TipsService();
export default tipsService;
