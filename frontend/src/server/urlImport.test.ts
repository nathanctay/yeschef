// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { parseJsonLd, parseHeuristic } from './urlImport'

describe('parseJsonLd', () => {
  it('extracts recipe from JSON-LD script block', () => {
    const html = `
      <script type="application/ld+json">
        {"@type":"Recipe","name":"Pasta","recipeIngredient":["200g pasta","salt"],"recipeInstructions":[{"@type":"HowToStep","text":"Boil water"}]}
      </script>
    `
    const result = parseJsonLd(html)
    expect(result?.title).toBe('Pasta')
    expect(result?.ingredients).toHaveLength(2)
    expect(result?.steps).toHaveLength(1)
    expect(result?.steps[0].text).toBe('Boil water')
  })

  it('returns null when no Recipe schema found', () => {
    expect(parseJsonLd('<html><body>no json-ld</body></html>')).toBeNull()
  })

  it('extracts recipe from @graph structure', () => {
    const html = `
      <script type="application/ld+json">
        {"@graph":[{"@type":"WebPage","name":"page"},{"@type":"Recipe","name":"Soup","recipeIngredient":["water"],"recipeInstructions":"Boil it"}]}
      </script>
    `
    const result = parseJsonLd(html)
    expect(result?.title).toBe('Soup')
    expect(result?.ingredients).toHaveLength(1)
  })

  it('returns null for invalid JSON in script block', () => {
    const html = `<script type="application/ld+json">{ invalid json }</script>`
    expect(parseJsonLd(html)).toBeNull()
  })

  it('handles mixed string and object steps in recipeInstructions array', () => {
    const html = `
      <script type="application/ld+json">
        {"@type":"Recipe","name":"Stew","recipeIngredient":["beef"],"recipeInstructions":[{"@type":"HowToStep","text":"Brown the beef"},"Season generously"]}
      </script>
    `
    const result = parseJsonLd(html)
    expect(result?.steps).toHaveLength(2)
    expect(result?.steps[0].text).toBe('Brown the beef')
    expect(result?.steps[1].text).toBe('Season generously')
  })
})

describe('parseHeuristic', () => {
  it('extracts ingredients from itemprop microdata', () => {
    const html = `
      <span itemprop="recipeIngredient">2 cups flour</span>
      <span itemprop="recipeIngredient">1 tsp salt</span>
    `
    const result = parseHeuristic(html)
    expect(result?.ingredients).toHaveLength(2)
    expect(result?.ingredients[0].text).toBe('2 cups flour')
  })

  it('returns null when no microdata found', () => {
    expect(parseHeuristic('<html><body>no microdata</body></html>')).toBeNull()
  })

  it('extracts title from itemprop="name"', () => {
    const html = `
      <h1 itemprop="name">Chocolate Cake</h1>
      <span itemprop="recipeIngredient">flour</span>
    `
    const result = parseHeuristic(html)
    expect(result?.title).toBe('Chocolate Cake')
  })
})
