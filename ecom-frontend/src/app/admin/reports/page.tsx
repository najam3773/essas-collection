'use client';

import { useEffect, useState } from 'react';
import { api, money } from '@/lib/api';

type Report = {
  orderCount: number;
  gmvCents: number;
  aovCents: number;
  revenueByDay: Array<{ date: string; cents: number }>;
};

export default function ReportsPage() {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('staff_token')!;
    api<Report>('/admin/reports/summary', { token }).then(setReport).catch(() => setReport(null));
  }, []);

  if (!report) return <p>Loading reports…</p>;

  return (
    <>
      <h1>Reports</h1>
      <div className="grid-3" style={{ marginTop: 16 }}>
        <div className="card"><div className="muted">GMV</div><h2>{money(report.gmvCents)}</h2></div>
        <div className="card"><div className="muted">Orders</div><h2>{report.orderCount}</h2></div>
        <div className="card"><div className="muted">AOV</div><h2>{money(report.aovCents)}</h2></div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h2>Revenue by day</h2>
        <table className="table">
          <thead><tr><th>Date</th><th>Revenue</th></tr></thead>
          <tbody>
            {report.revenueByDay.map((d) => (
              <tr key={d.date}><td>{d.date}</td><td>{money(d.cents)}</td></tr>
            ))}
            {!report.revenueByDay.length && (
              <tr><td colSpan={2} className="muted">No paid orders yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
