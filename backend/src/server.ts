// src/server.ts
import express from 'express'
import { scrapeUrl } from './scraper'

export function createApp(secret: string): express.Application {
  const app = express()
  app.use(express.json())

  // Health check — no auth required
  app.get('/health', (_req, res) => {
    res.json({ ok: true })
  })

  // Unknown route check — runs before auth so unrecognized paths get 404, not 401.
  // This service has exactly two routes and won't grow, so a static set is intentional.
  const knownRoutes = new Set(['GET /health', 'POST /scrape'])
  app.use((req, res, next) => {
    if (!knownRoutes.has(`${req.method} ${req.path}`)) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    next()
  })

  // Auth middleware — applies to all routes defined after this
  app.use((_req, res, next) => {
    if (_req.headers.authorization !== `Bearer ${secret}`) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    next()
  })

  // Concurrency guard — one Playwright scrape at a time on this 1GB machine
  let scraping = false

  app.post('/scrape', async (req, res) => {
    if (scraping) {
      res.status(503).json({ error: 'Server busy, try again shortly' })
      return
    }

    const { url } = req.body as { url?: string }
    try {
      new URL(url ?? '')
    } catch {
      res.status(422).json({ error: 'Invalid URL' })
      return
    }

    scraping = true
    try {
      const html = await scrapeUrl(url!)
      res.json({ html })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      res.status(500).json({ error: `Scrape failed: ${message}` })
    } finally {
      scraping = false
    }
  })

  return app
}
