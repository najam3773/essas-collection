'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { uploadProductImages } from '@/lib/api';

const DEFAULT_LINKS = [
  'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1200',
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1200',
  'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1200',
  'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200',
];

function parseUrls(text: string) {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ProductImageFields({
  name = 'media',
  initialUrls,
}: {
  name?: string;
  initialUrls?: string;
}) {
  const [urls, setUrls] = useState(initialUrls ?? DEFAULT_LINKS.join('\n'));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const previews = parseUrls(urls);

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    const token = localStorage.getItem('staff_token');
    if (!token) {
      setError('Please sign in again to upload pictures');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const uploaded = await uploadProductImages(files, token);
      const added = uploaded.map((f) => f.url).filter(Boolean);
      if (!added.length) throw new Error('Upload did not return image links');
      setUrls((prev) => [...parseUrls(prev), ...added].join('\n'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function removeUrl(index: number) {
    setUrls(previews.filter((_, i) => i !== index).join('\n'));
  }

  return (
    <div className="stack">
      <div>
        <label className="label">Upload pictures</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          multiple
          hidden
          onChange={onFiles}
        />
        <button
          type="button"
          className="btn secondary sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? 'Uploading…' : 'Choose pictures'}
        </button>
        <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
          JPEG, PNG, WebP, GIF or AVIF — up to 5MB each. Picture links below stay available too.
        </p>
        {error && <p className="error">{error}</p>}
      </div>
      <div>
        <label className="label">Picture links (one per line)</label>
        <textarea
          className="textarea"
          name={name}
          rows={4}
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          placeholder={'https://...\nhttps://...\nhttps://...'}
        />
      </div>
      {previews.length > 0 && (
        <div className="media-previews">
          {previews.map((url, i) => (
            <div key={`${url}-${i}`} className="media-preview">
              <img src={url} alt={`Product image ${i + 1}`} />
              <button type="button" aria-label={`Remove image ${i + 1}`} onClick={() => removeUrl(i)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
