import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../server/supabase', () => ({
  getSupabaseClient: vi.fn(),
}))

vi.mock('../../server/auth-internal', () => ({
  SESSION_COOKIE: 'yeschef-session',
  cookieOptions: {},
  getCookie: vi.fn(),
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
  _getSession: vi.fn(),
  _requireAuth: vi.fn(),
}))

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    inputValidator: (validator: any) => ({
      handler: (fn: any) => fn,
    }),
    handler: (fn: any) => fn,
  }),
}))

import { getSupabaseClient } from '../../server/supabase'
import { deleteCookie, _getSession, _requireAuth } from '../../server/auth-internal'
import { getSession, requireAuth, handleSignOut } from '../../server/auth'

const mockGetSupabaseClient = vi.mocked(getSupabaseClient)
const mockDeleteCookie = vi.mocked(deleteCookie)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getSession', () => {
  it('returns null when no cookie is set', async () => {
    vi.mocked(_getSession).mockResolvedValue(null)

    const result = await getSession()

    expect(result).toBeNull()
  })

  it('returns null when supabase returns error', async () => {
    vi.mocked(_getSession).mockResolvedValue(null)

    const result = await getSession()

    expect(result).toBeNull()
  })

  it('returns null when cookie contains malformed JSON', async () => {
    vi.mocked(_getSession).mockResolvedValue(null)

    const result = await getSession()

    expect(result).toBeNull()
  })
})

describe('requireAuth', () => {
  it('throws a redirect to /signin when getSession returns null', async () => {
    vi.mocked(_requireAuth).mockRejectedValue(
      Object.assign(new Error('redirect'), { to: '/signin' }),
    )

    await expect(requireAuth()).rejects.toMatchObject({ to: '/signin' })
  })
})

describe('signOut handler', () => {
  it('deletes the session cookie and returns', async () => {
    mockDeleteCookie.mockImplementation(() => {})

    await expect(handleSignOut()).resolves.toBeUndefined()
    expect(mockDeleteCookie).toHaveBeenCalledWith('yeschef-session')
  })
})
