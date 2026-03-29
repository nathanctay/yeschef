import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseClient } from './supabase'
import { requireAuth } from './auth'

export const shareCookbook = createServerFn({ method: 'POST' })
  .inputValidator((data: { cookbookId: string; usernameOrEmail: string; permission: 'view' | 'edit' }) =>
    z.object({
      cookbookId: z.string().uuid(),
      usernameOrEmail: z.string().min(1),
      permission: z.enum(['view', 'edit']),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const user = await requireAuth()
    const supabase = getSupabaseClient()

    const { data: cookbook, error: cbErr } = await supabase
      .from('cookbooks')
      .select('owner_id')
      .eq('id', data.cookbookId)
      .single()
    if (cbErr || !cookbook || cookbook.owner_id !== user.id) throw new Error('Not found')

    let targetUserId: string | null = null

    const { data: byName } = await supabase
      .from('profiles')
      .select('id')
      .eq('display_name', data.usernameOrEmail)
      .maybeSingle()

    if (byName) {
      targetUserId = byName.id
    } else {
      const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers()
      if (!authErr) {
        const match = users.find((u) => u.email === data.usernameOrEmail)
        if (match) targetUserId = match.id
      }
    }

    if (!targetUserId) throw new Error('No user found with that username or email')
    if (targetUserId === user.id) throw new Error('Cannot share with yourself')

    const { error } = await supabase
      .from('cookbook_shares')
      .upsert(
        { cookbook_id: data.cookbookId, user_id: targetUserId, permission: data.permission, granted_by: user.id },
        { onConflict: 'cookbook_id,user_id' }
      )
    if (error) throw new Error(error.message)
  })

export const revokeCookbookShare = createServerFn({ method: 'POST' })
  .inputValidator((data: { cookbookId: string; userId: string }) =>
    z.object({ cookbookId: z.string().uuid(), userId: z.string().uuid() }).parse(data)
  )
  .handler(async ({ data }) => {
    const user = await requireAuth()
    const supabase = getSupabaseClient()

    const { data: cookbook, error: cbErr } = await supabase
      .from('cookbooks')
      .select('owner_id')
      .eq('id', data.cookbookId)
      .single()
    if (cbErr || !cookbook || cookbook.owner_id !== user.id) throw new Error('Not found')

    const { error: deleteErr } = await supabase
      .from('cookbook_shares')
      .delete()
      .eq('cookbook_id', data.cookbookId)
      .eq('user_id', data.userId)
    if (deleteErr) throw new Error(deleteErr.message)
  })

export const listCookbookShares = createServerFn()
  .inputValidator((data: { cookbookId: string }) =>
    z.object({ cookbookId: z.string().uuid() }).parse(data)
  )
  .handler(async ({ data }) => {
    const user = await requireAuth()
    const supabase = getSupabaseClient()

    const { data: cookbook, error: cbErr } = await supabase
      .from('cookbooks')
      .select('owner_id')
      .eq('id', data.cookbookId)
      .single()
    if (cbErr || !cookbook || cookbook.owner_id !== user.id) throw new Error('Not found')

    const { data: shares, error } = await supabase
      .from('cookbook_shares')
      .select('user_id, permission, created_at, profile:profiles!cookbook_shares_user_id_fkey(display_name, avatar_url)')
      .eq('cookbook_id', data.cookbookId)
    if (error) throw new Error(error.message)
    return shares ?? []
  })
