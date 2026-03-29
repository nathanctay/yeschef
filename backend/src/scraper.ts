// src/scraper.ts
import { PlaywrightCrawler, Configuration } from '@crawlee/playwright'

export async function scrapeUrl(url: string): Promise<string> {
  let html = ''
  let scrapeError: Error | null = null

  const config = new Configuration({ persistStorage: false })

  const crawler = new PlaywrightCrawler(
    {
      retryOnBlocked: true, // detects Cloudflare Turnstile selector; waits 5s for auto-resolution; retries via SessionError if still blocked
      maxRequestsPerCrawl: 1,
      navigationTimeoutSecs: 30,
      requestHandlerTimeoutSecs: 35,
      launchContext: {
        launchOptions: {
          args: ['--no-sandbox', '--disable-dev-shm-usage'],
        },
      },
      async requestHandler({ page }) {
        html = await page.content()
      },
      async failedRequestHandler({ request }) {
        const msg = request.errorMessages.join('; ')
        scrapeError = new Error(msg || 'Request failed with no error message')
      },
    },
    config,
  )

  // crawler.run() throws directly only on Playwright launch failure.
  // Request-level failures (including blocked/challenge failures) go to failedRequestHandler.
  await crawler.run([{ url }])

  if (scrapeError) throw scrapeError
  if (!html) throw new Error('No HTML captured')
  return html
}
