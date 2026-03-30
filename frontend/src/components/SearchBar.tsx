import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { useDebounce } from '../hooks/useDebounce'
import { searchRecipes, searchUsers } from '../server/search'

type RecipeResult = {
  id: string
  title: string
  description: string | null
  cover_image_path: string | null
  rating_avg: number | null
  rating_count: number
  owner: { id: string; display_name: string; avatar_url: string | null }
}

type UserResult = {
  id: string
  display_name: string
  avatar_url: string | null
}

type DropdownResults = {
  recipes: RecipeResult[]
  users: UserResult[]
}

export function SearchBar() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [dropdown, setDropdown] = useState<DropdownResults | null>(null)
  const debouncedQuery = useDebounce(query, 300)
  const containerRef = useRef<HTMLDivElement>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setDropdown(null)
      setOpen(false)
      return
    }

    const id = ++requestIdRef.current
    setLoading(true)

    Promise.all([
      searchRecipes({ data: { query: debouncedQuery, limit: 3, offset: 0 } }),
      searchUsers({ data: { query: debouncedQuery, limit: 2, offset: 0 } }),
    ])
      .then(([recipes, users]) => {
        if (id !== requestIdRef.current) return
        setDropdown({ recipes, users })
        setOpen(recipes.length > 0 || users.length > 0)
      })
      .catch(() => {
        if (id !== requestIdRef.current) return
        setDropdown(null)
        setOpen(false)
      })
      .finally(() => {
        if (id !== requestIdRef.current) return
        setLoading(false)
      })
  }, [debouncedQuery])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && query.trim()) {
      setOpen(false)
      navigate({ to: '/search', search: { q: query.trim() } })
    }
  }

  function handleSeeAll() {
    if (!query.trim()) return
    setOpen(false)
    navigate({ to: '/search', search: { q: query.trim() } })
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder="Search recipes, people..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{
          width: '220px',
          padding: '6px 12px',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          fontSize: '0.875rem',
          color: 'var(--text)',
          backgroundColor: 'var(--surface-strong)',
          outline: 'none',
          opacity: loading ? 0.7 : 1,
          transition: 'opacity 0.15s ease, border-color 0.15s ease',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)' }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
      />

      {open && dropdown && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '280px',
            background: 'var(--surface-strong)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          {dropdown.recipes.length > 0 && (
            <div>
              <div style={{ padding: '8px 12px 4px', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Recipes
              </div>
              {dropdown.recipes.map((recipe) => (
                <Link
                  key={recipe.id}
                  to="/recipes/$id"
                  params={{ id: recipe.id }}
                  onClick={() => setOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', textDecoration: 'none', color: 'var(--text)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'rgba(241,231,218,0.4)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '' }}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '4px', background: 'var(--border)', overflow: 'hidden', flexShrink: 0 }}>
                    {recipe.cover_image_path && (
                      <img src={recipe.cover_image_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {recipe.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      by {recipe.owner.display_name}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {dropdown.recipes.length > 0 && dropdown.users.length > 0 && (
            <div style={{ height: '1px', background: 'var(--border)', margin: '0 12px' }} />
          )}

          {dropdown.users.length > 0 && (
            <div>
              <div style={{ padding: '8px 12px 4px', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                People
              </div>
              {dropdown.users.map((user) => (
                <Link
                  key={user.id}
                  to="/profile/$id"
                  params={{ id: user.id }}
                  onClick={() => setOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', textDecoration: 'none', color: 'var(--text)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'rgba(241,231,218,0.4)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '' }}
                >
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--border)', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border)' }}>
                    {user.avatar_url && (
                      <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    {user.display_name}
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={handleSeeAll}
              style={{ display: 'block', width: '100%', padding: '10px 12px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 500, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              See all results
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
