import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let client
let fetchMock

beforeEach(async () => {
  vi.resetModules()
  vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/api/v1/')
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  client = await import('./client.js')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('API requests', () => {
  it('sends authenticated JSON requests and returns the response', async () => {
    fetchMock.mockResolvedValue(Response.json({ id: 'expense-1' }))
    await expect(client.apiRequest('/expenses', {
      method: 'POST', token: 'test-token', body: { amount: 25 },
    })).resolves.toEqual({ id: 'expense-1' })
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.example.com/api/v1/expenses')
    expect(options.headers.get('Authorization')).toBe('Bearer test-token')
    expect(options.headers.get('Content-Type')).toBe('application/json')
    expect(options.body).toBe('{"amount":25}')
  })

  it('preserves multipart uploads without forcing a JSON content type', async () => {
    const body = new FormData()
    body.append('file', new Blob(['amount\n25']), 'expenses.csv')
    fetchMock.mockResolvedValue(Response.json({ imported: 1 }))
    await client.apiRequest('imports', { method: 'POST', body })
    const options = fetchMock.mock.calls[0][1]
    expect(options.body).toBe(body)
    expect(options.headers.has('Content-Type')).toBe(false)
  })

  it('handles empty successful responses', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await expect(client.apiRequest('expenses/1', { method: 'DELETE' })).resolves.toBeNull()
  })

  it('reports validation details and preserves the error status', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: {
      message: 'Validation failed', details: [{ path: 'amount', message: 'Must be positive' }],
    } }, { status: 422 }))
    await expect(client.apiRequest('expenses')).rejects.toMatchObject({
      name: 'ApiError', status: 422, message: 'Validation failed. amount: Must be positive',
    })
  })

  it('calls the session handler for unauthorized responses only', async () => {
    const onUnauthorized = vi.fn()
    client.setUnauthorizedHandler(onUnauthorized)
    for (const status of [403, 401]) {
      fetchMock.mockResolvedValueOnce(Response.json({ message: 'Access denied' }, { status }))
      await expect(client.apiRequest('expenses')).rejects.toMatchObject({ status })
    }
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('wraps network failures with an actionable message', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(client.apiRequest('expenses')).rejects.toMatchObject({
      name: 'ApiError', message: 'Unable to reach the API. Check your network connection and try again.',
    })
  })

  it('rejects missing API configuration before making a request', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    vi.resetModules()
    const unconfigured = await import('./client.js')
    await expect(unconfigured.apiRequest('expenses')).rejects.toThrow('API is not configured')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
