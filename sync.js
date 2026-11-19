import { RESULTS_ORIGIN } from './config.js';

export const SYNC_KEY = 'sajumoaut.sync.v2';
const clone = value => JSON.parse(JSON.stringify(value));
const revision = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const validMeta = meta => meta && typeof meta === 'object' && /^[a-f0-9]{64}$/.test(meta.key || '') && revision(meta.revision) === meta.revision && revision(meta.acknowledged) === meta.acknowledged;

export function hasStartedParticipation(session) {
  if (!session) return false;
  if (session.participationStartedAt !== undefined) return !!session.participationStartedAt;
  // Legacy clients did not save the acceptance time, but recorded the welcome action.
  const screen = session.lifecycle?.lastActiveScreen || session.screen;
  const afterWelcome = screen && !['welcome', 'resume', 'paused', 'withdrawn', 'previous-version'].includes(screen);
  return !!(afterWelcome || session.events?.some(event => event.screen === 'welcome' && event.action === 'next'));
}

export function resultSnapshot(session) {
  const copy = clone(session);
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

// The fragment stays in the browser. Only the configured results service receives the key.
export async function restorePersonalLink(fragment) {
  const match=/^#resume=([a-zA-Z0-9-]{16,100})\.([a-f0-9]{64})$/.exec(fragment);
  if (!match) throw new Error('개인 링크가 온전하지 않습니다. 원래 창에서 다시 복사해 주세요.');
  const [,id,key]=match;
  const queue=JSON.parse(localStorage.getItem(SYNC_KEY)||'{}');
  const cached=queue[id];
  const local=validMeta(cached)&&cached.key===key&&cached.snapshot?.id===id ? cached : null;
  let response;
  try {
    response=await fetch(RESULTS_ORIGIN+'/api/sessions/resume',{
      method:'POST', credentials:'omit', cache:'no-store', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id,writeKey:key}),signal:AbortSignal.timeout(12000)
    });
  } catch {
    if (local && !local.blocked) return local.snapshot;
    throw new Error('인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
  }
  if (!response.ok) {
    if (response.status===404 && local && !local.acknowledged && !local.blocked) return local.snapshot;
    throw new Error(response.status===404?'기록을 찾지 못했습니다. 원래 창에서 저장한 뒤 개인 링크를 다시 열어 주세요.':'진행 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
  }
  const {session,revision:serverRevision}=await response.json();
  if (session?.id!==id || !Number.isSafeInteger(serverRevision) || serverRevision<1) throw new Error('진행 기록을 확인할 수 없습니다.');
  if (local && !local.blocked && local.acknowledged===serverRevision) return local.snapshot;
  const latest=JSON.parse(localStorage.getItem(SYNC_KEY)||'{}');
  latest[id]={key,revision:serverRevision,acknowledged:serverRevision,fingerprint:fingerprint(session),snapshot:session};
  localStorage.setItem(SYNC_KEY,JSON.stringify(latest));
  return session;
}

/** Recover only the v2 upload queue; unrelated historical browser records are never uploaded. */
export function initRemoteSync(store, options = {}) {
  const target = options.eventTarget || globalThis;
  const doc = options.document || globalThis.document;
  let storage = options.storage;
  try { storage ||= globalThis.localStorage; } catch { /* Memory remains usable for this visit. */ }
  const fetcher = options.fetch || globalThis.fetch.bind(globalThis);
  const origin = options.origin || RESULTS_ORIGIN;
  const crypto = options.crypto || globalThis.crypto;
  const canCapture = options.canCapture || (() => true);
  const shouldUpload = options.shouldUpload || (() => true);
  const listeners = new Set();
  const activeId = store.session.id;
  let entries = {}, backup = true, disposed = false, sending = null, debounce;
  let activeConflict = false;
  const errors = new Map();
  const inFlight = new Set();
  const diagnosticKey = 'sajumoaut.save-diagnostics.v1';
  let recentFailures = [];
  try {
    const saved = JSON.parse(storage.getItem(diagnosticKey) || '[]');
    if (Array.isArray(saved)) recentFailures = saved.slice(-20);
  } catch { /* Diagnostics also work for this visit without storage. */ }
  function recordFailure(id, code, response, sent, bytes, started, reason) {
    const item = {
      at: new Date().toISOString(), participant: id.slice(0, 8), code,
      http: response?.status ?? null, revision: sent.revision, acknowledged: sent.acknowledged,
      elapsedMs: Date.now() - started, bytes, localBackup: backup,
      onlineHint: globalThis.navigator?.onLine ?? null,
    };
    // Server validation messages can identify a rule. Never retain arbitrary response text.
    if (code === 'HTTP-400' && typeof reason === 'string') {
      const question = /^(\d{2}(?:-\d+)?) /.exec(reason);
      if (question) item.question = question[1];
      let hash = 2166136261;
      for (const char of reason) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
      item.rule = (hash >>> 0).toString(16);
    }
    recentFailures = [...recentFailures, item].slice(-20);
    try { storage.setItem(diagnosticKey, JSON.stringify(recentFailures)); } catch { /* Keep in memory. */ }
  }

  function readQueue() {
    const parsed = JSON.parse(storage.getItem(SYNC_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid upload queue');
    const result = {};
    for (const [id, meta] of Object.entries(parsed)) if (validMeta(meta)) result[id] = meta;
    return result;
  }
  function merged(a, b) {
    if (!validMeta(a)) return validMeta(b) ? clone(b) : null;
    if (!validMeta(b)) return clone(a);
    // The persisted capability is authoritative. Never replace it with another tab's key.
    if (a.key !== b.key) return clone(b);
    const newest = b.revision > a.revision ? b : a;
    const result = clone(newest);
    result.acknowledged = Math.min(result.revision, Math.max(a.acknowledged, b.acknowledged));
    if ((a.blocked && a.revision >= result.revision) || (b.blocked && b.revision >= result.revision)) {
      result.blocked = true;
      result.conflictReason = a.conflictReason || b.conflictReason || '다른 화면에서 이 참여 기록이 변경되었습니다.';
    }
    return result;
  }
  function refresh(checkActiveConflict = false) {
    try {
      const disk = readQueue();
      for (const [id, saved] of Object.entries(disk)) {
        const memory = entries[id];
        if (checkActiveConflict && id === activeId && memory && (saved.key !== memory.key || (saved.revision > memory.revision && saved.fingerprint !== memory.fingerprint))) activeConflict = true;
        entries[id] = merged(memory, saved);
      }
    } catch { backup = false; }
  }
  refresh();

  function persist(id) {
    try {
      const disk = readQueue();
      const next = merged(entries[id], disk[id]);
      if (!next) return;
      if (id === activeId && entries[id] && next.key !== entries[id].key) activeConflict = true;
      disk[id] = next;
      storage.setItem(SYNC_KEY, JSON.stringify(disk));
      entries[id] = next;
      backup = true;
    } catch { backup = false; }
  }
  function pending(meta) { return !!meta?.snapshot && shouldUpload(meta.snapshot) && meta.revision > meta.acknowledged; }
  function status() {
    const active = entries[activeId];
    const conflict = activeConflict || !!active?.blocked;
    const activePending = pending(active);
    const allPending = Object.values(entries).filter(pending).length;
    const error = errors.get(activeId) || (conflict ? active?.conflictReason || '다른 화면에서 이 참여 기록이 변경되었습니다. 새로고침 후 확인해 주세요.' : null);
    return {
      state: conflict ? 'conflict' : error ? 'error' : activePending ? 'saving' : 'saved',
      diagnostics: recentFailures.filter(item => item?.participant === activeId.slice(0, 8)),
      conflict,
      pending: activePending,
      pendingCount: allPending,
      localBackup: backup,
      error,
      queueError: [...errors.entries()].find(([id]) => id !== activeId)?.[1] || null,
    };
  }
  function notify() { for (const listener of listeners) listener(status()); }
  function schedule() {
    clearTimeout(debounce);
    if (!disposed) debounce = setTimeout(() => { void flush(); }, options.debounceMs ?? 500);
  }
  function capture() {
    if (disposed || store.session.id !== activeId || !canCapture() || activeConflict) return;
    refresh(true);
    if (activeConflict || entries[activeId]?.blocked) { notify(); return; }
    const snapshot = resultSnapshot(store.session);
    const nextFingerprint = fingerprint(snapshot);
    let meta = entries[activeId];
    if (meta?.fingerprint === nextFingerprint) return;
    if (!meta) meta = { key: writeKey(crypto), revision: 0, acknowledged: 0, fingerprint: null, snapshot: null };
    const next = { ...meta, revision: meta.revision + 1, fingerprint: nextFingerprint, snapshot };
    delete next.blocked;
    delete next.conflictReason;
    entries[activeId] = next;
    persist(activeId); // Always persist before attempting an unload-time network request.
    errors.delete(activeId);
    notify();
    schedule();
  }
  // A crash may have left a newer upload snapshot than the primary local record.
  const restored = entries[activeId];
  if (restored?.snapshot && restored.fingerprint !== fingerprint(resultSnapshot(store.session))) {
    const queuedAt = Date.parse(restored.snapshot.updatedAt || restored.snapshot.startedAt || '');
    const localAt = Date.parse(store.session.updatedAt || store.session.startedAt || '');
    if (Number.isFinite(queuedAt) && Number.isFinite(localAt) && queuedAt > localAt) activeConflict = true;
  }

  async function send(id, meta) {
    // Immutable in-flight request: acknowledgments must not replace newer local edits.
    const sent = clone(meta);
    const body = JSON.stringify({ session: sent.snapshot, writeKey: sent.key, revision: sent.revision, baseRevision: sent.acknowledged });
    const bytes = new TextEncoder().encode(body).byteLength;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 12000);
    inFlight.add(id); notify();
    const started = Date.now();
    let response, reply;
    try {
      response = await fetcher(origin + '/api/sessions', {
        method: 'POST', mode: 'cors', credentials: 'omit', headers: { 'Content-Type': 'application/json' },
        body, signal: controller.signal, keepalive: bytes < 55000,
      });
      try { reply = await response.json(); } catch { reply = null; }
      refresh();
      const current = entries[id];
      if (!current || current.key !== sent.key) {
        if (id === activeId) activeConflict = true;
        return false;
      }
      if (response.status === 409 || (response.ok && Number.isInteger(reply?.revision) && reply.revision > sent.revision)) {
        // Do not "rebase" stale form contents above a newer server revision.
        recordFailure(id, 'CONFLICT', response, sent, bytes, started);
        current.blocked = true;
        current.conflictReason = '다른 화면에서 이 참여 기록이 변경되었거나 이미 종료되었습니다. 이 화면의 이전 내용으로 덮어쓰지 않았습니다.';
        if (id === activeId) activeConflict = true;
        errors.delete(id); persist(id); return false;
      }
      if (!response.ok || reply?.ok !== true || reply.revision !== sent.revision) throw new Error(reply?.error || '결과 저장 요청을 완료하지 못했습니다.');
      current.acknowledged = Math.max(current.acknowledged, sent.revision);
      persist(id); errors.delete(id);
      return true;
    } catch (error) {
      const code = controller.signal.aborted ? 'TIMEOUT' : !response ? 'NO-RESPONSE'
        : !response.ok ? 'HTTP-' + response.status : 'INVALID-ACK';
      recordFailure(id, code, response, sent, bytes, started, reply?.error);
      errors.set(id, error.message || '연결을 확인해 주세요.');
      return false;
    } finally { clearTimeout(timeout); inFlight.delete(id); notify(); }
  }
  async function pump() {
    const attempted = new Set();
    let sentCount = 0;
    while (!disposed && sentCount < 30) {
      refresh();
      const ids = Object.keys(entries).sort((a,b) => (a === activeId ? -1 : b === activeId ? 1 : 0));
      const id = ids.find(id => pending(entries[id]) && !entries[id].blocked && !attempted.has(id + ':' + entries[id].revision));
      if (!id) break;
      const meta = entries[id];
      attempted.add(id + ':' + meta.revision); sentCount += 1;
      await send(id, meta);
    }
    notify();
    const remaining = Object.entries(entries).some(([id, meta]) => pending(meta) && !meta.blocked && !errors.has(id));
    if (remaining && !disposed) schedule();
    return status();
  }
  function flush() {
    clearTimeout(debounce);
    if (disposed) return Promise.resolve(status());
    if (!sending) sending = pump().finally(() => { sending = null; });
    return sending;
  }
  function onChange(event) { if (event.detail?.id === activeId) capture(); }
  function onOnline() { refresh(); if (Object.values(entries).some(meta=>pending(meta)&&!meta.blocked)) void flush(); }
  function onPageHide() { capture(); void flush(); }
  function onVisibility() {
    if (doc?.visibilityState === 'hidden') onPageHide();
    else if (doc?.visibilityState === 'visible') onOnline();
  }
  function onStorage(event) { if (event.key === SYNC_KEY) { refresh(true); notify(); onOnline(); } }
  target.addEventListener('ut-record-change', onChange);
  target.addEventListener('online', onOnline);
  target.addEventListener('pagehide', onPageHide);
  target.addEventListener('storage', onStorage);
  doc?.addEventListener('visibilitychange', onVisibility);
  const retry = setInterval(onOnline, options.retryMs ?? 30000);
  capture();
  if (Object.values(entries).some(meta=>pending(meta)&&!meta.blocked)) schedule();
  return {
    get status() { return status(); }, flush,
    get linkFragment() {
      const key=entries[activeId]?.key;
      return key && shouldUpload(store.session) ? '#resume='+activeId+'.'+key : '';
    },
    subscribe(listener) { listeners.add(listener); listener(status()); return () => listeners.delete(listener); },
    dispose() { disposed = true; clearTimeout(debounce); clearInterval(retry); target.removeEventListener('ut-record-change', onChange); target.removeEventListener('online', onOnline); target.removeEventListener('pagehide', onPageHide); target.removeEventListener('storage', onStorage); doc?.removeEventListener('visibilitychange', onVisibility); listeners.clear(); },
  };
}
