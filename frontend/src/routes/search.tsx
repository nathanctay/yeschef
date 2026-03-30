import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { searchRecipes, searchUsers } from '../server/search'
import { RecipeCard } from '../components/RecipeCard'

type RecipeResult = Awaited<ReturnType<typeof searchRecipes>>[number]
type UserResult = Awaited<ReturnType<typeof searchUsers>>[number]
type Tab = 'all' | 'recipes' | 'people'

export const Route = createFileRoute('/search')({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === 'string' ? search.q : '',
  }),
  component: SearchPage,
})

function SearchPage() {
  const { q } = Route.useSearch()
  const [recipes, setRecipes] = useState<RecipeResult[]>([])
  const [users, setUsers] = useState<UserResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('all')

  useEffect(() => {
    if (!q) return

    setLoading(true)
    setError(null)

    Promise.all([
      searchRecipes({ data: { query: q, limit: 20, offset: 0 } }),
      searchUsers({ data: { query: q, limit: 20, offset: 0 } }),
    ])
      .then(([r, u]) => {
        setRecipes(r)
        setUsers(u)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Search failed')
      })
      .finally(() => setLoading(false))
  }, [q])

  useEffect(() => {
    setTab('all')
  }, [q])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'recipes', label: `Recipes${recipes.length ? ` (${recipes.length})` : ''}` },
    { key: 'people', label: `People${users.length ? ` (${users.length})` : ''}` },
  ]

  function doFetch() {
    setError(null)
    setLoading(true)
    Promise.all([
      searchRecipes({ data: { query: q, limit: 20, offset: 0 } }),
      searchUsers({ data: { query: q, limit: 20, offset: 0 } }),
    ])
      .then(([r, u]) => {
        setRecipes(r)
        setUsers(u)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Search failed'))
      .finally(() => setLoading(false))
  }

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', marginBottom: '1.5rem' }}>
        {q ? `Results for "${q}"` : 'Search'}
      </h1>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '8px 16px',
              fontSize: '0.875rem',
              fontWeight: 500,
              background: 'none',
              border: 'none',
              borderBottom: tab === key ? '2px solid var(--primary)' : '2px solid transparent',
              color: tab === key ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              marginBottom: '-1px',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Searching...</p>
      )}

      {error && !loading && (
        <div style={{ color: '#E53935', fontSize: '0.875rem' }}>
          {error}{' '}
          <button
            onClick={doFetch}
            style={{ textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (tab === 'all' || tab === 'recipes') && (
        <section style={{ marginBottom: tab === 'all' ? '2.5rem' : 0 }}>
          {tab === 'all' && recipes.length > 0 && (
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1rem' }}>Recipes</h2>
          )}
          {recipes.length > 0 ? (
            <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={{
                    ...recipe,
                    like_count: 0,
                    log_count: 0,
                  }}
                />
              ))}
            </div>
          ) : tab === 'recipes' && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No recipes found for "{q}"
            </p>
          )}
        </section>
      )}

      {!loading && !error && (tab === 'all' || tab === 'people') && (
        <section>
          {tab === 'all' && users.length > 0 && (
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1rem' }}>People</h2>
          )}
          {users.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {users.map((user) => (
                <Link
                  key={user.id}
                  to="/profile/$id"
                  params={{ id: user.id }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    textDecoration: 'none',
                    color: 'var(--text)',
                    background: 'white',
                  }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--border)', overflow: 'hidden', flexShrink: 0 }}>
                    {user.avatar_url && (
                      <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{user.display_name}</span>
                </Link>
              ))}
            </div>
          ) : tab === 'people' && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No people found matching "{q}"
            </p>
          )}
          {tab === 'all' && recipes.length === 0 && users.length === 0 && !loading && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No results for "{q}"
            </p>
          )}
        </section>
      )}
    </main>
  )
}
