// 이레: 외공은 행동력, 내공은 내공, 연계는 양쪽을 함께 사용한다.
const IRE_CARD_GROUPS=[
  ['붕대 정권','헝겊 장갑','넓은 소매','매듭 허리띠','면포 버선','무술 비급','옥패','향로의 숨','검은 허리끈','팔꿈치 보호대','수련석','머리끈','낡은 권투 붕대','목인장'],
  ['일보 권격','열린 손바닥','철산고','팔꿈치 밀치기','격투 자세','파고들기','올려치기','회전 정권','되받아치기','낮은 자세','급소 압박','도약 권격'],
  ['정좌 호흡','기운 모으기','내공의 고리','태극 방벽','발경','옥패 공명','내력 정권','정기 균형','회복 호흡','쌍장','용권 기류','천지개벽'],
  ['손끝 흘리기','일보후퇴 이보전진','전환 수비','공격 받아내기','호흡 전환','소매 흘리기','손목 제압','중심 잡기','마주 선 손바닥','비껴치기','기마 보법','각성명 - 극']
];
const IRE_CARD_NAMES=IRE_CARD_GROUPS.flat();
const IRE_RARITY_COLORS={일반:'#f2ede3',고급:'#64c69b',희귀:'#72aaf5',신화:'#d9a04c',초월:'#bc82ed'};
function ireCardCatalog(){
  return IRE_CARD_NAMES.map((name,i)=>{
    const rarity=i===49?'초월':i>=46?'신화':i>=38?'희귀':i>=20?'고급':'일반';
    const guard=/장갑|소매|버선|향로|보호|머리끈|자세|호흡|방벽|균형|흘리기|수비|받아내기|제압|중심|보법|무위/.test(name);
    const charge=/호흡|기운 모으기|정좌/.test(name);
    const inner=i>=26&&i<38,dual=i===30||i===32||i===35||i===37||i===49;
    const actionCost=inner?(dual?1:0):i===49?1:i>=46?2:i%13===0?0:1;
    const innerCost=dual?2:inner?2:i===49?2:0;
    const cost=actionCost||innerCost;
    const value=guard?4+3*(actionCost+innerCost):5+4*(actionCost+innerCost)+(i>=38?2:0);
    const effect=`${dual?`행동력 ${actionCost} + 내공 ${innerCost} · `:inner?`내공 ${innerCost} · `:''}${guard?'방어':'피해'} ${value}${charge?' · 내공 1 획득':''}`;
    return {name,cost,type:`${i<14?'일반':'전용'} · ${guard?'스킬':'공격'}`,effect,value,rarity:IRE_RARITY_COLORS[rarity],tone:guard?'#333b48':'#393039',extra:guard?'block':'attack',art:`assets/card-ire-${String(i+1).padStart(2,'0')}.webp`,keyword:i<14?'':i<26?'외공':i<38?'내공':'수비',actionCost,innerCost,innerGain:charge?1:0,rewardable:i!==49};
  });
}
