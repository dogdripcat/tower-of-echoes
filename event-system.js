/* Authoritative v0.56 event resolver: 83 definitions, deterministic eligibility, save-safe progress. */
(()=>{
  const heroName=()=>HEROES[state.hero]?.name;
  const events=()=>window.EVENT_DATABASE||[];
  const progress=()=>state.eventProgress??={completed:[],visits:{},floorVisits:{},awakening:false,transcendence:false,dragonLegacy:false};
  const completed=id=>progress().completed.includes(id);
  const mark=e=>{const p=progress();p.visits[e.event_id]=(p.visits[e.event_id]||0)+1;if(e.unique_per_run&&!p.completed.includes(e.event_id))p.completed.push(e.event_id);if(e.category==='awakening')p.awakening=true;if(e.category==='transcendence')p.transcendence=true;if(e.category==='a_potion')p.dragonLegacy=true;if(e.category==='arcana')p.floorVisits[`arcana:${state.stage+1}`]=true};
  const canVisit=e=>!e.unique_per_run||!completed(e.event_id)&&(progress().visits[e.event_id]||0)<(e.max_visits||1);
  const hasTranscendence=()=>state.deck?.some(c=>c.extra==='awakening-transcendence'||c.type==='초월');
  const eligible=e=>canVisit(e)&&(!e.character||e.character===heroName())&&state.stage+1>=e.floor_min&&state.stage+1<=e.floor_max&&(!e.prerequisite||e.prerequisite==='AWAKENING_EVENT_COMPLETED'&&progress().awakening||e.prerequisite==='TRANSCENDENCE_OBTAINED'&&hasTranscendence());
  const pick=list=>list[Math.floor(Math.random()*list.length)];
  const money={GOLD_SMALL:20,GOLD_MEDIUM:40,GOLD_HIGH:70};
  const awakeningSpecs=()=>AWAKENING_RULES[heroName()]||[];
  const transcendId=()=>`${({벨:'BEL',세라핀:'SER',루미에라:'LUM',베르나:'VER',이리스:'IRI',카렌:'KAR',이레:'IRE'})[heroName()]}-TRN-01`;
  function makeSpecial(spec,transcendence=false){
    const canonical=window.TOE_CARD_RUNTIME?.database.cards.find(c=>c.hero===heroName()&&c.type===(transcendence?'초월':'각성')&&(transcendence||c.id===spec.id));
    if(canonical){const c=window.TOE_CARD_RUNTIME.make(canonical);c.awakeningId=transcendence?transcendId():spec.id;if(transcendence){c.name=`${spec.name} - 극`;c.effect='각성한 5장 중 1장을 직접 선택해 초월 · 유일 · 소멸'}return c}
    const c=card(transcendence?`${spec.name} - 극`:spec.name,transcendence?2:1,transcendence?'초월':'각성',transcendence?'각성한 5장 중 1장 초월 · 유일 · 소멸':`${spec.effect} · 덱에서 5장 선택 · 유일 · 소멸`,0,transcendence?'#ffdf98':'#cb9fff','#292038',transcendence?'awakening-transcendence':'awakening-card');
    c.awakeningId=transcendence?transcendId():spec.id;c.exhaust=true;c.properties=[{keyword:'유일'},{keyword:'소멸'}];return c;
  }
  function grantAwakening(label){if(state.deck.some(c=>c.extra==='awakening-card'))return;const spec=awakeningSpecs().find(x=>x.name===label);if(spec)state.deck.push(makeSpecial(spec))}
  function grantTranscendence(){if(hasTranscendence())return;const oath=state.deck.find(c=>c.extra==='awakening-card'),spec=awakeningSpecs().find(x=>x.id===oath?.awakeningId)||awakeningSpecs()[0];if(spec)state.deck.push(makeSpecial(spec,true))}
  function addBlessing(e){const cap=state.stage+1,item={name:e.name,desc:'이 계층에서 얻은 이벤트 축복입니다.'};state.blessings??=[];if(state.blessings.length>=cap)state.blessings.shift();state.blessings.push(item)}
  function addCurse(e){state.curses??=[];state.curses.push({name:e.name,desc:'대가를 받아들여 얻은 이벤트 저주입니다.'})}
  function addDragon(name){const base=POTION_DATABASE.find(x=>x.name===name);if(!base||(state.inventory||[]).filter(x=>x.type==='potion').length>=POTION_SLOT_LIMIT)return false;state.inventory.push({...base,potionId:base.id,type:'potion',id:crypto.randomUUID(),icon:'🧪',w:1,h:1});state.potions++;renderBag();return true}
  function addEventRelic(){const base=RELIC_DATABASE.find(x=>x.eventOnly&&!state.inventory.some(y=>y.relicId===x.id));if(!base)return false;const item={...base,relicId:base.id,type:'relic',id:crypto.randomUUID()};if(!packBag([...state.inventory,item]))return false;state.inventory.push(item);state.relics++;renderBag();return true}
  function cardTask(kind,done){
    const filter=c=>kind!=='remove'||state.deck.length>1;
    if(typeof openCardChoice==='function'&&openCardChoice(kind,filter,c=>{if(kind==='upgrade')upgradeChosenCard(c);else if(kind==='remove')state.deck.splice(state.deck.findIndex(x=>x.id===c.id),1);else{c.value=Math.max(0,(c.value||0)+2);c.effect=`${c.effect} · 변환됨`}done();return true}))return;
    done();
  }
  function resolve(e,ch,done){
    const reward=ch.reward,cost=ch.cost;
    if(cost==='HP_SMALL')state.hp=Math.max(1,state.hp-6);if(cost==='HP_MEDIUM')state.hp=Math.max(1,state.hp-12);if(cost==='HP_HIGH')state.hp=Math.max(1,state.hp-20);if(cost==='MAX_HP_SMALL'){state.maxHp=Math.max(1,state.maxHp-4);state.hp=Math.min(state.hp,state.maxHp)}if(money[cost])state.gold=Math.max(0,state.gold-money[cost]);
    const finish=()=>{mark(e);sync();done()};
    if(reward==='CARD_UPGRADE')return cardTask('upgrade',finish);if(reward==='CARD_REMOVE')return cardTask('remove',finish);if(reward==='CARD_TRANSFORM')return cardTask('transform',finish);
    if(reward?.startsWith('SANCTUARY_TEMP_ACTIVITY:')){window.TOE_SANCTUARY?.queueActivityVisits(Number(reward.split(':')[1])||1);return finish()}
    if(reward==='GOLDEN_LAND_ENTRY'){mark(e);sync();return window.TOE_GOLDEN_LAND?.enter({source:'event',eventId:e.event_id,onExit:done})||done()}
    if(reward==='HP_RECOVER')state.hp=Math.min(state.maxHp,state.hp+12);else if(reward==='GOLD_MEDIUM')state.gold+=money.GOLD_MEDIUM;else if(reward==='GOLD_HIGH')state.gold+=money.GOLD_HIGH;else if(reward==='POTION')addInventoryItem('potion');else if(reward==='RELIC'||reward==='VALUABLE_RELIC')addInventoryItem('relic','event');else if(reward==='MAP_REVEAL')state.revealNextNode=true;else if(reward==='BLESSING')addBlessing(e);else if(ch.cost==='CURSE')addCurse(e);else if(reward?.startsWith('AWAKENING:'))grantAwakening(reward.split(':')[1]);else if(reward==='TRANSCENDENCE_CARD')grantTranscendence();else if(e.category==='a_potion')addDragon(reward);else if(reward==='EVENT_ONLY_RELIC')addEventRelic();else if(reward==='ARCANA_CHARGE')window.TOE_ARCANA?.addGauge(state,20,'event');else if(reward==='ARCANA_SELECT_3'){state.arcanaContentStatus=window.ARCANA_CONTENT_STATUS||'ARCANA_CONTENT_BLOCKED';state.arcanaSelectionPending=true}
    finish();
  }
  function show(e,done=finishMapRoom){
    $('#modal').className='modal event-modal';const category={floor:'계층 이벤트',common:'공통 이벤트',blessing:'축복',curse:'저주',arcana:'아르카나',a_potion:'용의 유산',event_relic:'초월 유물',awakening:'각성',transcendence:'초월'}[e.category]||'이벤트';
    $('#modal').innerHTML=`<span class="tag">${category}</span><h2>${e.name}</h2><p>${e.notes||'탑의 기척이 선택을 재촉합니다.'}</p><div class="choices">${e.choices.map((c,i)=>`<button class="choice" type="button" data-event-choice="${i}"><strong>${c.label}</strong>${c.cost?`대가: ${money[c.cost]?c.cost:`${c.cost}`}`:'대가 없음'}</button>`).join('')}</div>`;
    document.querySelectorAll('[data-event-choice]').forEach(b=>b.onclick=()=>resolve(e,e.choices[+b.dataset.eventChoice],done));
  }
  function characterEvent(category){return events().find(e=>e.category===category&&e.character===heroName()&&eligible(e))}
  function normalEvent(){
    const benefits=state.hubProgress?.benefits||{};
    const awakening=characterEvent('awakening');if(awakening){const boosted=benefits.BOND_RECOMMENDATION;delete benefits.BOND_RECOMMENDATION;if(Math.random()<(boosted?.50:awakening.base_chance))return awakening}
    const transcendence=characterEvent('transcendence');if(transcendence){const boosted=benefits.BOND_RECOMMENDATION;delete benefits.BOND_RECOMMENDATION;if(Math.random()<(boosted?.20:transcendence.base_chance))return transcendence}
    const special=events().filter(e=>['event_relic','a_potion'].includes(e.category)&&eligible(e));
    const secret=benefits.SECRET_RELIC_ORDER&&special.some(e=>e.category==='event_relic');
    if(secret)delete benefits.SECRET_RELIC_ORDER;
    if(special.length&&Math.random()<.12){const weighted=special.flatMap(e=>Array(e.category==='event_relic'?(secret?6:3):3).fill(e));return pick(weighted)}
    const arcana=events().find(e=>e.category==='arcana'&&eligible(e)&&!progress().floorVisits[`arcana:${state.stage+1}`]);if(arcana&&Math.random()<.05)return arcana;
    const pool=events().filter(e=>['floor','common','blessing','curse'].includes(e.category)&&eligible(e));return pick(pool);
  }
  window.eventRoom=()=>show(normalEvent());
  const previousBossGate=showBossGate;
  window.showBossGate=function(){
    const forced=state.stage===2?characterEvent('awakening'):state.stage===4?characterEvent('transcendence'):null;
    if(forced)return show(forced,previousBossGate);previousBossGate();
  };
  const previousLoad=loadGame;
  window.loadGame=function(){previousLoad();const p=progress();if(state.deck?.some(c=>c.extra==='awakening-card'))p.awakening=true;if(state.deck?.some(c=>c.extra==='awakening-transcendence'||c.type==='초월'))p.transcendence=true};
  window.TOE_EVENT_SYSTEM={eligible,normalEvent,characterEvent,mark,completed,progress,show};
})();
