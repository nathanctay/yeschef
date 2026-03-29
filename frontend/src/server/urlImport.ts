import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

function isCloudflareChallenge(html: string): boolean {
  return (
    html.includes('cf_chl_opt') ||
    html.includes('cf-browser-verification') ||
    html.includes('Checking if the site connection is secure') ||
    (html.includes('Just a moment') && html.includes('cloudflare'))
  )
}

async function fetchViaScraperService(url: string): Promise<string> {
  const serviceUrl = process.env.SCRAPER_SERVICE_URL
  const secret = process.env.SCRAPER_SECRET
  if (!serviceUrl || !secret) {
    throw new Error(
      'This site uses bot protection. Configure SCRAPER_SERVICE_URL and SCRAPER_SECRET to enable imports from sites like AllRecipes.',
    )
  }
  console.log('[urlImport] retrying via scraper service')
  const res = await fetch(`${serviceUrl}/scrape`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(45000),
  })
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => ({}))
    const msg = typeof body === 'object' && body !== null && typeof (body as Record<string, unknown>).error === 'string'
      ? (body as Record<string, unknown>).error as string
      : `Scraper service returned ${res.status}`
    throw new Error(msg)
  }
  const body: unknown = await res.json()
  if (typeof body !== 'object' || body === null || typeof (body as Record<string, unknown>).html !== 'string') {
    throw new Error('Scraper service returned an unexpected response shape')
  }
  return (body as { html: string }).html
}

interface ParsedRecipe {
  title: string
  description: string
  ingredients: Array<{ id: string; text: string }>
  steps: Array<{ id: string; text: string }>
  notes: string
}

function makeId() {
  return crypto.randomUUID()
}

export function parseJsonLd(html: string): ParsedRecipe | null {
  const scriptMatches = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
  for (const match of scriptMatches) {
    try {
      const json = JSON.parse(match[1])
      const schemas = Array.isArray(json) ? json : json['@graph'] ? json['@graph'] : [json]
      for (const schema of schemas) {
        if (schema['@type'] !== 'Recipe') continue
        const ingredients = (schema.recipeIngredient ?? []).map((text: string) => ({ id: makeId(), text }))
        const stepsRaw = schema.recipeInstructions ?? []
        const steps = (Array.isArray(stepsRaw) ? stepsRaw : [stepsRaw]).map((s: any) => ({
          id: makeId(),
          text: typeof s === 'string' ? s : s.text ?? '',
        }))
        return {
          title: schema.name ?? '',
          description: schema.description ?? '',
          ingredients,
          steps,
          notes: '',
        }
      }
    } catch {}
  }
  return null
}

export function parseHeuristic(html: string): ParsedRecipe | null {
  function stripTags(s: string) { return s.replace(/<[^>]+>/g, '').trim() }

  const ingredientMatches = [...html.matchAll(/itemprop="recipeIngredient"[^>]*>([\s\S]*?)</gi)]
  const stepMatches = [...html.matchAll(/itemprop="(?:recipeInstructions|step)"[^>]*>([\s\S]*?)</gi)]
  const nameMatch = html.match(/itemprop="name"[^>]*>([\s\S]*?)</)

  if (ingredientMatches.length > 0 || stepMatches.length > 0) {
    return {
      title: nameMatch ? stripTags(nameMatch[1]) : '',
      description: '',
      ingredients: ingredientMatches.map((m) => ({ id: makeId(), text: stripTags(m[1]) })).filter((i) => i.text),
      steps: stepMatches.map((m) => ({ id: makeId(), text: stripTags(m[1]) })).filter((s) => s.text),
      notes: '',
    }
  }

  return null
}

export const importRecipeFromUrl = createServerFn({ method: 'POST' })
  .inputValidator((data: { url: string }) =>
    z.object({ url: z.string().url() }).parse(data)
  )
  .handler(async ({ data }) => {
    let html: string
    try {
      console.log('[urlImport] fetching URL:', data.url)
      const res = await fetch(data.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; yesChef/1.0)' },
        signal: AbortSignal.timeout(10000),
      })
      html = await res.text()
      console.log('[urlImport] fetch complete — ok:', res.ok, 'status:', res.status, 'html.length:', html.length)
      // Don't throw on 4xx — many sites (AllRecipes, etc.) return 403 via bot-protection
      // middleware but still include the full recipe HTML. Let parsing decide if we got usable content.
      if (res.status >= 500) throw new Error(`Fetch failed: ${res.status}`)
    } catch (err) {
      console.log('[urlImport] fetch error:', err instanceof Error ? err.message : String(err))
      throw new Error('Could not fetch that URL. Check the address and try again.')
    }

    // Debug: show all JSON-LD script blocks and their @type values
    const allScripts = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
    console.log('[urlImport] JSON-LD script blocks found:', allScripts.length)
    for (const [i, m] of allScripts.entries()) {
      try {
        const j = JSON.parse(m[1])
        const schemas = Array.isArray(j) ? j : j['@graph'] ? j['@graph'] : [j]
        console.log(`[urlImport] block ${i} types:`, schemas.map((s: any) => s['@type']).join(', '))
      } catch { console.log(`[urlImport] block ${i} parse error`) }
    }
    // Debug: check for __NEXT_DATA__ or similar embedded data
    const hasNextData = html.includes('__NEXT_DATA__')
    const hasNextJson = html.includes('"@type":"Recipe"') || html.includes('"@type": "Recipe"')
    console.log('[urlImport] __NEXT_DATA__ present:', hasNextData, '| inline Recipe type:', hasNextJson)

    // If the response looks like a Cloudflare challenge, retry via scraper service
    if (isCloudflareChallenge(html)) {
      console.log('[urlImport] Cloudflare challenge detected — attempting scraper service fallback')
      html = await fetchViaScraperService(data.url)
      console.log('[urlImport] scraper service fetch complete — html.length:', html.length)
    }

    const jsonLdResult = parseJsonLd(html)
    console.log('[urlImport] parseJsonLd result:', jsonLdResult !== null ? 'found' : 'null')
    let result = jsonLdResult
    if (!result) {
      const heuristicResult = parseHeuristic(html)
      console.log('[urlImport] parseHeuristic result:', heuristicResult !== null ? 'found' : 'null')
      result = heuristicResult
    }
    if (!result) {
      throw new Error('Could not parse a recipe from that page. Try a different site or enter the recipe manually.')
    }

    return result
  })
