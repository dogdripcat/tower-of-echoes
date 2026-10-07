/* Shared 7-character Awakening. Existing combat resolves the card's original effect. */
(()=>{
  const heroName=()=>HEROES[state.hero]?.name;
  const specs=()=>AWAKENING_RULES[heroName()]||[];
  const specFor=c=>specs().find(s=>s.id===(c?.awakeningId||c?.bellId));
  const isAwakening=c=>Boolean(specFor(c));
  const transcendId=()=>`${({벨:'BEL',세라핀:'SER',루미에라:'LUM',베르나:'VER',이리스:'IRI',카렌:'KAR',이레:'IRE'})[heroName()]}-TRN-01`;
  const isTranscendence=c=>c?.awakeningId===transcendId()||c?.bellId===transcendId();
  const selectedSpec=()=>specs().find(s=>s.id===state.awakeningState?.id);
  const transcendName=()=>`${specs().find(s=>s.id===(state.deck.find(isAwakening)?.awakeningId||state.deck.find(isAwakening)?.bellId))?.name||selectedSpec()?.name||'각성명'} - 극`;
  const eligible=c=>c&&!isAwakening(c)&&!isTranscendence(c);
  function create(spec,kind){
    const ultimate=kind==='transcendence';const name=ultimate?`${spec.name} - 극`:spec.name;
    const c=card(name,ultimate?2:1,ultimate?'초월':'각성',ultimate?'각성한 5장 중 1장을 직접 선택해 초월 · 유일 · 소멸':`${spec.effect} · 덱에서 5장 선택 · 유일 · 소멸`,0,ultimate?'#ffdf98':'#cb9fff','#292038',ultimate?'awakening-transcendence':'awakening-card');
    c.awakeningId=ultimate?transcendId():spec.id;c.exhaust=true;c.properties=[{keyword:'유일'},{keyword:'소멸'}];return c;
  }
  globalThis.TOE_AWAKENING_FACTORY={create,isAwakening,isTranscendence};
  function choice(title,candidates,count,done){
    document.getElementById('awakeningChoice')?.remove();
    const chosen=new Set(),host=document.createElement('div');host.className='awakening-choice-overlay';host.id='awakeningChoice';
    host.innerHTML=`<div class="awakening-choice-dialog" role="dialog" aria-modal="true" aria-label="${title}"><h2>${title}</h2><p class="awakening-choice-progress" aria-live="polite"></p><div class="awakening-choice-grid"></div><button type="button" class="primary awakening-choice-confirm" disabled>선택 완료</button></div>`;
    const grid=host.querySelector('.awakening-choice-grid'),progress=host.querySelector('.awakening-choice-progress'),confirm=host.querySelector('.awakening-choice-confirm');
    for(const c of candidates){const b=document.createElement('button');b.type='button';b.className='awakening-choice-card';b.innerHTML='<strong></strong><small></small><span></span>';b.querySelector('strong').textContent=c.name;b.querySelector('small').textContent=c.type;b.querySelector('span').textContent=c.effect;b.onclick=()=>{if(chosen.has(c.id)){chosen.delete(c.id);b.classList.remove('selected')}else if(chosen.size<count){chosen.add(c.id);b.classList.add('selected')}progress.textContent=`${chosen.size} / ${count}장 선택`;confirm.disabled=chosen.size!==count};grid.append(b)}
    progress.textContent=`0 / ${count}장 선택`;confirm.onclick=()=>{if(chosen.size!==count)return;host.remove();done([...chosen])};document.body.append(host);host.querySelector('button')?.focus();
  }
  function spend(c){const cost=state.dragonWingFree?0:Math.max(0,Number.isFinite(c.actionCost)?c.actionCost:c.cost);if(cost>state.mana)return false;state.mana-=cost;state.hand.splice(state.hand.indexOf(c),1);state.exhaust.push(c);state.previousCardType=null;return true}
  const previousUpgrade=upgradeChosenCard;
  upgradeChosenCard=function(c){
    if(!isAwakening(c)&&!isTranscendence(c))return previousUpgrade(c);
    if(cardUpgradeLevel(c)>=3)return false;
    c.name+='*';c.awakeningUpgrade=(c.awakeningUpgrade||0)+1;
    if(isTranscendence(c)){c.cost=Math.max(0,2-c.awakeningUpgrade);c.actionCost=c.cost}
    else c.effect=`${specFor(c).extreme} · 덱에서 5장 선택 · 유일 · 소멸`;
    return true;
  };
  const previousUse=useCard;
  useCard=function(id,targetId=''){
    const c=state.hand.find(x=>x.id===id);if(!c)return;
    const action=state.dragonWingFree?0:Math.max(0,(Number.isFinite(c.actionCost)?c.actionCost:c.cost)-(hasCardProperty(c,'신속')?(c.swiftPlays||0):0));
    const inner=state.dragonWingFree?0:Number.isFinite(c.innerCost)?c.innerCost:0;if(action>state.mana||inner>state.innerQi)return;
    if(isAwakening(c)){
      const candidates=state.deck.filter(eligible);if(state.awakeningState||candidates.length<5||!spend(c))return;
      const spec=specFor(c);renderBattle();choice(`${spec.name} · 각성할 카드 5장`,candidates,5,ids=>{
        state.awakeningState={id:spec.id,color:spec.color,selectedIds:ids};
        if(heroName()==='이리스'&&spec.name==='인과'){state.summonCount=2;state.summonTwinHp=state.summonHp;state.summonTwinBlock=state.summonBlock}
        renderBattle();globalThis.TOE_COMBAT_MOTION?.applicationBurst(spec.color,false);sync();
      });return;
    }
    if(isTranscendence(c)){
      const ids=state.awakeningState?.selectedIds||[],candidates=ids.map(x=>state.deck.find(y=>y.id===x)).filter(Boolean);
      if(candidates.length!==5||state.transcendedId||!spend(c))return;
      renderBattle();choice(`${selectedSpec().name} - 극 · 초월할 카드 1장`,candidates,1,selected=>{state.transcendedId=selected[0];renderBattle();globalThis.TOE_COMBAT_MOTION?.applicationBurst(state.awakeningState?.color,true);sync()});return;
    }
    const spec=state.awakeningState?.selectedIds.includes(id)?selectedSpec():null;
    const target=targetId?state.enemies?.find(e=>e.id===targetId&&e.hp>0):currentTarget();
    const attack=c.extra==='attack'||c.extra==='special';
    const markBonus=heroName()==='벨'&&attack&&target?.marked?2*(target.markStacks||1):0;
    const blessing=heroName()==='루미에라'&&attack?(state.awakeningBlessing||0):0;
    const extreme=state.transcendedId===id,upgraded=Boolean(state.deck.find(x=>x.awakeningId===state.awakeningState?.id)?.awakeningUpgrade);
    const empowered=extreme||upgraded,boost=empowered?8:4;
    const before=target?.hp??0,original=c.value;
    if(attack)c.value+=(spec?.color==='red'?boost:0)+markBonus+(blessing?blessing*2:0);
    try{previousUse(id,targetId)}finally{c.value=original}
    if(markBonus){target.marked=false;target.markStacks=0}
    if(blessing)state.awakeningBlessing=0;
    if(heroName()==='이리스'&&state.summonCount===2&&c.extra==='special'&&target?.hp>0){const dealt=dealToEnemy(target,original);state.block+=4;state.summonTwinBlock=(state.summonTwinBlock||0)+2;spawnCombatFx('special',dealt,'enemy',target.id);if(!aliveEnemies().length){winBattle();return}}
    if(!spec)return;
    const active=document.body.classList.contains('in-battle')&&state.enemies?.some(e=>e.hp>0);
    // Killing an enemy with the Awakened card counts even if the normal combat resolver already opened rewards.
    if(spec.name==='장송'&&target&&before>0&&target.hp<=0){state.summonMaxHp=(state.summonMaxHp||5)+2;state.summonHp+=2}
    if(!active)return;
    if(spec.color==='red'){
      if(!attack&&target?.hp>0){const dealt=dealToEnemy(target,boost);spawnCombatFx('attack',dealt,'enemy',target.id)}
      if(spec.name==='혈월'&&target?.hp>0)target.bleed=(target.bleed||0)+(empowered?4:2);
      if(spec.name==='장송'&&!attack&&target&&before>0&&target.hp<=0){state.summonMaxHp=(state.summonMaxHp||5)+2;state.summonHp+=2}
    }else if(spec.color==='blue'){
      let guard=empowered?10:5;
      if(spec.name==='축성')guard=Math.max(0,state.summonHp||0)*(empowered?2:1);
      if(spec.name==='반진'){state.counterReduction=Math.max(state.counterReduction||0,empowered?4:2);state.counterDamage=Math.max(state.counterDamage||0,empowered?6:3);guard=0}
      if(spec.name==='연막')state.evasionCharges=Math.min(3,(state.evasionCharges||0)+(empowered?2:1));
      state.block+=guard;if(guard)spawnCombatFx('guard',guard,'hero');
    }else{
      state.awakeningGreenUsed??=[];const once=!state.awakeningGreenUsed.includes(id);
      if(once){state.awakeningGreenUsed.push(id);if(['기교','연산','강신','심안'].includes(spec.name)||spec.name==='인과'&&empowered)drawCards(empowered?2:1)}
      if(spec.name==='기교'&&once&&target?.hp>0){target.marked=true;target.markStacks=(target.markStacks||0)+(empowered?2:1)}
      if(spec.name==='연산'&&once)state.mana=Math.min(HEROES[state.hero].resourceMax,state.mana+(empowered?2:1));
      if(spec.name==='축복')state.awakeningBlessing=(state.awakeningBlessing||0)+(empowered?2:1);
      if(spec.name==='낙인'&&target?.hp>0){target.marked=true;target.markStacks=(target.markStacks||0)+(empowered?2:1)}
      if(spec.name==='심안'&&once)state.innerQi=Math.min(HEROES[state.hero].secondaryMax||3,state.innerQi+(empowered?2:1));
    }
    if(!aliveEnemies().length){winBattle();return}renderBattle();
  };
  const previousBattle=startBattle;
  startBattle=function(kind){state.awakeningState=null;state.transcendedId=null;state.awakeningGreenUsed=[];state.awakeningBlessing=0;state.evasionCharges=0;state.counterReduction=0;state.counterDamage=0;state.summonCount=1;state.summonTwinHp=0;state.summonTwinBlock=0;previousBattle(kind);if(heroName()==='이리스')state.summonMaxHp=5};
  const previousTurn=endTurn;
  endTurn=function(){state.awakeningGreenUsed=[];const before=state.turn;
    const after=()=>{if(state.turn===before)return;state.counterReduction=0;state.counterDamage=0;if(heroName()==='이리스'&&state.summonCount===2){state.summonTwinHp+=1;state.summonTwinBlock+=2}
      for(const enemy of aliveEnemies())if(enemy.bleed>0){const dealt=dealToEnemy(enemy,enemy.bleed);enemy.bleed--;spawnCombatFx('attack',dealt,'enemy',enemy.id)}
      if(!aliveEnemies().length){winBattle();return}renderBattle();
    };
    const result=previousTurn();if(result&&typeof result.then==='function')return result.then(after);after();
  };
  const previousRender=renderBattle;
  renderBattle=function(...args){previousRender(...args);const ids=state.awakeningState?.selectedIds||[];document.querySelectorAll('#hand .card').forEach((b,i)=>{const c=state.hand[i];if(c&&ids.includes(c.id)){b.classList.add(`awakened-${state.awakeningState.color}`);if(state.transcendedId===c.id)b.classList.add('transcended')}});if(heroName()==='이리스'&&state.summonCount===2){const span=document.createElement('span');span.textContent=`추가 집사 · HP ${state.summonTwinHp} · 방어 ${state.summonTwinBlock}`;$('#battleEffects').append(span)}};
  const previousLoad=loadGame;
  loadGame=function(){previousLoad();if(state.hero===null)return;const aliases=AWAKENING_LEGACY_NAMES[heroName()]||{};
    for(const c of state.deck||[]){const plain=c.name?.replace(/\*/g,'');const alias=aliases[plain];if(!c.awakeningId&&alias)c.awakeningId=alias;if(c.bellId&&!c.awakeningId)c.awakeningId=c.bellId;c.awakeningId=AWAKENING_SOURCE_IDS[c.awakeningId]||c.awakeningId;
      if(isAwakening(c)||isTranscendence(c)){c.exhaust=true;c.properties=[{keyword:'유일'},{keyword:'소멸'}];if(isAwakening(c)){const spec=specFor(c);c.name=spec.name+'*'.repeat(cardUpgradeLevel(c));c.extra='awakening-card';c.type='각성';c.cost=1;c.actionCost=1;c.innerCost=0;c.effect=`${spec.effect} · 덱에서 5장 선택 · 유일 · 소멸`}
      else{c.name=transcendName().replace('각성명',state.deck.find(isAwakening)?specFor(state.deck.find(isAwakening)).name:'각성명')+'*'.repeat(cardUpgradeLevel(c));c.extra='awakening-transcendence';c.type='초월';c.cost=2;c.actionCost=2;c.innerCost=0;c.effect='각성한 5장 중 1장 초월 · 유일 · 소멸'}}}
    const oath=state.deck.find(isAwakening);for(const c of state.deck.filter(isTranscendence)){const stars=cardUpgradeLevel(c);c.name=`${oath?specFor(oath).name:'각성명'} - 극`+'*'.repeat(stars);c.cost=Math.max(0,2-stars);c.actionCost=c.cost}
    const seen=new Set(),ult=new Set();state.deck=state.deck.filter(c=>{if(isAwakening(c)){if(seen.size)return false;seen.add(c.id)}if(isTranscendence(c)){if(ult.size)return false;ult.add(c.id)}return true});
    const retained=new Set(state.deck.map(c=>c.id));for(const pile of ['hand','draw','discard','exhaust'])state[pile]=state[pile]?.filter(c=>!isAwakening(c)&&!isTranscendence(c)||retained.has(c.id))||[];
    if(state.bellAwakening&&!state.awakeningState)state.awakeningState=state.bellAwakening;
    if(state.bellTranscendedId&&!state.transcendedId)state.transcendedId=state.bellTranscendedId;
    if(state.awakeningState){const ids=state.awakeningState.selectedIds?.filter(id=>state.deck.some(c=>c.id===id))||[];if(ids.length!==5)state.awakeningState=null;else{state.awakeningState.selectedIds=ids;state.awakeningState.color=selectedSpec()?.color||state.awakeningState.color}}
    if(state.transcendedId&&!state.awakeningState?.selectedIds.includes(state.transcendedId))state.transcendedId=null;
    if(document.body.classList.contains('in-battle'))renderBattle();
  };
})();
