import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseClient } from './supabase'
import { getSession } from './auth'

const searchInput = z.object({
  query: z.string().min(1).max(100),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
})

export const searchRecipes = createServerFn()
  .inputValidator((data: { query: string; limit?: number; offset?: number }) =>
    searchInput.parse(data)
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()
    const session = await getSession()
    const viewerId = session?.id ?? null

    const { data: rows, error } = await supabase.rpc('search_recipes', {
      query: data.query,
      viewer_id: viewerId,
      lim: data.limit,
      off: data.offset,
    })

    if (error) throw new Error(error.message)

    return (rows ?? []).map((row: any) => ({
      id: row.id as string,
      title: row.title as string,
      description: row.description as string | null,
      cover_image_path: row.cover_image_path as string | null,
      rating_avg: row.rating_avg as number | null,
      rating_count: row.rating_count as number,
      owner: {
        id: row.owner_id as string,
        display_name: row.owner_display_name as string,
        avatar_url: row.owner_avatar_url as string | null,
      },
    }))
  })

export const searchUsers = createServerFn()
  .inputValidator((data: { query: string; limit?: number; offset?: number }) =>
    searchInput.parse(data)
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()

    const { data: rows, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .ilike('display_name', `%${data.query}%`)
      .order('display_name', { ascending: true })
      .range(data.offset, data.offset + data.limit - 1)

    if (error) throw new Error(error.message)
    return rows ?? []
  })
