'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Item = {
  id: string;
  quantity: number;
  reserved: number;
  locationCode: string;
  variant: { sku: string; product: { name: string } };
};

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);

  async function load() {
    const token = localStorage.getItem('staff_token')!;
    setItems(await api<Item[]>('/admin/inventory', { token }));
  }

  useEffect(() => {
    load();
  }, []);

  async function save(id: string, quantity: number) {
    const token = localStorage.getItem('staff_token')!;
    await api(`/admin/inventory/${id}`, { token, method: 'PATCH', body: { quantity } });
    await load();
  }

  return (
    <>
      <h1>Inventory</h1>
      <p className="muted">Track stock per SKU / location</p>
      <div className="admin-card-list">
        {items.map((i) => (
          <article key={i.id} className="admin-entity-card">
            <div className="admin-entity-card-head">
              <strong>{i.variant.product.name}</strong>
            </div>
            <div className="admin-entity-meta">
              <span className="muted">{i.variant.sku}</span>
              <span>Qty {i.quantity}</span>
              <span className="muted">{i.locationCode} · reserved {i.reserved}</span>
            </div>
            <div className="admin-entity-actions">
              <input
                className="input"
                style={{ width: 90 }}
                type="number"
                defaultValue={i.quantity}
                id={`qty-m-${i.id}`}
              />
              <button
                className="btn sm"
                onClick={() => {
                  const el = document.getElementById(`qty-m-${i.id}`) as HTMLInputElement;
                  save(i.id, Number(el.value));
                }}
              >
                Update
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="card table-scroll admin-desktop-table" style={{ marginTop: 16 }}>
        <table className="table">
          <thead>
            <tr><th>Product</th><th>SKU</th><th>Location</th><th>Qty</th><th>Reserved</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.variant.product.name}</td>
                <td>{i.variant.sku}</td>
                <td>{i.locationCode}</td>
                <td>
                  <input
                    className="input"
                    style={{ width: 90 }}
                    type="number"
                    defaultValue={i.quantity}
                    id={`qty-${i.id}`}
                  />
                </td>
                <td>{i.reserved}</td>
                <td>
                  <button
                    className="btn sm"
                    onClick={() => {
                      const el = document.getElementById(`qty-${i.id}`) as HTMLInputElement;
                      save(i.id, Number(el.value));
                    }}
                  >
                    Update
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
