import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import {
  listCookbooksWithMembership,
  addRecipeToCookbook,
  removeRecipeFromCookbook,
} from '../server/cookbooks'

type CookbookRow = Awaited<ReturnType<typeof listCookbooksWithMembership>>[number]

interface AddToCookbookDialogProps {
  isOpen: boolean
  onClose: () => void
  recipeId: string
}

export function AddToCookbookDialog({ isOpen, onClose, recipeId }: AddToCookbookDialogProps) {
  const [cookbooks, setCookbooks] = useState<CookbookRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setLoadError(null)
    listCookbooksWithMembership({ data: { recipeId } })
      .then(setCookbooks)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load cookbooks'))
      .finally(() => setLoading(false))
  }, [isOpen, recipeId])

  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  async function handleToggle(cookbook: CookbookRow) {
    if (rowLoading[cookbook.id]) return
    const wasIn = cookbook.containsRecipe

    setCookbooks((prev) =>
      prev.map((c) =>
        c.id === cookbook.id ? { ...c, containsRecipe: !wasIn } : c
      )
    )
    setRowLoading((prev) => ({ ...prev, [cookbook.id]: true }))
    setRowErrors((prev) => ({ ...prev, [cookbook.id]: '' }))

    try {
      if (wasIn) {
        await removeRecipeFromCookbook({ data: { cookbookId: cookbook.id, recipeId } })
      } else {
        await addRecipeToCookbook({ data: { cookbookId: cookbook.id, recipeId } })
      }
    } catch (err) {
      setCookbooks((prev) =>
        prev.map((c) =>
          c.id === cookbook.id ? { ...c, containsRecipe: wasIn } : c
        )
      )
      setRowErrors((prev) => ({
        ...prev,
        [cookbook.id]: err instanceof Error ? err.message : 'Failed',
      }))
    } finally {
      setRowLoading((prev) => ({ ...prev, [cookbook.id]: false }))
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.45)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: '#FFFDF8',
          border: '1px solid #F1E7DA',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          padding: '28px 32px',
          maxWidth: '420px',
          width: '90%',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <h2 style={{ fontFamily: 'serif', fontSize: '1.3rem', fontWeight: 700, color: '#1F2937', marginBottom: '20px', flexShrink: 0 }}>
          Add to Cookbook
        </h2>

        {loading && (
          <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Loading...</p>
        )}

        {loadError && (
          <p style={{ color: '#E53935', fontSize: '0.9rem' }}>{loadError}</p>
        )}

        {!loading && !loadError && cookbooks.length === 0 && (
          <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>
            You have no cookbooks yet.{' '}
            <Link to="/cookbooks/new" style={{ color: '#E53935', fontWeight: 600 }} onClick={onClose}>
              Create one
            </Link>
          </p>
        )}

        {!loading && !loadError && cookbooks.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, overflowY: 'auto', flex: 1 }}>
            {cookbooks.map((cookbook) => (
              <li
                key={cookbook.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid #F1E7DA',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1F2937', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cookbook.name}
                  </span>
                  {rowErrors[cookbook.id] && (
                    <span style={{ fontSize: '0.75rem', color: '#E53935' }}>
                      {rowErrors[cookbook.id]}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleToggle(cookbook)}
                  disabled={!!rowLoading[cookbook.id]}
                  style={{
                    marginLeft: '12px',
                    padding: '5px 12px',
                    border: cookbook.containsRecipe ? '1px solid #F1E7DA' : 'none',
                    borderRadius: '4px',
                    background: cookbook.containsRecipe ? 'transparent' : '#E53935',
                    color: cookbook.containsRecipe ? '#6B7280' : '#FFFFFF',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: rowLoading[cookbook.id] ? 'not-allowed' : 'pointer',
                    opacity: rowLoading[cookbook.id] ? 0.6 : 1,
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {rowLoading[cookbook.id]
                    ? '...'
                    : cookbook.containsRecipe
                    ? 'Remove'
                    : 'Add'}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              border: '1px solid #F1E7DA',
              borderRadius: '6px',
              background: '#FFFDF8',
              color: '#6B7280',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
