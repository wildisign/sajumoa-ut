import { RESULTS_ORIGIN } from './config.js';

export const SYNC_KEY = 'sajumoaut.sync.v2';

export function resultSnapshot(session) {
  const copy = JSON.parse(JSON.stringify(session));
  delete copy.callRemaining;
  return copy;
}
function fingerprint(snapshot) {
  const comparable = { ...snapshot };
  delete comparable.updatedAt;
  return JSON.stringify(comparable);
}
function writeKey(crypto) {
  return [...crypto.getRandomValues(new Uint8Array(32))].map(n => n.toString(16).padStart(2, '0')).join('');
}

/** Only the active store is observed; historical local records are never uploaded. */
export function initRemoteSync(store, options = {}) {
  const target = options.eventTarget || globalThis;
  let storage = options.storage;
  try { storage ||= globalThis.localStorage; } catch { /* The in-memory queue still uploads during this page visit. */ }
  const fetcher = options.fetch || globalThis.fetch.bind(globalThis);
  const origin = options.origin || RESULTS_ORIGIN;
  const crypto = options.crypto || globalThis.crypto;
  const listeners = new Set();
  let entries = {}, backup = true, disposed = false, sending = null, debounce;
  let state = 'saving', lastError = null;
  try { entries = JSON.parse(storage.getItem(SYNC_KEY) || '{}'); } catch { backup = false; }
  if (!entries || typeof entries !== 'object' || Array.isArray(entries)) entries = {};
  const id = store.session.id;
  let meta = entries[id];
  if (!meta || typeof meta.key !== 'string' || !/^[a-f0-9]{64}$/.test(meta.key)) {
    meta = { key: writeKey(crypto), revision: 0, acknowledged: 0, fingerprint: null, snapshot: null };
  }
  function persist() {
    try {
      const current = JSON.parse(storage.getItem(SYNC_KEY) || '{}');
      storage.setItem(SYNC_KEY, JSON.stringify({ ...current, [id]: meta }));
      backup = true;
    } catch { backup = false; }
  }
  function status() {
    return { state, pending: meta.revision > meta.acknowledged, localBackup: backup, error: lastError };
  }
  function notify() { for (const listener of listeners) listener(status()); }
  function capture() {
    if (disposed || store.session.id !== id) return;
    const snapshot = resultSnapshot(store.session);
    const next = fingerprint(snapshot);
    if (meta.fingerprint === next) return;
    let priorRevision = 0;
    try { priorRevision = JSON.parse(storage.getItem(SYNC_KEY) || '{}')[id]?.revision || 0; } catch { /* memory backup remains usable */ }
    meta.revision = Math.max(meta.revision, priorRevision) + 1;
    meta.fingerprint = next;
    meta.snapshot = snapshot;
    persist();
    state = 'saving'; lastError = null; notify();
    clearTimeout(debounce);
    debounce = setTimeout(() => { void flush(); }, options.debounceMs ?? 500);
  }
  async function pump() {
    let consecutive = 0;
    while (!disposed && meta.revision > meta.acknowledged && consecutive < 3) {
      consecutive += 1;
      const revision = meta.revision;
      const body = JSON.stringify({ session: meta.snapshot, writeKey: meta.key, revision });
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 12000);
      state = 'saving'; notify();
      try {
        const response = await fetcher(origin + '/api/sessions', {
          method: 'POST', mode: 'cors', credentials: 'omit', headers: { 'Content-Type': 'application/json' },
          body, signal: controller.signal, keepalive: body.length < 55000,
        });
        if (!response.ok) throw new Error('결과 저장 요청을 완료하지 못했습니다.');
        const reply = await response.json();
        if (reply.ok !== true || !Number.isInteger(reply.revision) || reply.revision < revision) throw new Error('저장 확인 응답이 올바르지 않습니다.');
        if (reply.revision > revision) {
          // Another copy of this session advanced; resend this current snapshot above that revision.
          meta.revision = Math.max(meta.revision, reply.revision) + 1;
        } else meta.acknowledged = Math.max(meta.acknowledged, revision);
        persist();
        lastError = null;
      } catch (error) {
        state = 'error'; lastError = error.message || '연결을 확인해 주세요.'; notify();
        break;
      } finally { clearTimeout(timeout); }
    }
    if (!lastError) state = meta.revision > meta.acknowledged ? 'saving' : 'saved';
    notify();
    if (!disposed && !lastError && meta.revision > meta.acknowledged) {
      clearTimeout(debounce); debounce = setTimeout(() => { void flush(); }, options.debounceMs ?? 500);
    }
    return status();
  }
  function flush() {
    clearTimeout(debounce);
    if (disposed) return Promise.resolve(status());
    if (!sending) sending = pump().finally(() => { sending = null; });
    return sending;
  }
  function onChange(event) { if (event.detail?.id === id) capture(); }
  function onOnline() { if (meta.revision > meta.acknowledged) void flush(); }
  function onVisibility() { if (globalThis.document?.visibilityState === 'visible') onOnline(); }
  target.addEventListener('ut-record-change', onChange);
  target.addEventListener('online', onOnline);
  globalThis.document?.addEventListener('visibilitychange', onVisibility);
  const retry = setInterval(onOnline, options.retryMs ?? 30000);
  capture();
  if (meta.revision > meta.acknowledged) {
    state = 'saving'; clearTimeout(debounce); debounce = setTimeout(() => { void flush(); }, options.debounceMs ?? 500);
  } else state = 'saved';
  return {
    get status() { return status(); }, flush,
    subscribe(listener) { listeners.add(listener); listener(status()); return () => listeners.delete(listener); },
    dispose() { disposed = true; clearTimeout(debounce); clearInterval(retry); target.removeEventListener('ut-record-change', onChange); target.removeEventListener('online', onOnline); globalThis.document?.removeEventListener('visibilitychange', onVisibility); listeners.clear(); },
  };
}
