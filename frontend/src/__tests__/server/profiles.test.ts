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
  getSession: vi.fn(),
  requireAuth: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  notFound: vi.fn(() => {
    const err = new Error('Not Found')
    ;(err as unknown as { isNotFound: boolean }).isNotFound = true
    return err
  }),
  redirect: vi.fn(),
}))

import { getSupabaseClient } from '../../server/supabase'
import { requireAuth } from '../../server/auth'
import { getProfile, updateProfile } from '../../server/profiles'

const mockSupabase = {
  from: vi.fn(),
  storage: { from: vi.fn() },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSupabaseClient).mockReturnValue(mockSupabase as any)
})

describe('getProfile', () => {
  it('throws notFound for a non-existent user', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        }),
      }),
    })

    await expect(
      getProfile({ data: { id: '00000000-0000-0000-0000-000000000000' } } as any)
    ).rejects.toThrow()
  })
})

describe('updateProfile', () => {
  it('throws redirect when unauthenticated', async () => {
    vi.mocked(requireAuth).mockRejectedValue(
      Object.assign(new Error('Redirect'), { isRedirect: true }),
    )

    const mockRequest = {
      formData: async () => new FormData(),
    }

    await expect(
      updateProfile({ request: mockRequest } as any)
    ).rejects.toMatchObject({ isRedirect: true })
  })
})
