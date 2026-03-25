import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listComments, createComment, updateComment, deleteComment } from '../server/recipes'
import { ConfirmDialog } from './ConfirmDialog'

interface Comment {
  id: string
  user_id: string
  body: string
  created_at: string
  updated_at: string
  author: {
    id: string
    display_name: string
    avatar_url: string | null
  }
}

interface CommentListProps {
  recipeId: string
  viewerId: string | null
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function CommentList({ recipeId, viewerId }: CommentListProps) {
  const qc = useQueryClient()
  const [composerBody, setComposerBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [isDeletingComment, setIsDeletingComment] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ['comments', recipeId],
    queryFn: () => listComments({ data: { recipeId } }),
    staleTime: 30_000,
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!composerBody.trim()) return
    setIsSubmitting(true)
    setCreateError(null)
    try {
      await createComment({ data: { recipeId, body: composerBody.trim() } })
      setComposerBody('')
      qc.invalidateQueries({ queryKey: ['comments', recipeId] })
    } catch (err: any) {
      setCreateError(err?.message ?? 'Failed to post comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleUpdate(id: string) {
    if (!editBody.trim()) return
    setUpdateError(null)
    try {
      await updateComment({ data: { id, body: editBody.trim() } })
      setEditingId(null)
      qc.invalidateQueries({ queryKey: ['comments', recipeId] })
    } catch (err: any) {
      setUpdateError(err?.message ?? 'Failed to update comment')
    }
  }

  function handleDelete(id: string) {
    setDeleteTargetId(id)
  }

  async function handleConfirmDelete() {
    setIsDeletingComment(true)
    setDeleteError(null)
    try {
      await deleteComment({ data: { id: deleteTargetId! } })
      qc.invalidateQueries({ queryKey: ['comments', recipeId] })
    } catch (err: any) {
      setDeleteError(err?.message ?? 'Failed to delete comment')
    } finally {
      setIsDeletingComment(false)
      setDeleteTargetId(null)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #F1E7DA',
    borderRadius: '4px',
    fontSize: '0.9rem',
    color: '#1F2937',
    background: '#FFFDF8',
    boxSizing: 'border-box',
    resize: 'vertical',
  }

  const smallBtnStyle = (variant: 'primary' | 'ghost' | 'danger'): React.CSSProperties => ({
    padding: '4px 10px',
    border: variant === 'danger' ? '1px solid transparent' : '1px solid #F1E7DA',
    borderRadius: '4px',
    background: variant === 'primary' ? '#E53935' : 'transparent',
    color: variant === 'primary' ? '#FFFFFF' : variant === 'danger' ? '#E53935' : '#6B7280',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
  })

  return (
    <section style={{ marginTop: '40px' }}>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', borderBottom: '1px solid #F1E7DA', paddingBottom: '6px' }}>
        Comments ({comments.length})
      </h2>

      {updateError && <p style={{ color: '#E53935', fontSize: '0.85rem', marginBottom: '8px' }}>{updateError}</p>}
      {deleteError && <p style={{ color: '#E53935', fontSize: '0.85rem', marginBottom: '8px' }}>{deleteError}</p>}

      {isLoading && <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Loading comments...</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        {comments.map((comment) => (
          <div
            key={comment.id}
            style={{ borderBottom: '1px solid #F1E7DA', paddingBottom: '14px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              {comment.author.avatar_url ? (
                <img
                  src={comment.author.avatar_url}
                  alt={comment.author.display_name}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: '#F1E7DA',
                    border: '1px solid #E53935',
                    flexShrink: 0,
                  }}
                />
              )}
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{comment.author.display_name}</span>
              <span style={{ color: '#9CA3AF', fontSize: '0.78rem' }}>{formatDate(comment.created_at)}</span>
            </div>

            {editingId === comment.id ? (
              <div>
                <textarea
                  style={{ ...inputStyle, minHeight: '70px', marginBottom: '6px' }}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button style={smallBtnStyle('primary')} onClick={() => handleUpdate(comment.id)}>Save</button>
                  <button style={smallBtnStyle('ghost')} onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <p style={{ margin: '0 0 8px 0', lineHeight: 1.6, fontSize: '0.9rem', color: '#374151' }}>
                  {comment.body}
                </p>
                {viewerId === comment.user_id && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      style={smallBtnStyle('ghost')}
                      onClick={() => { setEditingId(comment.id); setEditBody(comment.body) }}
                    >
                      Edit
                    </button>
                    <button style={smallBtnStyle('danger')} onClick={() => handleDelete(comment.id)}>
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {viewerId && (
        <form onSubmit={handleCreate}>
          <textarea
            style={{ ...inputStyle, minHeight: '80px', marginBottom: '8px' }}
            value={composerBody}
            onChange={(e) => setComposerBody(e.target.value)}
            placeholder="Leave a comment..."
          />
          <button
            type="submit"
            disabled={isSubmitting || !composerBody.trim()}
            style={{
              padding: '8px 18px',
              background: '#E53935',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </button>
          {createError && <p style={{ color: '#E53935', fontSize: '0.85rem', marginTop: '8px' }}>{createError}</p>}
        </form>
      )}
      <ConfirmDialog
        isOpen={deleteTargetId !== null}
        title="Delete Comment"
        message="Delete this comment? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
        isLoading={isDeletingComment}
      />
    </section>
  )
}
