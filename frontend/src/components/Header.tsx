import { Link } from '@tanstack/react-router'
import { ProfileDropdown } from './ProfileDropdown'

interface HeaderProps {
  user: { id: string; displayName: string | null } | null
}

export function Header({ user }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-md border-b"
      style={{
        backgroundColor: 'var(--header-bg)',
        borderColor: 'var(--line)',
      }}
    >
      <div className="page-wrap flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            yesChef
          </span>
        </Link>

        {user ? (
          <>
            <nav className="flex items-center gap-6">
              <Link
                to="/explore"
                className="text-sm font-medium no-underline"
                style={{ color: 'var(--text-muted)' }}
                activeProps={{ style: { color: 'var(--primary)' } }}
              >
                Explore
              </Link>
              <Link
                to="/recipes"
                className="text-sm font-medium no-underline"
                style={{ color: 'var(--text-muted)' }}
                activeProps={{ style: { color: 'var(--primary)' } }}
              >
                My Recipes
              </Link>
              <Link
                to="/cookbooks"
                className="text-sm font-medium no-underline"
                style={{ color: 'var(--text-muted)' }}
                activeProps={{ style: { color: 'var(--primary)' } }}
              >
                My Cookbooks
              </Link>
              <Link
                to="/logs"
                className="text-sm font-medium no-underline"
                style={{ color: 'var(--text-muted)' }}
                activeProps={{ style: { color: 'var(--primary)' } }}
              >
                My Diary
              </Link>
            </nav>
            <ProfileDropdown user={user} />
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/auth/signin"
              className="text-sm font-medium px-3 py-1.5 rounded-md border no-underline transition-colors"
              style={{
                color: 'var(--text-muted)',
                borderColor: 'var(--border)',
              }}
            >
              Sign in
            </Link>
            <Link
              to="/auth/signup"
              className="text-sm font-medium px-3 py-1.5 rounded-md no-underline transition-colors text-white"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
