// Simple test to verify Jest setup works
describe('Jest Setup Test', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle async operations', async () => {
    const result = await Promise.resolve('test')
    expect(result).toBe('test')
  })

  it('should mock fetch', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ test: 'data' })
    })

    const response = await fetch('http://test.com')
    const data = await response.json()

    expect(data).toEqual({ test: 'data' })
    expect(global.fetch).toHaveBeenCalledWith('http://test.com')
  })
})
