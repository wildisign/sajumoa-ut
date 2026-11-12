import { createStore } from './store.js';

export function isPreviewMode(search = '') {
  return new URLSearchParams(search).get('preview') === '1';
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

function memoryOwnership() {
  const listeners = new Set();
  let owner = false, disposed = false;
  const state = () => ({ isOwner: owner, reason: '' });
  const notify = () => { for (const listener of listeners) listener(state()); };
  return {
    get isOwner() { return owner; },
    get reason() { return ''; },
    async acquire() { if (disposed) return false; owner = true; notify(); return true; },
    release() { owner = false; notify(); },
    subscribe(listener) { listeners.add(listener); listener(state()); return () => listeners.delete(listener); },
    dispose() { disposed = true; owner = false; notify(); listeners.clear(); },
  };
}

function previewSync() {
  const status = Object.freeze({
    state: 'preview', conflict: false, pending: false, pendingCount: 0,
    localBackup: true, error: null, queueError: null,
  });
  return {
    get status() { return status; },
    flush() { return Promise.resolve(status); },
    subscribe(listener) { listener(status); return () => {}; },
    dispose() {},
  };
}

/** This runtime has no browser storage, browser locks, or network dependencies. */
export function createPreviewRuntime() {
  let persistent = memoryStorage(), transient = memoryStorage();
  return {
    guard: memoryOwnership(),
    createStore() { return createStore({ localStorage: persistent, sessionStorage: transient }); },
    createRemote() { return previewSync(); },
    reset() { persistent = memoryStorage(); transient = memoryStorage(); },
  };
}
