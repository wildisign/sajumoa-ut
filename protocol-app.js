import {createStore} from './store.js';
import {initRemoteSync} from './sync.js';
import {createTabGuard} from './tab-guard.js';
import {isPreviewMode,createPreviewRuntime} from './preview-mode.js';
import {esc,btn,icon,home,modal,phone,payment} from './views.js';
import {VERSION,questions,factors,validateAnswer} from './protocol.js';
const app=document.querySelector('#app'),warning=document.querySelector('#storage-warning');
const previewMode=isPreviewMode(location.search),preview=previewMode?createPreviewRuntime():null,guard=preview?.guard||createTabGuard();
const query=new URLSearchParams(location.search),newRequested=query.has('new');
query.delete('new');
history.replaceState(null,'',location.pathname+(query.size?'?'+query:''));
let store,remote,unsubscribe,screen='welcome',timer,dialog,returnFocus,ready=false,initializing=false;
const taskScreens=['consult','phone','return','home','payment','reentry-home','reentry-modal'];
const validScreens=new Set(['welcome','screening','start','consult','phone','goal','return','home','payment','reentry','reentry-home','reentry-modal','review','thanks','withdrawn',...questions.map(q=>'q-'+q.id)]);
const terminal=()=>['submitted','withdrawn'].includes(store.session.status);
const active=()=>ready&&guard.isOwner&&remote?.status.state!=='conflict';
const question=()=>questions.find(q=>'q-'+q.id===screen);
function study(body,cls=''){return `<section class="study v5 ${cls}"><header class="study-head"><span class="study-brand">사주모아</span><div class="study-head-actions"><span class="study-badge">사용자 테스트</span></div></header><div class="study-body">${body}</div></section>`;}
function action(label='다음',id='next'){return `<div class="page-action">${btn(id,label,'primary')}</div>`;}
function title(num,text){return `<p class="step">${num}</p><h1>${text}</h1>`;}
function scenario(num,heading,situation,task,label){return study(`${title(num,heading)}<section class="scenario"><h2>현재 상황</h2><p>${situation}</p></section><section class="task-instruction"><h2>해 볼 일</h2><p>${task}</p></section><p class="safety">실제 전화 연결이나 결제는 진행되지 않습니다.</p>${screen==='goal'?'<p class="safety">진행을 마치거나 도움이 필요하면 오른쪽 위 테스트 진행 메뉴(⋮)를 이용해 주세요.</p>':''}${action(label)}`);}
function readOnly(html,summaryOnly=false){
 const template=document.createElement('template');
 template.innerHTML=html;
 for(const node of template.content.querySelectorAll('[id],[aria-labelledby],[aria-modal]')){
  node.removeAttribute('id');node.removeAttribute('aria-labelledby');node.removeAttribute('aria-modal');
  if(node.getAttribute('role')==='dialog')node.removeAttribute('role');
 }
 for(const button of template.content.querySelectorAll('button')){
  button.removeAttribute('data-action');button.removeAttribute('data-label');button.disabled=true;button.tabIndex=-1;
 }
 return summaryOnly?'<section class="payment">'+template.content.querySelector('.payment-body').outerHTML+'</section>':template.innerHTML;
}
function reference(key){
 if(key==='compare')return `<div class="compare-reference"><h2>화면 A</h2><div class="compare-panel">${readOnly(payment(),true)}</div><h2>화면 B</h2><div class="compare-panel">${readOnly(payment(true),true)}</div></div>`;
 return `<figure class="reference-box ${key}" aria-label="${key==='modal'?'상담하기 참고 화면':'포인트 충전 참고 화면'}"><div class="reference-window"><div class="reference-content">${readOnly(key==='modal'?modal(true):payment())}</div></div>${key==='payment'?btn('expand','펼쳐보기','expand-button'):''}</figure>`;
}
const referenceSizer=new ResizeObserver(entries=>{
 for(const {target,contentRect} of entries)target.style.setProperty('--reference-scale',String(contentRect.width/390));
});
function options(q){const a=store.session.answers;
 if(q.type==='text')return `<label class="screenreader-only" for="answer">${esc(q.prompt)}</label><textarea id="answer" data-answer="${q.id}" maxlength="20000" placeholder="${q.placeholder||'자유롭게 적어 주세요.'}" ${a[q.id]===q.unknown?'disabled':''}>${a[q.id]===q.unknown?'':esc(a[q.id]||'')}</textarea><label class="ut-option"><input type="checkbox" data-unknown="${q.id}" ${a[q.id]===q.unknown?'checked':''}>${q.unknown}</label>`;
 if(q.type==='factors')return `<p class="answer-help">최대 2개까지 선택해 주세요. ‘아직 판단하기 어려워요’는 단독으로 선택해 주세요.</p>${factors.map(([id,l])=>`<label class="ut-option"><input type="checkbox" data-factor="${id}" ${a.F1?.includes(id)?'checked':''}>${l}</label>`).join('')}<div ${a.F1?.includes('other')?'':'hidden'} id="other-field"><label for="other">기타 내용을 적어 주세요.</label><textarea id="other" maxlength="20000" data-answer="F1Other">${esc(a.F1Other||'')}</textarea></div>`;
 return `<fieldset class="ut-options"><legend class="screenreader-only">${esc(q.prompt)}</legend>${q.options.map(l=>`<label class="ut-option"><input type="radio" name="${q.id}" data-answer="${q.id}" value="${esc(l)}" ${a[q.id]===l?'checked':''}>${esc(l)}</label>`).join('')}</fieldset>`;
}
function questionnaire(q){return study(`${q.reference?reference(q.reference):''}<section class="question-content">${title(q.number+' · 질문',esc(q.title))}<p class="question-prompt">${esc(q.prompt)}</p>${options(q)}${q.reason?`<label class="reason-label" for="reason">${esc(q.reason)} <span>선택</span></label><textarea id="reason" maxlength="20000" data-answer="${q.id}Reason">${esc(store.session.answers[q.id+'Reason']||'')}</textarea>`:''}<p class="form-error" id="question-error" role="alert"></p></section>${action(q.id==='P2'?'다음 상황으로':'다음')}`,'question-page');}
function reentryHome(){return home().replace('<div class="filter-bar">',`<article class="reconnect-card">${btn('dismiss-card','상담 카드 닫기','card-close',false,icon('close'))}<div class="reconnect-profile"><div class="portrait"></div><div><p>지난 상담 · 5분</p><h2>서가비 선생님</h2></div></div><p>포인트가 부족해 상담이 종료됐어요.</p><div class="reconnect-bottom"><span>1,200P / 30초</span>${btn('reconnect','이어서 상담하기','primary')}</div></article><div class="filter-bar">`);}
function reentryModal(){return `${reentryHome()}<div class="modal-backdrop"><section class="consult-modal tobe" role="dialog" aria-modal="true" aria-labelledby="consult-title"><h1 class="modal-title" id="consult-title">상담하기</h1>${btn('close','닫기','modal-close',false,icon('close'))}<div class="consult-profile"><div class="portrait"></div><strong>서가비 선생님</strong></div><div class="balance-row"><div class="balance-copy">보유 포인트<strong>0P</strong></div>${btn('tobe-charge','포인트 충전','pay-entry')}</div><div class="modal-divider"></div><div class="consult-body"><h2>전화 상담</h2><div class="rate-box"><span><strong>1,200P</strong> / 30초</span><small>약 0분 상담 가능</small></div>${btn('tobe-call','전화 상담하기','consult-now')}<div class="postpaid-secondary"><strong>후불 전화 상담</strong><span>1,600원 / 30초</span><p>안내에 따라 상담사 고유번호 223번을 입력해 주세요.</p>${btn('postpaid','후불 전화 상담','consult-postpaid',true)}</div></div></section></div>`;}
function progressMenuButton(className){
 return btn('menu','테스트 진행 메뉴',className,false,'<span class="progress-menu-dots" aria-hidden="true"></span>');
}
function controls(){return `<nav class="test-controls-bar" aria-label="테스트 진행"><span>사용자 테스트</span>${progressMenuButton('session-tools')}</nav>`;}
function render(){closeDialog(false);clearTimeout(timer);referenceSizer.disconnect();document.body.classList.toggle('has-test-controls',taskScreens.includes(screen));
 const q=question();if(q)app.innerHTML=questionnaire(q);else switch(screen){
 case 'welcome':app.innerHTML=study(`${title('01 · 안내','참여 안내')}<p>사주모아에서 상담이 끝난 뒤의 화면을 살펴보는 테스트입니다.</p><div class="intro-section"><h2>실제 전화·결제는 진행되지 않아요</h2><p>화면의 버튼을 눌러도 실제로 전화가 연결되거나 결제되지 않습니다.</p></div><div class="intro-section"><h2>평소처럼 답해 주세요</h2><p>정답은 없습니다. 평소라면 어떻게 할지 답해 주세요. 모르는 내용은 모른다고 답하셔도 됩니다.</p></div><div class="intro-section"><h2>${previewMode?'미리보기 답변은 저장되지 않아요':'답변은 익명으로 저장돼요'}</h2><p>${previewMode?'입력 내용은 이 창에서만 유지되며 전송되지 않습니다.':'선택과 작성한 답변은 익명 참여번호와 함께 저장됩니다.'}</p></div>${previewMode?'':'<p class="safety">창을 닫아도 같은 기기와 브라우저에서 이어서 진행할 수 있습니다.</p>'}${action('안내를 확인했어요')}`);break;
 case 'screening':app.innerHTML=study(`${title('02 · 질문','시작 전 질문')}${[['interest','운세 상담에 관심이 있나요?',['관심 있어요','별로 관심 없어요']],['used','사주모아를 써본 적이 있나요?',['써본 적 있어요','써본 적 없어요']]].map(([key,prompt,opts])=>`<fieldset class="screening-group"><legend>${prompt}</legend>${opts.map(l=>`<label class="ut-option"><input type="radio" name="${key}" data-screening="${key}" value="${l}" ${store.session.screening[key]===l?'checked':''}>${l}</label>`).join('')}</fieldset>`).join('')}<p id="question-error" class="form-error" role="alert"></p>${action()}`);break;
 case 'start':app.innerHTML=scenario('03-1 · 상담 체험','서가비 선생님과<br>상담하려고 합니다','사주모아에 가입해 혜택으로 받은<br>10,000포인트를 보유하고 있습니다.','다음 화면에서 서가비 선생님과 상담을 시작해 주세요.','시작하기');break;
 case 'consult':app.innerHTML=modal(false);break;
 case 'phone':app.innerHTML=phone();timer=setTimeout(()=>{if(active()&&screen==='phone')go('goal');},2000);break;
 case 'goal':app.innerHTML=scenario('04-1 · 통화 후 이용','통화가 끝나<br>앱으로 돌아왔습니다','기본 제공 포인트를 모두 사용해<br>상담 통화가 종료되었습니다.','화면을 살펴본 뒤, 추가로 상담받을지 결정해 주세요.','계속 진행하기');break;
 case 'return':app.innerHTML=modal(true);break;
 case 'home':app.innerHTML=home();break;
 case 'payment':app.innerHTML=payment();break;
 case 'reentry':app.innerHTML=scenario('08-1 · 새로운 상황','잠시 뒤, 앱에<br>다시 들어왔습니다','앱을 잠시 나갔다가 다시 들어왔습니다.<br>이전에 상담한 서가비 선생님에게 더 물어보고 싶은 내용이 생겼습니다.','서가비 선생님과 다시 상담하려면 어떻게 할지 화면에서 진행해 주세요.','계속 진행하기');break;
 case 'reentry-home':app.innerHTML=reentryHome();break;
 case 'reentry-modal':app.innerHTML=reentryModal();break;
 case 'review':app.innerHTML=study(`${title('11-1 · 최종 제출','테스트를 마쳤습니다')}<p>선택한 내용과 작성한 답변을 제출해 주세요.</p><p id="question-error" class="form-error" role="alert"></p>${action('제출','submit')}`);break;
 case 'thanks':app.innerHTML=study(`<h1 id="completion-title" aria-live="polite">답변을 저장하고 있습니다.</h1><p id="save-status" role="status" aria-live="polite"></p><p id="save-detail" class="muted"></p>${btn('retry','저장 다시 시도','secondary')}`,'thanks-page');break;
 case 'resume':app.innerHTML=study(`${title('진행 기록','이어서 진행할까요?')}<p>이 기기에 이전 진행 화면과 답변이 저장되어 있습니다.</p>${action('이어서 하기','resume')}${btn('new-person','새 참여 시작','secondary spaced')}`);break;
 case 'paused':app.innerHTML=study(`<h1>참여를 중단했습니다.</h1><p>${previewMode?'이 창에서 이어서 진행할 수 있습니다.':'같은 기기와 브라우저에서 테스트 링크를 다시 열면 이어서 진행할 수 있습니다.'}</p>${action('이어서 하기','resume')}`);break;
 case 'previous-version':app.innerHTML=study(`${title('진행 기록','테스트가 업데이트됐어요')}<p>새 질문에 답하려면 처음부터 시작해 주세요.</p>${action('새 참여 시작','new-person')}`);break;
 case 'withdrawn':app.innerHTML=study('<h1>참여해 주셔서 감사합니다.</h1><p>참여를 종료했습니다.</p>');break;
 default:app.innerHTML=study('<h1>진행 상태를 확인해 주세요.</h1>');}
 if(taskScreens.includes(screen))app.insertAdjacentHTML('beforeend',controls());
 else if(!['welcome','thanks','withdrawn','paused','resume','previous-version'].includes(screen))app.querySelector('.study-head-actions')?.insertAdjacentHTML('beforeend',progressMenuButton('study-menu'));
 if(['consult','return','reentry-modal'].includes(screen)){const bg=app.querySelector('.app-shell');bg.inert=true;bg.setAttribute('aria-hidden','true');}
 const referenceWindow=app.querySelector('.reference-window');
 if(referenceWindow){
  referenceWindow.style.setProperty('--reference-scale',String(referenceWindow.clientWidth/390));
  referenceSizer.observe(referenceWindow);
 }
 app.focus({preventScroll:true});status();}
function save(){store.save();status();}
function log(action,label=action){
 if(store.session.questionnaireVersion===VERSION)store.log(screen==='previous-version'?'resume':screen,label||action,{action});
}
function go(next){
 const reference=question()?.reference;
 const preserve=reference&&questions.find(q=>'q-'+q.id===next)?.reference===reference;
 const offset=preserve?scrollY:0;
 screen=next;store.setScreen(next);
 history.pushState({screen},'',location.pathname+location.search);
 render();
 window.scrollTo(0,offset);
}
function error(message){const e=document.querySelector('#question-error');if(e){e.textContent=message;e.tabIndex=-1;e.focus();}}
function status(){
 if(!remote)return;
 const s=remote.status;
 warning.hidden=previewMode||(!store.error&&!s.queueError);
 warning.textContent='임시 저장을 완료하지 못했습니다. 제출 후 저장 상태를 확인해 주세요.';
 if(s.state==='conflict'){ready=false;closeDialog(false);clearTimeout(timer);app.innerHTML=study('<h1>다른 창의 기록을 확인해 주세요.</h1><p>최근 기록을 보호하기 위해 이 창의 작성을 멈췄습니다.</p>');return;}
 const heading=document.querySelector('#completion-title');
 if(!heading)return;
 const complete=previewMode||s.state==='saved';
 const failed=s.state==='error';
 heading.textContent=complete?'참여해 주셔서 감사합니다.':failed?'답변을 아직 전송하지 못했습니다.':'답변을 저장하고 있습니다.';
 document.querySelector('#save-detail').textContent=previewMode?'미리보기 답변은 저장·전송되지 않습니다.':complete?'':failed?'인터넷 연결을 확인하고 다시 시도해 주세요.':'저장 완료까지 이 창을 유지해 주세요.';
 document.querySelector('[data-action="retry"]').hidden=!failed;
}
function closeDialog(focus=true){if(!dialog)return;dialog.remove();dialog=null;app.inert=false;app.removeAttribute('aria-hidden');document.body.classList.remove('reference-open');if(focus&&returnFocus?.isConnected)returnFocus.focus({preventScroll:true});returnFocus=null;}
function openDialog(html,trigger){returnFocus=trigger;dialog=document.createElement('div');dialog.className='reference-backdrop';dialog.innerHTML=`<section class="reference-dialog" role="dialog" aria-modal="true" aria-label="${html.includes('펼친')?'충전 화면':'테스트 진행'}">${html}</section>`;document.body.append(dialog);app.inert=true;app.setAttribute('aria-hidden','true');document.body.classList.add('reference-open');dialog.querySelector('button')?.focus();}
function menu(trigger){
 const decisionTask=['return','home','payment'].includes(screen);
 const reentryTask=screen.startsWith('reentry-');
 const reentryReached=screen==='reentry-modal';
 const contextActions=[];
 if(decisionTask)contextActions.push(btn('task-done','판단을 마쳤어요','primary'));
 if(decisionTask||reentryTask){
  contextActions.push(reentryReached
   ?btn('reentry-done','질문으로 이동','secondary spaced')
   :btn('help','다음 행동을 모르겠어요','secondary spaced'));
 }
 openDialog(`<h2>테스트 진행</h2>${contextActions.join('')}
  ${btn('dialog-close','화면으로 돌아가기','secondary spaced')}
  ${btn('pause-participation','참여 중단하기','secondary spaced')}
  <p class="participation-note">참여를 중단해도 같은 링크를 통해 이어서 진행할 수 있습니다.</p>
  ${previewMode?'<p class="participation-note preview-resume-note">미리보기에서는 이 창에서만 이어서 진행할 수 있습니다.</p>':''}`,trigger);
}
function next(){const q=question();if(q){const m=validateAnswer(q,store.session.answers);if(m){error(m);return;}log('question-complete',q.id+' 답변 완료');if(q.id==='P2'){go('reentry');return;}const i=questions.indexOf(q);go(i===questions.length-1?'review':'q-'+questions[i+1].id);return;}const mapping={welcome:'screening',screening:'start',start:'consult',goal:'return',reentry:'reentry-home'};if(screen==='screening'&&(!store.session.screening.interest||!store.session.screening.used)){error('두 질문에 모두 답해 주세요.');return;}if(mapping[screen])go(mapping[screen]);}
document.addEventListener('click',e=>{const b=e.target.closest('button[data-action]');if(!b||!active()||b.disabled)return;const a=b.dataset.action;log(a,b.dataset.label);
 if(['return','home'].includes(screen)&&b.closest('.app-shell,.consult-modal'))store.firstAction(b.dataset.label);
 if(b.getAttribute('aria-disabled')==='true')return;
 if(a==='next')next();else if(a==='menu')menu(b);else if(a==='dialog-close')closeDialog();
 else if(a==='expand')openDialog(`<header class="reference-dialog-head"><h2>충전 화면 <span class="screenreader-only">펼친 상태</span></h2>${btn('dialog-close','접기','expand-button')}</header><div class="reference-image-scroll" tabindex="0">${readOnly(payment())}</div>`,b);
 else if(a==='task-done'||a==='help'){
  const reentry=screen.startsWith('reentry-');
  const key=reentry?'reentryHelpRequested':a==='help'?'helpRequested':'decisionComplete';
  store.session.measurement[key]=true;
  save();go(reentry?'q-R1':'q-A1');
 }
 else if(a==='reentry-done'||a==='tobe-charge'||a==='tobe-call'){
  store.session.measurement.reentryCompleted=true;
  save();go('q-R1');
 }
 else if(a==='consult-now'&&screen==='consult')go('phone');else if(a==='end-call')go('goal');
 else if(a==='close')go(screen==='reentry-modal'?'reentry-home':'home');
 else if(a==='reconnect'||(a==='reopen'&&screen==='reentry-home')){store.session.measurement.reentryAction=a;save();go('reentry-modal');}
 else if(a==='dismiss-card')app.querySelector('.reconnect-card')?.remove();else if(a==='reopen'){store.returnToModal();go('return');}
 else if(a==='modal-payment'||a==='tab-coins'){if(screen.startsWith('reentry-'))go('q-R1');else{store.arrive(a==='modal-payment'?'modal_payment':'bottom_tab');go('payment');}}
 else if(a==='tab-home')go('home');
 else if(a==='submit'){const missing=questions.find(q=>validateAnswer(q,store.session.answers));if(missing){go('q-'+missing.id);error('제출하기 전에 답변을 확인해 주세요.');return;}store.submit(store.session.answers);go('thanks');void remote.flush();}
 else if(a==='retry')void remote.flush();
 else if(a==='pause-participation'){
  store.pause(screen,'참가자가 참여 중단 선택');
  screen='paused';
  history.replaceState({screen},'',location.pathname+location.search);
  render();
  window.scrollTo(0,0);
  void remote.flush();
 }
 else if(a==='resume'){
  if(store.session.status==='paused')store.resume();
  go(validScreens.has(store.session.screen)?store.session.screen:'welcome');
 }
 else if(a==='new-person'){
  if(!terminal()&&store.session.questionnaireVersion===VERSION)store.withdraw(store.session.screen,'새 참여 시작');
  startNew();
 }
 else if(a==='preview-restart'&&preview){preview.reset();startNew();}
});
document.addEventListener('input',e=>{if(active()&&e.target.matches('textarea[data-answer]')){store.session.answers[e.target.dataset.answer]=e.target.value;save();}});
document.addEventListener('change',e=>{if(!active())return;const n=e.target;if(n.dataset.screening){store.session.screening[n.dataset.screening]=n.value;save();return;}
 if(n.dataset.answer&&n.type==='radio'){store.session.answers[n.dataset.answer]=n.value;log('answer-select',n.dataset.answer+': '+n.value);save();}
 if(n.dataset.unknown){const q=question();store.session.answers[q.id]=n.checked?q.unknown:'';save();const y=scrollY;render();scrollTo(0,y);}
 if(n.dataset.factor){let values=Array.isArray(store.session.answers.F1)?[...store.session.answers.F1]:[];if(n.checked){values=n.dataset.factor==='undecided'?['undecided']:[...values.filter(v=>v!=='undecided'),n.dataset.factor];if(values.length>2){n.checked=false;error('최대 2가지까지 선택할 수 있습니다.');return;}}else values=values.filter(v=>v!==n.dataset.factor);store.session.answers.F1=values;if(!values.includes('other'))delete store.session.answers.F1Other;save();const y=scrollY;render();scrollTo(0,y);}});
document.addEventListener('keydown',e=>{
 const scope=dialog||app.querySelector('.modal-backdrop > .consult-modal:not([aria-hidden])');
 if(!scope||(!dialog&&question()))return;
 if(e.key==='Escape'&&dialog){e.preventDefault();closeDialog();return;}
 if(e.key!=='Tab')return;
 const list=[...scope.querySelectorAll('button:not([disabled]),[tabindex="0"]')].filter(n=>n.getAttribute('aria-disabled')!=='true');
 if(!dialog)list.push(...app.querySelectorAll('.test-controls-bar button'),...document.querySelectorAll('[data-action="preview-restart"]'));
 const first=list[0],last=list.at(-1);
 if(e.shiftKey&&(document.activeElement===first||!list.includes(document.activeElement))){e.preventDefault();last?.focus();}
 else if(!e.shiftKey&&(document.activeElement===last||!list.includes(document.activeElement))){e.preventDefault();first?.focus();}
});
window.addEventListener('popstate',e=>{if(!active()||terminal()||store.session.status==='paused'||!validScreens.has(e.state?.screen))return;screen=e.state.screen;store.setScreen(screen);render();});
function connect(){
 remote=preview?preview.createRemote():initRemoteSync(store,{canCapture:()=>ready&&guard.isOwner&&store.session.questionnaireVersion===VERSION});
 unsubscribe=remote.subscribe(status);
}
function startNew(){
 unsubscribe?.();remote?.dispose();
 if(preview)store=preview.createStore();else store.newSession();
 store.session.questionnaireVersion=VERSION;
 store.session.screen='welcome';
 store.save();
 connect();
 go('welcome');
}
async function init(){
 if(initializing||ready)return;
 initializing=true;
 try{
  let sameTab=false;try{sameTab=!!sessionStorage.getItem('sajumoaut.active.v1');}catch{}
  store=preview?preview.createStore():createStore();
  if(!store.restored){
   store.session.questionnaireVersion=VERSION;
   store.session.screen='welcome';
   store.save();
  }
  ready=true;
  if(store.session.questionnaireVersion!==VERSION)screen='previous-version';
  else if(store.restored&&(!sameTab||newRequested||store.session.status==='paused'))screen='resume';
  else screen=validScreens.has(store.session.screen)?store.session.screen:'welcome';
  connect();
  render();
  history.replaceState({screen},'',location.pathname+location.search);
 }finally{initializing=false;}
}
if(previewMode){
 document.body.classList.add('preview-mode');
 const banner=document.createElement('aside');
 banner.className='preview-banner';
 banner.setAttribute('aria-label','미리보기 안내');
 banner.innerHTML=`<div><strong>미리보기 · 기록 저장 안 함</strong><small>실제 참가자 기록에 반영되지 않아요.</small></div>${btn('preview-restart','처음부터 다시')}`;
 document.body.prepend(banner);
}
guard.subscribe(s=>{if(!s.isOwner&&ready){ready=false;clearTimeout(timer);closeDialog(false);app.innerHTML=study('<h1>한 창에서 진행해 주세요.</h1><p>다른 창에서 테스트가 진행 중입니다. 해당 창을 닫고 새로고침해 주세요.</p>');}else if(s.isOwner&&!ready)void init();});
if(await guard.acquire())await init();else app.innerHTML=study('<h1>한 창에서 진행해 주세요.</h1>');
