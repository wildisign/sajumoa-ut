export const VERSION=6;
export const factors=[['need','추가 상담이 필요한 정도'],['expected_help','상담에서 얻을 수 있을 것으로 기대하는 도움'],['minimum_amount','한 번에 충전해야 하는 최소 금액'],['available_time','충전한 금액으로 상담할 수 있는 시간'],['benefits','할인·추가 포인트 같은 혜택'],['findability','충전 화면을 찾기 쉬운 정도'],['other','기타 - 직접 입력'],['undecided','아직 판단하기 어려워요']];
export const previousQuestions=[
 {id:'A1',number:'05-1',title:'포인트 충전 의사',prompt:'과업의 상황과 같이 기본 제공 포인트 소진으로 통화가 끊겼다면 상담을 이어가기 위해 충전을 고려하시겠습니까?',reference:'modal',options:['충전을 고려할 수 있어요','충전을 보류하고 싶어요','아직 판단하기 어려워요']},
 {id:'A2',number:'05-2',title:'충전 여부 결정 이유',prompt:'충전 여부를 결정한 가장 큰 이유는 무엇인가요?',reference:'modal',type:'text',unknown:'설명하기 어려워요'},
 {id:'A3',number:'05-3',title:'포인트와 후불 가격 비교',prompt:'아까 본 화면에서 포인트와 후불 중 어느 쪽이 더 저렴하다고 생각했나요?',options:['포인트가 더 저렴하다고 생각했어요','후불이 더 저렴하다고 생각했어요','가격을 비교하지 않았어요','잘 모르겠어요']},
 {id:'F1',number:'06-1',title:'추가 상담 결정 요소',prompt:'사주모아에서 내 돈으로 추가 상담을 받을지 결정한다면, 중요하게 고려할 요소를 최대 2가지 골라 주세요.',type:'factors'},
 {id:'V1',number:'06-2',title:'가입 혜택의 가치',prompt:'화면에서 안내된 신규 가입 혜택 10,000포인트는 얼마나 가치 있게 느껴지셨나요?',options:['1 매우 낮음','2 낮음','3 보통','4 높음','5 매우 높음']},
 {id:'P1',number:'07-1',title:'실제로 결제될 금액',prompt:'표시된 최소 금액으로 충전한다면, 실제로 결제될 금액은 얼마라고 이해하셨나요?',reference:'payment',type:'text',placeholder:'금액을 입력해 주세요 (원)',unknown:'화면만으로 알기 어려워요'},
 {id:'P2',number:'07-2',title:'최소 결제금액 부담',prompt:'위 화면에서 실제로 결제해야 하는 최소 금액은 얼마나 부담스럽게 느껴지셨나요?',reference:'payment',options:['1 전혀 부담스럽지 않음','2 별로 부담스럽지 않음','3 보통','4 다소 부담스러움','5 매우 부담스러움']},
 {id:'R1',number:'09-1',title:'선택 전 예상한 일',prompt:'방금 선택한 항목을 누르기 전, 어떤 일이 일어날 것으로 예상했나요?',type:'text',unknown:'기억나지 않아요'},
 {id:'R2',number:'09-2',title:'재상담에 필요한 것',prompt:'같은 상담사와 다시 상담하려면 무엇이 필요하다고 이해했나요?',type:'text',unknown:'잘 모르겠어요'},
 {id:'R3',number:'09-3',title:'재상담 방법 찾기',prompt:'이전에 상담한 상담사와 다시 상담할 방법을 찾기 쉬웠나요?',options:['1 전혀 쉽지 않음','2 별로 쉽지 않음','3 보통','4 대체로 쉬움','5 매우 쉬움'],reason:'쉽거나 어려웠던 부분이 있다면 적어 주세요.'},
 {id:'C1',number:'10',title:'금액 표시 비교',prompt:'충전되는 포인트와 실제 결제금액을 구분하기에는 어느 화면이 더 명확한가요?',reference:'compare',options:['화면 A','화면 B','차이 없음','둘 다 불명확'],reason:'선택한 화면이 더 명확하다고 생각한 이유를 적어 주세요.'},
 {id:'feedback',number:'11',title:'테스트에 대한 추가 의견',prompt:'이번 테스트와 관련해 더 하고 싶은 말이 있나요?',type:'text',optional:true}
];
export const routePrompts={
 reconnect:'홈에서 ‘이어서 상담하기’를 눌렀을 때, 바로 다음에 어떤 일이 일어날 거라고 생각하셨나요?',
 reopen:'홈에서 서가비 선생님의 ‘상담하기’를 눌렀을 때, 바로 다음에 어떤 일이 일어날 거라고 생각하셨나요?',
 help:'홈에서 서가비 선생님과 다시 상담하려고 할 때, 어느 부분에서 다음 행동을 정하기 어려웠나요?',
 other:'홈에서 서가비 선생님과 다시 상담하려고 할 때, 선택한 항목에서 무엇을 기대하셨나요?'
};
export function reentryRoute(s){
 const route=s.measurement?.reentryAction;
 if(route==='reconnect'||route==='reopen')return route;
 return s.measurement?.reentryHelpRequested?'help':'other';
}
export function participantQuestions(s){
 if(s.questionnaireVersion===5)return previousQuestions;
 const selected=['reconnect','reopen'].includes(reentryRoute(s));
 return selected?questions:questions.filter(q=>q.id!=='findDifficulty');
}
export const notFound='찾지 못했어요';
export const questions=previousQuestions.flatMap(q=>{
 if(q.id==='R1')return [{id:'routeThought',number:'09-1',title:'재상담 화면에서의 선택',prompt:'재상담 경로별 응답',reference:'reentry',type:'text',unknown:'잘 모르겠어요'}];
 if(q.id==='R2')return [];
 if(q.id==='R3')return [{id:'findDifficulty',number:'09-2',title:'재상담 방법 찾기',prompt:'홈에서 서가비 선생님과 다시 상담할 방법을 찾는 과정은 어땠나요?',options:['매우 어려웠어요','다소 어려웠어요','보통이었어요','다소 쉬웠어요','매우 쉬웠어요']}];
 return [q];
});
export const answerKeys=questions.flatMap(q=>[q.id,...(q.reason?[q.id+'Reason']:[])]).concat(['F1Other']);
export function validateAnswer(q,answers){
 const value=answers[q.id];
 if(q.optional && (value==null || typeof value==='string'))return '';
 if(q.type==='factors'){
  if(!Array.isArray(value)||!value.length||value.length>2||new Set(value).size!==value.length||value.some(v=>!factors.some(([id])=>id===v))||(value.includes('undecided')&&value.length!==1))return '중요하게 고려할 요소를 1~2가지 선택해 주세요.';
  if(value.includes('other')&&!answers.F1Other?.trim())return '기타 내용을 입력해 주세요.';
 }else if(q.options){if(!q.options.includes(value))return '항목을 하나 선택해 주세요.';}
 else if(typeof value!=='string'||!value.trim())return '답변을 입력하거나 아래 항목을 선택해 주세요.';
 return '';
}

