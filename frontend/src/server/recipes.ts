import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSupabaseClient } from './supabase'
import { getSession, requireAuth } from './auth'

async function uploadCoverImage(file: File, bucket: string): Promise<string> {
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Cover image must be a JPEG, PNG, WebP, or GIF')
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('Cover image must be smaller than 10MB')
  }

  const supabase = getSupabaseClient()
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  const ext = mimeToExt[file.type]
  const path = `${crypto.randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await supabase.storage.from(bucket).upload(path, buffer, { contentType: file.type })
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

export const listRecipes = createServerFn()
  .inputValidator((data: { cursor?: string; limit?: number }) =>
    z
      .object({ cursor: z.string().datetime().optional(), limit: z.number().int().min(1).max(100).optional() })
      .parse(data)
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()
    const session = await getSession()
    const viewerId = session?.id ?? null
    const limit = data.limit ?? 20

    let query = supabase
      .from('recipes')
      .select(
        `id, owner_id, title, description, cover_image_path, visibility, created_at,
         like_count:recipe_likes(count),
         log_count:recipe_logs(count),
         owner:profiles!owner_id(id, display_name, avatar_url)`
      )
      .order('created_at', { ascending: false })
      .limit(limit)

    if (data.cursor) {
      query = query.lt('created_at', data.cursor)
    }

    if (viewerId) {
      query = query.or(`visibility.eq.public,owner_id.eq.${viewerId}`)
    } else {
      query = query.eq('visibility', 'public')
    }

    const { data: rows, error } = await query
    if (error) throw new Error(error.message)

    return rows.map((r: any) => ({
      ...r,
      like_count: r.like_count[0]?.count ?? 0,
      log_count: r.log_count[0]?.count ?? 0,
    }))
  })

export const listRecipesForUser = createServerFn()
  .inputValidator((data: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()
    const session = await getSession()
    const viewerId = session?.id ?? null

    let query = supabase
      .from('recipes')
      .select(
        `id, owner_id, title, description, cover_image_path, visibility, created_at,
         like_count:recipe_likes(count),
         log_count:recipe_logs(count),
         owner:profiles!owner_id(id, display_name, avatar_url)`
      )
      .eq('owner_id', data.userId)
      .order('created_at', { ascending: false })

    if (viewerId !== data.userId) {
      query = query.eq('visibility', 'public')
    }

    const { data: rows, error } = await query
    if (error) throw new Error(error.message)

    return rows.map((r: any) => ({
      ...r,
      like_count: r.like_count[0]?.count ?? 0,
      log_count: r.log_count[0]?.count ?? 0,
    }))
  })

export const getRecipe = createServerFn()
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const supabase = getSupabaseClient()
    const session = await getSession()
    const viewerId = session?.id ?? null

    const { data: recipe, error } = await supabase
      .from('recipes')
      .select(
        `id, owner_id, title, description, cover_image_path, visibility, content_json, created_at, updated_at,
         forked_from_recipe_id,
         like_count:recipe_likes(count),
         log_count:recipe_logs(count),
         comment_count:recipe_comments(count),
         owner:profiles!owner_id(id, display_name, avatar_url)`
      )
      .eq('id', data.id)
      .single()

    if (error || !recipe) {
      throw new Response('Not Found', { status: 404 })
    }

    const isOwner = viewerId === recipe.owner_id
    const isPublic = recipe.visibility === 'public'

    if (!isOwner && !isPublic) {
      throw new Response('Not Found', { status: 404 })
    }

    let viewerHasLiked = false
    if (viewerId) {
      const { data: like } = await supabase
        .from('recipe_likes')
        .select('user_id')
        .eq('recipe_id', data.id)
        .eq('user_id', viewerId)
        .maybeSingle()
      viewerHasLiked = !!like
    }

    return {
      ...recipe,
      like_count: (recipe as any).like_count[0]?.count ?? 0,
      log_count: (recipe as any).log_count[0]?.count ?? 0,
      comment_count: (recipe as any).comment_count[0]?.count ?? 0,
      viewerHasLiked,
    }
  })

export const createRecipe = createServerFn({ method: 'POST' })
  .inputValidator((data: FormData) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth()
    const supabase = getSupabaseClient()

    const title = data.get('title') as string
    const description = (data.get('description') as string) || null
    const visibility = (data.get('visibility') as string) || 'private'
    const ingredientsRaw = data.get('ingredients') as string
    const stepsRaw = data.get('steps') as string
    const notes = (data.get('notes') as string) || undefined
    const coverImageFile = data.get('coverImage') as File | null

    if (!title) throw new Error('Title is required')
    if (visibility !== 'public' && visibility !== 'private') {
      throw new Error('Invalid visibility value')
    }

    let ingredients: Array<{ id?: string; text: string }>
    let steps: Array<{ id?: string; text: string }>
    try {
      ingredients = JSON.parse(ingredientsRaw)
      steps = JSON.parse(stepsRaw)
    } catch {
      throw new Error('Invalid ingredients or steps format')
    }

    const content_json = { ingredients, steps, ...(notes ? { notes } : {}) }

    let cover_image_path: string | null = null
    if (coverImageFile && coverImageFile.size > 0) {
      cover_image_path = await uploadCoverImage(coverImageFile, 'recipe-covers')
    }

    const { data: row, error } = await supabase
      .from('recipes')
      .insert({
        owner_id: user.id,
        title,
        description,
        visibility,
        content_json,
        cover_image_path,
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    return { id: row.id }
  })

export const updateRecipe = createServerFn({ method: 'POST' })
  .inputValidator((data: FormData) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth()
    const supabase = getSupabaseClient()

    const id = data.get('id') as string
    const title = data.get('title') as string
    const description = (data.get('description') as string) || null
    const visibility = (data.get('visibility') as string) || 'private'
    const ingredientsRaw = data.get('ingredients') as string
    const stepsRaw = data.get('steps') as string
    const notes = (data.get('notes') as string) || undefined
    const coverImageFile = data.get('coverImage') as File | null

    if (!id) throw new Error('Recipe id is required')
    const { success: idValid } = z.string().uuid().safeParse(id)
    if (!idValid) throw new Error('Invalid recipe id format')
    if (visibility !== 'public' && visibility !== 'private') {
      throw new Error('Invalid visibility value')
    }

    const { data: existing, error: fetchErr } = await supabase
      .from('recipes')
      .select('owner_id')
      .eq('id', id)
      .single()

    if (fetchErr || !existing || existing.owner_id !== user.id) {
      throw new Response('Not Found', { status: 404 })
    }

    let ingredients: Array<{ id?: string; text: string }>
    let steps: Array<{ id?: string; text: string }>
    try {
      ingredients = JSON.parse(ingredientsRaw)
      steps = JSON.parse(stepsRaw)
    } catch {
      throw new Error('Invalid ingredients or steps format')
    }
    const content_json = { ingredients, steps, ...(notes ? { notes } : {}) }

    let cover_image_path: string | undefined
    if (coverImageFile && coverImageFile.size > 0) {
      cover_image_path = await uploadCoverImage(coverImageFile, 'recipe-covers')
    }

    const { error } = await supabase
      .from('recipes')
      .update({
        title,
        description,
        visibility,
        content_json,
        ...(cover_image_path !== undefined ? { cover_image_path } : {}),
      })
      .eq('id', id)

    if (error) throw new Error(error.message)
    return { id }
  })

export const deleteRecipe = createServerFn()
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const user = await requireAuth()
    const supabase = getSupabaseClient()

    const { data: existing, error: fetchErr } = await supabase
      .from('recipes')
      .select('owner_id')
      .eq('id', data.id)
      .single()

    if (fetchErr || !existing || existing.owner_id !== user.id) {
      throw new Response('Not Found', { status: 404 })
    }

    const { error } = await supabase.from('recipes').delete().eq('id', data.id)
    if (error) throw new Error(error.message)
  })

export const likeRecipe = createServerFn()
  .inputValidator((data: { recipeId: string }) => z.object({ recipeId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const user = await requireAuth()
    const supabase = getSupabaseClient()

    // Verify recipe is visible to this user
    await getRecipe({ data: { id: data.recipeId } } as any)

    await supabase
      .from('recipe_likes')
      .upsert({ recipe_id: data.recipeId, user_id: user.id }, { onConflict: 'recipe_id,user_id', ignoreDuplicates: true })
  })

export const unlikeRecipe = createServerFn()
  .inputValidator((data: { recipeId: string }) => z.object({ recipeId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const user = await requireAuth()
    const supabase = getSupabaseClient()

    // Verify recipe exists and is visible to this user
    await getRecipe({ data: { id: data.recipeId } } as any)

    await supabase
      .from('recipe_likes')
      .delete()
      .eq('recipe_id', data.recipeId)
      .eq('user_id', user.id)
  })

export const listComments = createServerFn()
  .inputValidator((data: { recipeId: string }) => z.object({ recipeId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    // Verify visibility before listing
    await getRecipe({ data: { id: data.recipeId } } as any)

    const supabase = getSupabaseClient()
    const { data: rows, error } = await supabase
      .from('recipe_comments')
      .select(`id, user_id, body, created_at, updated_at, author:profiles!user_id(id, display_name, avatar_url)`)
      .eq('recipe_id', data.recipeId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return rows
  })

export const createComment = createServerFn()
  .inputValidator((data: { recipeId: string; body: string }) =>
    z.object({ recipeId: z.string().uuid(), body: z.string().min(1).max(2000) }).parse(data)
  )
  .handler(async ({ data }) => {
    const user = await requireAuth()

    // Verify recipe is visible
    await getRecipe({ data: { id: data.recipeId } } as any)

    const supabase = getSupabaseClient()
    const { data: row, error } = await supabase
      .from('recipe_comments')
      .insert({ recipe_id: data.recipeId, user_id: user.id, body: data.body })
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    return { id: row.id }
  })

export const updateComment = createServerFn()
  .inputValidator((data: { id: string; body: string }) =>
    z.object({ id: z.string().uuid(), body: z.string().min(1).max(2000) }).parse(data)
  )
  .handler(async ({ data }) => {
    const user = await requireAuth()
    const supabase = getSupabaseClient()

    const { data: existing, error: fetchErr } = await supabase
      .from('recipe_comments')
      .select('user_id')
      .eq('id', data.id)
      .single()

    if (fetchErr || !existing || existing.user_id !== user.id) {
      throw new Response('Not Found', { status: 404 })
    }

    const { error } = await supabase
      .from('recipe_comments')
      .update({ body: data.body, updated_at: new Date().toISOString() })
      .eq('id', data.id)

    if (error) throw new Error(error.message)
  })

export const deleteComment = createServerFn()
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const user = await requireAuth()
    const supabase = getSupabaseClient()

    const { data: existing, error: fetchErr } = await supabase
      .from('recipe_comments')
      .select('user_id')
      .eq('id', data.id)
      .single()

    if (fetchErr || !existing || existing.user_id !== user.id) {
      throw new Response('Not Found', { status: 404 })
    }

    const { error } = await supabase.from('recipe_comments').delete().eq('id', data.id)
    if (error) throw new Error(error.message)
  })

export const forkRecipe = createServerFn()
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const user = await requireAuth()

    const source = await getRecipe({ data: { id: data.id } } as any)

    const supabase = getSupabaseClient()
    const { data: row, error } = await supabase
      .from('recipes')
      .insert({
        owner_id: user.id,
        title: source.title,
        description: source.description,
        cover_image_path: source.cover_image_path,
        visibility: 'private',
        content_json: source.content_json,
        forked_from_recipe_id: source.id,
      })
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    return { id: row.id }
  })
