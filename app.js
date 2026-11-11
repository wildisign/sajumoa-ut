import { createStore } from './store.js';
import { initRemoteSync } from './sync.js';

const store = createStore();
const app = document.querySelector('#app');
const warning = document.querySelector('#storage-warning');
const params = new URLSearchParams(location.search);
if (params.get('new') === '1') {
  store.newSession();
  params.delete('new');
  history.replaceState(null, '', location.pathname + (params.size ? '?' + params : ''));
}
if (store.session.protocolVersion !== 2) store.newSession();
if (params.has('moderator')) {
  params.delete('moderator');
  history.replaceState(null, '', location.pathname + (params.size ? '?' + params : ''));
}
const remote = initRemoteSync(store);
const screens = new Set(['screening','ineligible','start','consult','phone','goal','return','home','payment','extra-task','questions','thanks']);
let screen = screens.has(store.session.screen) ? store.session.screen : 'screening';
let interval, toastTimer, transitionTimer;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths = {
  close:'M5 5l14 14M19 5L5 19', home:'M3 10l9-8 9 8v11h-7v-7h-4v7H3z', heart:'M12 21S2 15 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 7-10 13-10 13z', user:'M4 22v-3a8 8 0 0 1 16 0v3M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10', coins:'M3 6a9 3 0 1 0 18 0 9 3 0 1 0-18 0M3 6v12a9 3 0 0 0 18 0V6M3 12a9 3 0 0 0 18 0', phone:'M5 2L2 5c0 8 9 17 17 17l3-3-6-5-3 3c-3-1-5-3-6-6l3-3z', search:'M21 21l-6-6M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16', star:'M12 2l3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1z', card:'M2 5h20v15H2zM2 10h20M5 15h4', mic:'M9 3a3 3 0 0 1 6 0v8a3 3 0 0 1-6 0zM5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8M2 2l20 20', video:'M2 6h13v13H2zM15 10l7-4v13l-7-5', speaker:'M3 10h4l6-6v16l-6-6H3zM17 7c5 3 5 7 0 10M20 3c8 6 8 12 0 18', bluetooth:'M8 5l10 13-6 4V2l6 4L8 19', shield:'M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6z', record:'M9 12a4 4 0 1 0-8 0 4 4 0 1 0 8 0M23 12a4 4 0 1 0-8 0 4 4 0 1 0 8 0M5 16h14', arrow:'M15 3l-9 9 9 9'
};
function icon(name) {
  if (name === 'keypad') return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">' + [5,12,19].flatMap(x=>[3,9,15].map(y=>`<circle cx="${x}" cy="${y}" r="2" fill="currentColor"/>`)).join('') + '<circle cx="12" cy="21" r="2" fill="currentColor"/></svg>';
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.star}"/></svg>`;
}
function btn(id,label,cls='',inert=false,content=esc(label)) { return `<button type="button" class="${cls}" data-action="${id}" data-label="${esc(label)}" aria-label="${esc(label)}" ${inert?'aria-disabled="true"':''}>${content}</button>`; }
const coin = '<span class="coin" aria-hidden="true">C</span>';
function study(body, cls='', foot=true) {
 return `<section class="study ${cls}"><header class="study-head"><span class="study-brand">사주모아</span><span class="study-badge">USER TEST</span></header><div class="study-body">${body}</div>${foot?'<footer class="study-foot"><span>사주모아 · 사용자 테스트</span></footer>':''}</section>`;
}
function nav(active='home') { return `<nav class="bottom-nav" aria-label="앱 하단 메뉴">${[['home','홈'],['heart','찜'],['user','마이페이지'],['coins','이용료 결제']].map(([i,l])=>btn('tab-'+i,l,(active===i?'active':''),i!=='home'&&i!=='coins',icon(i)+l)).join('')}</nav>`; }
function home() { return `<div class="app-shell"><header class="app-header"><span class="app-logo">Sajumoa</span><div class="header-actions">${btn('search','검색','icon-button',true,icon('search'))}${btn('profile','마이페이지','icon-button',true,icon('user'))}</div></header><section class="hero"><small>당신의 이야기를 듣는 곳</small><h2>마음속 고민,<br>함께 이야기해 보세요</h2><p>사주 · 타로 · 신점 전문 상담</p></section><div class="categories">${[['card','타로'],['coins','사주'],['star','신점'],['heart','후기']].map(([i,l])=>btn('category-'+i,l,'category',true,icon(i)+l)).join('')}</div><div class="filter-bar">${['추천','신규','급상승','상담중'].map(l=>btn('filter-'+l,l,'',true)).join('')}</div><article class="advisor-card"><div class="advisor-photo" role="img" aria-label="서가비 상담사"></div><div class="advisor-info"><h3>서가비 <span>223번</span></h3><p>내담자의 마음에 귀 기울이는 상담</p><p>후기 (21)</p><div class="rate">1,200 이용료 / 30초</div></div>${btn('reopen','상담하기','consult-side',false,icon('phone')+'상담<br>하기')}</article>${nav()}</div>`; }
function detail() {return `<div class="app-shell"><div class="app-detail"><span>${icon('arrow')}</span><div class="detail-portrait" role="img" aria-label="서가비 상담사"></div><div class="detail-info"><p>신점</p><h2>서가비 <span>223번</span></h2><p>1,200 이용료 / 30초</p><p class="detail-tags">#용한점집 #현실적인조언<br>#속마음을이해하는</p></div></div></div>`;}
function modal(zero=false) {return `${zero?home():detail()}<div class="modal-backdrop"><section class="consult-modal" role="dialog" aria-modal="true" aria-labelledby="consult-title"><h1 class="modal-title" id="consult-title">상담하기</h1>${btn('close','닫기','modal-close',!zero,icon('close'))}<div class="consult-profile"><div class="portrait" role="img" aria-label="서가비 상담사"></div><div><span>[신점]</span> &nbsp;서가비 <span>223번</span></div></div><div class="balance-row">${coin}<div class="balance-copy">보유 이용료<strong>${zero?'0':'10,000'}</strong></div>${btn('modal-payment','이용료 결제','pay-entry',!zero)}</div><div class="modal-divider"></div><div class="consult-body"><p class="consult-note">아래 버튼 클릭시, 서가비 선생님과 자동으로 연결됩니다.</p>${btn('consult-now','지금 상담하기','consult-now',zero,'지금 상담하기 &gt;')}<div class="rate-box">${coin}<span><strong>1,200</strong>이용료 / 30초</span><small>약 <strong>${zero?'0':'4'}분</strong> 상담 가능</small></div><p class="consult-note">아래 버튼 클릭 후, 안내멘트에 따라 상담사 고유번호 223번<br>입력하시면 서가비 선생님과 연결됩니다.</p>${btn('postpaid','후불로 상담하기','consult-postpaid',zero,'후불로 상담하기 &gt;')}<div class="rate-box postpaid-rate"><span class="coin" aria-hidden="true">₩</span><span><strong>1,600</strong>원 / 30초</span></div></div></section></div>`;}
function phone() {return `<section class="phone"><div class="phone-top"><span>8:08</span><span>LTE &nbsp;51 ▰</span></div><p class="phone-timer" id="call-timer">04:08</p><h1>070-8016-9100</h1><div class="shield">${icon('shield')}</div><div class="phone-space"></div>${btn('assist','통화 어시스트','assist',true)}<div class="call-panel"><div class="call-controls">${[['record','녹음',''],['video','영상통화','dim'],['bluetooth','블루투스',''],['speaker','스피커','speaker'],['mic','내 소리 차단',''],['keypad','키패드','']].map(([i,l,c])=>btn('call-'+i,l,'call-control '+c,true,icon(i)+l)).join('')}</div>${btn('end-call','통화 종료','hangup',false,icon('phone'))}</div></section>`;}
function payment() {return `<div class="app-shell payment"><h1>이용료 결제</h1><section class="points"><p>보유포인트</p>${coin}<strong>0</strong></section><div class="payment-body"><h2>결제금액 선택 <small>(VAT별도)</small></h2><div class="amounts">${[30000,50000,100000,200000,300000,500000].map((n,i)=>btn('amount-'+n,'포인트 '+n.toLocaleString('ko-KR'),'amount-row',true,`<span class="radio ${i===0?'selected':''}" aria-hidden="true"></span><strong>포인트 ${n.toLocaleString('ko-KR')}</strong><small>${n.toLocaleString('ko-KR')}원</small>`)).join('')}</div><h2>결제방법 선택</h2><div class="methods">${btn('method-card','신용카드','method selected',true,icon('card')+'신용카드')}${btn('method-naver','네이버 페이','method',true,'<span class="naver" aria-hidden="true">N</span>네이버 페이')}${btn('method-kakao','카카오 페이','method',true,'<span class="kakao" aria-hidden="true">pay</span>카카오 페이')}${btn('method-account','가상계좌','method',true,icon('card')+'가상계좌')}</div><h2>결제금액</h2><div class="totals"><div><span>결제금액 (VAT별도)</span><strong>30,000 원</strong></div><div><span>총 결제금액</span><strong>33,000 원</strong></div></div></div><section class="purchase-guide"><h2>포인트 구매 안내</h2><p>· 포인트 구매/이용 내역은 마이메뉴 &gt; 상담내역, 결제내역에서 확인하실 수 있습니다.</p><p>· 정당한 이유 없이 결제/환불을 반복하시는 경우 이용이 제한될 수 있습니다.</p><p>· 이용하지 않은 포인트에 한 하여 결제일로부터 7일 이내에 청약철회 등 환불을 하실 수 있습니다.</p><p class="red">* 미성년자는 사주모아 운세상담을 이용하실 수 없습니다.</p></section><footer class="app-footer"><strong>Sajumoa</strong><p>넥스트벤처스 사업자정보</p><p>이용약관 &nbsp; 개인정보취급방침</p></footer><div class="payment-action">${btn('pay','결제','',true)}</div><aside class="arrival-guide"><span class="arrival-label">사용자 테스트 안내</span><p>여기까지가 과업입니다.<br>다음 질문으로 넘어갑니다.</p>${btn('to-questions','질문으로 가기','primary')}</aside>${nav('coins')}</div>`;}
function isDetour(){return store.session.measurement.firstButton && store.session.measurement.firstButton!=='이용료 결제';}
function questions() {
 const a=store.session.answers||{};
 const list=[['q1','1. 돌아온 화면에서 처음에 무엇을 누르셨어요? 무엇을 보고 누르셨어요?'],...(isDetour()?[['q2','2. 돌아가신 화면에서 무엇을 찾고 계셨어요?']]:[]),['q3','3. 돌아온 화면에서 확인하고 싶었던 게 있었어요?']];
 return study(`<p class="step">마지막 단계</p><h1>질문 (사실 회상부터)</h1><p class="muted">방금 경험을 떠올리며 편하게 적어 주세요.</p><form id="answers-form">${list.map(([id,q])=>`<div class="answer-block"><label for="${id}">${q}</label><textarea id="${id}" name="${id}" placeholder="답변을 적어 주세요">${esc(a[id])}</textarea></div>`).join('')}<p class="muted">버튼 선택과 작성한 답변은 테스트 결과로 자동 저장됩니다.</p><button class="primary" type="submit" data-action="submit" data-label="제출">제출</button></form>`,'questions');
}
function render(){
 clearInterval(interval); clearTimeout(transitionTimer); transitionTimer=null;
 switch(screen){
 case 'screening':app.innerHTML=study(`<p class="step">참여 전 확인</p><h1>반갑습니다.</h1><p class="muted" style="margin-bottom:32px">시작하기 전에 두 가지를 확인할게요.</p><fieldset class="question"><legend><span class="q-number">Q1</span>운세 상담(사주, 타로 등)에<br>관심이 있나요?</legend>${['관심 있어요','별로 관심 없어요'].map((l,i)=>btn('interest-'+i,l,'choice',false,`<span class="dot" aria-hidden="true"></span>${l}`)).join('')}</fieldset><fieldset class="question"><legend><span class="q-number">Q2</span>사주모아를 써본 적 있나요?</legend>${['써본 적 있어요','써본 적 없어요'].map((l,i)=>btn('used-'+i,l,'choice',false,`<span class="dot" aria-hidden="true"></span>${l}`)).join('')}</fieldset><p id="screening-error" class="form-error" role="status"></p>`); updateChoices();break;
 case 'ineligible':app.innerHTML=study('<div class="complete-icon">✓</div><h1>참여 조건을 확인했어요.</h1><p class="lead">이 테스트는 사주모아를 써본 적이 없는 분을 대상으로 합니다.</p><p class="muted" style="margin-top:24px">관심을 가져 주셔서 감사합니다.</p>');break;
 case 'start':app.innerHTML=study(`<p class="step">0. 시작</p><h1>상담을 시작해 볼게요.</h1><p class="lead">사주모아 상담을 직접 해볼 거예요.</p><p class="task">오늘 고민되는 내용을<br>서가비 선생님과 상담해보세요.</p><p class="muted">버튼 선택과 작성한 답변은 테스트 결과로 자동 저장됩니다. 이름이나 연락처는 적지 않아도 돼요.</p>${btn('start','시작하기','primary')}`);break;
 case 'consult':app.innerHTML=modal(false);break;
 case 'phone':app.innerHTML=phone();startTimer();break;
 case 'goal':app.innerHTML=study(`<p class="step">다음 과업</p><h1>상담이 중간에 끊겼어요.</h1><p class="task">서가비 선생님과<br>이어서 상담해 보세요.</p>${btn('continue','계속하기','primary')}`);break;
 case 'return':app.innerHTML=modal(true);break;
 case 'home':app.innerHTML=home();break;
 case 'payment':app.innerHTML=payment();break;
 case 'extra-task':app.innerHTML=study(`<p class="step">추가 과업</p><h1>이용료를 채워서<br>상담해 보세요.</h1><p class="lead">다음 화면에서 이어서 진행해 주세요.</p>${btn('extra-continue','계속하기','primary')}${btn('extra-skip','질문으로 넘어가기','secondary extra-skip')}`);break;
 case 'questions':app.innerHTML=questions();break;
 case 'thanks':app.innerHTML=study(`<div class="complete-icon">✓</div><p class="step">테스트 완료</p><h1>참여해 주셔서<br>감사합니다.</h1><p class="lead" id="save-status" role="status" aria-live="polite"></p><p class="muted" id="save-detail" style="margin-top:16px"></p>${btn('remote-retry','저장 다시 시도','secondary download-button')}<p class="session-code">참여 번호 ${esc(store.session.id)}</p>`);break;
 }
 if(screen==='consult'||screen==='return') {document.querySelector('.app-shell').inert=true;document.querySelector('.app-shell').setAttribute('aria-hidden','true');}
 if(['return','home'].includes(screen)) app.insertAdjacentHTML('beforeend',btn('need-help',store.session.measurement.phase==='B'?'질문으로 넘어가기':'진행이 어려워요','study-help',false,`<small>테스트 안내</small>${store.session.measurement.phase==='B'?'질문으로 넘어가기':'진행이 어려워요'}`));
 if(screen!=='phone') app.focus({preventScroll:true});
 showStorageError();
 updateRemoteStatus();
}
function updateChoices(){const selected=store.session.screening.interest;document.querySelectorAll('[data-action^="interest-"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.label===selected)));document.querySelectorAll('[data-action^="used-"]').forEach(b=>b.setAttribute('aria-pressed','false'));}
function showStorageError(){const unavailable=!!store.error||!remote.status.localBackup;warning.hidden=!unavailable;warning.textContent=unavailable?'이 브라우저에서는 임시 저장을 사용할 수 없습니다. 제출 완료 안내가 나올 때까지 이 창을 유지해 주세요.':'';}
function updateRemoteStatus(){
 showStorageError();
 const status=document.querySelector('#save-status'),detail=document.querySelector('#save-detail'),retry=document.querySelector('[data-action="remote-retry"]');
 if(!status)return;
 const state=remote.status.state;
 status.textContent=state==='saved'?'결과가 제출되었습니다.':state==='error'?'결과를 아직 전송하지 못했어요.':'결과를 저장하고 있어요.';
 detail.textContent=state==='saved'?'이 창을 닫으셔도 됩니다.':state==='error'?'인터넷 연결을 확인한 뒤 저장을 다시 시도해 주세요.':'제출 완료 안내가 나올 때까지 잠시 기다려 주세요.';
 retry.hidden=state!=='error';
}
function navigate(next,{replace=false}={}){
 if(next==='return'&&!store.session.measurement.started){store.session.measurement.started=true;store.save();}
 screen=next;store.setScreen(next);history[replace?'replaceState':'pushState']({screen:next},'',location.pathname+location.search);render();window.scrollTo(0,0);
}
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1600);}
function startTimer(){
 let remaining=Number.isInteger(store.session.callRemaining)?store.session.callRemaining:248;
 const draw=()=>{document.querySelector('#call-timer').textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');};draw();
 interval=setInterval(()=>{remaining=Math.max(0,remaining-1);store.session.callRemaining=remaining;store.save();draw();if(remaining===0){clearInterval(interval);navigate('goal');}},1000);
}
app.addEventListener('click',event=>{
 const b=event.target.closest('button[data-action]');if(!b)return;
 const action=b.dataset.action,label=b.dataset.label;
 if(action==='submit')return; // The form submit handler logs mouse and keyboard submissions once.
 store.log(screen,label,{action,inert:b.getAttribute('aria-disabled')==='true'});
 if(['return','home'].includes(screen)&&!store.session.measurement.arrived)store.firstAction(label);
 showStorageError();
 if(b.getAttribute('aria-disabled')==='true')return;
 if(action.startsWith('interest-')){store.session.screening.interest=label;store.save();updateChoices();return;}
 if(action.startsWith('used-')){
  if(!store.session.screening.interest){document.querySelector('#screening-error').textContent='Q1에서 관심 여부를 먼저 선택해 주세요.';return;}
  store.session.screening.used=label;store.save();
  if(action==='used-0'){store.exclude('기존 사주모아 이용자');store.session.status='screened_out';navigate('ineligible');}else navigate('start');return;
 }
 if(action==='start'){navigate('consult');return;}
 if(action==='consult-now'&&screen==='consult'){store.session.callRemaining=248;store.save();navigate('phone');return;}
 if(action==='postpaid'&&screen==='consult'){
  if(transitionTimer)return; toast('선불 종료 상황으로 진행합니다');
  transitionTimer=setTimeout(()=>{transitionTimer=null;store.session.callRemaining=248;store.save();navigate('phone');},1300);return;
 }
 if(action==='end-call'){navigate('goal');return;}
 if(action==='continue'){navigate('return');return;}
 if(action==='close'&&screen==='return'){navigate('home');return;}
 if(action==='reopen'){if(!store.session.measurement.arrived)store.returnToModal();navigate('return');return;}
 if(action==='modal-payment'){store.arrive('modal_payment');navigate('payment');return;}
 if(action==='tab-coins'){
  if(screen==='home'){store.arrive('bottom_tab');navigate('payment');}return;
 }
 if(action==='tab-home'){if(screen==='payment')navigate('home');return;}
 if(action==='to-questions'){navigate('questions');return;}
 if(action==='need-help'){
  if(store.session.measurement.phase==='B')navigate('questions');
  else beginExtraTask();
  return;
 }
 if(action==='extra-continue'){navigate('return');return;}
 if(action==='extra-skip'){navigate('questions');return;}
 if(action==='remote-retry'){void remote.flush();return;}
});
app.addEventListener('input',event=>{if(event.target.matches('textarea')){store.session.answers[event.target.name]=event.target.value;store.save();showStorageError();}});
app.addEventListener('submit',event=>{if(event.target.id!=='answers-form')return;event.preventDefault();const answers=Object.fromEntries(new FormData(event.target));store.log(screen,'제출',{action:'submit'});store.submit(answers);navigate('thanks');void remote.flush();});
document.addEventListener('keydown',event=>{
 if(event.key==='Tab'&&['consult','return'].includes(screen)){
  const items=[...document.querySelectorAll('.consult-modal button,.study-help')];const first=items[0],last=items.at(-1);
  if(event.shiftKey&&(document.activeElement===first||!items.includes(document.activeElement))){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&(document.activeElement===last||!items.includes(document.activeElement))){event.preventDefault();first.focus();}
 }
});
window.addEventListener('popstate',event=>{
 const next=event.state?.screen;if(!screens.has(next)||store.session.status==='submitted'||store.session.status==='screened_out'){history.replaceState({screen},'',location.pathname+location.search);return;}
 store.log(screen,'브라우저 뒤로/앞으로',{to:next,action:'browser_navigation'});
 if(['return','home'].includes(screen)&&!store.session.measurement.arrived)store.firstAction('브라우저 뒤로/앞으로');
 if(next==='return'&&screen!=='return'&&!store.session.measurement.arrived)store.returnToModal();
 screen=next;store.setScreen(next);render();window.scrollTo(0,0);
});
function beginExtraTask(){
 store.exclude('조건부 B: 첫 과업에서 충전 미경유, 참가자가 진행 어려움을 선택');
 store.session.measurement.phase='B';store.save();navigate('extra-task');
}
remote.subscribe(updateRemoteStatus);
history.replaceState({screen},'',location.pathname+location.search);
render();
