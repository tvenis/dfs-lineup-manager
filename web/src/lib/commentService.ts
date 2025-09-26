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

  static async getPlayerComments(playerDkId: number): Promise<Comment[]> {
    const response = await fetch(`${this.baseUrl}/player/${playerDkId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch comments');
    }
    return response.json();
  }

  static async createComment(comment: CommentCreate): Promise<Comment> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(comment),
    });
    if (!response.ok) {
      throw new Error('Failed to create comment');
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
}
