/* Tower of Echoes v0.57 — finalized Guild, Inn and Sanctuary event content. */
(()=>{
  const QUEST_TEMPLATES=[
    ['normal','길목 정리','일반 전투 {n}회 승리','normal'],
    ['elite','강자의 증표','정예 전투 {n}회 승리','elite'],
    ['healthy','온전한 귀환','HP 60% 이상으로 전투 {n}회 승리','healthy'],
    ['potionless','절제된 승리','포션을 사용하지 않고 전투 {n}회 승리','potionless'],
    ['hard','험로 돌파','어려운 조우 {n}회 승리','hard'],
    ['attack','검끝의 계약','공격 카드로 적 {n}체 처치','attack'],
    ['skill','전술 연구','스킬 카드 {n}회 사용','skill'],
    ['enhance','전장의 준비','강화 카드 {n}회 사용','enhance'],
    ['block','철벽 증명','한 전투에서 방어 {n} 획득','block'],
    ['status','상태 관찰','상태이상 {n}회 부여','status'],
    ['gold','회수 임무','전투 보상 골드 {n} 획득','gold'],
    ['event','탑의 기록','이벤트 {n}회 완료','event'],
    ['relic','유물 조사','유물 {n}개 획득','relic'],
    ['potion','연금술 표본','포션 {n}개 획득','potion'],
    ['map','길잡이의 의뢰','맵 노드 {n}개 이동','map'],
    ['boss','계층의 증명','보스 전투 1회 승리','boss'],
    ['survival','불굴의 등반자','전투 {n}회 생존','survival']
  ];
  const GRADES=['F','E','D','C','B','A','S'];
  const general=[];
  for(let floor=1;floor<=5;floor++)for(let i=0;i<QUEST_TEMPLATES.length;i++){
    const [kind,name,objective,metric]=QUEST_TEMPLATES[i],target=kind==='boss'?1:Math.max(1,Math.min(8,floor+1+(i%3)));
    const grade=GRADES[Math.min(GRADES.length-1,Math.floor((floor-1)*1.25+i/8))];
    general.push({id:`GQ-F${floor}-${String(i+1).padStart(2,'0')}`,name:`${name} ${floor}`,kind,metric,grade,floor,target,objective:objective.replace('{n}',target),sanctuaryExclusive:false});
  }
  const sanctuary=[
    {id:'GQ-SAN-C01',name:'성역의 작은 심부름',kind:'sanctuary',metric:'sanctuary',grade:'C',floor:1,target:2,objective:'성역 서비스 2회 이용',sanctuaryExclusive:true,reward:{type:'TEMP_ACTIVITY',visits:1}},
    {id:'GQ-SAN-C02',name:'순례자의 길잡이',kind:'sanctuary',metric:'map',grade:'C',floor:1,target:5,objective:'맵 노드 5개 이동',sanctuaryExclusive:true,reward:{type:'TEMP_ACTIVITY',visits:1}},
    {id:'GQ-SAN-B01',name:'성역 관리인의 부탁',kind:'sanctuary',metric:'sanctuary',grade:'B',floor:2,target:3,objective:'서로 다른 성역 서비스 3종 이용',sanctuaryExclusive:true,reward:{type:'TEMP_ACTIVITY',visits:3}},
    {id:'GQ-SAN-B02',name:'긴 순례의 기록',kind:'sanctuary',metric:'survival',grade:'B',floor:2,target:4,objective:'전투 4회 생존',sanctuaryExclusive:true,reward:{type:'TEMP_ACTIVITY',visits:3}},
    {id:'GQ-SAN-A01',name:'성역의 공인',kind:'sanctuary',metric:'boss',grade:'A',floor:3,target:1,objective:'보스 전투 1회 승리',sanctuaryExclusive:true,reward:{type:'MAX_ACTIVITY',amount:1}}
  ];
  window.GUILD_QUEST_DATABASE=[...general,...sanctuary];

  const FOOD_NAMES=[
    '검은빵과 치즈','묽은 보리죽','구운 뿌리채소','허브 달걀찜','닭고기 수프','버섯 스튜','소금절임 생선','따뜻한 우유',
    '사냥꾼 샌드위치','호밀 파이','훈제 소시지','콩과 베이컨','양파 그라탱','말린 과일죽','채소 오믈렛','향신료 감자',
    '산양 치즈 플래터','닭고기 포토푀','붉은콩 스튜','허브 송어구이','고기와 버섯 파이','크림 수프','향초 돼지구이','순례자 도시락',
    '장미 꿀 타르트','기름진 오리구이','성곽식 고기찜','시계탑 티 세트','성녀의 흰 수프','용병식 철판구이','겨울 사슴 스튜','비취 허브면',
    '황금향 만찬','별빛 생선구이','교단 축일 파이','정령의 과실 샐러드','달빛 양갈비','왕실 버섯 리조토','심연 문어구이',
    '성역 특선 정찬','수호자의 연회','마녀의 향신 만찬','북부 족장의 식탁','고해사의 축일상','기사단 대연회','점성술사의 별미','탑지기의 만찬',
    '천상의 일곱 접시'
  ];
  const gradeFor=i=>i<8?'F':i<16?'E':i<24?'D':i<32?'C':i<39?'B':i<47?'A':'S';
  const PRICE={F:20,E:25,D:30,C:35,B:40,A:50,S:60};
  window.INN_FOOD_DATABASE=FOOD_NAMES.map((name,i)=>{
    const grade=gradeFor(i),mode=i%3;
    return {id:`FOOD-${String(i+1).padStart(2,'0')}`,name,grade,price:PRICE[grade],desc:mode===0?'다음 3회 전투 시작 시 방어 획득':mode===1?'다음 3회 전투의 첫 턴 공격 피해 증가':'다음 3회 전투의 첫 턴 드로우 증가',block:mode===0?4+Math.floor(i/12):0,attack:mode===1?1+Math.floor(i/16):0,draw:mode===2?1:0,duration:3};
  });

  const activityEvents=[
    ['SAN-E01','상단 조우','탑을 오르던 상단이 다음 성역을 위한 물자를 나누어 줍니다.'],
    ['SAN-E02','모험가 파티 조우','귀환 중인 모험가들이 성역 이용권을 건넵니다.'],
    ['SAN-E03','기사단 조우','순찰 기사단이 성역에 전할 공문을 맡깁니다.'],
    ['SAN-E04','학자 조우','탑을 조사하던 학자가 성역 관리인의 추천서를 써 줍니다.']
  ].map(([event_id,name,notes])=>({event_id,name,category:'common',floor_min:1,floor_max:5,character:null,trigger:'event_node',base_chance:null,forced_before:null,prerequisite:null,unique_per_run:true,max_visits:1,choices:[{id:'accept',label:'도움을 받는다',cost:null,reward:'SANCTUARY_TEMP_ACTIVITY:1'},{id:'decline',label:'정중히 사양한다',cost:null,reward:null}],cost:null,reward:null,combat_type:null,blessing:null,curse:null,arcana:null,potion:null,relic:null,event_only:false,notes}));
  const goldenLand={event_id:'GLD-E01',name:'황금빛 초대장',category:'common',floor_min:2,floor_max:4,character:null,trigger:'event_node',base_chance:null,forced_before:null,prerequisite:null,unique_per_run:true,max_visits:1,choices:[{id:'enter',label:'황금향에 입장한다',cost:null,reward:'GOLDEN_LAND_ENTRY'},{id:'decline',label:'초대를 거절한다',cost:null,reward:null}],cost:null,reward:null,combat_type:null,blessing:null,curse:null,arcana:null,potion:null,relic:null,event_only:true,notes:'이벤트로만 입장 가능한 이차원 카지노. 거절해도 이번 런에는 다시 등장하지 않습니다.'};
  window.EVENT_DATABASE.push(...activityEvents,goldenLand);
})();
