import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../server/supabase', () => ({ getSupabaseClient: vi.fn() }))
vi.mock('../../server/auth', () => ({ getSession: vi.fn() }))
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    inputValidator: (_v: any) => ({ handler: (fn: any) => fn }),
    handler: (fn: any) => fn,
  }),
}))

import { getSupabaseClient } from '../../server/supabase'
import { getSession } from '../../server/auth'
import { searchRecipes, searchUsers } from '../../server/search'

const mockGetSupabaseClient = vi.mocked(getSupabaseClient)
const mockGetSession = vi.mocked(getSession)

beforeEach(() => vi.clearAllMocks())

// ─── searchRecipes ────────────────────────────────────────────────────────────

describe('searchRecipes', () => {
  function makeRpcMock(rows: any[], error: any = null) {
    const rpc = vi.fn().mockResolvedValue({ data: rows, error })
    mockGetSupabaseClient.mockReturnValue({ rpc } as any)
    return rpc
  }

  it('returns shaped recipe results from the RPC', async () => {
    makeRpcMock([{
      id: 'r1',
      owner_id: 'u1',
      title: 'Pasta',
      description: 'A classic',
      cover_image_path: null,
      visibility: 'public',
      rating_avg: 4.5,
      rating_count: 10,
      created_at: '2026-01-01T00:00:00Z',
      owner_display_name: 'Alice',
      owner_avatar_url: null,
    }])
    mockGetSession.mockResolvedValue(null)

    const result = await searchRecipes({ data: { query: 'pasta', limit: 20, offset: 0 } })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: 'r1',
      title: 'Pasta',
      owner: { id: 'u1', display_name: 'Alice', avatar_url: null },
    })
  })

  it('passes viewer_id from session to the RPC', async () => {
    const rpc = makeRpcMock([])
    mockGetSession.mockResolvedValue({ id: 'viewer-1' } as any)

    await searchRecipes({ data: { query: 'pasta', limit: 20, offset: 0 } })

    expect(rpc).toHaveBeenCalledWith('search_recipes', expect.objectContaining({
      viewer_id: 'viewer-1',
    }))
  })

  it('passes viewer_id as null when unauthenticated', async () => {
    const rpc = makeRpcMock([])
    mockGetSession.mockResolvedValue(null)

    await searchRecipes({ data: { query: 'pasta', limit: 20, offset: 0 } })

    expect(rpc).toHaveBeenCalledWith('search_recipes', expect.objectContaining({
      viewer_id: null,
    }))
  })

  it('passes query, lim, off to the RPC', async () => {
    const rpc = makeRpcMock([])
    mockGetSession.mockResolvedValue(null)

    await searchRecipes({ data: { query: 'soup', limit: 3, offset: 6 } })

    expect(rpc).toHaveBeenCalledWith('search_recipes', {
      query: 'soup',
      viewer_id: null,
      lim: 3,
      off: 6,
    })
  })

  it('throws when the RPC returns an error', async () => {
    makeRpcMock([], { message: 'rpc error' })
    mockGetSession.mockResolvedValue(null)

    await expect(
      searchRecipes({ data: { query: 'pasta', limit: 20, offset: 0 } })
    ).rejects.toThrow('rpc error')
  })

  it('returns empty array when RPC returns no rows', async () => {
    makeRpcMock([])
    mockGetSession.mockResolvedValue(null)

    const result = await searchRecipes({ data: { query: 'zzz', limit: 20, offset: 0 } })
    expect(result).toEqual([])
  })
})

// ─── searchUsers ─────────────────────────────────────────────────────────────

describe('searchUsers', () => {
  function makeQueryMock(rows: any[], error: any = null) {
    const chain: any = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: rows, error }),
    }
    mockGetSupabaseClient.mockReturnValue(chain as any)
    return chain
  }

  it('returns matching profiles', async () => {
    makeQueryMock([{ id: 'u1', display_name: 'Alice', avatar_url: null }])

    const result = await searchUsers({ data: { query: 'ali', limit: 20, offset: 0 } })

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 'u1', display_name: 'Alice' })
  })

  it('queries with ILIKE on display_name', async () => {
    const chain = makeQueryMock([])

    await searchUsers({ data: { query: 'chef', limit: 5, offset: 0 } })

    expect(chain.ilike).toHaveBeenCalledWith('display_name', '%chef%')
  })

  it('applies limit and offset via range', async () => {
    const chain = makeQueryMock([])

    await searchUsers({ data: { query: 'chef', limit: 2, offset: 4 } })

    expect(chain.range).toHaveBeenCalledWith(4, 5)
  })

  it('throws when supabase returns an error', async () => {
    makeQueryMock([], { message: 'db error' })

    await expect(
      searchUsers({ data: { query: 'chef', limit: 20, offset: 0 } })
    ).rejects.toThrow('db error')
  })
})
