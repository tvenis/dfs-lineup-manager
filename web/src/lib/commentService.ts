import { buildApiUrl, API_CONFIG } from '@/config/api';

export interface Comment {
  id: number;
  playerDkId?: number;
  week_id?: number;
  content: string;
  created_at: string;
  updated_at?: string;
  player?: {
    playerDkId: number;
    displayName: string;
  };
  week?: {
    id: number;
    week_number: number;
    year: number;
  };
}

export interface CommentCreate {
  content: string;
  playerDkId?: number;
  week_id?: number;
}

export interface CommentUpdate {
  content: string;
  playerDkId?: number;
  week_id?: number;
}

export class CommentService {
  private static baseUrl = buildApiUrl(API_CONFIG.ENDPOINTS.COMMENTS);
  
  static {
    console.log('CommentService initialized with baseUrl:', this.baseUrl);
    console.log('API_CONFIG.BASE_URL:', API_CONFIG.BASE_URL);
    console.log('API_CONFIG.ENDPOINTS.COMMENTS:', API_CONFIG.ENDPOINTS.COMMENTS);
  }

  static async getPlayerComments(playerDkId: number): Promise<Comment[]> {
    const response = await fetch(`${this.baseUrl}/player/${playerDkId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch comments');
    }
    return response.json();
  }

  static async createComment(comment: CommentCreate): Promise<Comment> {
    console.log('Creating comment:', comment);
    console.log('API URL:', this.baseUrl);
    
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(comment),
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`Failed to create comment: ${response.status} ${errorText}`);
    }
    return response.json();
  }

  static async updateComment(commentId: number, comment: CommentUpdate): Promise<Comment> {
    const response = await fetch(`${this.baseUrl}/${commentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(comment),
    });
    if (!response.ok) {
      throw new Error('Failed to update comment');
    }
    return response.json();
  }

  static async deleteComment(commentId: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${commentId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete comment');
    }
  }

  static async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}
