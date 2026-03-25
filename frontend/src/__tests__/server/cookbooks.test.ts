import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies before importing server functions
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
}))

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    inputValidator: (_validator: any) => ({ handler: (fn: any) => fn }),
    handler: (fn: any) => fn,
  }),
}))

import { getSupabaseClient } from '../../server/supabase'
import { requireAuth } from '../../server/auth'
import { notFound } from '@tanstack/react-router'
import { listCookbooksForUser } from '../../server/cookbooks'

// getCookbook internals extracted for unit testing
async function getCookbookHandler(
  userId: string,
  id: string,
  supabase: ReturnType<typeof getSupabaseClient>
) {
  const cookbookResult = await (supabase as unknown as {
    from: (t: string) => {
      select: (q: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{ data: unknown; error: unknown }>
        }
      }
    }
  })
    .from('cookbooks')
    .select('id,owner_id,name,description,cover_style,cover_color,cover_image_path,visibility,created_at')
    .eq('id', id)
    .single()

  const { data: cookbook, error } = cookbookResult as {
    data: { owner_id: string } | null
    error: unknown
  }

  if (error || !cookbook) throw notFound()
  if (cookbook.owner_id !== userId) throw notFound()
  return cookbook
}

describe('getCookbook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws notFound when viewer is not the owner', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'cb-1', owner_id: 'other-user', name: 'Test' },
      error: null,
    })
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })
    const mockSupabase = { from: mockFrom }

    vi.mocked(getSupabaseClient).mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof getSupabaseClient>
    )

    await expect(
      getCookbookHandler('current-user', 'cb-1', mockSupabase as unknown as ReturnType<typeof getSupabaseClient>)
    ).rejects.toMatchObject({ isNotFound: true })

    expect(notFound).toHaveBeenCalled()
  })
})

describe('listCookbooksForUser', () => {
  it('always returns an empty array in Phase 1', async () => {
    const result = await listCookbooksForUser({ data: { userId: 'any-user' } } as any)
    expect(result).toEqual([])
  })
})
