import { useState, useRef, useEffect } from 'react'
import { VolumeX, Volume2 } from 'lucide-react'

type Slide = { type: 'image'; src: string; alt: string } | { type: 'video'; src: string }

interface RecipeMediaCarouselProps {
  coverImagePath: string | null
  videoPath: string | null
  images: string[]  // must be a normalized string[] — caller responsible
  title: string
}

function buildSlides(coverImagePath: string | null, videoPath: string | null, images: string[], title: string): Slide[] {
  const slides: Slide[] = []
  if (coverImagePath) slides.push({ type: 'image', src: coverImagePath, alt: `${title} photo 1` })
  if (videoPath) slides.push({ type: 'video', src: videoPath })
  images.forEach((src) => {
    slides.push({ type: 'image', src, alt: `${title} photo ${slides.length + 1}` })
  })
  return slides
}

export function RecipeMediaCarousel({ coverImagePath, videoPath, images, title }: RecipeMediaCarouselProps) {
  // All hooks declared first — before any conditional returns
  const [activeIndex, setActiveIndex] = useState(0)
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  const slides = buildSlides(coverImagePath, videoPath, images, title)
  const videoSlideIndex = slides.findIndex((s) => s.type === 'video')
  const clampedIndex = Math.min(activeIndex, Math.max(0, slides.length - 1))

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (clampedIndex === videoSlideIndex) {
      video.play()?.catch(() => {})
    } else {
      video.muted = true
      setIsMuted(true)
      video.pause()
      video.currentTime = 0
    }
  }, [clampedIndex, videoSlideIndex])

  if (slides.length === 0) return null

  const isSingle = slides.length === 1

  function goTo(index: number) {
    setActiveIndex(Math.min(Math.max(0, index), slides.length - 1))
  }

  const arrowStyle = (hidden: boolean): React.CSSProperties => ({
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(0,0,0,0.4)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: '1rem',
    zIndex: 2,
    visibility: hidden ? 'hidden' : 'visible',
  })

  const thumbActiveStyle: React.CSSProperties = { border: '2px solid #C17D3C' }
  const thumbBaseStyle: React.CSSProperties = {
    width: '64px',
    height: '64px',
    borderRadius: '4px',
    cursor: 'pointer',
    border: '2px solid transparent',
    overflow: 'hidden',
    flexShrink: 0,
    padding: 0,
    background: 'none',
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ position: 'relative', overflow: 'hidden', height: '360px', borderRadius: '8px', marginBottom: '8px' }}>
        <div
          style={{
            display: 'flex',
            height: '100%',
            transition: 'transform 0.3s ease',
            transform: `translateX(-${clampedIndex * 100}%)`,
          }}
        >
          {slides.map((slide) => (
            <div
              key={slide.src}
              style={{ width: '100%', height: '100%', flexShrink: 0, position: 'relative', background: '#000' }}
            >
              {slide.type === 'image' ? (
                <img
                  src={slide.src}
                  alt={slide.alt}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    src={slide.src}
                    autoPlay
                    muted
                    loop
                    playsInline
                    title="video-slide"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {clampedIndex === videoSlideIndex && (
                    <button
                      type="button"
                      aria-label={isMuted ? 'Unmute' : 'Mute'}
                      onClick={() => {
                        const video = videoRef.current
                        if (!video) return
                        video.muted = !video.muted
                        setIsMuted(video.muted)
                      }}
                      style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        background: 'rgba(0,0,0,0.5)',
                        color: 'white',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: 'none',
                        zIndex: 3,
                      }}
                    >
                      {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {!isSingle && (
          <>
            <button
              type="button"
              onClick={() => goTo(clampedIndex - 1)}
              style={{ ...arrowStyle(clampedIndex === 0), left: '10px' }}
              aria-label="Previous slide"
            >
              {'<'}
            </button>
            <button
              type="button"
              onClick={() => goTo(clampedIndex + 1)}
              style={{ ...arrowStyle(clampedIndex === slides.length - 1), right: '10px' }}
              aria-label="Next slide"
            >
              {'>'}
            </button>
          </>
        )}
      </div>

      {!isSingle && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {slides.map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              aria-label={`thumb ${i + 1}`}
              onClick={() => goTo(i)}
              style={{
                ...thumbBaseStyle,
                ...(clampedIndex === i ? thumbActiveStyle : {}),
              }}
            >
              {slide.type === 'image' ? (
                <img
                  src={slide.src}
                  alt=""
                  aria-hidden="true"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div
                  aria-label="Video"
                  style={{
                    width: '100%',
                    height: '100%',
                    background: '#111',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.2rem',
                  }}
                >
                  &#9654;
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
