import { createFileRoute, useRouter, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { requireAuth } from '../server/auth'
import { getRecipe, updateRecipe } from '../server/recipes'
import { RecipeForm } from '../components/RecipeForm'
import type { RecipeFormData } from '../components/RecipeForm'

export const Route = createFileRoute('/recipes/$id/edit')({
  loader: async ({ params }) => {
    const [recipe, session] = await Promise.all([
      getRecipe({ data: { id: params.id } }),
      requireAuth(),
    ])
    if (recipe.owner_id !== session.id) {
      throw redirect({ to: '/recipes/$id', params: { id: params.id } })
    }
    return { recipe }
  },
  component: EditRecipePage,
})

function EditRecipePage() {
  const { recipe } = Route.useLoaderData()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const content = recipe.content_json as {
    ingredients: Array<{ id?: string; text: string }>
    steps: Array<{ id?: string; text: string }>
    notes?: string
  }

  const defaultValues: Partial<RecipeFormData> = {
    title: recipe.title,
    description: recipe.description ?? '',
    visibility: recipe.visibility as 'public' | 'private',
    ingredients: content.ingredients,
    steps: content.steps,
    notes: content.notes ?? '',
    video_path: (recipe as any).video_path as string | null ?? null,
    images: (recipe as any).images as string[] ?? [],
    servings: (recipe as any).servings as number | null ?? null,
    prep_time_minutes: (recipe as any).prep_time_minutes as number | null ?? null,
    cook_time_minutes: (recipe as any).cook_time_minutes as number | null ?? null,
    total_time_minutes: (recipe as any).total_time_minutes as number | null ?? null,
    nutrition_json: (recipe as any).nutrition_json as RecipeFormData['nutrition_json'] ?? null,
  }

  async function handleSubmit(formData: FormData) {
    formData.append('id', recipe.id)
    setIsLoading(true)
    setError(null)
    try {
      const result = await updateRecipe({ data: formData })
      await router.navigate({ to: '/recipes/$id', params: { id: result.id } })
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update recipe')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{ fontFamily: 'serif', fontSize: '2rem', marginBottom: '24px', color: '#1F2937' }}>
        Edit Recipe
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
      <RecipeForm defaultValues={defaultValues} onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  )
}
