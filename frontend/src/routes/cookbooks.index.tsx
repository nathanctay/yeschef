import { createFileRoute, Link } from '@tanstack/react-router'
import { listCookbooks } from '../server/cookbooks'
import CookbookCard from '../components/CookbookCard'
import { requireAuth } from '../server/auth'

export const Route = createFileRoute('/cookbooks/')({
  beforeLoad: async () => {
    await requireAuth()
  },
  loader: async () => {
    return await listCookbooks()
  },
  component: CookbooksPage,
})

function CookbooksPage() {
  const cookbooks = Route.useLoaderData()

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1F2937]">My Cookbooks</h1>
        <Link
          to="/cookbooks/new"
          className="px-4 py-2 rounded-md bg-[#E53935] text-white text-sm font-medium hover:bg-[#CC332F] transition-colors"
        >
          New Cookbook
        </Link>
      </div>

      {cookbooks.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[#6B7280] text-lg mb-4">
            Create your first cookbook
          </p>
          <Link
            to="/cookbooks/new"
            className="px-5 py-2.5 rounded-md bg-[#E53935] text-white font-medium hover:bg-[#CC332F] transition-colors"
          >
            Get started
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {cookbooks.map((cookbook) => (
            <CookbookCard key={cookbook.id} cookbook={cookbook} />
          ))}
        </div>
      )}
    </main>
  )
}
