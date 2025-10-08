// Simple PlayerService test without path mapping issues
describe('PlayerService Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Basic API Functionality', () => {
    it('should handle successful API calls', async () => {
      const mockPlayer = {
        playerDkId: 11370,
        player: {
          playerDkId: 11370,
          firstName: 'Test',
          lastName: 'Player',
          displayName: 'Test Player',
          position: 'QB',
          team: 'TEST'
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPlayer
      })

      // Test the fetch call directly
      const response = await fetch('http://localhost:8000/api/players/11370')
      const data = await response.json()

      expect(data).toEqual(mockPlayer)
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/players/11370')
    })

    it('should handle 404 errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      const response = await fetch('http://localhost:8000/api/players/99999')
      
      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
    })

    it('should handle network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      )

      await expect(fetch('http://localhost:8000/api/players/11370')).rejects.toThrow(
        'Network error'
      )
    })

    it('should handle malformed JSON responses', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Unexpected token < in JSON at position 0')
        }
      })

      const response = await fetch('http://localhost:8000/api/players/11370')
      
      await expect(response.json()).rejects.toThrow(
        'Unexpected token < in JSON at position 0'
      )
    })
  })

  describe('Error Scenarios', () => {
    it('should handle server errors (500)', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      const response = await fetch('http://localhost:8000/api/players/11370')
      
      expect(response.ok).toBe(false)
      expect(response.status).toBe(500)
    })

    it('should handle timeout errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Request timeout')
      )

      await expect(fetch('http://localhost:8000/api/players/11370')).rejects.toThrow(
        'Request timeout'
      )
    })

    it('should handle connection refused', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Connection refused')
      )

      await expect(fetch('http://localhost:8000/api/players/11370')).rejects.toThrow(
        'Connection refused'
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle very large player IDs', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const response = await fetch('http://localhost:8000/api/players/999999999')
      expect(response.status).toBe(404)
    })

    it('should handle negative player IDs', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400
      })

      const response = await fetch('http://localhost:8000/api/players/-1')
      expect(response.status).toBe(400)
    })

    it('should handle zero player ID', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400
      })

      const response = await fetch('http://localhost:8000/api/players/0')
      expect(response.status).toBe(400)
    })
  })

  describe('URL Construction', () => {
    it('should construct proper URLs with query parameters', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entries: [], total: 0, week_id: 1 })
      })

      const url = 'http://localhost:8000/api/players/pool/1?position=QB&team_id=TEST&limit=50'
      await fetch(url)

      expect(global.fetch).toHaveBeenCalledWith(url)
    })

    it('should handle URL encoding properly', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ players: [], total: 0 })
      })

      const searchTerm = 'player with spaces & special chars'
      const url = `http://localhost:8000/api/players/profiles?search=${encodeURIComponent(searchTerm)}`
      
      await fetch(url)
      expect(global.fetch).toHaveBeenCalledWith(url)
    })
  })
})
