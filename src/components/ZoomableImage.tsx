import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  src: string
  className?: string
  alt?: string
}

export function ZoomableImage({ src, className = '', alt = '' }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        className="zoomable-trigger"
        onClick={() => setOpen(true)}
        aria-label="ขยายรูปเต็มจอ"
      >
        <img
          src={src}
          alt={alt}
          className={className}
          draggable={false}
          decoding="sync"
        />
      </button>
      {open &&
        createPortal(
          <div
            className="img-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label="รูปขยายเต็มจอ กดเพื่อปิด"
            onClick={() => setOpen(false)}
          >
            <img
              src={src}
              alt={alt}
              className="img-lightbox-full"
              draggable={false}
              decoding="sync"
            />
          </div>,
          document.body,
        )}
    </>
  )
}
