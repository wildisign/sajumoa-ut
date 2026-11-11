export const SESSIONS_KEY = 'sajumoaut.sessions.v1';
export const ACTIVE_KEY = 'sajumoaut.active.v1';

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
  let persistent, transient, session, error = null;
  try {
    persistent = options.localStorage || globalThis.localStorage;
    transient = options.sessionStorage || globalThis.sessionStorage;
    const active = transient.getItem(ACTIVE_KEY);
    session = readSessions(persistent).find(record => record.id === active);
  } catch (cause) { error = `브라우저 저장소를 읽을 수 없습니다. 기록을 내려받아 보관해 주세요. (${cause.message})`; }

  function fresh() {
    return {
      id: makeId(), startedAt: now(), screen: 'screening', status: 'in_progress',
      screening: {}, answers: {}, events: [],
      measurement: { started: false, firstButton: null, entryRoute: null, returnCount: 0, excluded: false, exclusionReason: null, arrived: false },
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
      error = null;
      return true;
    } catch (cause) {
      error = `브라우저에 저장하지 못했습니다. 이 화면을 닫기 전에 기록을 내려받아 주세요. (${cause.message})`;
      return false;
    }
  }
  function log(screen, button, extra = {}) {
    session.events.push({ ...extra, id: makeId(), type: 'tap', screen, button, at: now() });
    return save();
  }
  const api = {
    get session() { return session; },
    get error() { return error; },
    save, log,
    setScreen(screen) { session.screen = screen; return save(); },
    firstAction(button) {
      session.measurement.started = true;
      if (session.measurement.firstButton === null) session.measurement.firstButton = button;
      return save();
    },
    arrive(route) {
      if (!session.measurement.arrived) {
        session.measurement.arrived = true;
        session.measurement.entryRoute = ['modal_payment', 'bottom_tab'].includes(route) ? route : 'other';
      }
      return save();
    },
    returnToModal() { session.measurement.returnCount += 1; return save(); },
    exclude(reason) {
      session.measurement.excluded = true;
      session.measurement.exclusionReason = reason;
      return save();
    },
    submit(answers) { session.answers = { ...answers }; session.status = 'submitted'; return save(); },
    newSession() { session = fresh(); save(); return session; },
  };
  if (!session) { session = fresh(); save(); }
  return api;
}
