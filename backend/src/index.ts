// src/index.ts
import { createApp } from './server'

const secret = process.env.SCRAPER_SECRET
if (!secret) {
  console.error('SCRAPER_SECRET env var is required')
  process.exit(1)
}

const port = parseInt(process.env.PORT ?? '3000', 10)
const app = createApp(secret)
app.listen(port, () => {
  console.log(`Scraper service listening on port ${port}`)
})
