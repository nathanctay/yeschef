import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { requireAuth } from '../server/auth'
import { getProfile, updateProfile } from '../server/profiles'

export const Route = createFileRoute('/profile/edit')({
  beforeLoad: async () => {
    await requireAuth()
  },
  loader: async () => {
    const user = await requireAuth()
    return getProfile({ data: { id: user.id } })
  },
  component: ProfileEditPage,
})

function ProfileEditPage() {
  const profile = Route.useLoaderData()
  const router = useRouter()
  const [previewUrl, setPreviewUrl] = useState<string | null>(profile.avatar_url ?? null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData(e.currentTarget)
      await updateProfile({ data: formData })
      await router.navigate({ to: '/profile' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-[#1F2937]">Edit Profile</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} encType="multipart/form-data" className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <label htmlFor="display_name" className="text-sm font-semibold text-[#1F2937]">
            Display Name
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            defaultValue={profile.display_name ?? ''}
            className="rounded-lg border border-[#F1E7DA] bg-[#FFFDF8] px-4 py-2.5 text-sm text-[#1F2937] outline-none focus:border-[#E53935] focus:ring-1 focus:ring-[#E53935]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-[#1F2937]">Avatar</span>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Avatar preview"
              className="h-24 w-24 rounded-full object-cover border-2 border-[#F1E7DA]"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#E53935] text-2xl font-bold text-white">
              {(profile.display_name ?? '?')[0].toUpperCase()}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-fit rounded-lg border border-[#F1E7DA] bg-[#FFFDF8] px-4 py-2 text-sm text-[#1F2937] hover:border-[#E53935] hover:text-[#E53935] transition"
          >
            Change photo
          </button>
          <input
            ref={fileInputRef}
            name="avatarImage"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-[#E53935] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#C62828] disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => router.navigate({ to: '/profile' })}
            className="rounded-lg border border-[#F1E7DA] px-6 py-2.5 text-sm font-semibold text-[#1F2937] transition hover:border-[#1F2937]"
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  )
}
