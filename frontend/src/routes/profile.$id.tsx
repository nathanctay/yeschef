import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { getSession } from '../server/auth'
import { getProfile, followUser, unfollowUser } from '../server/profiles'
import { listRecipesForUser } from '../server/recipes'
import { listLogsForUser } from '../server/logs'
import { listCookbooksForUser } from '../server/cookbooks'
import { RecipeCard } from '../components/RecipeCard'
import LogRow from '../components/LogRow'

export const Route = createFileRoute('/profile/$id')({
  loader: async ({ params }) => {
    const profileId = params.id
    const [profile, viewer] = await Promise.all([
      getProfile({ data: { id: profileId } }),
      getSession(),
    ])
    const [recipes, logs, cookbooks] = await Promise.all([
      listRecipesForUser({ data: { userId: profileId } }),
      listLogsForUser({ data: { userId: profileId } }),
      listCookbooksForUser({ data: { userId: profileId } }),
    ])
    return { profile, viewer, recipes, logs, cookbooks }
  },
  component: PublicProfilePage,
})

type Tab = 'recipes' | 'logs' | 'cookbooks'

function PublicProfilePage() {
  const { profile, viewer, recipes, logs, cookbooks } = Route.useLoaderData()
  const [activeTab, setActiveTab] = useState<Tab>('recipes')
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  const isOwnProfile = viewer?.id === profile.id
  const canFollow = viewer !== null && !isOwnProfile

  const initials = profile.display_name
    ? profile.display_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  async function handleFollow() {
    setFollowLoading(true)
    try {
      if (isFollowing) {
        await unfollowUser({ data: { id: profile.id } })
        setIsFollowing(false)
      } else {
        await followUser({ data: { id: profile.id } })
        setIsFollowing(true)
      }
    } finally {
      setFollowLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex items-center gap-4">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.display_name ?? 'Avatar'}
            className="h-20 w-20 rounded-full object-cover border-2 border-[#F1E7DA]"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#E53935] text-2xl font-bold text-white">
            {initials}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937]">
            {profile.display_name ?? 'Unnamed Chef'}
          </h1>
          {canFollow && (
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`mt-2 rounded-lg px-4 py-1.5 text-sm font-semibold transition disabled:opacity-50 ${
                isFollowing
                  ? 'border border-[#F1E7DA] bg-[#FFFDF8] text-[#1F2937] hover:border-[#E53935] hover:text-[#E53935]'
                  : 'bg-[#E53935] text-white hover:bg-[#C62828]'
              }`}
            >
              {followLoading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          )}
        </div>
      </header>

      <div className="mb-6 flex gap-6 rounded-xl border border-[#F1E7DA] bg-[#FFFDF8] px-6 py-4">
        {[
          { label: 'Recipes', value: profile.recipe_count },
          { label: 'Logs', value: profile.log_count },
          { label: 'Cookbooks', value: profile.cookbook_count },
          { label: 'Following', value: profile.following_count },
          { label: 'Followers', value: profile.follower_count },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center">
            <span className="text-xl font-bold text-[#1F2937]">{value}</span>
            <span className="text-xs text-[#1F2937]/60">{label}</span>
          </div>
        ))}
      </div>

      <div className="mb-4 flex gap-2 border-b border-[#F1E7DA]">
        {(['recipes', 'logs', 'cookbooks'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold capitalize transition ${
              activeTab === tab
                ? 'border-b-2 border-[#E53935] text-[#E53935]'
                : 'text-[#1F2937]/60 hover:text-[#1F2937]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'recipes' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.length === 0 ? (
            <p className="col-span-full text-sm text-[#1F2937]/60">No recipes yet.</p>
          ) : (
            recipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="flex flex-col gap-2">
          {logs.length === 0 ? (
            <p className="text-sm text-[#1F2937]/60">No logs yet.</p>
          ) : (
            logs.map((log) => <LogRow key={log.id} log={log} />)
          )}
        </div>
      )}

      {activeTab === 'cookbooks' && (
        <p className="text-sm text-[#1F2937]/60">No public cookbooks yet.</p>
      )}
    </main>
  )
}
