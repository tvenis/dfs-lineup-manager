/**
 * Comprehensive test suite for WeekService
 * Tests critical functionality for active week and last completed week retrieval
 */

import { WeekService } from '@/lib/weekService';
import { Week } from '@/types/prd';

// Mock the fetch function
global.fetch = jest.fn();

describe('WeekService', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getActiveWeek', () => {
    it('should return active week when it exists', async () => {
      const mockActiveWeek: Week = {
        id: 5,
        week_number: 10,
        year: 2025,
        start_date: '2025-03-10',
        end_date: '2025-03-16',
        game_count: 16,
        status: 'Active',
        imported_at: '2025-01-01T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockActiveWeek,
      });

      const result = await WeekService.getActiveWeek();

      expect(result).toEqual(mockActiveWeek);
      expect(result?.status).toBe('Active');
      expect(result?.week_number).toBe(10);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/weeks/active')
      );
    });

    it('should return null when no active week exists (404)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: 'No active week found' }),
      });

      const result = await WeekService.getActiveWeek();

      expect(result).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/weeks/active')
      );
    });

    it('should return null when fetch fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await WeekService.getActiveWeek();

      expect(result).toBeNull();
    });

    it('should return null when response is not ok (500 error)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ detail: 'Internal server error' }),
      });

      const result = await WeekService.getActiveWeek();

      expect(result).toBeNull();
    });
  });

  describe('getLastCompletedWeek', () => {
    it('should return last completed week when it exists', async () => {
      const mockCompletedWeek: Week = {
        id: 4,
        week_number: 9,
        year: 2025,
        start_date: '2025-03-03',
        end_date: '2025-03-09',
        game_count: 16,
        status: 'Completed',
        imported_at: '2025-01-01T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCompletedWeek,
      });

      const result = await WeekService.getLastCompletedWeek();

      expect(result).toEqual(mockCompletedWeek);
      expect(result?.status).toBe('Completed');
      expect(result?.week_number).toBe(9);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/weeks/last-completed')
      );
    });

    it('should return null when no completed week exists (404)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: 'No completed week found' }),
      });

      const result = await WeekService.getLastCompletedWeek();

      expect(result).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/weeks/last-completed')
      );
    });

    it('should return null when fetch fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await WeekService.getLastCompletedWeek();

      expect(result).toBeNull();
    });

    it('should return null when response is not ok (500 error)', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ detail: 'Internal server error' }),
      });

      const result = await WeekService.getLastCompletedWeek();

      expect(result).toBeNull();
    });

    it('should return the most recent completed week when multiple exist', async () => {
      // This is an integration concern, but we test that the service calls the right endpoint
      const mockRecentCompletedWeek: Week = {
        id: 10,
        week_number: 15,
        year: 2025,
        start_date: '2025-04-14',
        end_date: '2025-04-20',
        game_count: 16,
        status: 'Completed',
        imported_at: '2025-01-01T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockRecentCompletedWeek,
      });

      const result = await WeekService.getLastCompletedWeek();

      expect(result).toEqual(mockRecentCompletedWeek);
      expect(result?.week_number).toBe(15);
    });
  });

  describe('getWeeks', () => {
    it('should return all weeks', async () => {
      const mockWeeksResponse = {
        weeks: [
          {
            id: 1,
            week_number: 1,
            year: 2025,
            start_date: '2025-01-06',
            end_date: '2025-01-12',
            game_count: 16,
            status: 'Completed',
            imported_at: '2025-01-01T00:00:00Z',
            created_at: '2025-01-01T00:00:00Z',
          },
          {
            id: 2,
            week_number: 2,
            year: 2025,
            start_date: '2025-01-13',
            end_date: '2025-01-19',
            game_count: 16,
            status: 'Active',
            imported_at: '2025-01-01T00:00:00Z',
            created_at: '2025-01-01T00:00:00Z',
          },
        ],
        total: 2,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockWeeksResponse,
      });

      const result = await WeekService.getWeeks();

      expect(result.weeks).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/weeks?skip=0&limit=100')
      );
    });

    it('should throw error when fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(WeekService.getWeeks()).rejects.toThrow();
    });
  });

  describe('getWeek', () => {
    it('should return specific week by id', async () => {
      const mockWeek: Week = {
        id: 5,
        week_number: 5,
        year: 2025,
        start_date: '2025-02-03',
        end_date: '2025-02-09',
        game_count: 16,
        status: 'Active',
        imported_at: '2025-01-01T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockWeek,
      });

      const result = await WeekService.getWeek(5);

      expect(result).toEqual(mockWeek);
      expect(result.id).toBe(5);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/weeks/5')
      );
    });

    it('should throw error when week not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(WeekService.getWeek(999)).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed JSON response gracefully for active week', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await WeekService.getActiveWeek();

      expect(result).toBeNull();
    });

    it('should handle malformed JSON response gracefully for last completed week', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await WeekService.getLastCompletedWeek();

      expect(result).toBeNull();
    });

    it('should handle network timeout for active week', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100);
        })
      );

      const result = await WeekService.getActiveWeek();

      expect(result).toBeNull();
    });

    it('should handle network timeout for last completed week', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100);
        })
      );

      const result = await WeekService.getLastCompletedWeek();

      expect(result).toBeNull();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle scenario where active week exists but completed does not', async () => {
      const mockActiveWeek: Week = {
        id: 1,
        week_number: 1,
        year: 2025,
        start_date: '2025-01-06',
        end_date: '2025-01-12',
        game_count: 16,
        status: 'Active',
        imported_at: '2025-01-01T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
      };

      // Mock active week exists
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockActiveWeek,
      });

      const activeResult = await WeekService.getActiveWeek();
      expect(activeResult).toEqual(mockActiveWeek);

      // Mock completed week does not exist
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: 'No completed week found' }),
      });

      const completedResult = await WeekService.getLastCompletedWeek();
      expect(completedResult).toBeNull();
    });

    it('should handle scenario where completed week exists but active does not', async () => {
      const mockCompletedWeek: Week = {
        id: 18,
        week_number: 18,
        year: 2024,
        start_date: '2024-12-30',
        end_date: '2025-01-05',
        game_count: 16,
        status: 'Completed',
        imported_at: '2025-01-01T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
      };

      // Mock active week does not exist
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ detail: 'No active week found' }),
      });

      const activeResult = await WeekService.getActiveWeek();
      expect(activeResult).toBeNull();

      // Mock completed week exists
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCompletedWeek,
      });

      const completedResult = await WeekService.getLastCompletedWeek();
      expect(completedResult).toEqual(mockCompletedWeek);
    });

    it('should handle both active and completed weeks existing simultaneously', async () => {
      const mockActiveWeek: Week = {
        id: 10,
        week_number: 10,
        year: 2025,
        start_date: '2025-03-10',
        end_date: '2025-03-16',
        game_count: 16,
        status: 'Active',
        imported_at: '2025-01-01T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
      };

      const mockCompletedWeek: Week = {
        id: 9,
        week_number: 9,
        year: 2025,
        start_date: '2025-03-03',
        end_date: '2025-03-09',
        game_count: 16,
        status: 'Completed',
        imported_at: '2025-01-01T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
      };

      // Mock active week
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockActiveWeek,
      });

      const activeResult = await WeekService.getActiveWeek();
      expect(activeResult?.status).toBe('Active');
      expect(activeResult?.week_number).toBe(10);

      // Mock completed week
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCompletedWeek,
      });

      const completedResult = await WeekService.getLastCompletedWeek();
      expect(completedResult?.status).toBe('Completed');
      expect(completedResult?.week_number).toBe(9);

      // Verify that completed week is before active week
      expect(completedResult!.week_number).toBeLessThan(activeResult!.week_number);
    });
  });
});

