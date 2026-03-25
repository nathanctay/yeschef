import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { z } from 'zod'
import { getSupabaseClient } from './supabase'
import { getSession, requireAuth } from './auth'

export const listCookbooks = createServerFn().handler(async () => {
  const user = await requireAuth()
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('cookbooks')
    .select(`
      id,
      owner_id,
      name,
      description,
      cover_style,
      cover_color,
      cover_image_path,
      visibility,
      created_at,
      cookbook_recipes(count)
    `)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    owner_id: row.owner_id,
    name: row.name,
    description: row.description,
    cover_style: row.cover_style,
    cover_color: row.cover_color,
    cover_image_path: row.cover_image_path,
    visibility: row.visibility,
    created_at: row.created_at,
    recipe_count: (row.cookbook_recipes as unknown as { count: number }[])[0]?.count ?? 0,
  }))
})

export const listCookbooksForUser = createServerFn()
  .inputValidator((data: { userId: string }) =>
    z.object({ userId: z.string() }).parse(data)
  )
  .handler(async () => {
    // Phase 1: all cookbooks are private; always return empty list
    return []
  })

export const getCookbook = createServerFn()
  .inputValidator((data: { id: string }) =>
    z.object({ id: z.string() }).parse(data)
  )
  .handler(async ({ data }) => {
    const user = await requireAuth()
    const supabase = getSupabaseClient()

    const { data: cookbook, error } = await supabase
      .from('cookbooks')
      .select(`
        id,
        owner_id,
        name,
        description,
        cover_style,
        cover_color,
        cover_image_path,
        visibility,
        created_at
      `)
      .eq('id', data.id)
      .single()

    if (error || !cookbook) throw notFound()
    if (cookbook.owner_id !== user.id) throw notFound()

    const { data: recipeRows, error: recipesError } = await supabase
      .from('cookbook_recipes')
      .select(`
        recipe:recipes(
          id,
          title,
          cover_image_path,
          owner_id,
          visibility,
          recipe_likes(count),
          owner:profiles!recipes_owner_id_fkey(display_name)
        )
      `)
      .eq('cookbook_id', data.id)
      .order('sort_order', { ascending: true })

    if (recipesError) throw recipesError

    const recipes = (recipeRows ?? [])
      .map((row) => row.recipe)
      .filter((recipe): recipe is NonNullable<typeof recipe> => {
        if (!recipe) return false
        return recipe.owner_id === user.id || recipe.visibility === 'public'
      })
      .map((recipe) => ({
        id: recipe.id,
        title: recipe.title,
        cover_image_path: recipe.cover_image_path,
        owner_id: recipe.owner_id,
        visibility: recipe.visibility,
        like_count:
          (recipe.recipe_likes as unknown as { count: number }[])[0]?.count ?? 0,
        owner: {
          display_name:
            (recipe.owner as unknown as { display_name: string } | null)
              ?.display_name ?? null,
        },
      }))

    return { ...cookbook, recipes }
  })

const ALLOWED_COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const COVER_MAX_SIZE_BYTES = 10 * 1024 * 1024
const coverMimeToExt: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

async function uploadCookbookCoverImage(
  file: File,
  userId: string,
  supabase: ReturnType<typeof getSupabaseClient>
): Promise<string> {
  if (!ALLOWED_COVER_TYPES.includes(file.type)) {
    throw new Error('Cover image must be a JPEG, PNG, WebP, or GIF')
  }
  if (file.size > COVER_MAX_SIZE_BYTES) {
    throw new Error('Cover image must be smaller than 10MB')
  }
  const ext = coverMimeToExt[file.type]
  const storagePath = `${userId}/${crypto.randomUUID()}.${ext}`
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('cookbook-covers')
    .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false })
  if (uploadError) throw uploadError
  return storagePath
}

const CreateCookbookSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  cover_style: z.enum(['color', 'image']),
  cover_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export const createCookbook = createServerFn({ method: 'POST' })
  .inputValidator((data: FormData) => data)
  .handler(async ({ data }) => {
  const user = await requireAuth()
  const supabase = getSupabaseClient()

  const name = data.get('name') as string
  const description = (data.get('description') as string) || undefined
  const cover_style = data.get('cover_style') as 'color' | 'image'
  const cover_color = (data.get('cover_color') as string) || undefined
  const coverImageFile = data.get('coverImage') as File | null

  CreateCookbookSchema.parse({ name, description, cover_style, cover_color })

  let cover_image_path: string | null = null

  if (cover_style === 'image' && coverImageFile && coverImageFile.size > 0) {
    cover_image_path = await uploadCookbookCoverImage(coverImageFile, user.id, supabase)
  }

  const { data: row, error } = await supabase
    .from('cookbooks')
    .insert({
      owner_id: user.id,
      name,
      description: description ?? null,
      cover_style,
      cover_color: cover_color ?? null,
      cover_image_path,
      visibility: 'private',
    })
    .select('id')
    .single()

  if (error) throw error
  return { id: row.id }
})

const UpdateCookbookSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  cover_style: z.enum(['color', 'image']).optional(),
  cover_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export const updateCookbook = createServerFn({ method: 'POST' })
  .inputValidator((data: FormData) => data)
  .handler(async ({ data }) => {
  const user = await requireAuth()
  const supabase = getSupabaseClient()

  const id = data.get('id') as string
  const name = (data.get('name') as string) || undefined
  const description = (data.get('description') as string) || undefined
  const cover_style = (data.get('cover_style') as 'color' | 'image') || undefined
  const cover_color = (data.get('cover_color') as string) || undefined
  const coverImageFile = data.get('coverImage') as File | null

  UpdateCookbookSchema.parse({ id, name, description, cover_style, cover_color })

  const { data: existing, error: fetchError } = await supabase
    .from('cookbooks')
    .select('owner_id, cover_image_path')
    .eq('id', id)
    .single()

  if (fetchError || !existing) throw notFound()
  if (existing.owner_id !== user.id) throw notFound()

  let cover_image_path = existing.cover_image_path

  if (cover_style === 'image' && coverImageFile && coverImageFile.size > 0) {
    cover_image_path = await uploadCookbookCoverImage(coverImageFile, user.id, supabase)
  }

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name
  if (description !== undefined) updates.description = description
  if (cover_style !== undefined) updates.cover_style = cover_style
  if (cover_color !== undefined) updates.cover_color = cover_color
  if (cover_image_path !== existing.cover_image_path) {
    updates.cover_image_path = cover_image_path
  }

  const { error } = await supabase
    .from('cookbooks')
    .update(updates)
    .eq('id', id)

  if (error) throw error
})

export const deleteCookbook = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) =>
    z.object({ id: z.string() }).parse(data)
  )
  .handler(async ({ data }) => {
    const user = await requireAuth()
    const supabase = getSupabaseClient()

    const { data: existing, error: fetchError } = await supabase
      .from('cookbooks')
      .select('owner_id')
      .eq('id', data.id)
      .single()

    if (fetchError || !existing) throw notFound()
    if (existing.owner_id !== user.id) throw notFound()

    const { error } = await supabase
      .from('cookbooks')
      .delete()
      .eq('id', data.id)

    if (error) throw error
  })

export const addRecipeToCookbook = createServerFn({ method: 'POST' })
  .inputValidator((data: { cookbookId: string; recipeId: string }) =>
    z.object({ cookbookId: z.string(), recipeId: z.string() }).parse(data)
  )
  .handler(async ({ data }) => {
    const user = await requireAuth()
    const supabase = getSupabaseClient()

    const { data: cookbook, error: cbError } = await supabase
      .from('cookbooks')
      .select('owner_id')
      .eq('id', data.cookbookId)
      .single()

    if (cbError || !cookbook) throw notFound()
    if (cookbook.owner_id !== user.id) throw notFound()

    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('owner_id, visibility')
      .eq('id', data.recipeId)
      .single()

    if (recipeError || !recipe) throw notFound()
    const isVisible =
      recipe.owner_id === user.id || recipe.visibility === 'public'
    if (!isVisible) throw notFound()

    const { error } = await supabase
      .from('cookbook_recipes')
      .upsert(
        { cookbook_id: data.cookbookId, recipe_id: data.recipeId, sort_order: 0 },
        { onConflict: 'cookbook_id,recipe_id', ignoreDuplicates: true }
      )

    if (error) throw error
  })

export const removeRecipeFromCookbook = createServerFn({ method: 'POST' })
  .inputValidator((data: { cookbookId: string; recipeId: string }) =>
    z.object({ cookbookId: z.string(), recipeId: z.string() }).parse(data)
  )
  .handler(async ({ data }) => {
    const user = await requireAuth()
    const supabase = getSupabaseClient()

    const { data: cookbook, error: cbError } = await supabase
      .from('cookbooks')
      .select('owner_id')
      .eq('id', data.cookbookId)
      .single()

    if (cbError || !cookbook) throw notFound()
    if (cookbook.owner_id !== user.id) throw notFound()

    const { error } = await supabase
      .from('cookbook_recipes')
      .delete()
      .eq('cookbook_id', data.cookbookId)
      .eq('recipe_id', data.recipeId)

    if (error) throw error
  })

export const listCookbooksWithMembership = createServerFn()
  .inputValidator((data: { recipeId: string }) =>
    z.object({ recipeId: z.string() }).parse(data)
  )
  .handler(async ({ data }) => {
    const user = await requireAuth()
    const supabase = getSupabaseClient()

    const { data: cookbooks, error: cookbooksError } = await supabase
      .from('cookbooks')
      .select(`
        id,
        name,
        cover_style,
        cover_color,
        cover_image_path,
        cookbook_recipes(count)
      `)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })

    if (cookbooksError) throw cookbooksError

    const cookbookIds = (cookbooks ?? []).map((c) => c.id)

    if (cookbookIds.length === 0) return []

    const { data: memberships, error: membershipsError } = await supabase
      .from('cookbook_recipes')
      .select('cookbook_id')
      .eq('recipe_id', data.recipeId)
      .in('cookbook_id', cookbookIds)

    if (membershipsError) throw membershipsError

    const memberSet = new Set((memberships ?? []).map((m) => m.cookbook_id))

    return (cookbooks ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      cover_style: row.cover_style,
      cover_color: row.cover_color,
      cover_image_path: row.cover_image_path,
      recipe_count: (row.cookbook_recipes as unknown as { count: number }[])[0]?.count ?? 0,
      containsRecipe: memberSet.has(row.id),
    }))
  })
