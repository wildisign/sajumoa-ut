import { SESSIONS_KEY, readSessions } from './store.js';

const $ = selector => document.querySelector(selector);
let sessions = [], selected = null;
const routeLabels = { modal_payment: '모달 안 이용료 결제', bottom_tab: '하단 이용료 결제 탭', other: '기타' };
const statusLabels = { in_progress: '진행 중', submitted: '답변 제출', screened_out: '스크리닝 종료', completed: '완료' };
const screenLabels = {screening:'스크리닝',start:'0. 시작',consult:'2. 상담하기',phone:'3. 전화창',goal:'목표 안내',return:'4. 앱 복귀',home:'상담사 목록',payment:'도착: 이용료 결제',questions:'5. 질문',thanks:'참여 완료',ineligible:'스크리닝 종료'};
const questionLabels = {interest:'운세 상담 관심 여부',used:'사주모아 이용 경험',q1:'1. 돌아온 화면에서 처음에 무엇을 누르셨어요? 무엇을 보고 누르셨어요?',q2:'2. 돌아가신 화면에서 무엇을 찾고 계셨어요?',q3:'3. 돌아온 화면에서 확인하고 싶었던 게 있었어요?'};
function el(tag, text, className) { const element = document.createElement(tag); if (text !== undefined) element.textContent = String(text); if (className) element.className = className; return element; }
function notice(text, error = false) { $('#notice').textContent = text; $('#notice').classList.toggle('error', error); }
function dateLabel(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value || '—') : date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }); }
function display(value) { return value === null || value === undefined || value === '' ? '—' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value); }
function refresh() {
  try { sessions = readSessions(); } catch (error) { notice(`기록을 읽지 못했습니다. ${error.message}`, true); return; }
  sessions.sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
  if (!sessions.some(record => record.id === selected)) selected = sessions[0]?.id || null;
  render();
}
function render() {
  const list = $('#session-list'); list.replaceChildren();
  if (!sessions.length) list.append(el('p', '아직 저장된 기록이 없습니다.', 'empty'));
  sessions.forEach((record, index) => {
    const button = el('button', undefined, 'session-item'); button.type = 'button'; button.setAttribute('aria-pressed', String(record.id === selected));
    button.append(el('strong', `참가자 ${sessions.length - index} · ${String(record.id).slice(0, 8)}`), el('small', dateLabel(record.startedAt)), el('small', statusLabels[record.status] || record.status));
    button.addEventListener('click', () => { selected = record.id; render(); }); list.append(button);
  });
  const details = $('#details'); details.replaceChildren();
  const record = sessions.find(item => item.id === selected);
  if (!record) { details.append(el('p', '참가자가 테스트를 진행하면 이곳에서 행동 로그와 답변을 확인할 수 있습니다.', 'empty')); return; }
  const head = el('div', undefined, 'session-head'); head.append(el('h2', `참가자 ${record.id}`), el('p', `시작 ${dateLabel(record.startedAt)} · ${statusLabels[record.status] || record.status}`));
  const one = el('button', '이 참가자 JSON 내려받기'); one.type = 'button'; one.addEventListener('click', () => download(`sajumoa-ut-${record.id}.json`, JSON.stringify([record], null, 2), 'application/json')); head.append(one); details.append(head);
  const m = record.measurement || {};
  const facts = el('dl', undefined, 'facts');
  const m1 = !m.firstButton ? '첫 행동 미기록' : m.firstButton === '이용료 결제' ? '모달 안 이용료 결제' : m.firstButton === '닫기' && m.entryRoute === 'bottom_tab' ? 'X → 하단 탭' : '기타';
  [ ['4번 화면 첫 탭', m.firstButton], ['M1 첫 행동 분류', m1], ['최초 도착 경로', routeLabels[m.entryRoute] || m.entryRoute], ['모달로 되돌아온 횟수', m.returnCount ?? 0], ['이용료 결제 화면 도착 기록', m.arrived ? '도착 기록 있음' : '도착 기록 없음'], ['M1 분석 제외', m.excluded ? `제외 · ${m.exclusionReason || '사유 미기록'}` : '제외 표시 없음'], ['현재 저장 화면', screenLabels[record.screen] || record.screen] ].forEach(([label, value]) => { const fact = el('div', undefined, 'fact'); fact.append(el('dt', label), el('dd', display(value))); facts.append(fact); }); details.append(facts);
  details.append(el('h3', '스크리닝 응답', 'section-title')); appendAnswers(details, record.screening || {});
  details.append(el('h3', '질문 답변', 'section-title')); appendAnswers(details, record.answers || {});
  details.append(el('h3', `행동 로그 · ${(record.events || []).length}개`, 'section-title'));
  const wrap = el('div', undefined, 'table-wrap'), table = el('table'), thead = el('thead'), row = el('tr'); ['시각 (한국)', '화면', '누른 버튼 / 행동'].forEach(text => row.append(el('th', text))); thead.append(row); table.append(thead); const tbody = el('tbody');
  (record.events || []).forEach(event => { const tr = el('tr'); [dateLabel(event.at), screenLabels[event.screen] || event.screen, event.button || event.type].forEach(text => tr.append(el('td', display(text)))); tbody.append(tr); }); table.append(tbody); wrap.append(table); details.append(wrap);
  const raw = el('details'); raw.append(el('summary', '원본 데이터 보기'), el('pre', JSON.stringify(record, null, 2), 'raw')); details.append(raw);
}
function appendAnswers(target, answers) {
  if (!Object.keys(answers).length) { target.append(el('p', '저장된 응답이 없습니다.', 'helper')); return; }
  Object.entries(answers).forEach(([question, answer]) => { const box = el('div', undefined, 'answer'); box.append(el('h3', questionLabels[question] || question), el('p', display(answer))); target.append(box); });
}
function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` })); const a = el('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
function exportCsv() {
  const rows = [['참가자 ID', '시작 시각 ISO', '상태', '4번 첫 탭', '도착 경로', '되돌아온 횟수', 'M1 제외', '제외 사유', '행동 시각 ISO', '화면', '버튼', '스크리닝 JSON', '답변 JSON']];
  sessions.forEach(record => { const m = record.measurement || {}; const events = record.events?.length ? record.events : [{}]; events.forEach(event => rows.push([record.id, record.startedAt, record.status, m.firstButton, m.entryRoute, m.returnCount, m.excluded, m.exclusionReason, event.at, event.screen, event.button, JSON.stringify(record.screening || {}), JSON.stringify(record.answers || {})])); });
  download('sajumoa-ut-actions.csv', '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'), 'text/csv');
}
function validate(record) {
  if (!record || typeof record !== 'object' || typeof record.id !== 'string' || !record.id || record.id.length > 200 || !Array.isArray(record.events) || !record.measurement || typeof record.measurement !== 'object') throw new Error('사주모아 UT 기록 형식이 아닙니다.');
  if (record.events.some(event => !event || typeof event !== 'object' || typeof event.screen !== 'string')) throw new Error('행동 로그 형식이 올바르지 않습니다.');
  return record;
}
$('#refresh').addEventListener('click', () => { refresh(); notice('기록을 새로 불러왔습니다.'); });
$('#export-json').addEventListener('click', () => download('sajumoa-ut-records.json', JSON.stringify(sessions, null, 2), 'application/json'));
$('#export-csv').addEventListener('click', exportCsv);
$('#import-file').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error('10MB 이하의 JSON 파일을 선택해 주세요.');
    const payload = JSON.parse(await file.text()); const incoming = (Array.isArray(payload) ? payload : payload.sessions || [payload]).map(validate);
    const merged = readSessions();
    incoming.forEach(record => {
      const index = merged.findIndex(item => item.id === record.id);
      if (index < 0) { merged.push(record); return; }
      const existing = merged[index];
      const eventMap = new Map(); [...(existing.events || []), ...record.events].forEach(entry => eventMap.set(entry.id || `${entry.at}|${entry.screen}|${entry.button}`, entry));
      const latestIncoming = String(record.updatedAt || record.events.at(-1)?.at || record.startedAt) > String(existing.updatedAt || existing.events.at(-1)?.at || existing.startedAt);
      merged[index] = { ...(latestIncoming ? existing : record), ...(latestIncoming ? record : existing), events: [...eventMap.values()].sort((a, b) => String(a.at).localeCompare(String(b.at))) };
    });
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(merged)); selected = incoming[0]?.id || selected; refresh(); notice(`${incoming.length}개 기록을 가져왔습니다. 같은 참가자의 중복 행동은 합쳐집니다.`);
  } catch (error) { notice(`가져오지 못했습니다. ${error.message}`, true); }
  event.target.value = '';
});
window.addEventListener('storage', refresh);
refresh();
