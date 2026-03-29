import { createFileRoute, useNavigate, useRouter, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { getLog, updateLog, deleteLog } from '../server/logs'
import { getSession } from '../server/auth'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { StarPicker } from '../components/StarPicker'

export const Route = createFileRoute('/logs/$id')({
  loader: async ({ params }) => {
    const [log, session] = await Promise.all([
      getLog({ data: { id: params.id } }),
      getSession(),
    ])
    return { log, viewerId: session?.id ?? null }
  },
  component: LogDetailPage,
})

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function LogDetailPage() {
  const { log, viewerId } = Route.useLoaderData()
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const router = useRouter()
  const isOwner = viewerId !== null && viewerId === log.user_id

  const [editing, setEditing] = useState(false)
  const [loggedAt, setLoggedAt] = useState(log.logged_at)
  const [notes, setNotes] = useState(log.notes ?? '')
  const [visibility, setVisibility] = useState(log.visibility)
  const [rating, setRating] = useState<number | null>(log.rating ?? null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await updateLog({
        data: { id, loggedAt, notes, visibility, rating },
      })
      setEditing(false)
      await router.invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function handleDelete() {
    setShowDeleteDialog(true)
  }

  async function handleConfirmDelete() {
    setDeleting(true)
    setError(null)
    try {
      await deleteLog({ data: { id } })
      navigate({ to: '/logs' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
      setDeleting(false)
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="mb-2">
        {log.recipe_id && log.recipe ? (
          <Link
            to="/recipes/$id"
            params={{ id: log.recipe_id }}
            className="text-xl font-bold text-[#1F2937] hover:text-[#E53935]"
          >
            {log.recipe.title}
          </Link>
        ) : (
          <span className="text-xl font-bold text-[#6B7280] italic">
            Deleted recipe
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mb-6">
        <p className="text-sm text-[#6B7280]">{formatDate(log.logged_at)}</p>
        <span
          className={`text-xs px-1.5 py-0.5 rounded font-medium ${
            log.visibility === 'private'
              ? 'bg-[#F1E7DA] text-[#6B7280]'
              : 'bg-green-50 text-green-700'
          }`}
        >
          {log.visibility === 'private' ? 'Private' : 'Public'}
        </span>
      </div>

      {log.rating != null && (
        <div className="mb-4">
          <StarPicker value={log.rating} readOnly />
        </div>
      )}

      {!editing && (
        <>
          {log.notes ? (
            <p className="text-[#1F2937] leading-relaxed whitespace-pre-wrap mb-6">
              {log.notes}
            </p>
          ) : (
            <p className="text-[#6B7280] italic mb-6">No notes</p>
          )}

          {isOwner && (
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 rounded-md bg-[#E53935] text-white text-sm font-medium hover:bg-[#CC332F] transition-colors"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-md border border-[#E53935] text-[#E53935] text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          )}
        </>
      )}

      {editing && isOwner && (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="loggedAt"
              className="block text-sm font-medium text-[#1F2937] mb-1"
            >
              Date made
            </label>
            <input
              id="loggedAt"
              type="date"
              value={loggedAt}
              onChange={(e) => setLoggedAt(e.target.value)}
              className="border border-[#F1E7DA] rounded-md px-3 py-2 text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#E53935] bg-white"
            />
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-[#1F2937] mb-1"
            >
              Notes
            </label>
            <textarea
              id="notes"
              rows={6}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-[#F1E7DA] rounded-md px-3 py-2 text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#E53935] bg-white resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-1">
              Rating (optional)
            </label>
            <StarPicker value={rating} onChange={setRating} />
          </div>

          <div>
            <label
              htmlFor="visibility"
              className="block text-sm font-medium text-[#1F2937] mb-1"
            >
              Visibility
            </label>
            <select
              id="visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
              className="border border-[#F1E7DA] rounded-md px-3 py-2 text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#E53935] bg-white"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-md bg-[#E53935] text-white text-sm font-medium hover:bg-[#CC332F] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setEditing(false)
                setLoggedAt(log.logged_at)
                setNotes(log.notes ?? '')
                setVisibility(log.visibility)
                setRating(log.rating ?? null)
                setError(null)
              }}
              className="px-4 py-2 rounded-md border border-[#F1E7DA] text-[#6B7280] text-sm font-medium hover:bg-[#FFFDF8] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Log"
        message="Delete this log entry? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteDialog(false)}
        isLoading={deleting}
      />
    </main>
  )
}
