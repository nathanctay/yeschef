// src/server.test.ts
import request from 'supertest'

jest.mock('./scraper')
import { scrapeUrl } from './scraper'
const mockScrapeUrl = scrapeUrl as jest.MockedFunction<typeof scrapeUrl>

import { createApp } from './server'

const TEST_SECRET = 'test-secret-123'
const app = createApp(TEST_SECRET)
const authHeader = { Authorization: `Bearer ${TEST_SECRET}` }

describe('GET /health', () => {
  it('returns 200 without auth', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })
})

describe('POST /scrape — auth', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app).post('/scrape').send({ url: 'https://example.com' })
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'Unauthorized' })
  })

  it('returns 401 when secret is wrong', async () => {
    const res = await request(app)
      .post('/scrape')
      .set('Authorization', 'Bearer wrong-secret')
      .send({ url: 'https://example.com' })
    expect(res.status).toBe(401)
  })
})

describe('POST /scrape — input validation', () => {
  it('returns 422 when url is missing', async () => {
    const res = await request(app).post('/scrape').set(authHeader).send({})
    expect(res.status).toBe(422)
    expect(res.body).toEqual({ error: 'Invalid URL' })
  })

  it('returns 422 when url is not a valid URL', async () => {
    const res = await request(app).post('/scrape').set(authHeader).send({ url: 'not-a-url' })
    expect(res.status).toBe(422)
    expect(res.body).toEqual({ error: 'Invalid URL' })
  })
})

describe('POST /scrape — success and failure', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 200 with html on success', async () => {
    mockScrapeUrl.mockResolvedValue('<html>recipe</html>')

    const res = await request(app)
      .post('/scrape')
      .set(authHeader)
      .send({ url: 'https://www.allrecipes.com/recipe/123' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ html: '<html>recipe</html>' })
    expect(mockScrapeUrl).toHaveBeenCalledWith('https://www.allrecipes.com/recipe/123')
  })

  it('returns 500 with error message when scrapeUrl throws', async () => {
    mockScrapeUrl.mockRejectedValue(new Error('Cloudflare challenge failed'))

    const res = await request(app)
      .post('/scrape')
      .set(authHeader)
      .send({ url: 'https://www.allrecipes.com/recipe/123' })

    expect(res.status).toBe(500)
    expect(res.body.error).toContain('Cloudflare challenge failed')
  })
})

describe('POST /scrape — concurrency', () => {
  it('returns 503 when a scrape is already in progress', async () => {
    let resolve!: (value: string) => void
    mockScrapeUrl.mockReturnValue(new Promise<string>((r) => { resolve = r }))

    // Initiate first request immediately (.then() triggers the HTTP send without blocking)
    const first = request(app)
      .post('/scrape')
      .set(authHeader)
      .send({ url: 'https://example.com' })
      .then((r) => r)

    // Give Express time to receive the first request and set scraping = true
    await new Promise((r) => setTimeout(r, 20))

    const second = await request(app)
      .post('/scrape')
      .set(authHeader)
      .send({ url: 'https://example.com' })

    expect(second.status).toBe(503)
    expect(second.body).toEqual({ error: 'Server busy, try again shortly' })

    resolve('<html/>')
    await first
  })
})

describe('unknown routes', () => {
  it('returns 404 for unknown route', async () => {
    const res = await request(app).get('/unknown')
    expect(res.status).toBe(404)
  })
})
