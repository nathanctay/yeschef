import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    inputValidator: (_validator: any) => ({ handler: (fn: any) => fn }),
    handler: (fn: any) => fn,
  }),
}))

vi.mock('../../server/supabase', () => ({
  getSupabaseClient: vi.fn(),
}))

vi.mock('../../server/auth', () => ({
  requireAuth: vi.fn(),
  getSession: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  notFound: vi.fn(() => {
    const err = new Error('Not Found')
    ;(err as unknown as { isNotFound: boolean }).isNotFound = true
    return err
  }),
  redirect: vi.fn((opts: { to: string }) => {
    const err = new Error(`Redirect to ${opts.to}`)
    ;(err as unknown as { isRedirect: boolean; to: string }).isRedirect = true
    ;(err as unknown as { isRedirect: boolean; to: string }).to = opts.to
    return err
  }),
}))

import { getSupabaseClient } from '../../server/supabase'
import { getSession, requireAuth } from '../../server/auth'
import { getLog, listLogsForUser, createLog } from '../../server/logs'

describe('getLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws notFound when log is private and viewer is not the owner', async () => {
    vi.mocked(getSession).mockResolvedValue({ id: 'not-the-owner' } as any)

    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'log-1',
        user_id: 'owner-id',
        visibility: 'private',
        recipe_id: null,
        logged_at: '2026-01-01',
        notes: null,
        rating: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        recipe: null,
      },
      error: null,
    })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })
    vi.mocked(getSupabaseClient).mockReturnValue({ from: mockFrom } as any)

    await expect(
      getLog({ data: { id: 'log-1' } } as any)
    ).rejects.toMatchObject({ isNotFound: true })
  })
})

describe('listLogsForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('applies public-only filter when viewer is not the profile owner', async () => {
    vi.mocked(getSession).mockResolvedValue({ id: 'other-user' } as any)

    const mockEqVisibility = vi.fn().mockResolvedValue({ data: [], error: null })
    const mockOrder = vi.fn().mockReturnValue({ eq: mockEqVisibility })
    const mockEqUserId = vi.fn().mockReturnValue({ order: mockOrder })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUserId })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })
    vi.mocked(getSupabaseClient).mockReturnValue({ from: mockFrom } as any)

    await listLogsForUser({ data: { userId: 'profile-user' } } as any)

    expect(mockEqVisibility).toHaveBeenCalledWith('visibility', 'public')
  })

  it('skips public-only filter when viewer is the profile owner', async () => {
    vi.mocked(getSession).mockResolvedValue({ id: 'same-user' } as any)

    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null })
    const mockEqUserId = vi.fn().mockReturnValue({ order: mockOrder })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUserId })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })
    vi.mocked(getSupabaseClient).mockReturnValue({ from: mockFrom } as any)

    const result = await listLogsForUser({ data: { userId: 'same-user' } } as any)

    expect(result).toEqual([])
    expect(mockOrder).toHaveBeenCalled()
  })
})

describe('createLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws redirect when unauthenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(
      Object.assign(new Error('Redirect to /signin'), {
        isRedirect: true,
        to: '/signin',
      })
    )

    await expect(
      createLog({ data: { recipeId: 'r-1', loggedAt: '2026-01-01', notes: '', visibility: 'private' } } as any)
    ).rejects.toMatchObject({ isRedirect: true, to: '/signin' })
  })
})
