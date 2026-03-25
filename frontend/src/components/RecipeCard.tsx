import { Link } from '@tanstack/react-router'

interface RecipeCardProps {
  recipe: {
    id: string
    title: string
    cover_image_path: string | null
    like_count: number
    log_count: number
    owner: {
      display_name: string
      avatar_url: string | null
    }
  }
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <Link
      to="/recipes/$id"
      params={{ id: recipe.id }}
      style={{
        display: 'block',
        background: '#FFFFFF',
        border: '1px solid #F1E7DA',
        borderRadius: '8px',
        overflow: 'hidden',
        textDecoration: 'none',
        color: '#1F2937',
        boxShadow: '2px 2px 0 rgba(229, 57, 53, 0.08)',
        transition: 'box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = '4px 4px 0 rgba(229, 57, 53, 0.18)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = '2px 2px 0 rgba(229, 57, 53, 0.08)'
      }}
    >
      <div style={{ width: '100%', aspectRatio: '16/9', background: '#F1E7DA', overflow: 'hidden' }}>
        {recipe.cover_image_path ? (
          <img
            src={recipe.cover_image_path}
            alt={recipe.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              color: '#E53935',
              opacity: 0.3,
            }}
          >
            NO IMAGE
          </div>
        )}
      </div>

      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '6px', lineHeight: 1.3 }}>
          {recipe.title}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#6B7280', marginBottom: '10px' }}>
          {recipe.owner.avatar_url ? (
            <img
              src={recipe.owner.avatar_url}
              alt={recipe.owner.display_name}
              style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#F1E7DA',
                border: '1px solid #E53935',
                flexShrink: 0,
              }}
            />
          )}
          <span>{recipe.owner.display_name}</span>
        </div>

        <div style={{ display: 'flex', gap: '14px', fontSize: '0.8rem', color: '#6B7280' }}>
          <span>{recipe.like_count} {recipe.like_count === 1 ? 'like' : 'likes'}</span>
          <span>{recipe.log_count} {recipe.log_count === 1 ? 'log' : 'logs'}</span>
        </div>
      </div>
    </Link>
  )
}
