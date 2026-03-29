import { createServerFn } from '@tanstack/react-start'
import { notFound, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { getSupabaseClient } from './supabase'
import { getSession, requireAuth } from './auth'

export const createLog = createServerFn()
  .inputValidator((data: {
    recipeId: string
    loggedAt: string
    notes: string
    visibility: 'public' | 'private'
    rating?: number | null
  }) =>
    z
      .object({
        recipeId: z.string(),
        loggedAt: z.string(),
        notes: z.string(),
        visibility: z.enum(['public', 'private']),
        rating: z.number().min(0.5).max(5).multipleOf(0.5).nullable().optional(),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    const user = await requireAuth()
    const supabase = getSupabaseClient()

    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('owner_id, visibility')
      .eq('id', data.recipeId)
      .single()

    if (recipeError || !recipe) throw notFound()
    const isVisible =
      recipe.owner_id === user.id || recipe.visibility === 'public'
    if (!isVisible) throw notFound()

    const { data: log, error } = await supabase
      .from('recipe_logs')
      .insert({
        user_id: user.id,
        recipe_id: data.recipeId,
        logged_at: data.loggedAt,
        notes: data.notes || null,
        visibility: data.visibility,
        rating: data.rating ?? null,
      })
      .select('id')
      .single()

    if (error) throw error

    if (data.rating != null) {
      const { data: rData } = await supabase
        .from('recipes').select('rating_avg, rating_count').eq('id', data.recipeId).single()
      const oldCount = rData?.rating_count ?? 0
      const oldAvg = rData?.rating_avg ?? 0
      const newCount = oldCount + 1
      const newAvg = oldCount === 0 ? data.rating : (oldAvg * oldCount + data.rating) / newCount
      const { error: avgErr1 } = await supabase.from('recipes').update({ rating_avg: newAvg, rating_count: newCount }).eq('id', data.recipeId)
      if (avgErr1) throw new Error(avgErr1.message)
    }

    return { id: log.id }
  })

export const updateLog = createServerFn()
  .inputValidator((data: {
    id: string
    loggedAt?: string
    notes?: string
    visibility?: 'public' | 'private'
    rating?: number | null
  }) =>
    z
      .object({
        id: z.string(),
        loggedAt: z.string().optional(),
        notes: z.string().optional(),
        visibility: z.enum(['public', 'private']).optional(),
        rating: z.number().min(0.5).max(5).multipleOf(0.5).nullable().optional(),
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    const user = await requireAuth()
    const supabase = getSupabaseClient()

    const { data: existing, error: fetchError } = await supabase
      .from('recipe_logs')
      .select('user_id, recipe_id, rating')
      .eq('id', data.id)
      .single()

    if (fetchError || !existing) throw notFound()
    if (existing.user_id !== user.id) throw notFound()

    const updates: Record<string, unknown> = {}
    if (data.loggedAt !== undefined) updates.logged_at = data.loggedAt
    if (data.notes !== undefined) updates.notes = data.notes
    if (data.visibility !== undefined) updates.visibility = data.visibility
    if (data.rating !== undefined) updates.rating = data.rating ?? null

    const { error } = await supabase
      .from('recipe_logs')
      .update(updates)
      .eq('id', data.id)

    if (error) throw error

    const oldRating = (existing as any).rating as number | null
    const newRating = data.rating !== undefined ? (data.rating ?? null) : oldRating

    if (oldRating !== newRating) {
      const { data: rData } = await supabase
        .from('recipes').select('rating_avg, rating_count').eq('id', (existing as any).recipe_id).single()
      let count = rData?.rating_count ?? 0
      let avg = rData?.rating_avg ?? 0

      if (oldRating != null && count > 0) {
        if (count === 1) { count = 0; avg = 0 }
        else { avg = (avg * count - oldRating) / (count - 1); count -= 1 }
      }
      if (newRating != null) {
        avg = count === 0 ? newRating : (avg * count + newRating) / (count + 1)
        count += 1
      }

      const { error: avgErr2 } = await supabase.from('recipes').update({
        rating_avg: count === 0 ? null : avg,
        rating_count: count,
      }).eq('id', (existing as any).recipe_id)
      if (avgErr2) throw new Error(avgErr2.message)
    }
  })

export const deleteLog = createServerFn()
  .inputValidator((data: { id: string }) =>
    z.object({ id: z.string() }).parse(data)
  )
  .handler(async ({ data }) => {
    const user = await requireAuth()
    const supabase = getSupabaseClient()

    const { data: existing, error: fetchError } = await supabase
      .from('recipe_logs')
      .select('user_id, recipe_id, rating')
      .eq('id', data.id)
      .single()

    if (fetchError || !existing) throw notFound()
    if (existing.user_id !== user.id) throw notFound()

    const { error } = await supabase
      .from('recipe_logs')
      .delete()
      .eq('id', data.id)

    if (error) throw error

    const deletedRating = (existing as any).rating as number | null
    if (deletedRating != null) {
      const { data: rData } = await supabase
        .from('recipes').select('rating_avg, rating_count').eq('id', (existing as any).recipe_id).single()
      const oldCount = rData?.rating_count ?? 0
      const oldAvg = rData?.rating_avg ?? 0
      if (oldCount <= 1) {
        const { error: avgErr3a } = await supabase.from('recipes').update({ rating_avg: null, rating_count: 0 }).eq('id', (existing as any).recipe_id)
        if (avgErr3a) throw new Error(avgErr3a.message)
      } else {
        const newCount = oldCount - 1
        const newAvg = (oldAvg * oldCount - deletedRating) / newCount
        const { error: avgErr3b } = await supabase.from('recipes').update({ rating_avg: newAvg, rating_count: newCount }).eq('id', (existing as any).recipe_id)
        if (avgErr3b) throw new Error(avgErr3b.message)
      }
    }
  })

export const getLog = createServerFn()
  .inputValidator((data: { id: string }) =>
    z.object({ id: z.string() }).parse(data)
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()
    const session = await getSession()

    const { data: log, error } = await supabase
      .from('recipe_logs')
      .select(`
        id,
        user_id,
        recipe_id,
        logged_at,
        notes,
        rating,
        visibility,
        created_at,
        updated_at,
        recipe:recipes(id, title)
      `)
      .eq('id', data.id)
      .single()

    if (error || !log) throw notFound()

    if (log.visibility === 'private') {
      if (!session || session.id !== log.user_id) throw notFound()
    }

    return {
      id: log.id,
      user_id: log.user_id,
      recipe_id: log.recipe_id,
      logged_at: log.logged_at,
      notes: log.notes,
      rating: log.rating,
      visibility: log.visibility,
      created_at: log.created_at,
      updated_at: log.updated_at,
      recipe: log.recipe as { id: string; title: string } | null,
    }
  })

export const listLogsForRecipe = createServerFn()
  .inputValidator((data: { recipeId: string }) =>
    z.object({ recipeId: z.string() }).parse(data)
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()
    const session = await getSession()

    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('owner_id, visibility')
      .eq('id', data.recipeId)
      .single()

    if (recipeError || !recipe) throw notFound()
    const viewerId = session?.id ?? null
    const isVisible =
      recipe.owner_id === viewerId || recipe.visibility === 'public'
    if (!isVisible) throw notFound()

    let query = supabase
      .from('recipe_logs')
      .select(`
        id,
        user_id,
        logged_at,
        notes,
        rating,
        visibility,
        author:profiles!recipe_logs_user_id_fkey(id, display_name, avatar_url)
      `)
      .eq('recipe_id', data.recipeId)
      .order('logged_at', { ascending: false })

    if (viewerId) {
      query = query.or(`visibility.eq.public,user_id.eq.${viewerId}`)
    } else {
      query = query.eq('visibility', 'public')
    }

    const { data: logs, error } = await query
    if (error) throw error

    return (logs ?? []).map((log) => ({
      id: log.id,
      user_id: log.user_id,
      logged_at: log.logged_at,
      notes: log.notes,
      rating: log.rating,
      visibility: log.visibility,
      author: log.author as {
        id: string
        display_name: string | null
        avatar_url: string | null
      } | null,
    }))
  })

export const listLogsForUser = createServerFn()
  .inputValidator((data: { userId: string }) =>
    z.object({ userId: z.string() }).parse(data)
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()
    const session = await getSession()
    const viewerId = session?.id ?? null

    let query = supabase
      .from('recipe_logs')
      .select(`
        id,
        recipe_id,
        logged_at,
        notes,
        rating,
        visibility,
        created_at,
        recipe:recipes(title)
      `)
      .eq('user_id', data.userId)
      .order('logged_at', { ascending: false })

    if (viewerId !== data.userId) {
      query = query.eq('visibility', 'public')
    }

    const { data: logs, error } = await query
    if (error) throw error

    return (logs ?? []).map((log) => ({
      id: log.id,
      recipe_id: log.recipe_id,
      recipe_title:
        (log.recipe as { title: string } | null)?.title ?? null,
      logged_at: log.logged_at,
      notes: log.notes,
      rating: log.rating,
      visibility: log.visibility,
      created_at: log.created_at,
    }))
  })
