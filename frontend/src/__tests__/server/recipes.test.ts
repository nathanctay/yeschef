import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock modules before importing server functions
vi.mock('../../server/supabase', () => ({
  getSupabaseClient: vi.fn(),
}))
vi.mock('../../server/auth', () => ({
  getSession: vi.fn(),
  requireAuth: vi.fn(),
}))
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    inputValidator: (_validator: any) => ({
      handler: (fn: any) => fn,
    }),
    handler: (fn: any) => fn,
  }),
}))

import { getSupabaseClient } from '../../server/supabase'
import { getSession, requireAuth } from '../../server/auth'
import { getRecipe, deleteRecipe, createRecipe, likeRecipe, forkRecipe } from '../../server/recipes'

const mockGetSupabaseClient = vi.mocked(getSupabaseClient)
const mockGetSession = vi.mocked(getSession)
const mockRequireAuth = vi.mocked(requireAuth)

function makeSupabaseMock(recipeRow: any, likeRow: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: likeRow, error: null })
  const single = vi.fn().mockResolvedValue({ data: recipeRow, error: recipeRow ? null : { message: 'not found' } })

  const chainMock: any = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single,
    maybeSingle,
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  }
  return chainMock
}

const publicRecipe = {
  id: 'recipe-1',
  owner_id: 'owner-1',
  title: 'Test Recipe',
  description: null,
  cover_image_path: null,
  visibility: 'public',
  content_json: { ingredients: [], steps: [] },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  forked_from_recipe_id: null,
  like_count: [{ count: 3 }],
  log_count: [{ count: 1 }],
  comment_count: [{ count: 0 }],
  owner: { id: 'owner-1', display_name: 'Chef Alice', avatar_url: null },
}

const privateRecipe = { ...publicRecipe, id: 'recipe-2', visibility: 'private' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getRecipe', () => {
  it('throws 404 for private recipe when viewer is not owner', async () => {
    mockGetSession.mockResolvedValue({ id: 'other-user' } as any)
    const supabase = makeSupabaseMock(privateRecipe)
    mockGetSupabaseClient.mockReturnValue(supabase as any)

    await expect(
      getRecipe({ data: { id: privateRecipe.id } } as any)
    ).rejects.toBeInstanceOf(Response)
  })

  it('returns recipe when viewer is the owner', async () => {
    mockGetSession.mockResolvedValue({ id: 'owner-1' } as any)
    const supabase = makeSupabaseMock(privateRecipe, null)
    supabase.single
      .mockResolvedValueOnce({ data: privateRecipe, error: null })
    supabase.maybeSingle.mockResolvedValue({ data: null, error: null })
    mockGetSupabaseClient.mockReturnValue(supabase as any)

    const result = await getRecipe({ data: { id: privateRecipe.id } } as any)
    expect(result.id).toBe(privateRecipe.id)
    expect(result.viewerHasLiked).toBe(false)
  })

  it('returns recipe when recipe is public', async () => {
    mockGetSession.mockResolvedValue(null)
    const supabase = makeSupabaseMock(publicRecipe)
    mockGetSupabaseClient.mockReturnValue(supabase as any)

    const result = await getRecipe({ data: { id: publicRecipe.id } } as any)
    expect(result.id).toBe(publicRecipe.id)
    expect(result.viewerHasLiked).toBe(false)
  })
})

describe('deleteRecipe', () => {
  it('throws 404 when viewer is not the owner', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'not-owner' } as any)
    const supabase = makeSupabaseMock({ owner_id: 'real-owner' })
    mockGetSupabaseClient.mockReturnValue(supabase as any)

    await expect(
      deleteRecipe({ data: { id: 'recipe-1' } } as any)
    ).rejects.toBeInstanceOf(Response)
  })

  it('deletes the recipe when viewer is the owner', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'real-owner' } as any)
    const supabase = makeSupabaseMock({ owner_id: 'real-owner' })
    supabase.delete.mockReturnThis()
    // First eq() call is part of the ownership fetch chain (returns this so .single() can be called)
    // Second eq() call is the delete().eq() which should resolve with no error
    supabase.eq
      .mockReturnValueOnce(supabase) // ownership select chain: .eq('id', ...) -> chainable for .single()
      .mockResolvedValueOnce({ error: null }) // delete chain: .delete().eq('id', ...) -> resolves
    mockGetSupabaseClient.mockReturnValue(supabase as any)

    await expect(
      deleteRecipe({ data: { id: 'abc12345-1234-1234-1234-123456789abc' } } as any)
    ).resolves.toBeUndefined()
  })
})

describe('likeRecipe', () => {
  it('calls upsert on recipe_likes after verifying recipe visibility', async () => {
    mockGetSession.mockResolvedValue({ id: 'user-1' } as any)
    mockRequireAuth.mockResolvedValue({ id: 'user-1' } as any)
    const supabase = makeSupabaseMock(publicRecipe)
    supabase.upsert = vi.fn().mockResolvedValue({ error: null })
    mockGetSupabaseClient.mockReturnValue(supabase as any)

    await likeRecipe({ data: { recipeId: publicRecipe.id } } as any)

    expect(supabase.upsert).toHaveBeenCalled()
  })

  it('throws 404 when recipe is private and viewer is not the owner', async () => {
    mockGetSession.mockResolvedValue({ id: 'other-user' } as any)
    mockRequireAuth.mockResolvedValue({ id: 'other-user' } as any)
    const supabase = makeSupabaseMock(privateRecipe)
    mockGetSupabaseClient.mockReturnValue(supabase as any)

    await expect(
      likeRecipe({ data: { recipeId: privateRecipe.id } } as any)
    ).rejects.toBeInstanceOf(Response)
  })
})

describe('forkRecipe', () => {
  it('creates a private copy of a public recipe', async () => {
    mockGetSession.mockResolvedValue({ id: 'user-2' } as any)
    mockRequireAuth.mockResolvedValue({ id: 'user-2' } as any)
    const supabase = makeSupabaseMock(publicRecipe)
    // First single() call — getRecipe fetch
    supabase.single.mockResolvedValueOnce({ data: publicRecipe, error: null })
    // Second single() call — insert result
    supabase.single.mockResolvedValueOnce({ data: { id: 'forked-id' }, error: null })
    supabase.insert = vi.fn().mockReturnThis()
    mockGetSupabaseClient.mockReturnValue(supabase as any)

    const result = await forkRecipe({ data: { id: publicRecipe.id } } as any)
    expect(result.id).toBe('forked-id')
  })

  it('throws 404 when forking a private recipe as non-owner', async () => {
    mockGetSession.mockResolvedValue({ id: 'other-user' } as any)
    mockRequireAuth.mockResolvedValue({ id: 'other-user' } as any)
    const supabase = makeSupabaseMock(privateRecipe)
    mockGetSupabaseClient.mockReturnValue(supabase as any)

    await expect(
      forkRecipe({ data: { id: privateRecipe.id } } as any)
    ).rejects.toBeInstanceOf(Response)
  })
})

describe('createRecipe', () => {
  it('throws when title is missing from form data', async () => {
    mockRequireAuth.mockResolvedValue({ id: 'user-1' } as any)
    const supabase = makeSupabaseMock(null)
    mockGetSupabaseClient.mockReturnValue(supabase as any)

    const fd = new FormData()
    // No title appended — should trigger 'Title is required'
    fd.append('ingredients', JSON.stringify([]))
    fd.append('steps', JSON.stringify([]))

    await expect(
      createRecipe({ data: fd })
    ).rejects.toThrow('Title is required')
  })
})
