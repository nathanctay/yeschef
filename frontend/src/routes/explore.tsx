import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { requireAuth } from '../server/auth'
import { listRecipes } from '../server/recipes'
import { RecipeCard } from '../components/RecipeCard'

export const Route = createFileRoute('/explore')({
  beforeLoad: async () => {
    const user = await requireAuth()
    return { user }
  },
  loader: async ({ context }) => {
    const recipes = await listRecipes({ data: { limit: 50 } })
    return { recipes, viewer: context.user }
  },
  component: ExplorePage,
})

function ExplorePage() {
  const { recipes: initialRecipes } = Route.useLoaderData()
  const [recipes, setRecipes] = useState(initialRecipes)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialRecipes.length === 50)

  async function loadMore() {
    if (recipes.length === 0) return
    setIsLoadingMore(true)
    try {
      const oldest = recipes[recipes.length - 1]
      const more = await listRecipes({
        data: { limit: 50, cursor: oldest.created_at },
      })
      setRecipes((prev) => [...prev, ...more])
      if (more.length < 50) setHasMore(false)
    } finally {
      setIsLoadingMore(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold text-[#1F2937]">Explore</h1>

      {recipes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="text-base text-[#1F2937]/60">
            No recipes yet. Be the first to add one!
          </p>
          <Link
            to="/recipes/new"
            className="rounded-lg bg-[#E53935] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#C62828]"
          >
            Add a Recipe
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-10 flex justify-center">
              <button
                onClick={loadMore}
                disabled={isLoadingMore}
                className="rounded-xl border border-[#F1E7DA] bg-[#FFFDF8] px-8 py-3 text-sm font-semibold text-[#1F2937] transition hover:border-[#E53935] hover:text-[#E53935] disabled:opacity-50"
              >
                {isLoadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </main>
  )
}
