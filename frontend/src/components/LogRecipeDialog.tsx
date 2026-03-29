import { useState, useEffect, useRef } from 'react'
import { StarPicker } from './StarPicker'

interface LogRecipeDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { loggedAt: string; notes: string; visibility: 'public' | 'private'; rating: number | null }) => Promise<void>
}

export function LogRecipeDialog({ isOpen, onClose, onSubmit }: LogRecipeDialogProps) {
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10))
  const [logNotes, setLogNotes] = useState('')
  const [logVisibility, setLogVisibility] = useState<'public' | 'private'>('public')
  const [rating, setRating] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const firstInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    firstInputRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) {
      setLogDate(new Date().toISOString().slice(0, 10))
      setLogNotes('')
      setLogVisibility('public')
      setRating(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSubmit({ loggedAt: logDate, notes: logNotes, visibility: logVisibility, rating })
      onClose()
    } finally {
      setIsSubmitting(false)
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
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.45)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: '#FFFDF8',
          border: '1px solid #F1E7DA',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          padding: '28px 32px',
          maxWidth: '440px',
          width: '90%',
        }}
      >
        <h2 style={{ fontFamily: 'serif', fontSize: '1.3rem', fontWeight: 700, color: '#1F2937', marginBottom: '20px' }}>
          Log This Recipe
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '0.85rem', color: '#1F2937' }}>
              Date
            </label>
            <input
              ref={firstInputRef}
              type="date"
              style={inputStyle}
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '0.85rem', color: '#1F2937' }}>
              Notes
            </label>
            <textarea
              style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              value={logNotes}
              onChange={(e) => setLogNotes(e.target.value)}
              placeholder="How did it turn out? Any adjustments?"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '0.85rem', color: '#1F2937' }}>
              Rating (optional)
            </label>
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '0.85rem', color: '#1F2937' }}>
              Visibility
            </label>
            <select
              style={inputStyle}
              value={logVisibility}
              onChange={(e) => setLogVisibility(e.target.value as 'public' | 'private')}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '8px 18px',
                border: '1px solid #F1E7DA',
                borderRadius: '6px',
                background: '#FFFDF8',
                color: '#6B7280',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '8px 18px',
                border: 'none',
                borderRadius: '6px',
                background: '#E53935',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Saving...' : 'Save Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
