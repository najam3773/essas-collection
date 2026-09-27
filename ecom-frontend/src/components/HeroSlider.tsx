'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export type HeroSlide = {
  image: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaSecondaryLabel?: string;
  ctaSecondaryHref?: string;
};

export function HeroSlider({
  slides,
  brand,
  heroStyle = 'full-bleed',
}: {
  slides: HeroSlide[];
  brand: string;
  shopBar?: Array<{ label: string; name: string; href: string }>;
  heroStyle?: 'full-bleed' | 'split' | 'bold';
}) {
  const list = slides.length ? slides : [{ image: '', title: brand }];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const active = list[index % list.length];

  useEffect(() => {
    if (paused || list.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % list.length), 5200);
    return () => clearInterval(t);
  }, [paused, list.length]);

  function go(dir: -1 | 1) {
    setIndex((i) => (i + dir + list.length) % list.length);
  }

  return (
    <section
      className={`hero-ecom hero-style-${heroStyle}`}
      aria-label="Featured campaign"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="hero-slides" aria-live="polite">
        {list.map((slide, i) => (
          <div
            key={`${slide.image}-${i}`}
            className={`hero-slide ${i === index ? 'is-active' : ''}`}
            style={{ backgroundImage: slide.image ? `url(${slide.image})` : undefined }}
            aria-hidden={i !== index}
          />
        ))}
      </div>

      <div className="hero-ecom-content">
        <p className="hero-eyebrow">{brand}</p>
        <h1 className="hero-brand">{active.title || brand}</h1>
        {active.subtitle && <p className="hero-line">{active.subtitle}</p>}
        <div className="hero-ecom-cta">
          {active.ctaHref && (
            <Link href={active.ctaHref} className="btn shop-primary">
              {active.ctaLabel || 'Shop now'}
            </Link>
          )}
          {active.ctaSecondaryHref && (
            <Link href={active.ctaSecondaryHref} className="btn shop-secondary">
              {active.ctaSecondaryLabel || 'Explore'}
            </Link>
          )}
        </div>
      </div>

      {list.length > 1 && (
        <>
          <button type="button" className="hero-nav prev" aria-label="Previous slide" onClick={() => go(-1)}>
            ‹
          </button>
          <button type="button" className="hero-nav next" aria-label="Next slide" onClick={() => go(1)}>
            ›
          </button>
          <div className="hero-dots" role="tablist" aria-label="Hero slides">
            {list.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                className={i === index ? 'active' : ''}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <div className="hero-progress" aria-hidden>
            <span key={index} className={paused ? 'is-paused' : ''} />
          </div>
        </>
      )}
    </section>
  );
}
