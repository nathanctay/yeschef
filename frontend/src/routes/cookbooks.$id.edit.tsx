import { createFileRoute, useNavigate, Link, notFound } from '@tanstack/react-router'
import { useState } from 'react'
import { getCookbook, updateCookbook } from '../server/cookbooks'
import { COOKBOOK_COLORS } from '../lib/cookbookColors'

export const Route = createFileRoute('/cookbooks/$id/edit')({
  loader: async ({ params }) => {
    const cookbook = await getCookbook({ data: { id: params.id } })
    if (cookbook.viewerPermission !== 'owner') throw notFound()
    return cookbook
  },
  component: EditCookbookPage,
})

function EditCookbookPage() {
  const cookbook = Route.useLoaderData()
  const { id } = Route.useParams()
  const navigate = useNavigate()

  const [coverStyle, setCoverStyle] = useState<'color' | 'image'>(
    cookbook.cover_style as 'color' | 'image'
  )
  const [selectedColor, setSelectedColor] = useState(
    cookbook.cover_color ?? COOKBOOK_COLORS[0].value
  )
  const [visibility, setVisibility] = useState<'public' | 'private'>(
    cookbook.visibility as 'public' | 'private'
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const form = e.currentTarget
      const formData = new FormData(form)
      formData.set('id', id)
      await updateCookbook({ data: formData })
      navigate({ to: '/cookbooks/$id', params: { id } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#1F2937] mb-6">Edit Cookbook</h1>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[#1F2937] mb-1">
            Name <span className="text-[#E53935]">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={cookbook.name}
            className="w-full border border-[#F1E7DA] rounded-md px-3 py-2 text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#E53935] bg-white"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-[#1F2937] mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={cookbook.description ?? ''}
            className="w-full border border-[#F1E7DA] rounded-md px-3 py-2 text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#E53935] bg-white resize-none"
          />
        </div>

        <div>
          <p className="text-sm font-medium text-[#1F2937] mb-2">Visibility</p>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={visibility === 'private'}
                onChange={() => setVisibility('private')}
                className="accent-[#E53935]"
              />
              <span className="text-sm text-[#1F2937]">Private</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === 'public'}
                onChange={() => setVisibility('public')}
                className="accent-[#E53935]"
              />
              <span className="text-sm text-[#1F2937]">Public</span>
            </label>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-[#1F2937] mb-2">Cover style</p>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="cover_style"
                value="color"
                checked={coverStyle === 'color'}
                onChange={() => setCoverStyle('color')}
                className="accent-[#E53935]"
              />
              <span className="text-sm text-[#1F2937]">Color</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="cover_style"
                value="image"
                checked={coverStyle === 'image'}
                onChange={() => setCoverStyle('image')}
                className="accent-[#E53935]"
              />
              <span className="text-sm text-[#1F2937]">Image</span>
            </label>
          </div>
        </div>

        {coverStyle === 'color' && (
          <div>
            <p className="text-sm font-medium text-[#1F2937] mb-2">Cover color</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {COOKBOOK_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  title={color.label}
                  onClick={() => setSelectedColor(color.value)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: color.value,
                    border: selectedColor === color.value ? '3px solid #1F2937' : '3px solid transparent',
                    outline: selectedColor === color.value ? '2px solid #fff' : 'none',
                    outlineOffset: '-5px',
                    cursor: 'pointer',
                    padding: 0,
                    flexShrink: 0,
                  }}
                  aria-label={color.label}
                  aria-pressed={selectedColor === color.value}
                />
              ))}
            </div>
            <input type="hidden" name="cover_color" value={selectedColor} />
          </div>
        )}

        {coverStyle === 'image' && (
          <div>
            <label htmlFor="coverImage" className="block text-sm font-medium text-[#1F2937] mb-1">
              Cover image
            </label>
            <input
              id="coverImage"
              name="coverImage"
              type="file"
              accept="image/*"
              className="block text-sm text-[#6B7280] file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-[#F1E7DA] file:text-sm file:bg-white file:text-[#1F2937] hover:file:bg-[#FFFDF8]"
            />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-md bg-[#E53935] text-white font-medium hover:bg-[#CC332F] transition-colors disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            to="/cookbooks/$id"
            params={{ id }}
            className="px-5 py-2 rounded-md border border-[#E53935] text-[#E53935] font-medium hover:bg-red-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  )
}
