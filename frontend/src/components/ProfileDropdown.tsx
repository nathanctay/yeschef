import { useRef, useState, useEffect } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { signOut } from '../server/auth'

interface ProfileDropdownProps {
  user: { id: string; displayName: string | null }
}

export function ProfileDropdown({ user }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const initials = user.displayName
    ? user.displayName
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '?'
    : '?'

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function handleSignOut() {
    setOpen(false)
    setSigningOut(true)
    try {
      await signOut()
      await router.invalidate()
      await router.navigate({ to: '/' })
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open profile menu"
        aria-expanded={open}
        aria-haspopup="menu"
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: 'var(--primary)',
          color: 'white',
          fontSize: '0.75rem',
          fontWeight: 700,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            minWidth: 180,
            background: 'white',
            border: '1px solid var(--line)',
            borderRadius: 8,
            boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
            zIndex: 100,
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <p
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#1F2937',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user.displayName ?? '?'}
            </p>
          </div>
          <div style={{ padding: '4px 0' }}>
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="no-underline"
              role="menuitem"
              style={{
                display: 'block',
                padding: '8px 14px',
                fontSize: '0.875rem',
                color: '#1F2937',
              }}
            >
              My Profile
            </Link>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              role="menuitem"
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 14px',
                fontSize: '0.875rem',
                color: '#E53935',
                background: 'none',
                border: 'none',
                cursor: signingOut ? 'not-allowed' : 'pointer',
                opacity: signingOut ? 0.6 : 1,
              }}
            >
              {signingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
