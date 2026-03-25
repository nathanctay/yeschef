import { createFileRoute, useRouter, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { getRecipe, deleteRecipe, likeRecipe, unlikeRecipe, forkRecipe } from '../server/recipes'
import { getSession } from '../server/auth'
import { CommentList } from '../components/CommentList'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { LogRecipeDialog } from '../components/LogRecipeDialog'
import { AddToCookbookDialog } from '../components/AddToCookbookDialog'

import { createLog, listLogsForRecipe } from '../server/logs'

export const Route = createFileRoute('/recipes/$id/')({
  loader: async ({ params }) => {
    const [recipe, session] = await Promise.all([
      getRecipe({ data: { id: params.id } }),
      getSession(),
    ])
    return { recipe, viewerId: session?.id ?? null }
  },
  component: RecipePage,
})

function LogListSection({ recipeId, refreshKey }: { recipeId: string; refreshKey: number }) {
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof listLogsForRecipe>>>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    listLogsForRecipe({ data: { recipeId } }).then(setLogs).finally(() => setLoading(false))
  }, [recipeId, refreshKey])
  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading logs...</p>
  if (!logs.length) return <p style={{ color: 'var(--text-muted)' }}>No logs yet.</p>
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {logs.map(log => (
        <li key={log.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--line)' }}>
          <span style={{ fontWeight: 600 }}>{log.author.display_name}</span>
          {' — '}{new Date(log.logged_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          {log.notes && <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>{log.notes}</p>}
        </li>
      ))}
    </ul>
  )
}

function RecipePage() {
  const { recipe: initialRecipe, viewerId } = Route.useLoaderData()
  const router = useRouter()

  const [recipe, setRecipe] = useState(initialRecipe)
  const [logRefreshKey, setLogRefreshKey] = useState(0)
  const [isLiking, setIsLiking] = useState(false)
  const [isForking, setIsForking] = useState(false)
  const [showLogDialog, setShowLogDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showAddToCookbookDialog, setShowAddToCookbookDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isOwner = viewerId === recipe.owner_id

  const content = recipe.content_json as {
    ingredients: Array<{ id?: string; text: string }>
    steps: Array<{ id?: string; text: string }>
    notes?: string
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await deleteRecipe({ data: { id: recipe.id } })
      await router.navigate({ to: '/explore' })
    } catch {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  async function handleLike() {
    if (isLiking) return

    const wasLiked = recipe.viewerHasLiked
    const prevCount = recipe.like_count

    // Optimistic update — toggle immediately
    setRecipe((prev) => ({
      ...prev,
      viewerHasLiked: !wasLiked,
      like_count: wasLiked ? prevCount - 1 : prevCount + 1,
    }))

    setIsLiking(true)
    try {
      if (wasLiked) {
        await unlikeRecipe({ data: { recipeId: recipe.id } })
      } else {
        await likeRecipe({ data: { recipeId: recipe.id } })
      }
    } catch {
      // Revert on failure
      setRecipe((prev) => ({
        ...prev,
        viewerHasLiked: wasLiked,
        like_count: prevCount,
      }))
    } finally {
      setIsLiking(false)
    }
  }

  async function handleFork() {
    if (isForking) return
    setIsForking(true)
    try {
      const result = await forkRecipe({ data: { id: recipe.id } })
      await router.navigate({ to: '/recipes/$id/edit', params: { id: result.id } })
    } finally {
      setIsForking(false)
    }
  }

  async function handleLogSubmit(data: { loggedAt: string; notes: string; visibility: 'public' | 'private' }) {
    await createLog({ data: { recipeId: recipe.id, loggedAt: data.loggedAt, notes: data.notes, visibility: data.visibility } })
    setLogRefreshKey((k) => k + 1)
  }

  const sectionHeadingStyle: React.CSSProperties = {
    fontSize: '1.2rem',
    fontWeight: 700,
    marginBottom: '10px',
    borderBottom: '1px solid #F1E7DA',
    paddingBottom: '6px',
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px', color: '#1F2937' }}>
      {recipe.cover_image_path && (
        <img
          src={recipe.cover_image_path}
          alt={recipe.title}
          style={{ width: '100%', borderRadius: '8px', marginBottom: '24px', objectFit: 'cover', maxHeight: '360px' }}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '16px' }}>
        <h1 style={{ fontFamily: 'serif', fontSize: '2.2rem', margin: 0, flex: 1 }}>{recipe.title}</h1>
        {isOwner && (
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <Link
              to="/recipes/$id/edit"
              params={{ id: recipe.id }}
              style={{
                padding: '6px 14px',
                border: '1px solid #F1E7DA',
                borderRadius: '4px',
                background: '#FFFDF8',
                color: '#1F2937',
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Edit
            </Link>
            <button
              onClick={() => setShowDeleteDialog(true)}
              style={{
                padding: '6px 14px',
                border: '1px solid #E53935',
                borderRadius: '4px',
                background: 'transparent',
                color: '#E53935',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', color: '#6B7280', marginBottom: '20px', flexWrap: 'wrap' }}>
        <span>by {recipe.owner.display_name}</span>
        <span>{recipe.log_count} {recipe.log_count === 1 ? 'log' : 'logs'}</span>
        <span>{recipe.comment_count} {recipe.comment_count === 1 ? 'comment' : 'comments'}</span>

        {/* Like button */}
        <button
          onClick={viewerId ? handleLike : undefined}
          disabled={isLiking || !viewerId}
          title={viewerId ? undefined : 'Sign in to like'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            border: '1px solid #F1E7DA',
            borderRadius: '4px',
            background: recipe.viewerHasLiked ? '#FEE2E2' : '#FFFDF8',
            color: recipe.viewerHasLiked ? '#E53935' : '#6B7280',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: viewerId && !isLiking ? 'pointer' : 'default',
          }}
        >
          <span style={{ fontSize: '1rem' }}>{recipe.viewerHasLiked ? '[♥]' : '[♡]'}</span>
          {recipe.like_count}
        </button>

        {/* Log and Fork buttons */}
        {viewerId && (
          <>
            <button
              onClick={() => setShowLogDialog(true)}
              style={{
                padding: '4px 12px',
                border: '1px solid #F1E7DA',
                borderRadius: '4px',
                background: '#FFFDF8',
                color: '#1F2937',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Log Recipe
            </button>
            <button
              onClick={handleFork}
              disabled={isForking}
              style={{
                padding: '4px 12px',
                border: '1px solid #F1E7DA',
                borderRadius: '4px',
                background: '#FFFDF8',
                color: '#1F2937',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: isForking ? 'not-allowed' : 'pointer',
              }}
            >
              {isForking ? 'Forking...' : 'Fork Recipe'}
            </button>
            <button
              onClick={() => setShowAddToCookbookDialog(true)}
              style={{
                padding: '4px 12px',
                border: '1px solid #F1E7DA',
                borderRadius: '4px',
                background: '#FFFDF8',
                color: '#1F2937',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Add to Cookbook
            </button>
          </>
        )}
      </div>

      {recipe.description && (
        <p style={{ fontSize: '1rem', color: '#374151', marginBottom: '24px', lineHeight: 1.6 }}>
          {recipe.description}
        </p>
      )}

      <section style={{ marginBottom: '28px' }}>
        <h2 style={sectionHeadingStyle}>Ingredients</h2>
        <ul style={{ margin: 0, padding: '0 0 0 18px', lineHeight: 1.8 }}>
          {content.ingredients.map((ing, idx) => (
            <li key={ing.id ?? idx}>{ing.text}</li>
          ))}
        </ul>
      </section>

      <section style={{ marginBottom: '28px' }}>
        <h2 style={sectionHeadingStyle}>Steps</h2>
        <ol style={{ margin: 0, padding: '0 0 0 18px', lineHeight: 1.9 }}>
          {content.steps.map((step, idx) => (
            <li key={step.id ?? idx} style={{ marginBottom: '8px' }}>{step.text}</li>
          ))}
        </ol>
      </section>

      {content.notes && (
        <section style={{ marginBottom: '28px' }}>
          <h2 style={sectionHeadingStyle}>Notes</h2>
          <p style={{ lineHeight: 1.7, color: '#374151' }}>{content.notes}</p>
        </section>
      )}

      <LogListSection recipeId={recipe.id} refreshKey={logRefreshKey} />

      <CommentList recipeId={recipe.id} viewerId={viewerId} />

      <LogRecipeDialog
        isOpen={showLogDialog}
        onClose={() => setShowLogDialog(false)}
        onSubmit={handleLogSubmit}
      />
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Recipe"
        message="This will permanently delete the recipe. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        isLoading={isDeleting}
      />
      <AddToCookbookDialog
        isOpen={showAddToCookbookDialog}
        onClose={() => setShowAddToCookbookDialog(false)}
        recipeId={recipe.id}
      />
    </div>
  )
}
