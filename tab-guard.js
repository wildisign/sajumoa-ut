export const LOCK_NAME = 'sajumoa-ut-active-v3';
export const LEASE_KEY = 'sajumoaut.tab-lease.v3';

/** One writer for this study per browser origin. The owner token is never stored in sessionStorage. */
export function createTabGuard(options = {}) {
  const target = options.eventTarget || globalThis;
  const lockManager = Object.hasOwn(options, 'lockManager') ? options.lockManager : globalThis.navigator?.locks;
  let storage = options.storage;
  if (!Object.hasOwn(options, 'storage')) {
    try { storage = globalThis.localStorage; } catch { /* Fail closed if no fallback storage is available. */ }
  }
  const now = options.now || Date.now;
  const delay = options.delay || (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const leaseMs = options.leaseMs ?? 15000;
  const renewMs = options.renewMs ?? 3000;
  const settleMs = options.settleMs ?? 120;
  const token = options.token || globalThis.crypto?.randomUUID?.() || `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const listeners = new Set();
  let owner = false, disposed = false, reason = '', mode = null;
  let acquiring = null, nativeRequest = null, releaseNative = null, renewal = null, generation = 0;

  function notify() {
    const state = { isOwner: owner, reason };
    for (const listener of listeners) listener(state);
  }
  function update(value, message = '') {
    const changed = owner !== value || reason !== message;
    owner = value; reason = message;
    if (changed) notify();
  }
  function readLease() {
    if (!storage) throw new Error('Storage unavailable');
    const raw = storage.getItem(LEASE_KEY);
    if (!raw) return null;
    const lease = JSON.parse(raw);
    if (!lease || typeof lease.owner !== 'string' || !Number.isFinite(lease.expires)) throw new Error('Invalid lease');
    return lease;
  }
  function stopRenewal() { clearInterval(renewal); renewal = null; }
  function loseLease(message = '다른 탭에서 테스트가 진행 중입니다.') {
    stopRenewal(); update(false, message);
  }
  function checkLease() {
    if (!owner || mode !== 'lease') return owner;
    try {
      const lease = readLease();
      if (!lease || lease.owner !== token || lease.expires <= now()) loseLease();
    } catch { loseLease('이 브라우저의 탭 보호 정보를 확인할 수 없습니다.'); }
    return owner;
  }
  function renew() {
    if (!checkLease()) return;
    try {
      storage.setItem(LEASE_KEY, JSON.stringify({ owner: token, expires: now() + leaseMs }));
      checkLease();
    } catch { loseLease('이 브라우저의 탭 보호 정보를 저장할 수 없습니다.'); }
  }
  async function acquireLease(epoch) {
    mode = 'lease';
    try {
      const previous = readLease();
      if (previous && previous.owner !== token && previous.expires > now()) {
        update(false, '다른 탭에서 테스트가 진행 중입니다.'); return false;
      }
      storage.setItem(LEASE_KEY, JSON.stringify({ owner: token, expires: now() + leaseMs }));
      await delay(settleMs);
      if (disposed || epoch !== generation) {
        const current = readLease();
        if (current?.owner === token) storage.removeItem(LEASE_KEY);
        return false;
      }
      const current = readLease();
      if (!current || current.owner !== token || current.expires <= now()) {
        update(false, '다른 탭에서 테스트가 진행 중입니다.'); return false;
      }
      update(true);
      stopRenewal(); renewal = setInterval(renew, renewMs);
      return true;
    } catch {
      update(false, '이 브라우저에서는 여러 탭 보호를 사용할 수 없습니다. 다른 브라우저에서 열어 주세요.');
      return false;
    }
  }
  async function acquireWebLock(epoch) {
    mode = 'web-lock';
    // A release resolves the held callback; let that native request finish before reacquiring.
    if (nativeRequest) await nativeRequest.catch(() => {});
    if (disposed || epoch !== generation) return false;
    return new Promise(resolve => {
      let settled = false;
      const answer = value => { if (!settled) { settled = true; resolve(value); } };
      try {
        const pending = lockManager.request(LOCK_NAME, { mode: 'exclusive', ifAvailable: true }, async lock => {
          if (!lock || disposed || epoch !== generation) {
            if (!disposed && epoch === generation) update(false, '다른 탭에서 테스트가 진행 중입니다.');
            answer(false); return;
          }
          const held = new Promise(release => { releaseNative = release; });
          update(true); answer(true);
          await held;
          releaseNative = null;
        });
        nativeRequest = Promise.resolve(pending);
        nativeRequest.catch(async () => {
          if (disposed || epoch !== generation) { answer(false); return; }
          answer(await acquireLease(epoch));
        });
      } catch {
        void acquireLease(epoch).then(answer);
      }
    });
  }
  function acquire() {
    if (disposed) return Promise.resolve(false);
    if (checkLease()) return Promise.resolve(true);
    if (acquiring) return acquiring;
    const epoch = ++generation;
    acquiring = (lockManager?.request ? acquireWebLock(epoch) : acquireLease(epoch)).finally(() => { acquiring = null; });
    return acquiring;
  }
  function release() {
    generation += 1;
    stopRenewal();
    if (mode === 'lease') {
      try { if (readLease()?.owner === token) storage.removeItem(LEASE_KEY); } catch { /* No unrelated lease is changed. */ }
    }
    releaseNative?.(); releaseNative = null;
    update(false, disposed ? '테스트 탭 보호가 종료되었습니다.' : '테스트를 다시 열면 이어서 진행할 수 있습니다.');
  }
  function onStorage(event) {
    if (event.key !== LEASE_KEY && event.key !== null) return;
    if (event.storageArea && event.storageArea !== storage) return;
    checkLease();
  }
  function onPageHide() { release(); }
  function onPageShow(event) { if (event.persisted && !disposed) void acquire(); }
  target.addEventListener?.('storage', onStorage);
  target.addEventListener?.('pagehide', onPageHide);
  target.addEventListener?.('pageshow', onPageShow);
  return {
    acquire, release,
    get isOwner() { return checkLease(); },
    get reason() { return reason; },
    subscribe(listener) { listeners.add(listener); listener({ isOwner: checkLease(), reason }); return () => listeners.delete(listener); },
    dispose() {
      if (disposed) return;
      disposed = true; release();
      target.removeEventListener?.('storage', onStorage);
      target.removeEventListener?.('pagehide', onPageHide);
      target.removeEventListener?.('pageshow', onPageShow);
      listeners.clear();
    },
  };
}
