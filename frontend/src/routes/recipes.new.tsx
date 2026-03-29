import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { requireAuth } from '../server/auth'
import { createRecipe } from '../server/recipes'
import { RecipeForm } from '../components/RecipeForm'
import type { RecipeFormData } from '../components/RecipeForm'
import { importRecipeFromUrl } from '../server/urlImport'

export const Route = createFileRoute('/recipes/new')({
  beforeLoad: async () => {
    await requireAuth()
  },
  component: NewRecipePage,
})

function NewRecipePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importUrl, setImportUrl] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [prefill, setPrefill] = useState<Partial<RecipeFormData> | undefined>(undefined)

  async function handleImport() {
    if (!importUrl.trim()) return
    setIsImporting(true)
    setImportError(null)
    try {
      const parsed = await importRecipeFromUrl({ data: { url: importUrl.trim() } })
      setPrefill(parsed)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)
    try {
      const result = await createRecipe({ data: formData })
      await router.navigate({ to: '/recipes/$id', params: { id: result.id } })
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create recipe')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontFamily: 'serif', fontSize: '2rem', marginBottom: '24px', color: '#1F2937' }}>
        New Recipe
      </h1>
      <div style={{ marginBottom: '24px', padding: '16px', border: '1px solid #F1E7DA', borderRadius: '8px', background: '#FFFDF8' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.9rem', color: '#1F2937' }}>
          Import from URL
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="url"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            placeholder="https://www.allrecipes.com/recipe/..."
            style={{ flex: 1, padding: '8px 10px', border: '1px solid #F1E7DA', borderRadius: '4px', fontSize: '0.9rem', color: '#1F2937', background: '#fff' }}
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting || !importUrl.trim()}
            style={{ padding: '8px 16px', border: 'none', borderRadius: '4px', background: '#E53935', color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', opacity: isImporting ? 0.7 : 1 }}
          >
            {isImporting ? 'Importing...' : 'Import'}
          </button>
        </div>
        {importError && <p style={{ color: '#E53935', fontSize: '0.8rem', marginTop: '6px' }}>{importError}</p>}
      </div>
      {error && (
        <div
          style={{
            background: '#FEE2E2',
            border: '1px solid #E53935',
            borderRadius: '4px',
            padding: '10px 14px',
            marginBottom: '18px',
            color: '#E53935',
            fontSize: '0.9rem',
          }}
        >
          {error}
        </div>
      )}
      <RecipeForm
        key={JSON.stringify(prefill)}
        defaultValues={prefill}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  )
}
