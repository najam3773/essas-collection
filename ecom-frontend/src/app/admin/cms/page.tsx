'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Page = { id: string; title: string; slug: string; status: string; bodyHtml?: string | null };

export default function CmsPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [sections, setSections] = useState<string>('[]');

  async function load() {
    const token = localStorage.getItem('staff_token')!;
    setPages(await api<Page[]>('/admin/pages', { token }).catch(() => []));
    const home = await api<{ sections: unknown } | null>('/admin/home-sections', { token }).catch(() => null);
    setSections(JSON.stringify(home?.sections || [], null, 2));
  }

  useEffect(() => {
    load();
  }, []);

  async function createPage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = localStorage.getItem('staff_token')!;
    const fd = new FormData(e.currentTarget);
    await api('/admin/pages', {
      token,
      body: {
        title: fd.get('title'),
        slug: fd.get('slug'),
        bodyHtml: fd.get('bodyHtml'),
        status: 'published',
      },
    });
    e.currentTarget.reset();
    await load();
  }

  async function saveHome() {
    const token = localStorage.getItem('staff_token')!;
    await api('/admin/home-sections', {
      token,
      method: 'PUT',
      body: { sections: JSON.parse(sections) },
    });
    alert('Homepage sections saved');
  }

  async function removePage(id: string) {
    if (!confirm('Delete this page?')) return;
    const token = localStorage.getItem('staff_token')!;
    await api(`/admin/pages/${id}`, { token, method: 'DELETE' });
    await load();
  }

  async function togglePage(p: Page) {
    const token = localStorage.getItem('staff_token')!;
    await api(`/admin/pages/${p.id}`, {
      token,
      method: 'PUT',
      body: { status: p.status === 'published' ? 'draft' : 'published' },
    });
    await load();
  }

  return (
    <>
      <h1>CMS & page builder</h1>
      <div className="grid-2" style={{ marginTop: 16, alignItems: 'start' }}>
        <form className="card stack" onSubmit={createPage}>
          <h2>Content page</h2>
          <input className="input" name="title" placeholder="Title" required />
          <input className="input" name="slug" placeholder="slug" required />
          <textarea className="textarea" name="bodyHtml" rows={6} placeholder="<p>HTML content…</p>" />
          <button className="btn">Publish page</button>
        </form>
        <div className="card stack">
          <h2>Homepage sections (JSON)</h2>
          <textarea className="textarea" rows={12} value={sections} onChange={(e) => setSections(e.target.value)} />
          <button className="btn secondary" onClick={saveHome}>Save homepage</button>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h2>Pages</h2>
        <table className="table">
          <thead><tr><th>Title</th><th>Slug</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.id}>
                <td>{p.title}</td>
                <td>{p.slug}</td>
                <td><span className="badge">{p.status}</span></td>
                <td className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn sm secondary" onClick={() => togglePage(p)}>
                    {p.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                  <button className="btn sm secondary" onClick={() => removePage(p.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
