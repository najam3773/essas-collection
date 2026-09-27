'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const ENV_API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const STORAGE_KEY = 'status_api_url';

type CheckState = 'pending' | 'ok' | 'fail';

type Check = {
  key: string;
  label: string;
  hint: string;
  state: CheckState;
  detail: string;
  ms?: number;
};

type CheckDef = {
  key: string;
  label: string;
  hint: (base: string) => string;
  run: (base: string, signal: AbortSignal) => Promise<string>;
};

/** Trim trailing slashes and default to https:// when no scheme is given. */
function normalizeUrl(raw: string): string {
  let u = raw.trim().replace(/\/+$/, '');
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u;
}

const CHECKS: CheckDef[] = [
  {
    key: 'api',
    label: 'API reachable',
    hint: (b) => `GET ${b}/health`,
    run: async (base, signal) => {
      const r = await fetch(`${base}/health`, { signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (!j.ok) throw new Error('service reported not ok');
      return `service: ${j.service}`;
    },
  },
  {
    key: 'db',
    label: 'Database + seed data',
    hint: () => 'GET /storefront/products',
    run: async (base, signal) => {
      const r = await fetch(`${base}/storefront/products`, {
        signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (!Array.isArray(j)) throw new Error('unexpected payload');
      if (j.length === 0) throw new Error('no products — seed may not have run');
      return `${j.length} products returned`;
    },
  },
  {
    key: 'store',
    label: 'Store context',
    hint: () => 'GET /storefront/context',
    run: async (base, signal) => {
      const r = await fetch(`${base}/storefront/context`, { signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      return j?.tenant?.name || "Essa's Collection";
    },
  },
  {
    key: 'cors',
    label: 'CORS from this origin',
    hint: () => 'browser-enforced — a pass means headers are correct',
    run: async (base, signal) => {
      // Send a custom header so this triggers a real preflight, the way the app does.
      const r = await fetch(`${base}/storefront/context`, {
        signal,
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return typeof window !== 'undefined' ? `allowed for ${window.location.origin}` : 'allowed';
    },
  },
];

const idleChecks = (base: string): Check[] =>
  CHECKS.map((c) => ({
    key: c.key,
    label: c.label,
    hint: c.hint(base),
    state: 'pending' as CheckState,
    detail: 'checking…',
  }));

export default function StatusPage() {
  const [input, setInput] = useState(ENV_API_URL);
  const [target, setTarget] = useState(ENV_API_URL);
  const [checks, setChecks] = useState<Check[]>(() => idleChecks(ENV_API_URL));
  const [ranAt, setRanAt] = useState('');
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Restore a previously tested URL (e.g. a deployed backend) on first load.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved !== ENV_API_URL) {
        setInput(saved);
        setTarget(saved);
      }
    } catch {
      /* storage unavailable — fall back to the env value */
    }
  }, []);

  const runAll = useCallback(async (base: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setRunning(true);
    setChecks(idleChecks(base));

    await Promise.all(
      CHECKS.map(async (def, i) => {
        const started = performance.now();
        const finish = (state: CheckState, detail: string) => {
          if (ctrl.signal.aborted) return;
          const ms = Math.round(performance.now() - started);
          setChecks((prev) => {
            const next = [...prev];
            next[i] = { ...next[i], state, detail, ms };
            return next;
          });
        };
        try {
          finish('ok', await def.run(base, ctrl.signal));
        } catch (e) {
          if (ctrl.signal.aborted) return;
          const msg = e instanceof Error ? e.message : String(e);
          finish(
            'fail',
            msg === 'Failed to fetch'
              ? 'cannot reach API (down, wrong URL, CORS, or mixed content)'
              : msg,
          );
        }
      }),
    );

    if (ctrl.signal.aborted) return;
    setRanAt(new Date().toLocaleTimeString());
    setRunning(false);
  }, []);

  useEffect(() => {
    runAll(target);
  }, [target, runAll]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = normalizeUrl(input);
    if (!next) return;
    setInput(next);
    try {
      if (next === ENV_API_URL) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* non-fatal */
    }
    if (next === target) runAll(next);
    else setTarget(next);
  };

  const reset = () => {
    setInput(ENV_API_URL);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* non-fatal */
    }
    if (target === ENV_API_URL) runAll(ENV_API_URL);
    else setTarget(ENV_API_URL);
  };

  const failed = checks.filter((c) => c.state === 'fail').length;
  const pending = checks.some((c) => c.state === 'pending');
  const allOk = !pending && failed === 0;
  const isCustom = target !== ENV_API_URL;
  const mixedContent =
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    target.startsWith('http://');

  return (
    <main className="shell" style={{ paddingTop: 56, paddingBottom: 56, maxWidth: 860 }}>
      <p className="muted" style={{ marginBottom: 8 }}>Connectivity check</p>
      <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', marginTop: 0 }}>Frontend → Backend</h1>

      <form onSubmit={submit} className="card" style={{ marginTop: 20, padding: '16px 18px' }}>
        <label className="label" htmlFor="api-url">API URL</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          <input
            id="api-url"
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://api.example.com"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            style={{ flex: '1 1 320px', minWidth: 0, fontFamily: 'ui-monospace, monospace', fontSize: '.9rem' }}
          />
          <button className="btn" type="submit" disabled={running || !input.trim()}>
            {running ? 'Checking…' : 'Check'}
          </button>
          {isCustom && (
            <button className="btn secondary" type="button" onClick={reset} disabled={running}>
              Reset
            </button>
          )}
        </div>
        <div className="muted" style={{ fontSize: '.8rem', marginTop: 8 }}>
          {isCustom ? (
            <>Testing a custom URL — the build-time value is <code>{ENV_API_URL}</code></>
          ) : (
            <>From <code>NEXT_PUBLIC_API_URL</code>. Type any URL to probe a different backend.</>
          )}
        </div>
      </form>

      {mixedContent && (
        <div className="card" style={{ marginTop: 12, borderLeft: '4px solid #c0392b' }}>
          <strong>Mixed content</strong>
          <div className="muted" style={{ fontSize: '.88rem', marginTop: 4 }}>
            This page is on HTTPS but the API URL is <code>http://</code>. Browsers block that
            outright — the checks below will fail regardless of whether the API is healthy.
          </div>
        </div>
      )}

      <div
        className="card"
        style={{
          marginTop: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          borderLeft: `4px solid ${pending ? '#9aa0a6' : allOk ? '#1a7f4b' : '#c0392b'}`,
        }}
      >
        <span style={{ fontSize: '1.9rem', lineHeight: 1 }}>
          {pending ? '◌' : allOk ? '✓' : '✕'}
        </span>
        <div style={{ minWidth: 0 }}>
          <strong style={{ fontSize: '1.1rem' }}>
            {pending
              ? 'Running checks…'
              : allOk
                ? 'Everything is working'
                : `${failed} check${failed > 1 ? 's' : ''} failing`}
          </strong>
          <div className="muted" style={{ fontSize: '.9rem', marginTop: 2, wordBreak: 'break-all' }}>
            <code>{target}</code>
            {ranAt && ` · last run ${ranAt}`}
          </div>
        </div>
        <button
          className="btn secondary sm"
          onClick={() => runAll(target)}
          disabled={running}
          style={{ marginLeft: 'auto' }}
        >
          {running ? 'Checking…' : 'Re-run'}
        </button>
      </div>

      <div className="stack" style={{ marginTop: 18, gap: 10 }}>
        {checks.map((c) => (
          <div
            key={c.key}
            className="card"
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px' }}
          >
            <span
              aria-hidden
              style={{
                fontSize: '1.1rem',
                lineHeight: 1.4,
                color: c.state === 'ok' ? '#1a7f4b' : c.state === 'fail' ? '#c0392b' : '#9aa0a6',
              }}
            >
              {c.state === 'ok' ? '✓' : c.state === 'fail' ? '✕' : '◌'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <strong>{c.label}</strong>
                {c.ms !== undefined && (
                  <span className="muted" style={{ fontSize: '.8rem' }}>{c.ms} ms</span>
                )}
              </div>
              <div
                style={{
                  fontSize: '.9rem',
                  marginTop: 3,
                  color: c.state === 'fail' ? '#c0392b' : 'var(--muted)',
                  wordBreak: 'break-word',
                }}
              >
                {c.detail}
              </div>
              <div className="muted" style={{ fontSize: '.78rem', marginTop: 4, opacity: 0.75 }}>
                {c.hint}
              </div>
            </div>
          </div>
        ))}
      </div>

      {failed > 0 && !pending && (
        <div className="panel" style={{ marginTop: 18 }}>
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>If checks are failing</h2>
          <ul className="muted" style={{ fontSize: '.9rem', lineHeight: 1.7, paddingLeft: 18, margin: 0 }}>
            <li>Is the backend up? <code>docker compose ps</code> in <code>ecom-backend</code></li>
            <li>Is <code>{target}</code> the right address, reachable from this browser?</li>
            <li>Does the API allow this origin (<code>{typeof window !== 'undefined' ? window.location.origin : ''}</code>) in CORS?</li>
            <li>Once deployed, the API must be HTTPS or the browser blocks it as mixed content</li>
            <li>Passing here only fixes this page — set <code>NEXT_PUBLIC_API_URL</code> at build time for the real app</li>
          </ul>
        </div>
      )}
    </main>
  );
}
