import { createFileRoute, Link } from '@tanstack/react-router'
import { useRef, useEffect, useState } from 'react'
import { requireAuth } from '../server/auth'
import { listVideoFeed } from '../server/videoFeed'

export const Route = createFileRoute('/videos')({
  beforeLoad: async () => { await requireAuth() },
  loader: async () => listVideoFeed(),
  component: VideosPage,
})

function VideosPage() {
  const videos = Route.useLoaderData()

  if (videos.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '12px', textAlign: 'center', padding: '24px' }}>
        <p style={{ fontSize: '1.1rem', color: '#1F2937' }}>No videos yet</p>
        <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Follow cooks to see their recipe videos here</p>
        <Link to="/explore" style={{ color: '#E53935', fontWeight: 600, fontSize: '0.9rem' }}>Discover cooks</Link>
      </div>
    )
  }

  return (
    <div style={{ height: '100dvh', overflowY: 'scroll', scrollSnapType: 'y mandatory' }}>
      {videos.map((video) => (
        <VideoSlide key={video.id} video={video} />
      ))}
    </div>
  )
}

type VideoItem = Awaited<ReturnType<typeof listVideoFeed>>[number]

function VideoSlide({ video }: { video: VideoItem }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {})
        } else {
          videoRef.current?.pause()
        }
      },
      { threshold: 0.7 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const owner = video.owner as { id: string; display_name: string | null; avatar_url: string | null } | null

  return (
    <div
      ref={containerRef}
      style={{ height: '100dvh', scrollSnapAlign: 'start', position: 'relative', background: '#000', flexShrink: 0 }}
    >
      <video
        ref={videoRef}
        src={video.video_path ?? undefined}
        loop
        muted
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <UnmuteButton videoRef={videoRef} />
      <Link
        to="/recipes/$id"
        params={{ id: video.id }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '40px 20px 24px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
          textDecoration: 'none',
        }}
      >
        <p style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>{video.title}</p>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', margin: '4px 0 0' }}>
          {owner?.display_name ?? 'Unknown'}
        </p>
      </Link>
    </div>
  )
}

function UnmuteButton({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const [muted, setMuted] = useState(true)
  return (
    <button
      onClick={() => {
        if (videoRef.current) {
          videoRef.current.muted = !videoRef.current.muted
          setMuted(videoRef.current.muted)
        }
      }}
      style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        background: 'rgba(0,0,0,0.5)',
        border: 'none',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        color: '#fff',
        fontSize: '1.1rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-label={muted ? 'Unmute' : 'Mute'}
    >
      {muted ? '(muted)' : '(sound)'}
    </button>
  )
}
