import { useRef, useState, useEffect } from 'react'
import { Link, useRouter, useNavigate } from '@tanstack/react-router'
import { ConfirmDialog } from './ConfirmDialog'
import { COOKBOOK_COLORS } from '../lib/cookbookColors'
import { updateCookbook, deleteCookbook } from '../server/cookbooks'

type CookbookCardProps = {
  cookbook: {
    id: string
    name: string
    cover_style: string
    cover_color: string | null
    cover_image_path: string | null
    recipe_count: number
  }
}

function CookbookCover({
  cover_style,
  cover_color,
  cover_image_path,
  name,
}: {
  cover_style: string
  cover_color: string | null
  cover_image_path: string | null
  name: string
}) {
  if (cover_style === 'image' && cover_image_path) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const src = `${supabaseUrl}/storage/v1/object/public/cookbook-covers/${cover_image_path}`
    return (
      <img
        src={src}
        alt={name}
        className="w-full h-full object-cover"
      />
    )
  }

  const bg = cover_color ?? undefined
  const style = bg
    ? { backgroundColor: bg }
    : { background: 'linear-gradient(135deg, #E53935 0%, #F1E7DA 100%)' }

  return <div className="w-full h-full" style={style} />
}

export default function CookbookCard({ cookbook }: CookbookCardProps) {
  const router = useRouter()
  const navigate = useNavigate()
  const menuRef = useRef<HTMLDivElement>(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSavingColor, setIsSavingColor] = useState(false)
  const [localColor, setLocalColor] = useState<string | null>(null)
  const [colorError, setColorError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const displayColor = localColor ?? cookbook.cover_color

  // Close menu/popover on click-away
  useEffect(() => {
    if (!menuOpen && !colorOpen) return
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
        setColorOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [menuOpen, colorOpen])

  async function handleColorSelect(newColor: string) {
    if (isSavingColor) return
    const previousColor = localColor ?? cookbook.cover_color
    setLocalColor(newColor)
    setIsSavingColor(true)
    setColorError(null)
    try {
      const fd = new FormData()
      fd.set('id', cookbook.id)
      fd.set('cover_style', 'color')
      fd.set('cover_color', newColor)
      await updateCookbook({ data: fd })
      router.invalidate()
    } catch (err) {
      setLocalColor(previousColor)
      setColorError(err instanceof Error ? err.message : 'Failed to save color')
    } finally {
      setIsSavingColor(false)
    }
  }

  async function handleConfirmDelete() {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteCookbook({ data: { id: cookbook.id } })
      router.invalidate()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete cookbook')
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <Link
        to="/cookbooks/$id"
        params={{ id: cookbook.id }}
        className="block rounded-lg overflow-hidden border border-[#F1E7DA] shadow-[0_2px_8px_rgba(229,57,53,0.12)] hover:shadow-[0_4px_16px_rgba(229,57,53,0.18)] transition-shadow bg-white"
      >
        <div className="h-36 w-full overflow-hidden">
          <CookbookCover
            cover_style={cookbook.cover_style}
            cover_color={displayColor}
            cover_image_path={cookbook.cover_image_path}
            name={cookbook.name}
          />
        </div>
        <div className="p-3">
          <p className="font-semibold text-[#1F2937] truncate">{cookbook.name}</p>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {cookbook.recipe_count === 1
              ? '1 recipe'
              : `${cookbook.recipe_count} recipes`}
          </p>
        </div>
      </Link>

      {/* 3-dot button */}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setColorOpen(false)
          setMenuOpen((prev) => !prev)
        }}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(255,255,255,0.85)',
          color: '#6B7280',
          fontSize: '1rem',
          lineHeight: 1,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}
        aria-label="Cookbook options"
      >
        ⋯
      </button>

      {/* Dropdown anchor */}
      <div
        ref={menuRef}
        style={{
          position: 'absolute',
          top: '40px',
          right: '8px',
          zIndex: 10,
          minWidth: '148px',
        }}
      >
        {/* Menu */}
        {menuOpen && (
          <div
            style={{
              background: '#FFFDF8',
              border: '1px solid #F1E7DA',
              borderRadius: '8px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            }}
          >
            {/* Edit */}
            <button
              onClick={() => { setMenuOpen(false); navigate({ to: '/cookbooks/$id/edit', params: { id: cookbook.id } }) }}
              style={{ display: 'block', width: '100%', padding: '9px 14px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '0.875rem', fontWeight: 500, color: '#1F2937', cursor: 'pointer' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F1E7DA' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              Edit
            </button>

            {/* Change Color — hover to reveal flyout */}
            <div
              style={{ position: 'relative' }}
              onMouseEnter={() => setColorOpen(true)}
              onMouseLeave={() => setColorOpen(false)}
            >
              <button
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '9px 14px', border: 'none', background: colorOpen ? '#F1E7DA' : 'transparent', textAlign: 'left', fontSize: '0.875rem', fontWeight: 500, color: '#1F2937', cursor: 'pointer' }}
              >
                Change Color <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>›</span>
              </button>
              {colorOpen && (
                <div
                  style={{
                    position: 'absolute',
                    left: '100%',
                    top: 0,
                    marginRight: '4px',
                    background: '#FFFDF8',
                    border: '1px solid #F1E7DA',
                    borderRadius: '8px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    padding: '12px',
                    width: '152px',
                  }}
                >
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', marginBottom: '8px' }}>
                    Choose color
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {COOKBOOK_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        title={color.label}
                        disabled={isSavingColor}
                        onClick={() => handleColorSelect(color.value)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: color.value,
                          border: displayColor === color.value ? '2px solid #1F2937' : '2px solid transparent',
                          cursor: isSavingColor ? 'not-allowed' : 'pointer',
                          padding: 0,
                          opacity: isSavingColor ? 0.6 : 1,
                          flexShrink: 0,
                        }}
                        aria-label={color.label}
                      />
                    ))}
                  </div>
                  {colorError && (
                    <p style={{ color: '#E53935', fontSize: '0.75rem', marginTop: '6px' }}>{colorError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Delete */}
            <button
              onClick={() => { setMenuOpen(false); setShowDeleteDialog(true) }}
              style={{ display: 'block', width: '100%', padding: '9px 14px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '0.875rem', fontWeight: 500, color: '#E53935', cursor: 'pointer' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F1E7DA' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {deleteError && (
        <p style={{ color: '#E53935', fontSize: '0.7rem', padding: '2px 6px' }}>
          {deleteError}
        </p>
      )}

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Cookbook"
        message="Delete this cookbook? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteDialog(false)}
        isLoading={isDeleting}
      />
    </div>
  )
}
