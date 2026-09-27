'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { money } from '@/lib/api';
import type { ProductCardData } from '@/components/ProductCard';
import { mannequinLayout } from './path';
import { useBrandColors, useIsMobile } from './brandColors';

const ShowroomCanvas = dynamic(() => import('./ShowroomCanvas'), {
  ssr: false,
  loading: () => (
    <div className="vx-loading">
      <span>Opening boutique…</span>
    </div>
  ),
});

function priceOf(p?: ProductCardData | null) {
  if (!p) return null;
  return p.fromPriceCents ?? p.variants?.[0]?.salePriceCents ?? p.variants?.[0]?.priceCents ?? null;
}

const CHAPTERS = [
  { at: 0, kicker: 'Entrance', line: 'Step into the boutique' },
  { at: 0.2, kicker: 'Front gallery', line: 'New season on the floor' },
  { at: 0.45, kicker: 'Runway aisle', line: 'Products on display' },
  { at: 0.7, kicker: 'Atelier hall', line: 'Limited cuts ahead' },
  { at: 0.88, kicker: 'Finale', line: 'Choose your piece' },
];

type Props = {
  tenant: string;
  brand: string;
  title: string;
  subtitle: string;
  products: ProductCardData[];
};

/** Scroll-to-walk boutique with mannequins + soft mouse look. */
export function FashionShowroom({ tenant, brand, title, subtitle, products }: Props) {
  const trackRef = useRef<HTMLElement>(null);
  const pieces = useMemo(() => products.slice(0, mannequinLayout(8).length), [products]);
  const [selected, setSelected] = useState<ProductCardData | null>(null);
  const [progress, setProgress] = useState(0);
  const [hint, setHint] = useState(true);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const mobile = useIsMobile(768);
  const colors = useBrandColors();

  useEffect(() => {
    if (!selected && pieces[0]) setSelected(pieces[0]);
  }, [pieces, selected]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      if (total <= 0) {
        setProgress(0);
        return;
      }
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      setProgress(scrolled / total);
      if (hint && scrolled > 48) setHint(false);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [hint]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setLook({ x: x * 0.35, y: y * 0.2 });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useEffect(() => {
    if (!pieces.length) return;
    const layout = mannequinLayout(pieces.length, mobile);
    const zs = layout.map((s) => s.position[2]);
    const zMax = Math.max(...zs);
    const zMin = Math.min(...zs);
    const camZ = zMax - progress * (zMax - zMin + 4);
    let best = 0;
    let bestDist = Infinity;
    layout.forEach((slot, i) => {
      const d = Math.abs(slot.position[2] - camZ);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    const next = pieces[best];
    if (next && next.id !== selected?.id) setSelected(next);
  }, [progress, pieces, selected?.id, mobile]);

  function scrollToIndex(idx: number) {
    const el = trackRef.current;
    if (!el) return;
    const total = el.offsetHeight - window.innerHeight;
    const t = pieces.length <= 1 ? 0 : idx / (pieces.length - 1);
    window.scrollTo({ top: el.offsetTop + t * total * 0.92, behavior: 'smooth' });
  }

  const chapter = [...CHAPTERS].reverse().find((c) => progress >= c.at) || CHAPTERS[0];
  const price = priceOf(selected);

  return (
    <section ref={trackRef} className="vx-track" aria-label="Virtual boutique walkthrough">
      <div className="vx-stage">
        <div className="vx-canvas-wrap">
          {pieces.length > 0 ? (
            <ShowroomCanvas
              products={pieces}
              selectedId={selected?.id}
              progress={progress}
              look={mobile ? { x: 0, y: 0 } : look}
              mobile={mobile}
              colors={colors}
              brand={brand}
              onSelect={(p) => {
                setSelected(p);
                setHint(false);
                const idx = pieces.findIndex((x) => x.id === p.id);
                if (idx >= 0) scrollToIndex(idx);
              }}
            />
          ) : (
            <div className="vx-loading">
              <span>No looks on the floor yet.</span>
            </div>
          )}
        </div>

        <div className="vx-hud">
          <header className="vx-hud-top">
            <p className="vx-hud-brand">{brand}</p>
            <Link href={'/shop'} className="vx-hud-link">
              Enter catalog
            </Link>
          </header>

          <div className="vx-title-block">
            <p className="vx-kicker">{chapter.kicker}</p>
            <h1>{progress < 0.08 ? title : chapter.line}</h1>
            {progress < 0.12 && <p>{subtitle}</p>}
          </div>

          {hint && (
            <div className="vx-hint" role="status">
              <span className="vx-scroll-icon" aria-hidden />
              <strong>Scroll to walk</strong>
              <em>Click a product to inspect</em>
            </div>
          )}

          {selected && (
            <aside className="vx-panel">
              <p className="vx-kicker">{selected.category?.name || 'On display'}</p>
              <h2>{selected.name}</h2>
              {price != null && <p className="vx-price">{money(price)}</p>}
              <div className="vx-panel-actions">
                <Link href={`/product/${selected.slug}`} className="vx-btn">
                  View look
                </Link>
                <Link href={'/shop'} className="vx-btn ghost">
                  Full shop
                </Link>
              </div>
            </aside>
          )}

          <div className="vx-progress" aria-hidden>
            <span style={{ transform: `scaleY(${Math.max(progress, 0.02)})` }} />
          </div>

          <div className="vx-dots">
            {pieces.map((p, i) => (
              <button
                key={p.id}
                type="button"
                className={selected?.id === p.id ? 'on' : undefined}
                aria-label={p.name}
                onClick={() => {
                  setSelected(p);
                  scrollToIndex(i);
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
