// 카렌 카드: 처음 14장은 장비만, 이후 36장은 캐릭터 장면. 마지막 초월 카드는 이벤트 전용.
const KAREN_CARD_GROUPS=[
  ['도끼 날','방패 테두리','모피 어깨걸이','푸른 전투천','전쟁뿔','무기 손잡이','방패벽','숫돌','서릿날','강철 방패심','갈라진 판자','가죽 결속','전투 문양','모닥불 잔불'],
  ['도끼 내려치기','방패 밀치기','도끼 갈고리','눈밭 돌격','육박전','횡베기','핏빛 반격','첫 일격','어깨 멘 도끼','동토의 자세','전사의 함성','결정타'],
  ['북방 전쟁뿔','방패의 메아리','서리의 응답','도끼 방패 연격','전장의 보폭','푸른 전투혼','선조의 공명','광전사의 수비','방패 반격','폭풍의 외침','전투 고양','동토의 맹세'],
  ['전우의 방패','계승된 도끼','설원에 서다','방패의 서약','관문 사수','유산의 날','선조의 행렬','부서지지 않는 방패','대신 맞서기','달빛 반격','전승의 승리','각성명 - 극']
];
const KAREN_CARD_NAMES=KAREN_CARD_GROUPS.flat();
const KAREN_RARITY_COLORS={일반:'#f2ede3',고급:'#64c69b',희귀:'#72aaf5',신화:'#d9a04c',초월:'#bc82ed'};
function karenCardCatalog(){
  return KAREN_CARD_NAMES.map((name,i)=>{
    const rarity=i===49?'초월':i>=46?'신화':i>=38?'희귀':i>=20?'고급':'일반';
    const guard=/방패|어깨걸이|결속|수비|자세|사수|대신 맞서기|모닥불/.test(name);
    const cost=i>=46?2:i>=38?2:i%13===0?0:i%5===0?2:1;
    const value=guard?4+3*cost+(i>=38?3:0):5+4*cost+(i>=38?3:0);
    return {name,cost,type:`${i<14?'일반':'전용'} · ${guard?'스킬':'공격'}`,effect:`${guard?'방어':'피해'} ${value}`,value,rarity:KAREN_RARITY_COLORS[rarity],tone:guard?'#263c4d':'#482925',extra:guard?'block':'attack',art:`assets/card-karen-${String(i+1).padStart(2,'0')}.webp`,keyword:i<14?'':i<26?'파괴':i<38?'공명':'계승',rewardable:i!==49};
  });
}
