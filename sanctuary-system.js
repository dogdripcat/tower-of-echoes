/* Tower of Echoes v1.1.1 — Sanctuary activity, Inn, meal, and save migration. */
(()=>{
  const BASE_ACTIVITY=3,HARD_CAP=5;
  const REST_PRICES=[35,50,65,80,95];
  const LEGACY_MEALS={
    hearty:{name:'든든한 식사',price:30,desc:'다음 3회 전투 시작 시 방어 8',block:8},
    lean:{name:'담백한 식사',price:40,desc:'다음 3회 전투의 1턴 공격 피해 +2',attack:2},
    soup:{name:'따뜻한 수프',price:40,desc:'다음 3회 전투의 1턴 드로우 +1',draw:1},
    feast:{name:'성역 특선',price:60,desc:'다음 3회 전투 시작 시 방어 6 · 1턴 드로우 +1',block:6,draw:1}
  };
  const FOODS=window.INN_FOOD_DATABASE||Object.entries(LEGACY_MEALS).map(([id,meal])=>({id,...meal,grade:'C',duration:3}));
  const MEALS=Object.fromEntries(FOODS.map(meal=>[meal.id,meal]));
  const mealSpec=id=>MEALS[id]||LEGACY_MEALS[id];
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const FACILITIES=['merchant','blacksmith','enchanter','alchemist','confessor','guild','inn'];
  const counters=source=>Object.fromEntries(FACILITIES.map(key=>[key,Math.max(0,Number(source?.[key])||0)]));
  const facilityOf=reason=>{const key=String(reason||'').split(':')[0].toLowerCase();return FACILITIES.includes(key)?key:null};
  function ensure(){
    const old=state.sanctuary||{};
    const modifiers={activityMaxBonus:0,restEfficiencyBonus:0,mealEfficiencyBonus:0,mealDurationBonus:0,innPriceMultiplier:1,...old.modifiers};
    const permanentRelics=(state.inventory||[]).filter(item=>item.type==='relic'&&item.effect==='sanctuaryActivityMax').length;
    const maxActivity=clamp(Math.max(Number(old.maxActivity)||BASE_ACTIVITY,BASE_ACTIVITY+permanentRelics),BASE_ACTIVITY,HARD_CAP);
    const activityBonusVisits=clamp(Number(old.activityBonusVisits)||0,0,5),activeVisitBonus=clamp(Number(old.activeVisitBonus)||0,0,1);
    const previousTelemetry=old.telemetry||{};
    const telemetry={unique_sanctuary_entry:Math.max(0,Number(previousTelemetry.unique_sanctuary_entry)||0),entered_node_ids:Array.isArray(previousTelemetry.entered_node_ids)?[...new Set(previousTelemetry.entered_node_ids.map(String))]:[],facility_entry:counters(previousTelemetry.facility_entry),paid_facility_use:counters(previousTelemetry.paid_facility_use),activity_gained:Math.max(0,Number(previousTelemetry.activity_gained)||0),activity_spent:Math.max(0,Number(previousTelemetry.activity_spent)||0),activity_remaining:clamp(Number(previousTelemetry.activity_remaining??old.activity)||0,0,maxActivity+activeVisitBonus),activity_shortage_failures:counters(previousTelemetry.activity_shortage_failures)};
    telemetry.unique_sanctuary_entry=Math.max(telemetry.unique_sanctuary_entry,telemetry.entered_node_ids.length);
    Object.assign(old,{schemaVersion:4,maxActivity,activity:clamp(Number(old.activity)||0,0,maxActivity+activeVisitBonus),pendingActivityMax:clamp(Number(old.pendingActivityMax)||0,0,HARD_CAP-BASE_ACTIVITY),activityBonusVisits,activeVisitBonus,currentNodeId:old.currentNodeId||null,sessions:old.sessions||{},stocks:old.stocks||{},randomResults:old.randomResults||{},innUsed:Boolean(old.innUsed),meal:old.meal||null,menus:old.menus||{},combatSerial:Number(old.combatSerial)||0,lastCompletedCombatToken:old.lastCompletedCombatToken||null,modifiers,telemetry,lastSpend:old.lastSpend||null});
    state.sanctuary=old;
    for(const item of state.inventory||[])if(item.type==='relic'&&item.effect==='sanctuaryActivityVisit'&&!item.sanctuaryActivityApplied){state.sanctuary.activityBonusVisits=clamp(state.sanctuary.activityBonusVisits+(Number(item.amount)||1),0,5);item.sanctuaryActivityApplied=true}
    if(state.sanctuary.meal){state.sanctuary.meal.remaining=Math.max(0,Number(state.sanctuary.meal.remaining)||0);if(!state.sanctuary.meal.remaining)state.sanctuary.meal=null}
    return state.sanctuary;
  }
  function enter(nodeId){
    const s=ensure(),id=String(nodeId||state.map?.active||`F${state.stage+1}-SANCTUARY`);
    if(s.currentNodeId!==id){
      s.maxActivity=clamp(s.maxActivity+s.pendingActivityMax,BASE_ACTIVITY,HARD_CAP);s.pendingActivityMax=0;
      s.activeVisitBonus=s.activityBonusVisits>0?1:0;if(s.activeVisitBonus)s.activityBonusVisits--;
      s.currentNodeId=id;s.activity=s.maxActivity+s.activeVisitBonus;s.sessions={};s.stocks={};s.randomResults={};s.innUsed=false;
      if(!s.telemetry.entered_node_ids.includes(id)){s.telemetry.entered_node_ids.push(id);s.telemetry.unique_sanctuary_entry++}
      s.telemetry.activity_gained+=s.activity;s.telemetry.activity_remaining=s.activity;
    }
    return s;
  }
  function trackFacilityEntry(role){const s=ensure(),facility=facilityOf(role);if(!facility)return false;s.telemetry.facility_entry[facility]++;sync?.();return true}
  function spend(reason,amount=1){const s=ensure(),cost=Math.max(0,Number(amount)||0),facility=facilityOf(reason);if(s.activity<cost){if(facility)s.telemetry.activity_shortage_failures[facility]++;sync?.();return false}s.activity-=cost;s.lastAction=reason;s.lastSpend={facility,amount:cost};s.telemetry.activity_spent+=cost;s.telemetry.activity_remaining=s.activity;if(facility)s.telemetry.paid_facility_use[facility]++;if(!String(reason).startsWith('guild:'))window.TOE_HUB?.trackProgress('sanctuary',1,facility);sync?.();return true}
  function refund(amount=1){const s=ensure(),value=Math.max(0,Number(amount)||0),actual=Math.min(value,s.maxActivity+s.activeVisitBonus-s.activity);s.activity+=actual;s.telemetry.activity_spent=Math.max(0,s.telemetry.activity_spent-actual);s.telemetry.activity_remaining=s.activity;if(actual&&s.lastSpend?.facility)s.telemetry.paid_facility_use[s.lastSpend.facility]=Math.max(0,s.telemetry.paid_facility_use[s.lastSpend.facility]-1);s.lastSpend=null;sync?.()}
  function beginSession(role){const s=ensure();if(s.sessions[role])return true;if(!spend(`${role}:session`))return false;s.sessions[role]=true;return true}
  function sessionStarted(role){return Boolean(ensure().sessions[role])}
  function queueActivityUpgrade(amount=1){const s=ensure(),room=Math.max(0,HARD_CAP-s.maxActivity-s.pendingActivityMax),gain=Math.min(room,Math.max(0,amount));s.pendingActivityMax+=gain;sync?.();return gain}
  function queueActivityVisits(visits=1){const s=ensure();s.activityBonusVisits=clamp(s.activityBonusVisits+Math.max(0,Number(visits)||0),0,5);sync?.();return s.activityBonusVisits}
  function statusHTML(){const s=ensure(),meal=s.meal?`${s.meal.name} · ${s.meal.remaining}회`:'식사 효과 없음';return `<div class="sanctuary-status"><span>보유 골드 <b data-sanctuary-gold>${state.gold}</b>G</span><span>성역 활동력 <b data-sanctuary-activity>${s.activity}</b> / ${s.maxActivity}</span><span>${meal}</span></div>`}
  function updateStatus(){document.querySelectorAll('[data-sanctuary-gold]').forEach(n=>n.textContent=state.gold);document.querySelectorAll('[data-sanctuary-activity]').forEach(n=>n.textContent=ensure().activity)}
  function activityAvailable(){return ensure().activity>0}
  function price(base){return Math.max(0,Math.round(base*(ensure().modifiers.innPriceMultiplier||1)))}
  function efficiency(kind){return Math.max(0,1+(Number(ensure().modifiers[kind])||0))}
  function seededIndex(seed,length){let x=(Number(seed)||0)>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;return length?Math.abs(x>>>0)%length:0}
  function menuForFloor(){
    const s=ensure(),key=String(state.stage+1);if(s.menus[key])return s.menus[key];
    const seed=(Number(state.map_seed)||Number(state.map?.seed)||0)+(state.stage+1)*7919;
    const regular=FOODS.filter(food=>['C','B','A','S'].includes(food.grade)),today=FOODS.filter(food=>['F','E','D','C','B'].includes(food.grade));
    const selected=[];for(let i=0;i<4;i++){const pool=regular.filter(food=>!selected.includes(food.id));selected.push(pool[seededIndex(seed+i*104729,pool.length)].id)}
    s.menus[key]={regular:selected,today:today[seededIndex(seed+49999,today.length)].id};return s.menus[key];
  }
  function openInn(nav,bindNav,back,message='',view='lobby'){
    const s=ensure(),restPrice=price(REST_PRICES[state.stage]||REST_PRICES.at(-1)),heal=Math.ceil(state.maxHp*.30*efficiency('restEfficiencyBonus')),menu=menuForFloor();
    const rows=[...menu.regular.map(id=>({meal:MEALS[id],today:false})),{meal:MEALS[menu.today],today:true}];
    const disabled=s.innUsed||!activityAvailable();
    document.getElementById('modal').className='modal specialist-modal hub-room inn';
    const choices=view==='lobby'?`<div class="inn-services"><button type="button" data-inn-view="rest"><span><strong>휴식한다</strong><small>회복 서비스를 확인합니다.</small></span></button><button type="button" data-inn-view="meal"><span><strong>식사한다</strong><small>현재 메뉴에서 식사를 선택합니다.</small></span></button><button type="button" data-inn-back><span><strong>돌아간다</strong><small>성역으로 돌아갑니다.</small></span></button></div>`:view==='rest'?`<div class="inn-services"><button type="button" data-inn-rest ${disabled||state.gold<restPrice?'disabled':''}><span><strong>휴식</strong><small>최대 HP의 30% 회복 · 실제 ${heal} HP</small></span><b>${restPrice}G · 활동력 1</b></button></div>`:`<div class="inn-services">${rows.map(({meal,today})=>{const mealPrice=price(Math.round(meal.price*(today ? .75 : 1)));return `<button type="button" data-inn-meal="${meal.id}" data-inn-today="${today?'1':'0'}" ${disabled||state.gold<mealPrice?'disabled':''}><span><strong>${today?'오늘의 메뉴 · ':''}${meal.name} [${meal.grade}]</strong><small>${meal.desc}</small></span><b>${mealPrice}G · 활동력 1</b></button>`}).join('')}</div>`;
    document.getElementById('modal').innerHTML=`${nav}<div class="specialist-header"><div><span class="tag">성역 · 여관</span><h2>여관</h2><p>“지친 걸음도 무거운 마음도, 이곳에서는 잠시 내려놓으세요.”</p></div>${statusHTML()}</div><div class="inn-room-scene"><img src="assets/npc-innkeeper-cutout-v1.png" alt="여관주인"></div>${choices}<div class="merchant-footer"><span id="specialistNotice">${message||`${s.innUsed?'이번 성역에서 이미 이용했습니다.':'대화와 메뉴 확인은 무료이며, 실제 이용 확정 시 활동력 1을 사용합니다.'}`}</span>${view!=='lobby'?'<button type="button" id="innBack">← 서비스 선택</button>':''}<button type="button" class="primary" id="specialistLeave">성역으로</button></div>`;
    bindNav();document.getElementById('specialistLeave').onclick=back;
    document.querySelectorAll('[data-inn-view]').forEach(button=>button.onclick=()=>openInn(nav,bindNav,back,'',button.dataset.innView));
    document.querySelector('[data-inn-back]')?.addEventListener('click',back);
    document.getElementById('innBack')?.addEventListener('click',()=>openInn(nav,bindNav,back));
    const commit=(gold,run,label)=>{if(s.innUsed||state.gold<gold||!spend(`inn:${label}`))return false;state.gold-=gold;s.innUsed=true;run();sync();openInn(nav,bindNav,back,`${label} 이용 완료`);return true};
    document.querySelector('[data-inn-rest]')?.addEventListener('click',()=>commit(restPrice,()=>{state.hp=Math.min(state.maxHp,state.hp+heal)},'휴식'));
    document.querySelectorAll('[data-inn-meal]').forEach(button=>button.onclick=()=>{const id=button.dataset.innMeal,meal=MEALS[id],gold=price(Math.round(meal.price*(button.dataset.innToday==='1' ? .75 : 1)));if(s.meal&&s.meal.id!==id&&button.dataset.replaceConfirmed!=='1'){button.dataset.replaceConfirmed='1';document.getElementById('specialistNotice').textContent=`${s.meal.name} 효과가 사라집니다. 다시 선택하면 ${meal.name}(으)로 교체합니다.`;return}commit(gold,()=>{s.meal={id,name:meal.name,remaining:meal.duration+Math.max(0,Number(s.modifiers.mealDurationBonus)||0)}},meal.name)});
  }
  function eligibleBattle(kind){return ['normal','elite','boss','event','hard'].includes(String(kind||'').toLowerCase())}
  function applyMealAtBattleStart(kind){
    const s=ensure(),meal=s.meal;if(!meal||!eligibleBattle(kind))return;
    const spec=mealSpec(meal.id);if(!spec)return;
    const scale=efficiency('mealEfficiencyBonus'),token=++s.combatSerial;
    state.sanctuaryCombatMeal={token,id:meal.id,eligible:true};
    if(spec.block){const amount=Math.ceil(spec.block*scale);state.block=(state.block||0)+amount;spawnCombatFx?.('guard',amount,'hero')}
    if(spec.draw){drawCards?.(Math.max(1,Math.ceil(spec.draw*scale)))}
    renderBattle?.(`${meal.name} 효과가 적용되었습니다.`);
  }
  function finishMealCombat(){
    const s=ensure(),combat=state.sanctuaryCombatMeal;if(!combat?.eligible||s.lastCompletedCombatToken===combat.token)return;
    s.lastCompletedCombatToken=combat.token;if(s.meal){s.meal.remaining=Math.max(0,s.meal.remaining-1);if(!s.meal.remaining)s.meal=null}state.sanctuaryCombatMeal=null;
  }
  const priorStart=window.startBattle;
  if(priorStart)window.startBattle=function(kind,...args){const result=priorStart.call(this,kind,...args);applyMealAtBattleStart(state.encounterKind||kind);return result};
  const priorUse=window.useCard;
  if(priorUse)window.useCard=function(id,...args){const c=state.hand?.find(card=>card.id===id),combat=state.sanctuaryCombatMeal,spec=combat&&mealSpec(combat.id),attack=c&&(c.type==='공격'||c.extra==='attack'||c.extra==='special'),turnOne=state.turn===1;const original=c?.value;if(c&&attack&&turnOne&&spec?.attack)c.value=(c.value||0)+Math.ceil(spec.attack*efficiency('mealEfficiencyBonus'));try{return priorUse.call(this,id,...args)}finally{if(c)c.value=original}};
  const priorWin=window.winBattle;
  if(priorWin)window.winBattle=function(...args){finishMealCombat();return priorWin.apply(this,args)};
  const priorLoad=window.loadGame;
  if(priorLoad)window.loadGame=function(...args){const result=priorLoad.apply(this,args);ensure();return result};
  window.TOE_SANCTUARY={ensure,enter,spend,refund,beginSession,sessionStarted,trackFacilityEntry,queueActivityUpgrade,queueActivityVisits,statusHTML,updateStatus,activityAvailable,openInn,menuForFloor,foods:FOODS,meals:MEALS,restPrices:REST_PRICES};
  ensure();
})();
