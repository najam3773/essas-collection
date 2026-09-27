import { Router } from 'express';
import { prisma } from '../lib/db.js';

export const statusRouter = Router();

type Check = {
  key: string;
  label: string;
  hint: string;
  ok: boolean;
  detail: string;
  ms: number;
};

async function timed(
  key: string,
  label: string,
  hint: string,
  fn: () => Promise<string>,
): Promise<Check> {
  const started = process.hrtime.bigint();
  const ms = () => Number(process.hrtime.bigint() - started) / 1e6;
  try {
    const detail = await fn();
    return { key, label, hint, ok: true, detail, ms: Math.round(ms()) };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return { key, label, hint, ok: false, detail, ms: Math.round(ms()) };
  }
}

async function runChecks(): Promise<Check[]> {
  return Promise.all([
    timed('db', 'Database connection', 'SELECT 1', async () => {
      await prisma.$queryRaw`SELECT 1`;
      const [{ server }] = await prisma.$queryRaw<{ server: string }[]>`
        SELECT split_part(version(), ' on ', 1) AS server`;
      return server;
    }),
    timed('schema', 'Schema matches Prisma', 'probes columns/tables that have drifted before', async () => {
      // These two were missing from db/init and broke seeding; keep them covered.
      await prisma.themeConfig.findFirst({ select: { backgroundColor: true } });
      await prisma.sale.count();
      return 'theme_configs.background_color + sales table present';
    }),
    timed('seed', 'Seed data present', 'counts core records', async () => {
      const [tenants, products, orders] = await Promise.all([
        prisma.tenant.count(),
        prisma.product.count(),
        prisma.order.count(),
      ]);
      if (tenants === 0) throw new Error('no tenants — seed has not run');
      if (products === 0) throw new Error('no products — seed has not run');
      return `${tenants} tenants · ${products} products · ${orders} orders`;
    }),
    timed('tenants', 'Tenant resolution', 'loads each tenant with its theme config', async () => {
      const tenants = await prisma.tenant.findMany({
        select: { slug: true, name: true, themeConfig: { select: { brandName: true } } },
        orderBy: { slug: 'asc' },
        take: 10,
      });
      if (tenants.length === 0) throw new Error('no tenants found');
      return tenants.map((t) => t.slug).join(' · ');
    }),
  ]);
}

/** Machine-readable status. */
statusRouter.get('/status.json', async (_req, res, next) => {
  try {
    const checks = await runChecks();
    const ok = checks.every((c) => c.ok);
    res.status(ok ? 200 : 503).json({
      ok,
      service: 'commerce-core',
      env: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.round(process.uptime()),
      checkedAt: new Date().toISOString(),
      checks,
    });
  } catch (e) {
    next(e);
  }
});

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );

/** Human-readable status page, served by the API itself. */
statusRouter.get('/status', async (req, res, next) => {
  try {
    // helmet's default CSP is `default-src 'none'`, which blanks this page in a
    // browser. Relax it for this route only, just enough for the inline <style>.
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    );
    const checks = await runChecks();
    const ok = checks.every((c) => c.ok);
    const failed = checks.filter((c) => c.ok === false).length;
    const base = `${req.protocol}://${req.get('host')}`;

    const rows = checks
      .map(
        (c) => `
      <div class="check">
        <span class="icon ${c.ok ? 'ok' : 'bad'}">${c.ok ? '&#10003;' : '&#10007;'}</span>
        <div class="body">
          <div class="top"><strong>${esc(c.label)}</strong><span class="ms">${c.ms} ms</span></div>
          <div class="detail ${c.ok ? '' : 'bad'}">${esc(c.detail)}</div>
          <div class="hint">${esc(c.hint)}</div>
        </div>
      </div>`,
      )
      .join('');

    res.type('html').status(ok ? 200 : 503).send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>API Status &middot; commerce-core</title>
<style>
  :root { color-scheme: light dark; --bg:#fbf8f2; --fg:#1a1a2e; --muted:#6b7280; --card:#fff; --line:#e7e2d8; --ok:#1a7f4b; --bad:#c0392b; }
  @media (prefers-color-scheme: dark) { :root { --bg:#14141c; --fg:#f3f2ef; --muted:#9aa0a6; --card:#1e1e28; --line:#2e2e3a; --ok:#4ade80; --bad:#f87171; } }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font:14px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; padding:48px 20px; }
  .wrap { max-width:760px; margin:0 auto; }
  h1 { font-size:clamp(1.6rem,4vw,2.2rem); margin:.2rem 0 0; }
  .eyebrow { color:var(--muted); margin:0; }
  code { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.88em; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:16px 18px; }
  .banner { margin-top:22px; display:flex; align-items:center; gap:14px; border-left:4px solid ${ok ? 'var(--ok)' : 'var(--bad)'}; }
  .banner .big { font-size:1.8rem; line-height:1; color:${ok ? 'var(--ok)' : 'var(--bad)'}; }
  .banner .sub { color:var(--muted); font-size:.9rem; margin-top:2px; }
  .check { display:flex; gap:12px; align-items:flex-start; margin-top:10px; }
  .icon { font-size:1.05rem; line-height:1.4; }
  .icon.ok { color:var(--ok); } .icon.bad { color:var(--bad); }
  .body { flex:1; min-width:0; }
  .top { display:flex; gap:8px; align-items:baseline; flex-wrap:wrap; }
  .ms { color:var(--muted); font-size:.78rem; }
  .detail { font-size:.9rem; margin-top:2px; word-break:break-word; }
  .detail.bad { color:var(--bad); }
  .hint { color:var(--muted); font-size:.76rem; margin-top:3px; opacity:.8; }
  .meta { margin-top:20px; color:var(--muted); font-size:.85rem; }
  .meta div { margin-top:3px; }
  a { color:inherit; }
</style></head>
<body><div class="wrap">
  <p class="eyebrow">commerce-core</p>
  <h1>API Status</h1>

  <div class="card banner">
    <span class="big">${ok ? '&#10003;' : '&#10007;'}</span>
    <div>
      <strong style="font-size:1.05rem">${ok ? 'All systems operational' : `${failed} check${failed > 1 ? 's' : ''} failing`}</strong>
      <div class="sub"><code>${esc(base)}</code></div>
    </div>
  </div>

  <div class="card" style="margin-top:12px">${rows}</div>

  <div class="meta">
    <div>Environment: <code>${esc(process.env.NODE_ENV || 'development')}</code></div>
    <div>Uptime: ${Math.round(process.uptime())}s &middot; checked ${new Date().toISOString()}</div>
    <div>JSON: <a href="/status.json"><code>${esc(base)}/status.json</code></a></div>
  </div>
</div></body></html>`);
  } catch (e) {
    next(e);
  }
});
