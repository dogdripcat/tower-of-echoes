// 이리스 카드 도감: 일반 카드는 장비, 전용 카드는 이리스와 집사인형을 묘사한다.
const IRIS_CARD_GROUPS = [
  ['관절 압박','집사의 정권','은실 당기기','톱니 강타','분절 타격','기계 손끝','실타래 보호','관절 갑주','강철 장갑','태엽 수비','인형 방벽','정밀 조정','그림자 가리개','예비 관절'],
  ['전면 지시','대리 타격','집사의 개입','교차 조종','은실 포박','지휘자의 손짓','강제 회전','흑막의 손','주먹 관절','뒤틀린 지시','기습 인형','정지 명령'],
  ['관절 수리','예비 몸체','심장 재기동','은실 봉합','잔해 수거','대리 희생','그림자 소생','태엽 교체','재생 명령','집사의 귀환','수복 의식','불멸의 시종'],
  ['청동 설계','인형 설계도','새 관절','은실 공방','수호 장치','무대 뒤의 군세','공학적 돌파','동력 핵','폭주 장치','집사 뒤의 주인','정교한 교향','각성명 - 극']
];
const IRIS_CARD_NAMES = IRIS_CARD_GROUPS.flat();
const IRIS_RARITY_COLORS = {일반:'#f2ede3',고급:'#64c69b',희귀:'#72aaf5',신화:'#d9a04c',초월:'#bc82ed'};
function irisCardCatalog(){
  return IRIS_CARD_NAMES.map((name,i)=>{
    const rarity=i===49?'초월':i>=46?'신화':i>=38?'희귀':i>=20?'고급':'일반';
    const guard=/보호|갑주|수비|방벽|가리개|수리|봉합|희생|수호|집사 뒤|정지/.test(name);
    const cost=i>=46?2:i>=38?2:i%11===0?0:1;
    const value=guard?4+cost*3+(i>=38?3:0):5+cost*4+(i>=38?3:0);
    return {name,cost,type:`${i<14?'일반':'전용'} · ${guard?'스킬':'공격'}`,effect:`${guard?'방어':'피해'} ${value}`,value,rarity:IRIS_RARITY_COLORS[rarity],tone:guard?'#21334a':'#34234b',extra:guard?'block':'attack',art:`assets/card-iris-${String(i+1).padStart(2,'0')}.webp`,keyword:i<14?'':i<26?'조종':i<38?'소생':'창조',rewardable:i!==49};
  });
}
