import { createStore } from './store.js';
import { initRemoteSync } from './sync.js';
import { createTabGuard } from './tab-guard.js';
import { isPreviewMode, createPreviewRuntime } from './preview-mode.js';

let store, remote, remoteUnsubscribe;
const app = document.querySelector('#app');
const warning = document.querySelector('#storage-warning');
const params = new URLSearchParams(location.search);
const previewMode=isPreviewMode(location.search);
const preview=previewMode?createPreviewRuntime():null;
const newRequested=params.get('new')==='1';
params.delete('new');params.delete('moderator');
history.replaceState(null, '', location.pathname + (params.size ? '?' + params : ''));
const guard=preview?preview.guard:createTabGuard();
const screens = new Set(['screening','ineligible','start','consult','phone','goal','return','home','payment','extra-task','questions','thanks','paused','withdrawn']);
const terminal=()=>['submitted','screened_out','withdrawn'].includes(store?.session.status);
let screen='screening', optionsReturn='start', initializing=false, ownerReady=false;
let interval, toastTimer, transitionTimer, renderGeneration=0;
const SCREEN_CONTEXT_DELAY_MS=2000;
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
 return `<section class="study ${cls}"><header class="study-head"><span class="study-brand">사주모아</span><span class="study-badge">${previewMode?'PREVIEW':'USER TEST'}</span></header><div class="study-body">${body}</div>${foot?'<footer class="study-foot"><span>사주모아 · 사용자 테스트</span></footer>':''}</section>`;
}
function nav(active='home',readOnly=false) { return `<nav class="bottom-nav" aria-label="앱 하단 메뉴">${[['home','홈'],['heart','찜'],['user','마이페이지'],['coins','이용료 결제']].map(([i,l])=>btn('tab-'+i,l,(active===i?'active':''),readOnly||(i!=='home'&&i!=='coins'),icon(i)+l)).join('')}</nav>`; }
function home() { return `<div class="app-shell"><header class="app-header"><span class="app-logo">Sajumoa</span><div class="header-actions">${btn('search','검색','icon-button',true,icon('search'))}${btn('profile','마이페이지','icon-button',true,icon('user'))}</div></header><section class="hero"><small>당신의 이야기를 듣는 곳</small><h2>마음속 고민,<br>함께 이야기해 보세요</h2><p>사주 · 타로 · 신점 전문 상담</p></section><div class="categories">${[['card','타로'],['coins','사주'],['star','신점'],['heart','후기']].map(([i,l])=>btn('category-'+i,l,'category',true,icon(i)+l)).join('')}</div><div class="filter-bar">${['추천','신규','급상승','상담중'].map(l=>btn('filter-'+l,l,'',true)).join('')}</div><article class="advisor-card"><div class="advisor-photo" role="img" aria-label="서가비 상담사"></div><div class="advisor-info"><h3>서가비 <span>223번</span></h3><p>내담자의 마음에 귀 기울이는 상담</p><p>후기 (21)</p><div class="rate">1,200 이용료 / 30초</div></div>${btn('reopen','상담하기','consult-side',false,icon('phone')+'상담<br>하기')}</article>${nav()}</div>`; }
function detail() {return `<div class="app-shell"><div class="app-detail"><span>${icon('arrow')}</span><div class="detail-portrait" role="img" aria-label="서가비 상담사"></div><div class="detail-info"><p>신점</p><h2>서가비 <span>223번</span></h2><p>1,200 이용료 / 30초</p><p class="detail-tags">#용한점집 #현실적인조언<br>#속마음을이해하는</p></div></div></div>`;}
function modal(zero=false) {return `${zero?home():detail()}<div class="modal-backdrop"><section class="consult-modal" role="dialog" aria-modal="true" aria-labelledby="consult-title"><h1 class="modal-title" id="consult-title">상담하기</h1>${btn('close','닫기','modal-close',!zero,icon('close'))}<div class="consult-profile"><div class="portrait" role="img" aria-label="서가비 상담사"></div><div><span>[신점]</span> &nbsp;서가비 <span>223번</span></div></div><div class="balance-row">${coin}<div class="balance-copy">보유 이용료<strong>${zero?'0':'10,000'}</strong></div>${btn('modal-payment','이용료 결제','pay-entry',!zero)}</div><div class="modal-divider"></div><div class="consult-body"><p class="consult-note">아래 버튼 클릭시, 서가비 선생님과 자동으로 연결됩니다.</p>${btn('consult-now','지금 상담하기','consult-now',zero,'지금 상담하기 &gt;')}<div class="rate-box">${coin}<span><strong>1,200</strong>이용료 / 30초</span><small>약 <strong>${zero?'0':'4'}분</strong> 상담 가능</small></div><p class="consult-note">아래 버튼 클릭 후, 안내멘트에 따라 상담사 고유번호 223번<br>입력하시면 서가비 선생님과 연결됩니다.</p>${btn('postpaid','후불로 상담하기','consult-postpaid',true,'후불로 상담하기 &gt;')}<div class="rate-box postpaid-rate"><span class="coin" aria-hidden="true">₩</span><span><strong>1,600</strong>원 / 30초</span></div></div></section></div>`;}
function phone() {return `<section class="phone"><div class="phone-top"><span>8:08</span><span>LTE &nbsp;51 ▰</span></div><p class="phone-timer" id="call-timer">04:08</p><h1>070-8016-9100</h1><div class="shield">${icon('shield')}</div><div class="phone-space"></div>${btn('assist','통화 어시스트','assist',true)}<div class="call-panel"><div class="call-controls">${[['record','녹음',''],['video','영상통화','dim'],['bluetooth','블루투스',''],['speaker','스피커','speaker'],['mic','내 소리 차단',''],['keypad','키패드','']].map(([i,l,c])=>btn('call-'+i,l,'call-control '+c,true,icon(i)+l)).join('')}</div>${btn('end-call','통화 종료','hangup',false,icon('phone'))}</div></section>`;}
function payment() {return `<div class="app-shell payment"><h1>이용료 결제</h1><section class="points"><p>보유포인트</p>${coin}<strong>0</strong></section><div class="payment-body"><h2>결제금액 선택 <small>(VAT별도)</small></h2><div class="amounts">${[30000,50000,100000,200000,300000,500000].map((n,i)=>btn('amount-'+n,'포인트 '+n.toLocaleString('ko-KR'),'amount-row',true,`<span class="radio ${i===0?'selected':''}" aria-hidden="true"></span><strong>포인트 ${n.toLocaleString('ko-KR')}</strong><small>${n.toLocaleString('ko-KR')}원</small>`)).join('')}</div><h2>결제방법 선택</h2><div class="methods">${btn('method-card','신용카드','method selected',true,icon('card')+'신용카드')}${btn('method-naver','네이버 페이','method',true,'<span class="naver" aria-hidden="true">N</span>네이버 페이')}${btn('method-kakao','카카오 페이','method',true,'<span class="kakao" aria-hidden="true">pay</span>카카오 페이')}${btn('method-account','가상계좌','method',true,icon('card')+'가상계좌')}</div><h2>결제금액</h2><div class="totals"><div><span>결제금액 (VAT별도)</span><strong>30,000 원</strong></div><div><span>총 결제금액</span><strong>33,000 원</strong></div></div></div><section class="purchase-guide"><h2>포인트 구매 안내</h2><p>· 포인트 구매/이용 내역은 마이메뉴 &gt; 상담내역, 결제내역에서 확인하실 수 있습니다.</p><p>· 정당한 이유 없이 결제/환불을 반복하시는 경우 이용이 제한될 수 있습니다.</p><p>· 이용하지 않은 포인트에 한 하여 결제일로부터 7일 이내에 청약철회 등 환불을 하실 수 있습니다.</p><p class="red">* 미성년자는 사주모아 운세상담을 이용하실 수 없습니다.</p></section><footer class="app-footer"><strong>Sajumoa</strong><p>넥스트벤처스 사업자정보</p><p>이용약관 &nbsp; 개인정보취급방침</p></footer><div class="payment-action">${btn('pay','결제','',true)}</div>${nav('coins',true)}</div>`;}
function arrivalDialog(){return `<div class="arrival-backdrop"><section class="arrival-dialog" role="dialog" aria-modal="true" aria-labelledby="arrival-title" aria-describedby="arrival-description"><span class="arrival-label">사용자 테스트 안내</span><h2 id="arrival-title">여기까지가 과업입니다.</h2><p id="arrival-description">다음 질문으로 넘어갑니다.</p>${btn('to-questions','질문으로 가기','primary')}</section></div>`;}
function isDetour(){return store.session.measurement.firstButton && store.session.measurement.firstButton!=='이용료 결제';}
function questions() {
 const a=store.session.answers||{};
 const list=[['q1','1. 돌아온 화면에서 처음에 무엇을 누르셨어요? 무엇을 보고 누르셨어요?'],...(isDetour()?[['q2','2. 돌아가신 화면에서 무엇을 찾고 계셨어요?']]:[]),['q3','3. 돌아온 화면에서 확인하고 싶었던 게 있었어요?']];
 return study(`<p class="step">마지막 단계</p><h1>질문 (사실 회상부터)</h1><p class="muted">모든 질문에 답해 주세요. 떠오르는 내용이 없으면 ‘없어요’라고 적어도 됩니다.</p><form id="answers-form" novalidate>${list.map(([id,q])=>`<div class="answer-block"><label for="${id}">${q} <span class="required-label">필수</span></label><textarea id="${id}" name="${id}" placeholder="답변을 적어 주세요" required maxlength="20000" aria-describedby="${id}-error">${esc(a[id])}</textarea><p class="form-error" id="${id}-error"></p></div>`).join('')}<p class="muted">${previewMode?'미리보기에서는 버튼 선택과 답변이 저장·전송되지 않습니다.':'버튼 선택과 작성한 답변은 테스트 결과로 자동 저장됩니다.'}</p><button class="primary" type="submit" data-action="submit" data-label="제출">제출</button></form>`,'questions');
}
function cancelScreenTimers(){
 clearInterval(interval);interval=null;clearTimeout(transitionTimer);transitionTimer=null;renderGeneration+=1;
}
function scheduleScreenAction(expected,action){
 const generation=renderGeneration,sessionId=store.session.id;
 transitionTimer=setTimeout(()=>{
  transitionTimer=null;
  if(generation!==renderGeneration||screen!==expected||!guard.isOwner||!ownerReady||store.session.id!==sessionId||remote?.status.state==='conflict')return;
  action();
 },SCREEN_CONTEXT_DELAY_MS);
}
function openArrivalDialog(){
 if(app.querySelector('.arrival-dialog'))return;
 app.insertAdjacentHTML('beforeend',arrivalDialog());
 document.body.classList.add('arrival-open');
 const background=app.querySelector('.app-shell.payment');background.inert=true;background.setAttribute('aria-hidden','true');
 app.querySelector('.arrival-dialog [data-action="to-questions"]').focus({preventScroll:true});
}
function render(){
 cancelScreenTimers();
 switch(screen){
 case 'resume':app.innerHTML=study(`<p class="step">${previewMode?'이 창의 미리보기':'이 기기의 참여 기록'}</p><h1>${terminal()?(previewMode?'미리보기를 마쳤어요.':'이전에 참여한 기록이 있어요.'):'이어서 진행할까요?'}</h1><p class="lead">${previewMode?'입력 내용은 이 창 안에만 있습니다. 실제 참가자 기록에는 반영되지 않습니다.':terminal()?'같은 분이라면 다시 참여하지 않아도 됩니다.':'이전에 작성한 답변과 진행 화면이 저장되어 있습니다.'}</p>${previewMode?'':`<p class="session-code">참여 번호 ${esc(store.session.id)}</p>`}${btn('resume-existing',terminal()?(previewMode?'미리보기 확인':'참여 기록 확인'):'이어서 하기','primary')}${btn('new-person',previewMode?'새 미리보기 시작':'다른 참가자로 시작','secondary spaced')}`);break;
 case 'new-person-confirm':app.innerHTML=study(`<p class="step">${previewMode?'미리보기 다시 시작':'새 참가자 확인'}</p><h1>${previewMode?'처음부터 새로 체험할까요?':'다른 분이 참여하시나요?'}</h1><p class="lead">${previewMode?'이 창 안에서 새 미리보기를 시작합니다. 실제 참가자 기록은 바뀌지 않습니다.':`새 참여 번호로 시작합니다. ${terminal()?'이전 기록은 보관됩니다.':'이전 미완료 기록은 참여 종료로 남기고, 전송하지 못한 기록도 계속 보관합니다.'}`}</p>${btn('confirm-new-person',previewMode?'새 미리보기 시작':'다른 참가자로 새로 시작','primary')}${btn('cancel-new-person',previewMode?'이전 미리보기로 돌아가기':'이전 기록으로 돌아가기','secondary spaced')}`);break;
 case 'stop-confirm':app.innerHTML=study(`<p class="step">테스트 진행 관리</p><h1>진행을 멈출까요?</h1><p class="lead">${previewMode?'미리보기는 이 창 안에서만 이어집니다. 새로고침하거나 창을 닫으면 입력 내용이 사라집니다.':'잠시 멈추면 같은 기기에서 이어서 진행할 수 있습니다. 참여를 종료하면 지금까지의 기록을 남기고 이번 참여를 마칩니다.'}</p>${btn('cancel-stop','계속 진행하기','primary')}${btn('pause-confirm',previewMode?'잠시 멈추기':'저장하고 잠시 멈추기','secondary spaced')}${btn('withdraw-confirm','참여 종료하기','secondary spaced danger')}`);break;
 case 'paused':app.innerHTML=study(`<p class="step">잠시 중단</p><h1>${previewMode?'미리보기를 잠시 멈췄어요.':'진행 내용을 보관했어요.'}</h1><p class="lead">${previewMode?'이 창에서 이어서 진행할 수 있습니다. 새로고침하거나 창을 닫으면 처음부터 시작합니다.':'이 기기에서 테스트 링크를 다시 열면 이어서 진행할 수 있습니다.'}</p><p class="muted save-state" id="save-status" role="status" aria-live="polite"></p><p class="muted" id="save-detail"></p>${btn('remote-retry','저장 다시 시도','secondary spaced')}${btn('resume-existing','이어서 하기','primary')}${btn('new-person','다른 참가자로 시작','secondary spaced')}`);break;
 case 'withdrawn':app.innerHTML=study(`<p class="step">참여 종료</p><h1>${previewMode?'미리보기를 종료했어요.':'참여를 종료했어요.'}</h1><p class="lead">${previewMode?'실제 참가자 기록에는 반영되지 않습니다.':'지금까지 남긴 기록은 보관됩니다. 참여해 주셔서 감사합니다.'}</p><p class="muted save-state" id="save-status" role="status" aria-live="polite"></p><p class="muted" id="save-detail"></p>${btn('remote-retry','저장 다시 시도','secondary spaced')}${btn('new-person','다른 참가자로 시작','secondary spaced')}`);break;
 case 'screening':app.innerHTML=study(`<p class="step">참여 전 확인</p><h1>반갑습니다.</h1><p class="muted" style="margin-bottom:32px">시작하기 전에 두 가지를 확인할게요.</p><fieldset class="question"><legend><span class="q-number">Q1</span>운세 상담(사주, 타로 등)에<br>관심이 있나요?</legend>${['관심 있어요','별로 관심 없어요'].map((l,i)=>btn('interest-'+i,l,'choice',false,`<span class="dot" aria-hidden="true"></span>${l}`)).join('')}</fieldset><fieldset class="question"><legend><span class="q-number">Q2</span>사주모아를 써본 적 있나요?</legend>${['써본 적 있어요','써본 적 없어요'].map((l,i)=>btn('used-'+i,l,'choice',false,`<span class="dot" aria-hidden="true"></span>${l}`)).join('')}</fieldset><p id="screening-error" class="form-error" role="status"></p>`); updateChoices();break;
 case 'ineligible':app.innerHTML=study('<div class="complete-icon">✓</div><h1>참여 조건을 확인했어요.</h1><p class="lead">이 테스트는 사주모아를 써본 적이 없는 분을 대상으로 합니다.</p><p class="muted" style="margin-top:24px">관심을 가져 주셔서 감사합니다.</p>');break;
 case 'start':app.innerHTML=study(`<p class="step">0. 시작</p><h1>상담을 시작해 볼게요.</h1><p class="lead">사주모아 상담을 직접 해볼 거예요.</p><p class="task">오늘 고민되는 내용을<br>서가비 선생님과 상담해보세요.</p><p class="muted">${previewMode?'미리보기에서는 버튼 선택과 답변이 저장·전송되지 않습니다.':'버튼 선택과 작성한 답변은 테스트 결과로 자동 저장됩니다. 이름이나 연락처는 적지 않아도 돼요.'}</p>${btn('start','시작하기','primary')}`);break;
 case 'consult':app.innerHTML=modal(false);break;
 case 'phone':app.innerHTML=phone();startTimer();break;
 case 'goal':app.innerHTML=study(`<p class="step">다음 과업</p><h1>이용료가 부족해<br>통화가 끊겼어요.</h1><p class="task">서가비 선생님과<br>이어서 상담해 보세요.</p>${btn('continue','계속하기','primary')}`);break;
 case 'return':app.innerHTML=modal(true);break;
 case 'home':app.innerHTML=home();break;
 case 'payment':app.innerHTML=payment();break;
 case 'extra-task':app.innerHTML=study(`<p class="step">추가 과업</p><h1>이용료를 채워서<br>상담해 보세요.</h1><p class="lead">다음 화면에서 이어서 진행해 주세요.</p>${btn('extra-continue','계속하기','primary')}${btn('extra-skip','질문으로 넘어가기','secondary extra-skip')}`);break;
 case 'questions':app.innerHTML=questions();break;
 case 'thanks':app.innerHTML=study(`<div class="complete-icon">✓</div><p class="step">${previewMode?'미리보기 완료':'테스트 완료'}</p><h1>${previewMode?'미리보기를 마쳤어요.':'참여해 주셔서<br>감사합니다.'}</h1><p class="lead" id="save-status" role="status" aria-live="polite"></p><p class="muted" id="save-detail" style="margin-top:16px"></p>${btn('remote-retry','저장 다시 시도','secondary download-button')}${previewMode?'':`<p class="session-code">참여 번호 ${esc(store.session.id)}</p>`}`);break;
 }
 if(screen==='consult'||screen==='return') {document.querySelector('.app-shell').inert=true;document.querySelector('.app-shell').setAttribute('aria-hidden','true');}
 const controls=screens.has(screen)&&!['ineligible','thanks','paused','withdrawn','payment'].includes(screen);
 document.body.classList.remove('arrival-open');
 document.body.classList.toggle('has-test-controls',controls);
 if(controls)app.insertAdjacentHTML('beforeend',`<nav class="test-controls-bar" aria-label="테스트 진행 관리"><span>사용자 테스트</span><div>${['return','home'].includes(screen)?btn('need-help',store.session.measurement.phase==='B'?'질문으로 넘어가기':'진행이 어려워요','test-help'):''}${btn('session-options','진행 관리','session-tools')}</div></nav>`);
 if(screen!=='phone') app.focus({preventScroll:true});
 showStorageError();
 updateRemoteStatus();
 if(screen==='phone')scheduleScreenAction('phone',()=>navigate('goal'));
 if(screen==='payment')scheduleScreenAction('payment',openArrivalDialog);
}
function updateChoices(){const selected=store.session.screening.interest;document.querySelectorAll('[data-action^="interest-"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.label===selected)));document.querySelectorAll('[data-action^="used-"]').forEach(b=>b.setAttribute('aria-pressed','false'));}
function showStorageError(){if(previewMode){warning.hidden=true;return;}if(!store||!remote)return;const unavailable=!!store.error||!remote.status.localBackup;const queued=remote.status.queueError;warning.hidden=!unavailable&&!queued;warning.textContent=unavailable?'이 브라우저에서는 임시 저장을 사용할 수 없습니다. 저장 완료 안내가 나올 때까지 이 창을 유지해 주세요.':queued?'이 기기에 이전 미전송 기록이 남아 있습니다. 연결이 복구되면 다시 전송합니다.':'';}
function updateRemoteStatus(){
 showStorageError();
 if(!remote||!ownerReady)return;
 if(remote.status.state==='conflict'){
  cancelScreenTimers();screen='conflict';document.body.classList.remove('has-test-controls','arrival-open');
  app.innerHTML=study('<p class="step">기록 보호</p><h1>다른 창의 기록을 확인해 주세요.</h1><p class="lead">다른 곳에서 이 참여 기록이 갱신되어, 오래된 내용으로 덮어쓰지 않도록 이 창의 작성을 멈췄습니다.</p><p class="muted spaced">다른 테스트 창에서 최근 진행 내용을 확인해 주세요. 중복 제출하지 않아도 됩니다.</p>');return;
 }
 const status=document.querySelector('#save-status'),detail=document.querySelector('#save-detail'),retry=document.querySelector('[data-action="remote-retry"]');
 if(!status)return;
 const state=remote.status.state;
 if(state==='preview'){
  status.textContent='미리보기 · 기록 저장 안 함';
  detail.textContent='버튼 선택과 답변은 저장·전송되지 않습니다. 새로고침하거나 창을 닫으면 사라집니다.';
  retry.hidden=true;return;
 }
 status.textContent=state==='saved'?(screen==='thanks'?'결과가 제출되었습니다.':'현재 상태가 저장되었습니다.'):state==='conflict'?'다른 창에서 기록이 갱신되어 이 창에서는 변경할 수 없습니다.':state==='error'?'결과를 아직 전송하지 못했어요.':'결과를 저장하고 있어요.';
 detail.textContent=state==='saved'?'이 창을 닫으셔도 됩니다.':state==='conflict'?'다른 테스트 창을 확인해 주세요. 이 창의 오래된 기록으로 덮어쓰지 않았습니다.':state==='error'?'이 기기에 미전송 기록을 보관했습니다. 인터넷 연결을 확인한 뒤 다시 시도하거나 나중에 같은 기기에서 링크를 열어 주세요.':'저장 완료 안내가 나올 때까지 잠시 기다려 주세요.';
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
 interval=setInterval(()=>{if(!guard.isOwner||!ownerReady||remote?.status.state==='conflict'){clearInterval(interval);return;}remaining=Math.max(0,remaining-1);store.session.callRemaining=remaining;store.save();draw();},1000);
}
app.addEventListener('click',event=>{
 const b=event.target.closest('button[data-action]');if(!b)return;
 const action=b.dataset.action,label=b.dataset.label;
 if(action==='tab-retry'){void acquireOwner();return;}
 if(!guard.isOwner||!ownerReady||!store||!remote)return;
 if(remote.status.state==='conflict'&&action!=='remote-retry')return;
 if(action==='submit')return; // The form submit handler logs mouse and keyboard submissions once.
 store.log(['resume','new-person-confirm'].includes(screen)?'resume':screen,label,{action,inert:b.getAttribute('aria-disabled')==='true'});
 if(['return','home'].includes(screen)&&!store.session.measurement.arrived&&action!=='session-options')store.firstAction(label);
 showStorageError();
 if(b.getAttribute('aria-disabled')==='true')return;
 if(action==='resume-existing'){
  if(store.session.status==='paused')store.resume();
  navigate(screens.has(store.session.screen)?store.session.screen:'start',{replace:true});return;
 }
 if(action==='new-person'){screen='new-person-confirm';render();return;}
 if(action==='cancel-new-person'){screen='resume';render();return;}
 if(action==='confirm-new-person'){
  if(!terminal()){const last=store.session.status==='paused'?store.session.lifecycle?.lastActiveScreen:store.session.screen;store.withdraw(last||'start','다른 참가자로 새 참여 시작');}
  remoteUnsubscribe?.();remote.dispose();store.newSession();connectRemote();navigate('screening',{replace:true});return;
 }
 if(action==='session-options'){optionsReturn=store.session.screen;screen='stop-confirm';render();return;}
 if(action==='cancel-stop'){screen=optionsReturn;render();return;}
 if(action==='pause-confirm'){store.pause(optionsReturn);screen='paused';history.replaceState({screen},'',location.pathname+location.search);render();void remote.flush();return;}
 if(action==='withdraw-confirm'){store.withdraw(optionsReturn);screen='withdrawn';history.replaceState({screen},'',location.pathname+location.search);render();void remote.flush();return;}
 if(action.startsWith('interest-')){store.session.screening.interest=label;store.save();updateChoices();return;}
 if(action.startsWith('used-')){
  if(!store.session.screening.interest){document.querySelector('#screening-error').textContent='Q1에서 관심 여부를 먼저 선택해 주세요.';return;}
  store.session.screening.used=label;store.save();
  if(action==='used-0'){store.exclude('기존 사주모아 이용자');store.session.status='screened_out';navigate('ineligible');}else navigate('start');return;
 }
 if(action==='start'){navigate('consult');return;}
 if(action==='consult-now'&&screen==='consult'){store.session.callRemaining=248;store.save();navigate('phone');return;}
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
app.addEventListener('input',event=>{if(guard.isOwner&&ownerReady&&event.target.matches('textarea')&&remote.status.state!=='conflict'){store.session.answers[event.target.name]=event.target.value;store.save();if(event.target.value.trim()){event.target.removeAttribute('aria-invalid');const hint=document.querySelector('#'+event.target.id+'-error');if(hint)hint.textContent='';}showStorageError();}});
app.addEventListener('submit',event=>{
 if(event.target.id!=='answers-form')return;event.preventDefault();
 if(!guard.isOwner||!ownerReady||remote.status.state==='conflict')return;
 const answers=Object.fromEntries(new FormData(event.target));let first;
 for(const textarea of event.target.querySelectorAll('textarea')){const empty=!textarea.value.trim();textarea.setAttribute('aria-invalid',String(empty));document.querySelector('#'+textarea.id+'-error').textContent=empty?'답변을 입력해 주세요. 떠오르는 내용이 없으면 ‘없어요’라고 적어 주세요.':'';if(empty&&!first)first=textarea;}
 if(first){store.log(screen,'제출 시도: 필수 답변 누락',{action:'submit_invalid'});first.focus();return;}
 store.log(screen,'제출',{action:'submit'});store.submit(answers);navigate('thanks');void remote.flush();
});
document.addEventListener('keydown',event=>{
 if(!guard.isOwner||!ownerReady)return;
 if(event.key==='Tab'&&screen==='payment'&&document.querySelector('.arrival-dialog')){event.preventDefault();document.querySelector('.arrival-dialog [data-action="to-questions"]')?.focus();return;}
 if(event.key==='Tab'&&['consult','return'].includes(screen)){
  const items=[...document.querySelectorAll('.consult-modal button,.test-controls-bar button,.preview-banner button')];const first=items[0],last=items.at(-1);
  if(event.shiftKey&&(document.activeElement===first||!items.includes(document.activeElement))){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&(document.activeElement===last||!items.includes(document.activeElement))){event.preventDefault();first.focus();}
 }
});
window.addEventListener('popstate',event=>{
 if(!guard.isOwner||!ownerReady||!store||remote?.status.state==='conflict'||['resume','new-person-confirm','stop-confirm'].includes(screen)){history.replaceState({screen},'',location.pathname+location.search);return;}
 const next=event.state?.screen;if(!screens.has(next)||terminal()||store.session.status==='paused'){history.replaceState({screen},'',location.pathname+location.search);return;}
 store.log(screen,'브라우저 뒤로/앞으로',{to:next,action:'browser_navigation'});
 if(['return','home'].includes(screen)&&!store.session.measurement.arrived)store.firstAction('브라우저 뒤로/앞으로');
 if(next==='return'&&screen!=='return'&&!store.session.measurement.arrived)store.returnToModal();
 screen=next;store.setScreen(next);render();window.scrollTo(0,0);
});
function beginExtraTask(){
 store.exclude('조건부 B: 첫 과업에서 충전 미경유, 참가자가 진행 어려움을 선택');
 store.session.measurement.phase='B';store.save();navigate('extra-task');
}
function renderBlocked(message){cancelScreenTimers();document.body.classList.remove('has-test-controls','arrival-open');ownerReady=false;screen='blocked';warning.hidden=true;app.innerHTML=study(`<p class="step">여러 창 동시 진행 방지</p><h1>한 창에서만 진행해 주세요.</h1><p class="lead">${esc(message||'다른 창에서 테스트가 진행 중입니다.')}</p><p class="muted spaced">다른 테스트 창을 닫은 뒤 아래 버튼을 누르면 저장된 기록을 이어서 불러옵니다.</p>${btn('tab-retry','다른 창을 닫았어요. 이어서 하기','primary')}`);}
function connectRemote(){remote=preview?preview.createRemote():initRemoteSync(store,{canCapture:()=>guard.isOwner&&ownerReady});remoteUnsubscribe=remote.subscribe(updateRemoteStatus);}
async function initializeOwner(){
 if(initializing)return;initializing=true;
 try{
  let tabActive=previewMode;if(!previewMode)try{tabActive=!!sessionStorage.getItem('sajumoaut.active.v1');}catch{}
  remoteUnsubscribe?.();remote?.dispose();store=preview?preview.createStore():createStore();
  if(store.session.protocolVersion!==2)store.newSession();
  ownerReady=true;
  screen=store.restored&&(newRequested||!tabActive)?'resume':(screens.has(store.session.screen)?store.session.screen:'screening');
  connectRemote();history.replaceState({screen},'',location.pathname+location.search);render();
 }finally{initializing=false;}
}
async function acquireOwner(){if(await guard.acquire()){if(!ownerReady)await initializeOwner();}else renderBlocked(guard.reason);}
if(previewMode){
 document.body.classList.add('preview-mode');
 const banner=document.createElement('aside');banner.className='preview-banner';banner.setAttribute('aria-label','미리보기 안내');
 banner.innerHTML='<div><strong>미리보기 · 기록 저장 안 함</strong><small>실제 참가자 기록에 반영되지 않아요.</small></div><button type="button" data-action="preview-restart">처음부터 다시</button>';
 banner.querySelector('button').addEventListener('click',()=>{
  cancelScreenTimers();clearTimeout(toastTimer);
  document.querySelector('#toast').classList.remove('show');
  remoteUnsubscribe?.();remote?.dispose();preview.reset();store=preview.createStore();
  optionsReturn='start';connectRemote();navigate('screening',{replace:true});
 });
 document.body.prepend(banner);
}

guard.subscribe(state=>{if(!state.isOwner&&ownerReady)renderBlocked(state.reason);else if(state.isOwner&&!ownerReady&&!initializing)void initializeOwner();});
await acquireOwner();
