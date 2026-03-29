import { useState } from 'react'
import { Star, StarHalf } from 'lucide-react'

interface StarPickerProps {
  value: number | null
  onChange?: (rating: number | null) => void
  readOnly?: boolean
  size?: number
}

export function StarPicker({ value, onChange = () => {}, readOnly = false, size = 24 }: StarPickerProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const display = hovered ?? value

  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const halfVal = n - 0.5
        const isFull = (display ?? 0) >= n
        const isHalf = !isFull && (display ?? 0) >= halfVal

        if (readOnly) {
          return (
            <span key={n} aria-label={`${n} stars`} style={{ color: isFull || isHalf ? '#E53935' : '#D1D5DB', lineHeight: 1 }}>
              {isFull
                ? <Star size={size} fill="currentColor" />
                : isHalf
                  ? <StarHalf size={size} fill="currentColor" />
                  : <Star size={size} fill="none" />
              }
            </span>
          )
        }

        return (
          <div key={n} style={{ position: 'relative', width: size, height: size, cursor: 'pointer' }}
            onMouseLeave={() => setHovered(null)}
          >
            <span style={{ color: isFull ? '#E53935' : isHalf ? '#E53935' : '#D1D5DB', lineHeight: 1, pointerEvents: 'none' }}>
              {isFull
                ? <Star size={size} fill="currentColor" />
                : isHalf
                  ? <StarHalf size={size} fill="currentColor" />
                  : <Star size={size} fill="none" />
              }
            </span>
            <div
              style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '100%' }}
              onMouseEnter={() => setHovered(halfVal)}
              onClick={() => onChange(value === halfVal ? null : halfVal)}
              aria-label={`${halfVal} stars`}
              role="button"
            />
            <div
              style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '100%' }}
              onMouseEnter={() => setHovered(n)}
              onClick={() => onChange(value === n ? null : n)}
              aria-label={`${n} stars`}
              role="button"
            />
          </div>
        )
      })}
    </div>
  )
}
