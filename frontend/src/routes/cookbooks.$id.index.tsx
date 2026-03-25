import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import {
  getCookbook,
  deleteCookbook,
  addRecipeToCookbook,
  removeRecipeFromCookbook,
} from '../server/cookbooks'
import { listRecipesForUser } from '../server/recipes'
import { getSession } from '../server/auth'
import { useQueryClient } from '@tanstack/react-query'

export const Route = createFileRoute('/cookbooks/$id/')({
  loader: async ({ params }) => {
    const [cookbook, session] = await Promise.all([
      getCookbook({ data: { id: params.id } }),
      getSession(),
    ])
    const userRecipes = session
      ? await listRecipesForUser({ data: { userId: session.id } })
      : []
    return { cookbook, userRecipes }
  },
  component: CookbookDetailPage,
})

function CookbookDetailPage() {
  const { cookbook, userRecipes } = Route.useLoaderData()
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [recipeFilter, setRecipeFilter] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string

  const coverBg =
    cookbook.cover_style === 'image' && cookbook.cover_image_path
      ? undefined
      : cookbook.cover_color ?? undefined

  async function handleRemoveRecipe(recipeId: string) {
    try {
      await removeRecipeFromCookbook({
        data: { cookbookId: id, recipeId },
      })
      qc.invalidateQueries({ queryKey: ['cookbooks', id] })
      navigate({ to: '/cookbooks/$id/', params: { id } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove recipe')
    }
  }

  async function handleAddRecipe(recipeId: string) {
    try {
      await addRecipeToCookbook({
        data: { cookbookId: id, recipeId },
      })
      qc.invalidateQueries({ queryKey: ['cookbooks', id] })
      setRecipeFilter('')
      navigate({ to: '/cookbooks/$id/', params: { id } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add recipe')
    }
  }

  async function handleConfirmDelete() {
    setIsDeleting(true)
    try {
      await deleteCookbook({ data: { id } })
      navigate({ to: '/cookbooks' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete cookbook')
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const existingRecipeIds = new Set(cookbook.recipes.map((r) => r.id))
  const filteredUserRecipes = userRecipes.filter(
    (r) =>
      !existingRecipeIds.has(r.id) &&
      r.title.toLowerCase().includes(recipeFilter.toLowerCase())
  )

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Cookbook header */}
      <div className="flex gap-5 items-start mb-8">
        <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 border border-[#F1E7DA]">
          {cookbook.cover_style === 'image' && cookbook.cover_image_path ? (
            <img
              src={`${supabaseUrl}/storage/v1/object/public/cookbook-covers/${cookbook.cover_image_path}`}
              alt={cookbook.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full"
              style={
                coverBg
                  ? { backgroundColor: coverBg }
                  : {
                      background:
                        'linear-gradient(135deg, #E53935 0%, #F1E7DA 100%)',
                    }
              }
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-[#1F2937]">{cookbook.name}</h1>
            <Link
              to="/cookbooks/$id/edit"
              params={{ id }}
              className="px-3 py-1 rounded border border-[#F1E7DA] bg-[#FFFDF8] text-[#1F2937] text-sm font-semibold hover:border-[#E53935] transition-colors"
            >
              Edit
            </Link>
          </div>
          {cookbook.description && (
            <p className="text-[#6B7280] mt-1">{cookbook.description}</p>
          )}
        </div>
      </div>

      {/* Recipe list */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-[#1F2937] mb-3">Recipes</h2>
        {cookbook.recipes.length === 0 ? (
          <p className="text-[#6B7280] text-sm">
            No recipes yet. Add one below.
          </p>
        ) : (
          <ul className="divide-y divide-[#F1E7DA]">
            {cookbook.recipes.map((recipe) => (
              <li key={recipe.id} className="flex items-center gap-3 py-3">
                {recipe.cover_image_path ? (
                  <img
                    src={`${supabaseUrl}/storage/v1/object/public/recipe-covers/${recipe.cover_image_path}`}
                    alt={recipe.title}
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-[#F1E7DA] flex-shrink-0" />
                )}
                <Link
                  to="/recipes/$id"
                  params={{ id: recipe.id }}
                  className="flex-1 text-[#1F2937] hover:text-[#E53935] font-medium truncate"
                >
                  {recipe.title}
                </Link>
                <button
                  onClick={() => handleRemoveRecipe(recipe.id)}
                  className="text-sm text-[#6B7280] hover:text-[#E53935] transition-colors flex-shrink-0"
                  aria-label={`Remove ${recipe.title} from cookbook`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Add Recipe section */}
      <section className="mb-10 p-4 rounded-lg border border-[#F1E7DA] bg-[#FFFDF8]">
        <h2 className="text-base font-semibold text-[#1F2937] mb-3">
          Add a Recipe
        </h2>
        <input
          type="text"
          placeholder="Search your recipes..."
          value={recipeFilter}
          onChange={(e) => setRecipeFilter(e.target.value)}
          className="w-full border border-[#F1E7DA] rounded-md px-3 py-2 text-sm text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#E53935] bg-white mb-2"
        />
        {recipeFilter.length > 0 && (
          <ul className="max-h-48 overflow-y-auto border border-[#F1E7DA] rounded-md divide-y divide-[#F1E7DA] bg-white">
            {filteredUserRecipes.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[#6B7280]">
                No matching recipes
              </li>
            ) : (
              filteredUserRecipes.map((recipe) => (
                <li
                  key={recipe.id}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <span className="text-sm text-[#1F2937] truncate">
                    {recipe.title}
                  </span>
                  <button
                    onClick={() => handleAddRecipe(recipe.id)}
                    className="ml-3 text-sm font-medium text-[#E53935] hover:text-[#CC332F] flex-shrink-0"
                  >
                    Add
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </section>

      {/* Danger zone */}
      <div className="border-t border-[#F1E7DA] pt-6">
        <button
          onClick={() => setShowDeleteDialog(true)}
          className="px-4 py-2 rounded-md border border-[#E53935] text-[#E53935] text-sm font-medium hover:bg-red-50 transition-colors"
        >
          Delete Cookbook
        </button>
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Cookbook"
        message="Delete this cookbook? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteDialog(false)}
        isLoading={isDeleting}
      />
    </main>
  )
}
