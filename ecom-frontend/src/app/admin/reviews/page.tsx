'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Review = {
  id: string;
  authorName: string;
  rating: number;
  title?: string;
  body?: string;
  isApproved: boolean;
  product: { name: string };
};

export default function ReviewsAdminPage() {
  const [reviews, setReviews] = useState<Review[]>([]);

  async function load() {
    const token = localStorage.getItem('staff_token')!;
    setReviews(await api<Review[]>('/admin/reviews', { token }));
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(id: string, isApproved: boolean) {
    const token = localStorage.getItem('staff_token')!;
    await api(`/admin/reviews/${id}`, { token, method: 'PATCH', body: { isApproved: !isApproved } });
    await load();
  }

  return (
    <>
      <h1>Product reviews</h1>
      <div className="card" style={{ marginTop: 16 }}>
        <table className="table">
          <thead><tr><th>Product</th><th>Author</th><th>Rating</th><th>Review</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id}>
                <td>{r.product.name}</td>
                <td>{r.authorName}</td>
                <td>{r.rating}/5</td>
                <td><strong>{r.title}</strong><div className="muted">{r.body}</div></td>
                <td><span className={`badge ${r.isApproved ? '' : 'warn'}`}>{r.isApproved ? 'Approved' : 'Hidden'}</span></td>
                <td>
                  <button className="btn sm secondary" onClick={() => toggle(r.id, r.isApproved)}>
                    {r.isApproved ? 'Hide' : 'Approve'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
