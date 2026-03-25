import { Link } from '@tanstack/react-router'

type LogRowProps = {
  log: {
    id: string
    recipe_id: string | null
    recipe_title: string | null
    logged_at: string
    notes: string | null
    visibility: string
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '...'
}

export default function LogRow({ log }: LogRowProps) {
  return (
    <Link
      to="/logs/$id"
      params={{ id: log.id }}
      className="block py-3 border-b border-[#F1E7DA] hover:bg-[#FFFDF8] transition-colors px-1"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {log.recipe_id ? (
            <span className="font-medium text-[#1F2937] hover:text-[#E53935] truncate block">
              {log.recipe_title ?? 'Untitled recipe'}
            </span>
          ) : (
            <span className="text-[#6B7280] italic">Deleted recipe</span>
          )}
          <p className="text-sm text-[#6B7280] mt-0.5">
            {formatDate(log.logged_at)}
          </p>
          {log.notes && (
            <p className="text-sm text-[#1F2937] mt-1 leading-snug">
              {truncate(log.notes, 100)}
            </p>
          )}
        </div>
        {log.visibility === 'private' && (
          <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded bg-[#F1E7DA] text-[#6B7280] font-medium mt-0.5">
            Private
          </span>
        )}
      </div>
    </Link>
  )
}
