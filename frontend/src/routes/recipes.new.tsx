import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { requireAuth } from '../server/auth'
import { createRecipe } from '../server/recipes'
import { RecipeForm } from '../components/RecipeForm'

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
      <RecipeForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  )
}
