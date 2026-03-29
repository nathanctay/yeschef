// src/scraper.test.ts

// Mock must be declared before any imports that use it
let capturedOptions: any = null
let capturedConfig: any = null
const mockRun = jest.fn()

jest.mock('@crawlee/playwright', () => ({
  PlaywrightCrawler: jest.fn().mockImplementation((options: any, config: any) => {
    capturedOptions = options
    capturedConfig = config
    return { run: mockRun }
  }),
  Configuration: jest.fn().mockImplementation((opts: any) => ({ _opts: opts })),
}))

import { scrapeUrl } from './scraper'

describe('scrapeUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    capturedOptions = null
    capturedConfig = null
  })

  it('returns HTML captured by requestHandler', async () => {
    mockRun.mockImplementation(async () => {
      await capturedOptions.requestHandler({ page: { content: async () => '<html>recipe</html>' } })
    })

    const result = await scrapeUrl('https://example.com/recipe')
    expect(result).toBe('<html>recipe</html>')
  })

  it('passes Configuration with persistStorage:false as second constructor argument', async () => {
    mockRun.mockImplementation(async () => {
      await capturedOptions.requestHandler({ page: { content: async () => '<html/>' } })
    })

    await scrapeUrl('https://example.com')

    const { Configuration } = jest.requireMock('@crawlee/playwright')
    expect(Configuration).toHaveBeenCalledWith({ persistStorage: false })
    expect(capturedConfig).toBeDefined()
  })

  it('sets maxRequestsPerCrawl to 1', async () => {
    mockRun.mockImplementation(async () => {
      await capturedOptions.requestHandler({ page: { content: async () => '<html/>' } })
    })

    await scrapeUrl('https://example.com')
    expect(capturedOptions.maxRequestsPerCrawl).toBe(1)
  })

  it('sets retryOnBlocked to true', async () => {
    mockRun.mockImplementation(async () => {
      await capturedOptions.requestHandler({ page: { content: async () => '<html/>' } })
    })

    await scrapeUrl('https://example.com')
    expect(capturedOptions.retryOnBlocked).toBe(true)
  })

  it('includes --no-sandbox and --disable-dev-shm-usage in launch args', async () => {
    mockRun.mockImplementation(async () => {
      await capturedOptions.requestHandler({ page: { content: async () => '<html/>' } })
    })

    await scrapeUrl('https://example.com')

    const args = capturedOptions.launchContext.launchOptions.args
    expect(args).toContain('--no-sandbox')
    expect(args).toContain('--disable-dev-shm-usage')
  })

  it('throws error from failedRequestHandler', async () => {
    mockRun.mockImplementation(async () => {
      await capturedOptions.failedRequestHandler({
        request: { errorMessages: ['Navigation timeout', 'Challenge failed'] },
      })
    })

    await expect(scrapeUrl('https://example.com')).rejects.toThrow('Navigation timeout; Challenge failed')
  })

  it('throws fallback message when failedRequestHandler receives empty errorMessages', async () => {
    mockRun.mockImplementation(async () => {
      await capturedOptions.failedRequestHandler({
        request: { errorMessages: [] },
      })
    })

    await expect(scrapeUrl('https://example.com')).rejects.toThrow('Request failed with no error message')
  })

  it('throws "No HTML captured" when run completes without calling requestHandler', async () => {
    mockRun.mockResolvedValue(undefined)
    await expect(scrapeUrl('https://example.com')).rejects.toThrow('No HTML captured')
  })
})
