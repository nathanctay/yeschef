import { useState, useEffect } from 'react'
import { shareCookbook, revokeCookbookShare, listCookbookShares } from '../server/cookbookShares'

type ShareRow = Awaited<ReturnType<typeof listCookbookShares>>[number]

interface ShareCookbookPanelProps {
  isOpen: boolean
  onClose: () => void
  cookbookId: string
}

export function ShareCookbookPanel({ isOpen, onClose, cookbookId }: ShareCookbookPanelProps) {
  const [shares, setShares] = useState<ShareRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [permission, setPermission] = useState<'view' | 'edit'>('view')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)

  const [revokingIds, setRevokingIds] = useState<Set<string>>(new Set())
  const [revokeErrors, setRevokeErrors] = useState<Record<string, string>>({})

  function loadShares() {
    setLoading(true)
    setLoadError(null)
    listCookbookShares({ data: { cookbookId } })
      .then(setShares)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load shares'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!isOpen) return
    loadShares()
  }, [isOpen, cookbookId])

  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError(null)
    setInviteSuccess(null)
    setInviting(true)
    try {
      await shareCookbook({ data: { cookbookId, usernameOrEmail: usernameOrEmail.trim(), permission } })
      setInviteSuccess(`Shared with ${usernameOrEmail.trim()}`)
      setUsernameOrEmail('')
      loadShares()
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to share')
    } finally {
      setInviting(false)
    }
  }

  async function handleRevoke(userId: string) {
    setRevokingIds((prev) => new Set(prev).add(userId))
    setRevokeErrors((prev) => { const next = { ...prev }; delete next[userId]; return next })
    try {
      await revokeCookbookShare({ data: { cookbookId, userId } })
      setShares((prev) => prev.filter((s) => s.user_id !== userId))
    } catch (err) {
      setRevokeErrors((prev) => ({
        ...prev,
        [userId]: err instanceof Error ? err.message : 'Failed to revoke',
      }))
    } finally {
      setRevokingIds((prev) => { const next = new Set(prev); next.delete(userId); return next })
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
          maxWidth: '460px',
          width: '90%',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <h2 style={{ fontFamily: 'serif', fontSize: '1.3rem', fontWeight: 700, color: '#1F2937', marginBottom: '20px', flexShrink: 0 }}>
          Share Cookbook
        </h2>

        <form onSubmit={handleInvite} style={{ marginBottom: '20px', flexShrink: 0 }}>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="Username or email"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              required
              style={{
                width: '100%',
                border: '1px solid #F1E7DA',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '0.9rem',
                color: '#1F2937',
                background: 'white',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', color: '#1F2937' }}>
              <input
                type="radio"
                name="permission"
                value="view"
                checked={permission === 'view'}
                onChange={() => setPermission('view')}
                style={{ accentColor: '#E53935' }}
              />
              View
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', color: '#1F2937' }}>
              <input
                type="radio"
                name="permission"
                value="edit"
                checked={permission === 'edit'}
                onChange={() => setPermission('edit')}
                style={{ accentColor: '#E53935' }}
              />
              Edit
            </label>
          </div>

          {inviteError && (
            <p style={{ fontSize: '0.8rem', color: '#E53935', marginBottom: '8px' }}>{inviteError}</p>
          )}
          {inviteSuccess && (
            <p style={{ fontSize: '0.8rem', color: '#16a34a', marginBottom: '8px' }}>{inviteSuccess}</p>
          )}

          <button
            type="submit"
            disabled={inviting || !usernameOrEmail.trim()}
            style={{
              padding: '8px 18px',
              borderRadius: '6px',
              background: '#E53935',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: inviting || !usernameOrEmail.trim() ? 'not-allowed' : 'pointer',
              opacity: inviting || !usernameOrEmail.trim() ? 0.6 : 1,
              border: 'none',
            }}
          >
            {inviting ? 'Inviting...' : 'Invite'}
          </button>
        </form>

        <div style={{ borderTop: '1px solid #F1E7DA', paddingTop: '16px', overflowY: 'auto', flex: 1 }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6B7280', marginBottom: '10px' }}>
            Current shares
          </p>

          {loading && (
            <p style={{ fontSize: '0.9rem', color: '#6B7280' }}>Loading...</p>
          )}

          {loadError && (
            <p style={{ fontSize: '0.9rem', color: '#E53935' }}>{loadError}</p>
          )}

          {!loading && !loadError && shares.length === 0 && (
            <p style={{ fontSize: '0.9rem', color: '#6B7280' }}>Not shared with anyone yet.</p>
          )}

          {!loading && !loadError && shares.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {shares.map((share) => {
                const profile = share.profile as unknown as { display_name: string | null; avatar_url: string | null } | null
                return (
                  <li
                    key={share.user_id}
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
                        {profile?.display_name ?? share.user_id}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'capitalize' }}>
                        {share.permission}
                      </span>
                      {revokeErrors[share.user_id] && (
                        <span style={{ fontSize: '0.75rem', color: '#E53935', display: 'block' }}>
                          {revokeErrors[share.user_id]}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRevoke(share.user_id)}
                      disabled={revokingIds.has(share.user_id)}
                      style={{
                        marginLeft: '12px',
                        padding: '5px 12px',
                        border: '1px solid #F1E7DA',
                        borderRadius: '4px',
                        background: 'transparent',
                        color: '#6B7280',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: revokingIds.has(share.user_id) ? 'not-allowed' : 'pointer',
                        opacity: revokingIds.has(share.user_id) ? 0.6 : 1,
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {revokingIds.has(share.user_id) ? '...' : 'Revoke'}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

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
