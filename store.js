export const SESSIONS_KEY = 'sajumoaut.sessions.v1';
export const ACTIVE_KEY = 'sajumoaut.active.v1';
export const LATEST_KEY = 'sajumoaut.latest.v3';

const makeId = () => globalThis.crypto?.randomUUID?.() || `ut-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();
export function readSessions(storage = globalThis.localStorage) {
  const raw = storage.getItem(SESSIONS_KEY);
  if (!raw) return [];
  const records = JSON.parse(raw);
  if (!Array.isArray(records)) throw new Error('저장된 기록의 형식이 올바르지 않습니다.');
  return records;
}

export function createStore(options = {}) {
  let persistent, transient, session, error = null, restored = false;
  try {
    persistent = options.localStorage || globalThis.localStorage;
    transient = options.sessionStorage || globalThis.sessionStorage;
    const active = transient.getItem(ACTIVE_KEY);
    const records = readSessions(persistent);
    session = records.find(record => record.id === active);
    if (!session) {
      const latest = persistent.getItem(LATEST_KEY);
      session = records.find(record => record.id === latest && record.protocolVersion >= 2 && !record.testRecord)
        || records.filter(record => record.protocolVersion >= 2 && !record.testRecord).sort((a,b)=>String(b.startedAt).localeCompare(String(a.startedAt)))[0];
    }
    // A persisted upload queue can be newer than the record list after a partial storage failure.
    try {
      const queue = JSON.parse(persistent.getItem('sajumoaut.sync.v2') || '{}');
      if (!session) session = Object.values(queue).map(entry=>entry?.snapshot).filter(record=>record?.protocolVersion>=2 && !record.testRecord).sort((a,b)=>String(b.startedAt).localeCompare(String(a.startedAt)))[0];
      const queued = queue[session?.id]?.snapshot;
      if (queued && String(queued.updatedAt || '') >= String(session.updatedAt || '')) session = { ...session, ...queued };
    } catch { /* The record list still provides a recoverable copy. */ }
    restored = !!session;
  } catch (cause) { error = `브라우저 저장소를 읽을 수 없습니다. 기록을 내려받아 보관해 주세요. (${cause.message})`; }

  function fresh() {
    return {
      id: makeId(), protocolVersion: 2, startedAt: now(), screen: 'screening', status: 'in_progress',
      screening: {}, answers: {}, events: [],
      measurement: { phase: 'A', started: false, firstButton: null, entryRoute: null, returnCount: 0, excluded: false, exclusionReason: null, arrived: false },
    };
  }
  function save() {
    session.updatedAt = now();
    try {
      if (!persistent || !transient) throw new Error('저장소 사용 불가');
      const records = readSessions(persistent);
      const index = records.findIndex(record => record.id === session.id);
      if (index < 0) records.push(session); else records[index] = session;
      persistent.setItem(SESSIONS_KEY, JSON.stringify(records));
      transient.setItem(ACTIVE_KEY, session.id);
      persistent.setItem(LATEST_KEY, session.id);
      error = null;
      return true;
    } catch (cause) {
      error = `브라우저에 저장하지 못했습니다. 이 화면을 닫기 전에 기록을 내려받아 주세요. (${cause.message})`;
      return false;
    } finally {
      if (typeof globalThis.dispatchEvent === 'function' && typeof globalThis.CustomEvent === 'function') {
        globalThis.dispatchEvent(new CustomEvent('ut-record-change', { detail: session }));
      }
    }
  }
  function log(screen, button, extra = {}) {
    session.events.push({ ...extra, phase: session.measurement.phase || 'A', id: makeId(), type: 'tap', screen, button, at: now() });
    return save();
  }
  const api = {
    get session() { return session; },
    get error() { return error; },
    get restored() { return restored; },
    save, log,
    setScreen(screen) { session.screen = screen; return save(); },
    firstAction(button) {
      if (session.measurement.phase === 'B' || session.measurement.arrived) return true;
      session.measurement.started = true;
      if (session.measurement.firstButton === null) session.measurement.firstButton = button;
      return save();
    },
    arrive(route) {
      if (session.measurement.phase === 'B') {
        if (!session.measurement.secondaryArrived) {
          session.measurement.secondaryArrived = true;
          session.measurement.secondaryEntryRoute = ['modal_payment', 'bottom_tab'].includes(route) ? route : 'other';
        }
        return save();
      }
      if (!session.measurement.arrived) {
        session.measurement.arrived = true;
        session.measurement.entryRoute = ['modal_payment', 'bottom_tab'].includes(route) ? route : 'other';
      }
      return save();
    },
    returnToModal() {
      if (session.measurement.phase === 'B') session.measurement.secondaryReturnCount = (session.measurement.secondaryReturnCount || 0) + 1;
      else if (!session.measurement.arrived) session.measurement.returnCount += 1;
      return save();
    },
    exclude(reason) {
      session.measurement.excluded = true;
      session.measurement.exclusionReason = reason;
      return save();
    },
    submit(answers) { session.answers = { ...answers }; session.status = 'submitted'; return save(); },
    pause(lastActiveScreen, reason='참가자가 잠시 중단 선택') { session.lifecycle={lastActiveScreen,stoppedAt:now(),stopReason:reason};session.status='paused';session.screen='paused';return save(); },
    withdraw(lastActiveScreen, reason='참가자가 참여 종료 선택') { session.lifecycle={lastActiveScreen,stoppedAt:now(),stopReason:reason};session.status='withdrawn';session.screen='withdrawn';return save(); },
    resume() {
      if (session.status !== 'paused') return false;
      session.status='in_progress';session.screen=session.lifecycle?.lastActiveScreen || 'start';
      session.lifecycle={...session.lifecycle,resumedAt:now()};return save();
    },
    newSession() { session = fresh(); restored=false; save(); return session; },
  };
  if (!session) { session = fresh(); save(); }
  return api;
}
