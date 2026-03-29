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

async function uploadRecipeImage(file: File): Promise<string> {
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const MAX_SIZE_BYTES = 10 * 1024 * 1024

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Image must be a JPEG, PNG, WebP, or GIF')
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('Image must be smaller than 10MB')
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
  await supabase.storage.from('recipe-images').upload(path, buffer, { contentType: file.type })
  return supabase.storage.from('recipe-images').getPublicUrl(path).data.publicUrl
}

async function uploadVideo(file: File): Promise<string> {
  const MAX_SIZE_BYTES = 200 * 1024 * 1024 // 200MB

  if (!file.type.startsWith('video/')) {
    throw new Error('File must be a video')
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('Video must be smaller than 200MB')
  }

  const supabase = getSupabaseClient()
  const ext = file.type.split('/')[1] ?? 'mp4'
  const path = `${crypto.randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await supabase.storage.from('recipe-videos').upload(path, buffer, { contentType: file.type })
  return supabase.storage.from('recipe-videos').getPublicUrl(path).data.publicUrl
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

    // Base select fragment (reused for both queries)
    const SELECT = `id, owner_id, title, description, cover_image_path, visibility, created_at,
      rating_avg, rating_count,
      like_count:recipe_likes(count),
      log_count:recipe_logs(count),
      owner:profiles!owner_id(id, display_name, avatar_url)`

    function normalize(rows: Array<Record<string, any>>) {
      return rows.map((r) => ({
        ...r,
        like_count: r.like_count[0]?.count ?? 0,
        log_count: r.log_count[0]?.count ?? 0,
      }))
    }

    // If logged in, try to rank followed users first
    if (viewerId) {
      const { data: follows } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', viewerId)

      const followedIds = (follows ?? []).map((f) => f.following_id)

      if (followedIds.length > 0) {
        const visibilityFilter = `visibility.eq.public,owner_id.eq.${viewerId}`

        // Note: cursor pagination is not applied on the ranked path in Phase 2 — a full re-fetch is used.
        const followedQuery = supabase
          .from('recipes')
          .select(SELECT)
          .in('owner_id', followedIds)
          .or(visibilityFilter)
          .order('created_at', { ascending: false })
          .limit(limit)

        const othersQuery = supabase
          .from('recipes')
          .select(SELECT)
          .not('owner_id', 'in', `(${followedIds.join(',')})`)
          .or(visibilityFilter)
          .order('created_at', { ascending: false })
          .limit(limit)

        const [{ data: followedRows, error: e1 }, { data: otherRows, error: e2 }] =
          await Promise.all([followedQuery, othersQuery])

        if (e1) throw new Error(e1.message)
        if (e2) throw new Error(e2.message)

        const combined = [
          ...normalize(followedRows ?? []),
          ...normalize(otherRows ?? []),
        ].slice(0, limit)

        return combined
      }
    }

    // Fallback: original unranked query
    let query = supabase
      .from('recipes')
      .select(SELECT)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (data.cursor) query = query.lt('created_at', data.cursor)

    if (viewerId) {
      query = query.or(`visibility.eq.public,owner_id.eq.${viewerId}`)
    } else {
      query = query.eq('visibility', 'public')
    }

    const { data: rows, error } = await query
    if (error) throw new Error(error.message)
    return normalize(rows)
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
         rating_avg, rating_count,
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
        `id, owner_id, title, description, cover_image_path, video_path, visibility, content_json, created_at, updated_at,
         forked_from_recipe_id,
         images, rating_avg, rating_count, servings, prep_time_minutes, cook_time_minutes, total_time_minutes, nutrition_json,
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

    // New image gallery
    const imageFilesRaw = data.getAll('imageFiles') as File[]
    const imageFiles = imageFilesRaw.filter((f) => f && f.size > 0)
    const uploadedImages: string[] = []
    for (const f of imageFiles) {
      uploadedImages.push(await uploadRecipeImage(f))
    }

    // New metadata fields
    const servings = data.get('servings') ? parseInt(data.get('servings') as string, 10) : null
    const prep_time_minutes = data.get('prep_time_minutes') ? parseInt(data.get('prep_time_minutes') as string, 10) : null
    const cook_time_minutes = data.get('cook_time_minutes') ? parseInt(data.get('cook_time_minutes') as string, 10) : null
    const total_time_minutes = data.get('total_time_minutes') ? parseInt(data.get('total_time_minutes') as string, 10) : null
    const nutritionRaw = data.get('nutrition_json') as string | null
    let nutrition_json: object | null = null
    try {
      if (nutritionRaw) nutrition_json = JSON.parse(nutritionRaw)
    } catch {}

    const videoFile = data.get('videoFile') as File | null
    let video_path: string | null = null
    if (videoFile && videoFile.size > 0) {
      video_path = await uploadVideo(videoFile)
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
        video_path,
        images: uploadedImages,
        servings,
        prep_time_minutes,
        cook_time_minutes,
        total_time_minutes,
        nutrition_json,
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

    // Keep existing images + upload new ones
    const existingImagesRaw = data.get('images') as string | null
    let existingImages: string[] = []
    try {
      if (existingImagesRaw) existingImages = JSON.parse(existingImagesRaw)
    } catch {}

    const imageFilesRaw = data.getAll('imageFiles') as File[]
    const imageFiles = imageFilesRaw.filter((f) => f && f.size > 0)
    const newImageUrls: string[] = []
    for (const f of imageFiles) {
      newImageUrls.push(await uploadRecipeImage(f))
    }
    const allImages = [...existingImages, ...newImageUrls]

    // Metadata fields
    const servings = data.get('servings') ? parseInt(data.get('servings') as string, 10) : null
    const prep_time_minutes = data.get('prep_time_minutes') ? parseInt(data.get('prep_time_minutes') as string, 10) : null
    const cook_time_minutes = data.get('cook_time_minutes') ? parseInt(data.get('cook_time_minutes') as string, 10) : null
    const total_time_minutes = data.get('total_time_minutes') ? parseInt(data.get('total_time_minutes') as string, 10) : null
    const nutritionRaw = data.get('nutrition_json') as string | null
    let nutrition_json: object | null | undefined
    try {
      nutrition_json = nutritionRaw ? JSON.parse(nutritionRaw) : undefined
    } catch {}

    const videoFile = data.get('videoFile') as File | null
    let video_path: string | undefined
    if (videoFile && videoFile.size > 0) {
      video_path = await uploadVideo(videoFile)
    }

    const { error } = await supabase
      .from('recipes')
      .update({
        title,
        description,
        visibility,
        content_json,
        ...(cover_image_path !== undefined ? { cover_image_path } : {}),
        ...(video_path !== undefined ? { video_path } : {}),
        images: allImages,
        servings,
        prep_time_minutes,
        cook_time_minutes,
        total_time_minutes,
        ...(nutrition_json !== undefined ? { nutrition_json } : {}),
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
