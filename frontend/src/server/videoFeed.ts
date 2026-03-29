import { createServerFn } from '@tanstack/react-start'
import { getSupabaseClient } from './supabase'
import { requireAuth } from './auth'

export const listVideoFeed = createServerFn()
  .handler(async () => {
    const user = await requireAuth()
    const supabase = getSupabaseClient()

    const { data: follows } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followedIds = (follows ?? []).map((f) => f.following_id)

    if (followedIds.length === 0) return []

    const { data: recipes, error } = await supabase
      .from('recipes')
      .select(`
        id, title, video_path, owner_id, created_at,
        owner:profiles!owner_id(id, display_name, avatar_url)
      `)
      .in('owner_id', followedIds)
      .not('video_path', 'is', null)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return recipes ?? []
  })
