import { createFileRoute, Link } from '@tanstack/react-router'
import { requireAuth } from '../server/auth'
import { listRecipesForUser } from '../server/recipes'
import { RecipeCard } from '../components/RecipeCard'

export const Route = createFileRoute('/recipes/')({
  beforeLoad: async () => {
    const user = await requireAuth()
    return { user }
  },
  loader: async ({ context }) => {
    const recipes = await listRecipesForUser({ data: { userId: context.user.id } })
    return { recipes }
  },
  component: MyRecipesPage,
})

function MyRecipesPage() {
  const { recipes } = Route.useLoaderData()

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1F2937]">My Recipes</h1>
        <Link
          to="/recipes/new"
          className="px-4 py-2 rounded-md bg-[#E53935] text-white text-sm font-medium hover:bg-[#CC332F] transition-colors"
        >
          New Recipe
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[#6B7280] text-lg mb-4">
            You haven't added any recipes yet.
          </p>
          <Link
            to="/recipes/new"
            className="text-[#E53935] font-medium hover:underline"
          >
            Add your first recipe
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <div key={recipe.id} style={{ position: 'relative' }}>
              <RecipeCard recipe={recipe} />
              {recipe.visibility === 'private' && (
                <span
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    background: 'rgba(0,0,0,0.55)',
                    color: '#fff',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    letterSpacing: '0.03em',
                  }}
                >
                  Private
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
