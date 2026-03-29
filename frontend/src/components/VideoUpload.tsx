import { useState, useRef, useEffect } from 'react'

interface VideoUploadProps {
  currentVideoPath: string | null
  onFileSelect: (file: File | null) => void
  error: string | null
}

export function VideoUpload({ currentVideoPath, onFileSelect, error }: VideoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [durationError, setDurationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) {
      setDurationError('Please select a video file')
      return
    }
    // Revoke previous preview URL before creating a new one
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setDurationError(null)

    const url = URL.createObjectURL(file)
    const tempVideo = document.createElement('video')
    tempVideo.preload = 'metadata'
    tempVideo.onloadedmetadata = () => {
      URL.revokeObjectURL(tempVideo.src)
      if (tempVideo.duration > 90) {
        URL.revokeObjectURL(url)
        setDurationError('Video must be 90 seconds or shorter')
        setPreview(null)
        onFileSelect(null)
        if (inputRef.current) inputRef.current.value = ''
      } else {
        setPreview(url)
        onFileSelect(file)
      }
    }
    tempVideo.src = url
  }

  const displaySrc = preview ?? currentVideoPath ?? undefined

  return (
    <div>
      <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '0.9rem', color: '#1F2937' }}>
        Video (optional, max 90 seconds / 200MB)
      </label>
      {displaySrc && (
        <video
          src={displaySrc}
          controls
          style={{ width: '100%', maxHeight: '240px', borderRadius: '6px', marginBottom: '8px', background: '#000' }}
        />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={{
          display: 'inline-block',
          padding: '6px 14px',
          border: '1px solid #F1E7DA',
          borderRadius: '4px',
          background: '#FFFDF8',
          color: '#1F2937',
          fontSize: '0.85rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {preview || currentVideoPath ? 'Change video' : 'Choose video'}
      </button>
      {(durationError || error) && (
        <p style={{ color: '#E53935', fontSize: '0.8rem', marginTop: '4px' }}>{durationError ?? error}</p>
      )}
    </div>
  )
}
