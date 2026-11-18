import {btn} from './views.js?v=20261118-list';

export function reentryHome(){
 const tabs=[['home','홈','ae6d2.svg'],['heart','찜','db143.svg'],['user','마이페이지','54238.svg'],['coins','포인트 충전','66e7d.svg']];
 const nav=tabs.map(([id,label,file])=>btn('tab-'+id,label,'',id==='heart'||id==='user','<img alt="" src="./assets/reentry/'+file+'">'+label)).join('');
 return `<div class="app-shell figma-home"><div class="figma-home-layout"><div class="figma-home-art"><div style="position:absolute;height:7.94872cqw;left:-0.25641cqw;top:22.05128cqw;width:100.0cqw" data-name="이벤트 배너">
        <img alt="" style="position:absolute;inset:0;max-width:none;object-fit:cover;pointer-events:none;width:100%;height:100%" src="./assets/reentry/b4476.png">
      </div>
      <div style="position:absolute;height:9.74359cqw;left:79.74359cqw;top:37.17949cqw;width:15.38462cqw" data-name="헤더 아이콘">
        <img alt="" style="position:absolute;inset:0;max-width:none;object-fit:cover;pointer-events:none;width:100%;height:100%" src="./assets/reentry/1fc6f.png">
      </div>
      <p style="word-break:break-word;position:absolute;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:700;line-height:normal;left:3.84615cqw;color:#2b7089;font-size:7.69231cqw;top:36.41026cqw;white-space:nowrap">
        Sajumoa
      </p>
      <div style="position:absolute;height:50.0cqw;left:3.33333cqw;border-radius:3.07692cqw;top:47.17949cqw;width:92.5641cqw" aria-label="2026년 인생 스포! 사주를 더한 깊은 해석" role="img">
        <img alt="" style="position:absolute;inset:0;max-width:none;object-fit:cover;pointer-events:none;border-radius:3.07692cqw;width:100%;height:100%" src="./assets/reentry/e3675.png">
      </div>
      <div style="position:absolute;left:43.58974cqw;width:1.53846cqw;height:1.53846cqw;top:107.4359cqw" data-name="캐러셀 점 1">
        <img alt="" style="position:absolute;display:block;inset:0;max-width:none;width:100%;height:100%" src="./assets/reentry/ee1eb.svg">
      </div>
      <div style="position:absolute;left:47.17949cqw;width:1.53846cqw;height:1.53846cqw;top:107.4359cqw" data-name="캐러셀 점 2">
        <img alt="" style="position:absolute;display:block;inset:0;max-width:none;width:100%;height:100%" src="./assets/reentry/3ccb5.svg">
      </div>
      <div style="position:absolute;left:50.76923cqw;width:1.53846cqw;height:1.53846cqw;top:107.4359cqw" data-name="캐러셀 점 3">
        <img alt="" style="position:absolute;display:block;inset:0;max-width:none;width:100%;height:100%" src="./assets/reentry/ee1eb.svg">
      </div>
      <div style="position:absolute;left:54.35897cqw;width:1.53846cqw;height:1.53846cqw;top:107.4359cqw" data-name="캐러셀 점 4">
        <img alt="" style="position:absolute;display:block;inset:0;max-width:none;width:100%;height:100%" src="./assets/reentry/ee1eb.svg">
      </div>
      <div style="position:absolute;height:12.30769cqw;left:-0.25641cqw;top:114.10256cqw;width:100.0cqw" data-name="카테고리">
        <img alt="" style="position:absolute;inset:0;max-width:none;object-fit:cover;pointer-events:none;width:100%;height:100%" src="./assets/reentry/c4fef.png">
      </div>
      <div style="position:absolute;background:#2b7089;height:12.82051cqw;left:-0.25641cqw;overflow:hidden;top:137.94872cqw;width:25.0cqw" data-name="탭 추천">
        <p style="transform:translateX(-50%);word-break:break-word;position:absolute;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:700;line-height:normal;left:12.5cqw;font-size:4.10256cqw;text-align:center;color:white;top:3.84615cqw;width:25.0cqw">
          추천
        </p>
      </div>
      <div style="position:absolute;background:white;height:12.82051cqw;left:24.74359cqw;overflow:hidden;top:137.94872cqw;width:25.0cqw" data-name="탭 신규">
        <p style="transform:translateX(-50%);word-break:break-word;position:absolute;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:400;line-height:normal;left:12.5cqw;color:#333;font-size:4.10256cqw;text-align:center;top:3.84615cqw;width:25.0cqw">
          신규
        </p>
      </div>
      <div style="position:absolute;background:white;height:12.82051cqw;left:49.74359cqw;overflow:hidden;top:137.94872cqw;width:25.0cqw" data-name="탭 급상승">
        <p style="transform:translateX(-50%);word-break:break-word;position:absolute;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:400;line-height:normal;left:12.5cqw;color:#333;font-size:4.10256cqw;text-align:center;top:3.84615cqw;width:25.0cqw">
          급상승
        </p>
        <div style="position:absolute;background:#e53935;height:3.58974cqw;left:15.38462cqw;overflow:hidden;border-radius:0.76923cqw;top:0.51282cqw;width:6.66667cqw" data-name="HOT 배지">
          <p style="transform:translateX(-50%);word-break:break-word;position:absolute;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:700;line-height:normal;left:3.33333cqw;font-size:2.30769cqw;text-align:center;color:white;top:0.51282cqw;width:6.66667cqw">
            HOT
          </p>
        </div>
      </div>
      <div style="position:absolute;background:white;height:12.82051cqw;left:74.74359cqw;overflow:hidden;top:137.94872cqw;width:25.0cqw" data-name="탭 상담중">
        <p style="transform:translateX(-50%);word-break:break-word;position:absolute;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:400;line-height:normal;left:12.5cqw;color:#333;font-size:4.10256cqw;text-align:center;top:3.84615cqw;width:25.0cqw">
          상담중
        </p>
      </div>
      <div style="position:absolute;background:white;border-width:0.25641cqw;border-color:#e9e9e9;border-style:solid;height:35.12821cqw;left:4.10256cqw;overflow:hidden;border-radius:3.33333cqw;top:204.35897cqw;width:91.53846cqw" data-name="카드 미소">
        <div style="position:absolute;height:35.12821cqw;left:-0.25641cqw;top:-0.25641cqw;width:30.25641cqw" aria-label="미소" role="img">
          <img alt="" style="position:absolute;inset:0;max-width:none;object-fit:cover;pointer-events:none;width:100%;height:100%" src="./assets/reentry/eb02e.png">
        </div>
        <div style="position:absolute;background:#f1fcff;height:35.12821cqw;left:76.92308cqw;overflow:hidden;top:-0.25641cqw;width:14.35897cqw" data-name="상담 컬럼">
          <div style="position:absolute;left:4.10256cqw;width:6.15385cqw;height:6.15385cqw;top:8.71795cqw" data-name="전화 아이콘 미소">
            <img alt="" style="position:absolute;inset:0;max-width:none;object-fit:cover;pointer-events:none;width:100%;height:100%" src="./assets/reentry/3499b.png">
          </div>
          <div style="transform:translateX(-50%);word-break:break-word;position:absolute;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:700;line-height:0;left:7.17949cqw;color:#2b7089;font-size:3.84615cqw;text-align:center;top:19.48718cqw;width:14.35897cqw">
            <p style="line-height:normal;margin-bottom:0">상담</p>
            <p style="line-height:normal">하기</p>
          </div>
        </div>
        <div style="position:absolute;background:#00509e;height:5.12821cqw;left:1.28205cqw;overflow:hidden;border-radius:1.02564cqw;top:1.28205cqw;width:9.23077cqw" data-name="배지 타로">
          <p style="transform:translateX(-50%);word-break:break-word;position:absolute;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:700;line-height:normal;left:4.61538cqw;font-size:2.82051cqw;text-align:center;color:white;top:0.76923cqw;width:9.23077cqw">
            타로
          </p>
        </div>
        <p style="word-break:break-word;position:absolute;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:700;line-height:normal;left:31.28205cqw;font-size:3.84615cqw;color:black;top:3.33333cqw;white-space:nowrap">
          미소
        </p>
        <p style="word-break:break-word;position:absolute;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:700;line-height:normal;left:39.48718cqw;color:#00509e;font-size:3.84615cqw;top:3.33333cqw;white-space:nowrap">
          | 202번
        </p>
        <p style="word-break:break-word;position:absolute;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:400;line-height:normal;left:31.28205cqw;color:#333;font-size:3.07692cqw;top:8.97436cqw;width:43.58974cqw">
          인생 타이밍 쥐어주는 신의 한 수!
        </p>
        <div style="position:absolute;left:31.28205cqw;width:3.58974cqw;height:3.58974cqw;top:19.23077cqw" data-name="후기 아이콘 미소">
          <img alt="" style="position:absolute;inset:0;max-width:none;object-fit:cover;pointer-events:none;width:100%;height:100%" src="./assets/reentry/26c80.png">
        </div>
        <p style="word-break:break-word;position:absolute;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:400;line-height:normal;left:35.89744cqw;color:#151515;font-size:3.07692cqw;top:19.23077cqw;white-space:nowrap">
          후기 ( 1816 )
        </p>
        <div style="position:absolute;left:31.28205cqw;width:3.58974cqw;height:3.58974cqw;top:25.38462cqw" data-name="가격 아이콘 미소">
          <img alt="" style="position:absolute;inset:0;max-width:none;object-fit:cover;pointer-events:none;width:100%;height:100%" src="./assets/reentry/9955a.png">
        </div>
        <p style="word-break:break-word;position:absolute;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:400;line-height:normal;left:35.89744cqw;color:#151515;font-size:3.33333cqw;top:25.38462cqw;white-space:nowrap">
          1,000 / 30초
        </p>
      </div>
      <div style="position:absolute;background:white;border-width:0.25641cqw;border-color:#e9e9e9;border-style:solid;height:35.12821cqw;left:4.10256cqw;overflow:hidden;border-radius:3.33333cqw;top:242.5641cqw;width:91.53846cqw" data-name="카드 연화선녀">
        <div style="position:absolute;height:35.12821cqw;left:-0.25641cqw;top:-0.25641cqw;width:30.25641cqw" data-name="사진 연화선녀">
          <img alt="" style="position:absolute;inset:0;max-width:none;object-fit:cover;pointer-events:none;width:100%;height:100%" src="./assets/reentry/b00f1.png">
        </div>
        <div style="position:absolute;background:#f1fcff;height:35.12821cqw;left:76.92308cqw;overflow:hidden;top:-0.25641cqw;width:14.35897cqw" data-name="상담 컬럼">
          <div style="position:absolute;left:4.10256cqw;width:6.15385cqw;height:6.15385cqw;top:8.71795cqw" data-name="전화 아이콘 연화선녀">
            <img alt="" style="position:absolute;inset:0;max-width:none;object-fit:cover;pointer-events:none;width:100%;height:100%" src="./assets/reentry/3499b.png">
          </div>
          <div style="transform:translateX(-50%);word-break:break-word;position:absolute;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:700;line-height:0;left:7.17949cqw;color:#2b7089;font-size:3.84615cqw;text-align:center;top:19.48718cqw;width:14.35897cqw">
            <p style="line-height:normal;margin-bottom:0">상담</p>
            <p style="line-height:normal">하기</p>
          </div>
        </div>
        <div style="position:absolute;background:#91705a;height:5.12821cqw;left:1.28205cqw;overflow:hidden;border-radius:1.02564cqw;top:1.28205cqw;width:9.23077cqw" data-name="배지 신점">
          <p style="transform:translateX(-50%);word-break:break-word;position:absolute;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:700;line-height:normal;left:4.61538cqw;font-size:2.82051cqw;text-align:center;color:white;top:0.76923cqw;width:9.23077cqw">
            신점
          </p>
        </div>
        <p style="word-break:break-word;position:absolute;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:700;line-height:normal;left:31.28205cqw;font-size:3.84615cqw;color:black;top:3.33333cqw;white-space:nowrap">
          연화선녀
        </p>
        <p style="word-break:break-word;position:absolute;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:700;line-height:normal;left:46.66667cqw;color:#91705a;font-size:3.84615cqw;top:3.33333cqw;white-space:nowrap">
          | 228번
        </p>
        <p style="word-break:break-word;position:absolute;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:400;line-height:normal;left:31.28205cqw;color:#333;font-size:3.07692cqw;top:8.97436cqw;width:43.58974cqw">
          소름 직관! 영검한 선녀점사
        </p>
        <div style="position:absolute;left:31.28205cqw;width:3.58974cqw;height:3.58974cqw;top:19.23077cqw" data-name="후기 아이콘 연화선녀">
          <img alt="" style="position:absolute;inset:0;max-width:none;object-fit:cover;pointer-events:none;width:100%;height:100%" src="./assets/reentry/26c80.png">
        </div>
        <p style="word-break:break-word;position:absolute;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:400;line-height:normal;left:35.89744cqw;color:#151515;font-size:3.07692cqw;top:19.23077cqw;white-space:nowrap">
          후기 ( 1 )
        </p>
        <div style="position:absolute;left:31.28205cqw;width:3.58974cqw;height:3.58974cqw;top:25.38462cqw" data-name="가격 아이콘 연화선녀">
          <img alt="" style="position:absolute;inset:0;max-width:none;object-fit:cover;pointer-events:none;width:100%;height:100%" src="./assets/reentry/9955a.png">
        </div>
        <p style="word-break:break-word;position:absolute;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:400;line-height:normal;left:35.89744cqw;color:#151515;font-size:3.33333cqw;top:25.38462cqw;white-space:nowrap">
          700 / 30초
        </p>
      </div>
      <div style="position:absolute;height:43.58974cqw;left:4.10256cqw;overflow:hidden;border-radius:3.07692cqw;top:157.69231cqw;width:91.53846cqw" class="reconnect-card figma-reconnect">
        <div style="position:absolute;background:white;border-width:0.25641cqw;border-color:#d5e2e7;border-style:solid;align-content:stretch;display:flex;flex-direction:column;gap:2.05128cqw;align-items:flex-start;left:0;padding:4.10256cqw;border-radius:3.07692cqw;top:0;width:91.53846cqw" data-name="Sajumoa/상담 복귀 카드">
          <div style="align-content:stretch;display:flex;gap:3.07692cqw;height:13.33333cqw;align-items:center;padding-right:14.35897cqw;position:relative;flex-shrink:0;width:83.33333cqw" data-name="지난 상담사와 닫기">
            <div style="position:relative;border-radius:2.05128cqw;flex-shrink:0;width:13.33333cqw;height:13.33333cqw" data-name="서가비 선생님 사진">
              <img alt="" style="position:absolute;inset:0;max-width:none;object-fit:cover;pointer-events:none;border-radius:2.05128cqw;width:100%;height:100%" src="./assets/reentry/fb76e.png">
            </div>
            <div style="word-break:break-word;align-content:stretch;display:flex;flex-direction:column;gap:0.51282cqw;align-items:flex-start;overflow:hidden;position:relative;flex-shrink:0;width:52.5641cqw" data-name="상담사 식별">
              <p style="font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:400;line-height:5.12821cqw;position:relative;flex-shrink:0;font-size:3.33333cqw;color:#666;width:52.5641cqw">
                지난 상담 · 5분
              </p>
              <p style="font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:700;height:5.12821cqw;line-height:6.15385cqw;position:relative;flex-shrink:0;font-size:4.35897cqw;color:#1a1a1a;width:52.5641cqw">
                서가비 선생님
              </p>
            </div>
            <div style="position:absolute;align-content:stretch;display:flex;align-items:center;justify-content:center;left:74.35897cqw;overflow:hidden;width:11.28205cqw;height:11.28205cqw;top:-2.5641cqw" class="card-close" aria-hidden="true">
              <p style="word-break:break-word;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:400;line-height:7.17949cqw;position:relative;flex-shrink:0;font-size:5.64103cqw;color:#666;text-align:center;width:6.15385cqw">
                ×
              </p>
            </div>
          </div>
          <p style="word-break:break-word;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:400;line-height:5.12821cqw;position:relative;flex-shrink:0;font-size:3.58974cqw;color:#1a1a1a;width:83.33333cqw">
            포인트가 부족해 상담이 종료됐어요.
          </p>
          <div style="align-content:stretch;display:flex;gap:3.07692cqw;height:12.30769cqw;align-items:center;overflow:hidden;position:relative;flex-shrink:0;width:83.33333cqw" data-name="요금과 다음 행동">
            <p style="word-break:break-word;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:400;line-height:5.12821cqw;position:relative;flex-shrink:0;font-size:3.33333cqw;color:#666;width:39.23077cqw">
              1,200P / 30초
            </p>
            <button type="button" data-action="reconnect" data-label="이어서 상담하기" style="background:#2b7089;align-content:stretch;cursor:pointer;display:flex;height:12.30769cqw;align-items:center;justify-content:center;position:relative;border-radius:2.05128cqw;flex-shrink:0;width:41.02564cqw" >
              <p style="word-break:break-word;font-family:'Noto Sans KR','Malgun Gothic',sans-serif;font-weight:700;line-height:5.12821cqw;position:relative;flex-shrink:0;font-size:3.58974cqw;color:white;text-align:center;width:36.92308cqw">
                이어서 상담하기
              </p>
            </button>
          </div>
        </div>
      </div></div></div><nav class="bottom-nav figma-tabs" aria-label="앱 하단 메뉴">${nav}</nav></div>`;
}

