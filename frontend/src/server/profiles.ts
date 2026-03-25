import { createServerFn } from '@tanstack/react-start'
import { notFound, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { getSupabaseClient } from './supabase'
import { getSession, requireAuth } from './auth'

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

async function uploadAvatar(file: File): Promise<string> {
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    throw new Error('Avatar must be a JPEG, PNG, WebP, or GIF')
  }
  if (file.size > AVATAR_MAX_SIZE_BYTES) {
    throw new Error('Avatar must be smaller than 5MB')
  }
  const supabase = getSupabaseClient()
  const ext = file.name.split('.').pop()
  const path = `${crypto.randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, buffer, { contentType: file.type })
  if (error) throw new Error(`Avatar upload failed: ${error.message}`)
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
}

const GetProfileInput = z.object({ id: z.string().uuid() })

export const getProfile = createServerFn()
  .inputValidator((data: z.infer<typeof GetProfileInput>) =>
    GetProfileInput.parse(data),
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, created_at, updated_at')
      .eq('id', data.id)
      .single()

    if (error || !profile) throw notFound()

    const [
      { count: recipe_count },
      { count: log_count },
      { count: cookbook_count },
      { count: following_count },
      { count: follower_count },
    ] = await Promise.all([
      supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', data.id),
      supabase
        .from('recipe_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', data.id),
      supabase
        .from('cookbooks')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', data.id),
      supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', data.id),
      supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', data.id),
    ])

    return {
      ...profile,
      recipe_count: recipe_count ?? 0,
      log_count: log_count ?? 0,
      cookbook_count: cookbook_count ?? 0,
      following_count: following_count ?? 0,
      follower_count: follower_count ?? 0,
    }
  })

export const updateProfile = createServerFn({ method: 'POST' })
  .inputValidator((data: FormData) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth()
    const supabase = getSupabaseClient()

    const display_name = data.get('display_name') as string | null
    const avatarFile = data.get('avatarImage') as File | null

    const updates: { display_name?: string; avatar_url?: string } = {}

    if (display_name !== null) {
      const trimmed = display_name.trim()
      if (trimmed.length === 0) throw new Error('Display name cannot be empty')
      if (trimmed.length > 100) throw new Error('Display name must be 100 characters or fewer')
      updates.display_name = trimmed
    }

    if (avatarFile && avatarFile.size > 0) {
      updates.avatar_url = await uploadAvatar(avatarFile)
    }

    if (Object.keys(updates).length === 0) {
      const { data: current, error: fetchErr } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single()
      if (fetchErr || !current) throw new Error('Profile not found')
      return current
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select('display_name, avatar_url')
      .single()

    if (error) throw new Error(`Profile update failed: ${error.message}`)

    return profile
  })

const FollowInput = z.object({ id: z.string().uuid() })

export const followUser = createServerFn({ method: 'POST' })
  .inputValidator((data: z.infer<typeof FollowInput>) =>
    FollowInput.parse(data),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth()
    if (user.id === data.id) {
      throw new Error('Cannot follow yourself')
    }
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('user_follows')
      .upsert(
        { follower_id: user.id, following_id: data.id },
        { onConflict: 'follower_id,following_id', ignoreDuplicates: true }
      )

    if (error) throw new Error(`Follow failed: ${error.message}`)
  })

export const unfollowUser = createServerFn({ method: 'POST' })
  .inputValidator((data: z.infer<typeof FollowInput>) =>
    FollowInput.parse(data),
  )
  .handler(async ({ data }) => {
    const user = await requireAuth()
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', data.id)

    if (error) throw new Error(`Unfollow failed: ${error.message}`)
  })
