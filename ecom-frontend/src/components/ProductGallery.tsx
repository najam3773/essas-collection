'use client';

import { useEffect, useRef, useState } from 'react';

export type GalleryImage = { url: string; alt?: string };

/**
 * Classic commerce gallery:
 * - One large active image
 * - Remaining images as bottom thumbnails
 * - Hover zoom-in on the main image (cursor-following magnifier)
 */
export function ProductGallery({ images, alt }: { images: GalleryImage[]; alt: string }) {
  const list = images.filter((i) => i.url).length
    ? images.filter((i) => i.url)
    : [{ url: '', alt }];
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zooming, setZooming] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const stageRef = useRef<HTMLDivElement>(null);
  const current = list[Math.min(index, list.length - 1)];

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false);
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % list.length);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + list.length) % list.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, list.length]);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = stageRef.current;
    if (!el || !current.url) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    setOrigin({ x, y });
    setZooming(true);
  }

  return (
    <div className="pgallery">
      {/* Main open image */}
      <div
        ref={stageRef}
        className={`pgallery-stage ${zooming ? 'is-zooming' : ''}`}
        onMouseMove={onMove}
        onMouseEnter={() => current.url && setZooming(true)}
        onMouseLeave={() => setZooming(false)}
        onClick={() => current.url && setLightbox(true)}
        role="button"
        tabIndex={0}
        aria-label="Product image — hover to zoom, click for fullscreen"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setLightbox(true);
        }}
      >
        {current.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.url}
            alt={current.alt || alt}
            className="pgallery-img"
            style={
              zooming
                ? {
                    transform: 'scale(2.2)',
                    transformOrigin: `${origin.x}% ${origin.y}%`,
                  }
                : undefined
            }
            draggable={false}
          />
        ) : (
          <div className="pgallery-empty">No image</div>
        )}
        {current.url && !zooming && (
          <span className="pgallery-hint">Hover to zoom · Click for full view</span>
        )}
      </div>

      {/* Remaining images on the bottom */}
      {list.length > 1 && (
        <div className="pgallery-thumbs" role="list">
          {list.map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              type="button"
              role="listitem"
              className={`pgallery-thumb ${i === index ? 'active' : ''}`}
              onClick={() => {
                setIndex(i);
                setZooming(false);
              }}
              aria-label={`Show image ${i + 1} of ${list.length}`}
              aria-current={i === index ? 'true' : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt || `${alt} ${i + 1}`} />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(false)}>
          <button type="button" className="lightbox-close" onClick={() => setLightbox(false)} aria-label="Close">
            ×
          </button>
          {list.length > 1 && (
            <>
              <button
                type="button"
                className="lightbox-nav prev"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i - 1 + list.length) % list.length);
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="lightbox-nav next"
                onClick={(e) => {
                  e.stopPropagation();
                  setIndex((i) => (i + 1) % list.length);
                }}
              >
                ›
              </button>
            </>
          )}
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.url} alt={current.alt || alt} />
            <p>
              {index + 1} / {list.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
