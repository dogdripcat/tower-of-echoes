/* Data-driven monster actions, learnable AI and boss-domain runtime. */
(()=>{
  const db=window.MONSTER_COMBAT_DATABASE||{monsters:[],domains:{}};
  const byName=new Map(db.monsters.map(x=>[x.name,x]));
  const byId=new Map(db.monsters.map(x=>[x.id,x]));
  const statusNames={MARK:'표식',BLEEDING:'출혈',BIND:'속박',POISON:'중독',PAIN:'고통',SHOCK:'감전',REGRET:'후회',VULNERABLE:'취약',BURN:'화상',FROSTBITE:'동상',CONFUSION:'혼란',OBLIVION:'망각'};
  const statusIcon={MARK:'◎',BLEEDING:'♨',BIND:'⛓',POISON:'☠',PAIN:'✦',SHOCK:'⚡',REGRET:'⌛',VULNERABLE:'◈',BURN:'🔥',FROSTBITE:'❄',CONFUSION:'?',OBLIVION:'◉'};
  const specOf=enemy=>byName.get(enemy?.name)||byId.get(enemy?.monsterId);
  const domainOf=enemy=>enemy?.domainId&&db.domains[enemy.domainId];
  const playerHas=status=>Boolean((state.statuses||[]).some(x=>x.id===status||x.status===status));
  const addPlayerStatus=(id,value=1)=>{state.statuses??=[];const old=state.statuses.find(x=>x.id===id||x.status===id);if(old)old.stacks=(old.stacks||1)+value;else state.statuses.push({id,status:id,name:statusNames[id]||id,icon:statusIcon[id]||'◆',stacks:value,kind:'debuff',desc:`${statusNames[id]||id} ${value}스택`})};
  const addStatusCard=(id,value=1)=>{if(typeof card!=='function')return;const c=card(statusNames[id]||id,0,'상태',`${statusNames[id]||id} ${value}`,0,'#d56b85','#251526','status');c.statusId=id;c.statusStacks=value;c.temporary=true;state.discard??=[];state.discard.push(c)};
  const activeBoss=()=>state.enemies?.find(e=>e.kind==='boss'&&e.hp>0&&e.domain?.active);
  const exactHp=(enemy,spec)=>{const template=STAGES[state.stage]?.enemies?.find(x=>x[0]===enemy.name)||STAGES[state.stage]?.elite;const old=Number(template?.[2])||spec.hp;const ratio=enemy.maxHp/old;return Math.max(1,Math.round(spec.hp*(Number.isFinite(ratio)&&ratio>0?ratio:1)))};
  const normalizeEnemy=(enemy,kind,count,isLeader)=>{
    const spec=specOf(enemy);if(!spec)return enemy;
    enemy.monsterId=spec.id;enemy.rank=spec.rank;enemy.baseHp=spec.hp;enemy.role=spec.role;enemy.actions=spec.actions;enemy.ai=spec.ai;enemy.domainId=spec.domainId||null;enemy.startArmor=spec.startArmor||0;enemy.passive=spec.passive||null;enemy.cooldowns??={};enemy.uses??={};enemy.lastActionId??=null;enemy.telegraph??=null;enemy.forcedNext??=null;enemy.actionBuff??=0;enemy.counter??=0;enemy.statuses??={};enemy.survivalOnce??=spec.passive==='UNDEAD_SURVIVAL_ONCE';enemy.summoned=Boolean(enemy.summoned);enemy.domain??=null;enemy.bossTurns??=0;enemy.phase??=1;enemy.domainDamageBonus??=0;
    const calculated=exactHp(enemy,spec);if(enemy.hp===undefined||enemy.hp===enemy.maxHp){enemy.maxHp=calculated;enemy.hp=calculated}else enemy.maxHp=calculated;
    enemy.block=Math.max(0,enemy.block||0);enemy.armor=enemy.armor??spec.startArmor??0;
    if(enemy.summoned)enemy.uses.rally=1;
    return enemy;
  };
  const previousBuild=buildEncounter;
  buildEncounter=function(kind){const list=previousBuild(kind);return list.map((enemy,index)=>normalizeEnemy(enemy,kind,list.length,index===0&&enemy.kind!== 'normal'))};
  const previousDeal=dealToEnemy;
  dealToEnemy=function(enemy,damage){
    let incoming=Math.max(0,damage||0);
    if(enemy?.armor>0){const absorbed=Math.min(enemy.armor,incoming);enemy.armor-=absorbed;incoming-=absorbed}
    if(enemy?.domain?.id==='IRON_GATE'&&enemy.domain.active&&enemy.domain.armor>0){const absorbed=Math.min(enemy.domain.armor,incoming);enemy.domain.armor-=absorbed;incoming-=absorbed;if(enemy.domain.armor<=0)enemy.domain.brokenThisCycle=true}
    const dealt=previousDeal(enemy,incoming);if(enemy.hp<=0&&enemy.survivalOnce){enemy.hp=1;enemy.survivalOnce=false}state.damageThisTurn=(state.damageThisTurn||0)+dealt;queueDomain(enemy);phaseUpdate(enemy);return dealt;
  };
  const cooldownReady=(enemy,action)=>!(enemy.cooldowns?.[action.id]>0);
  const conditionMet=(enemy,action)=>{
    const c=action.condition;if(!c)return true;
    if(c==='NO_MARK')return !playerHas('MARK');
    if(c==='MARKED')return playerHas('MARK');
    if(c==='NO_BIND')return !playerHas('BIND');
    if(c==='BOUND')return playerHas('BIND');
    if(c==='HP_BELOW_50')return enemy.hp<=enemy.maxHp*.5;
    if(c==='BURNED')return playerHas('BURN');
    if(c==='PHASE_3')return enemy.phase>=3;
    return true;
  };
  const hasFreeSlot=()=>aliveEnemies().length<5;
  function activateDomain(enemy){
    const template=domainOf(enemy);if(!template)return;
    enemy.domain={...template,active:true,activated:true,armor:0,armorTarget:template.armor||10,bloomGauge:template.bloomGauge||0,bossTurns:0,cycle:0,currentLaw:template.colors?.[0]||null,nextLaw:template.colors?.[1]||null,adapted:[],brokenThisCycle:false,forceAction:null,damageBonus:0,timeAcceleration:0};
    enemy.phase=1;state.domainLog=`${template.name}이 활성화되었습니다.`;
  }
  function phaseUpdate(enemy){
    if(!enemy.domain?.active)return;
    const ratio=enemy.hp/enemy.maxHp;enemy.phase=ratio<.35?3:ratio<.70?2:1;
    if(enemy.domain.id==='NAMELESS_SANCTUM'){
      const colors=enemy.domain.colors;const index=Math.max(0,colors.indexOf(enemy.domain.currentLaw));enemy.domain.nextLaw=colors[(index+1)%colors.length];
    }
  }
  function queueDomain(enemy){
    const template=domainOf(enemy);if(!template||enemy.domain?.active)return;
    const ratio=enemy.hp/enemy.maxHp;
    const eligible=template.activation==='BATTLE_START'||template.activation==='HP_LE_60'&&ratio<=.60||template.activation==='HP_LE_70'&&ratio<=.70||template.activation==='HP_LE_75'&&ratio<=.75||template.activation==='AFTER_BOSS_TURN_3'&&enemy.bossTurns>=3;
    if(eligible)enemy.domainPending=true;
  }
  function actionEligible(enemy,action){
    if(enemy.summoned&&action.type==='summon')return false;
    if(action.requiresFreeSlot&&!hasFreeSlot())return false;
    if(action.requiresTelegraph&&enemy.telegraph!==action.requiresTelegraph)return false;
    if(enemy.domain?.suppressOblivion&&action.id==='oblivion-sentence')return false;
    if(enemy.domain?.id==='BLOOD_GARDEN'&&enemy.domain.suppressHeal&&(action.type==='heal'||action.type==='attackHeal'||action.type==='blockHeal'))return false;
    if(enemy.domain?.id==='FROZEN_CLOCK'&&enemy.domain.delayCharge>0&&action.type==='telegraph')return false;
    if(enemy.domain?.skipCounter&&action.type==='counter')return false;
    if(enemy.forcedNext&&action.id!==enemy.forcedNext)return false;
    if(!conditionMet(enemy,action)||!cooldownReady(enemy,action))return false;
    if(action.cannotRepeat&&enemy.lastActionId===action.id)return false;
    if(action.maxUses!=null&&(enemy.uses[action.id]||0)>=action.maxUses)return false;
    return true;
  }
  function chooseAction(enemy){
    const spec=specOf(enemy);if(!spec)return null;
    if(enemy.domainPending){const domainAction=spec.actions.find(x=>x.type==='domain');if(domainAction)return domainAction}
    if(enemy.domain?.forceAction){const forced=spec.actions.find(x=>x.id===enemy.domain.forceAction);if(forced){enemy.domain.forceAction=null;return forced}}
    if(enemy.forcedNext){const forced=spec.actions.find(x=>x.id===enemy.forcedNext);if(forced&&actionEligible(enemy,forced))return forced;}
    const candidates=spec.actions.filter(action=>actionEligible(enemy,action)).sort((a,b)=>(b.priority||0)-(a.priority||0));
    return candidates[0]||spec.actions.find(x=>x.type==='attack')||spec.actions[0];
  }
  function actionText(enemy,action){
    if(!action)return '대기';
    if(action.type==='attack')return action.hits>1?`공격 ${action.damage} ×${action.hits}`:`공격 ${action.damage}`;
    if(action.type==='block')return `방어 ${action.block}`;
    if(action.type==='counter')return `반격 ${action.counter}`;
    if(action.type==='status')return `${statusNames[action.status]||action.status} ${action.value||1}`;
    if(action.type==='summon')return '소환';
    if(action.type==='heal'||action.type==='attackHeal')return action.type==='attackHeal'?`공격 ${action.damage} · 회복 ${action.heal}`:`회복 ${action.heal}`;
    if(action.type==='telegraph')return `${action.name} · 다음 공격 예고`;
    if(action.type==='domain')return `영역 발동 · ${domainOf(enemy)?.name||''}`;
    if(action.type==='lawErosion')return '법칙 침식';
    return action.name;
  }
  function intentForData(enemy){
    enemy.nextAction??=chooseAction(enemy);
    const action=enemy.nextAction||chooseAction(enemy);enemy.nextAction=action;
    return {kind:'monster-action',action,value:action?.damage||0,text:actionText(enemy,action)};
  }
  intentFor=intentForData;
  function hurtPlayer(enemy,damage){
    let incoming=Math.max(0,damage||0);if(state.hero===6)incoming=Math.max(0,incoming-(state.counterReduction||0));
    const blocked=Math.min(state.block,incoming);state.block-=blocked;let taken=incoming-blocked;
    if(taken>=state.hp&&state.phoenixProtection&&!state.phoenixTriggered){state.phoenixProtection=false;state.phoenixTriggered=true;state.hp=1;state.block+=12;taken=0}
    else state.hp=Math.max(0,state.hp-taken);
    if(state.hero===6&&taken>0&&state.counterDamage>0)dealToEnemy(enemy,state.counterDamage);
    return taken;
  }
  function applyActionStatus(enemy,action){
    if(!action.status)return;
    if(action.status==='MARK'){addPlayerStatus('MARK',action.value||1);return}
    addPlayerStatus(action.status,action.statusValue||action.value||1);
    if(action.status==='BIND'||action.status==='OBLIVION'||action.status==='PAIN'||action.status==='REGRET')addStatusCard(action.status,action.value||1);
  }
  function summon(enemy,action){
    if(!hasFreeSlot())return;
    const spec=byName.get(action.summonName);if(!spec)return;
    const spawned={id:crypto.randomUUID(),name:spec.name,type:STAGES[state.stage].types[0],maxHp:spec.hp,hp:spec.hp,attack:5,block:0,kind:'normal',marked:false,slot:state.enemies.length, summoned:true};normalizeEnemy(spawned,'normal',state.enemies.length,false);state.enemies.push(spawned);
  }
  function executeAction(enemy,action){
    if(!action)return '';
    phaseUpdate(enemy);
    const domain=enemy.domain?.active?enemy.domain:null;
    const spec=specOf(enemy);if(enemy.armor>0)enemy.armor=Math.max(0,enemy.armor-(enemy.rank==='ELITE'?4:2));
    if(domain?.id==='IRON_GATE'&&action.type!=='domain'){if(domain.skipNextTurn){domain.skipNextTurn=false;domain.skipCounter=true;domain.armor=0;domain.damageBonus=0}else{domain.skipCounter=false;domain.armor=domain.armorTarget||10;domain.damageBonus=4}}
    if(action.type==='domain'){activateDomain(enemy);enemy.domainPending=false;enemy.nextAction=null;return `영역 발동: ${domainOf(enemy)?.name||''}`}
    if(action.type==='attack'||action.type==='attackHeal'||action.type==='attackBlock'){
      const hits=action.hits||1;let total=0;const enrage=domain?.id==='NAMELESS_SANCTUM'&&enemy.bossTurns>=12?Math.min(.2,enemy.bossTurns>=15?.2:.1):0;const astraBonus=domain?.id==='FROZEN_CLOCK'?(domain.timeAcceleration||0):0;const morganaBonus=domain?.id==='LIFE_BORDER'&&(action.id==='life-drain'||action.id==='border-harvest')&&(domain.cycle||0)>=4?2:0;const partyBonus=state.monsterPartyAttackBonus||0;for(let i=0;i<hits&&enemy.hp>0&&state.hp>0;i++)total+=hurtPlayer(enemy,Math.ceil(((action.damage||0)+(enemy.actionBuff||0)+(i===0?partyBonus:0)+((domain?.damageBonus||0)/hits)+astraBonus+morganaBonus)*(1+enrage)));if(partyBonus)state.monsterPartyAttackBonus=0;enemy.actionBuff=0;if(enemy.hp>0&&state.hp>0){applyActionStatus(enemy,action);if(action.type==='attackHeal')enemy.hp=Math.min(enemy.maxHp,enemy.hp+(action.heal||0));if(action.type==='attackBlock')enemy.block+=action.block||0}
    }else if(action.type==='block'){enemy.block+=action.block||0}
    else if(action.type==='counter'){enemy.counter=action.counter||0}
    else if(action.type==='status'){applyActionStatus(enemy,action)}
    else if(action.type==='buff'){enemy.actionBuff=(enemy.actionBuff||0)+(action.nextDamageBonus||0);state.monsterPartyAttackBonus=(state.monsterPartyAttackBonus||0)+(action.attackBonus||0)}
    else if(action.type==='heal'){enemy.hp=Math.min(enemy.maxHp,enemy.hp+(action.heal||0))}
    else if(action.type==='blockHeal'){enemy.block+=action.block||0;enemy.hp=Math.min(enemy.maxHp,enemy.hp+(action.heal||0))}
    else if(action.type==='blockBuff'){enemy.block+=action.block||0;enemy.actionBuff=(enemy.actionBuff||0)+(action.nextDamageBonus||0)}
    else if(action.type==='telegraph'){enemy.telegraph=action.id;enemy.forcedNext=action.next}
    else if(action.type==='recover'){enemy.block+=action.block||0;enemy.telegraph=null;enemy.forcedNext=null}
    else if(action.type==='summon'){summon(enemy,action)}
    else if(action.type==='lawErosion'){state.lawErosionActive=true}
    if(action.id==='bloom'){if(enemy.domain){enemy.domain.bloomGauge=1;enemy.domain.forceAction=null}}
    if(action.requiresTelegraph){enemy.telegraph=null;enemy.forcedNext=null;if(action.id==='bell-of-doom'||action.id==='swallow'||action.id==='silent-execution'||action.id==='final-bell'||action.id==='border-harvest'||action.id==='law-collapse'||action.id==='sanctum-collapse')enemy.forcedNext=specOf(enemy)?.actions.find(x=>x.id==='overheat')?.id||null}
    enemy.uses[action.id]=(enemy.uses[action.id]||0)+1;enemy.lastActionId=action.id;for(const key of Object.keys(enemy.cooldowns))enemy.cooldowns[key]=Math.max(0,enemy.cooldowns[key]-1);if(action.cooldown)enemy.cooldowns[action.id]=action.cooldown;
    if(enemy.kind==='boss')enemy.bossTurns++;
    if(domain?.id==='FROZEN_CLOCK'){if(enemy.bossTurns%4===0)domain.timeAcceleration=Math.min(domain.maxTimeAcceleration||3,(domain.timeAcceleration||0)+1);if(domain.delayCharge>0&&action.type!=='telegraph')domain.delayCharge--}
    if(domain?.id==='BLOOD_GARDEN'&&action.id==='bloom')domain.cycle=(domain.cycle||0)+1;
    enemy.nextAction=null;queueDomain(enemy);return action.name;
  }
  function executeMultiHitAnimated(enemy,action,motion){
    phaseUpdate(enemy);
    const domain=enemy.domain?.active?enemy.domain:null;
    const spec=specOf(enemy);
    if(enemy.armor>0)enemy.armor=Math.max(0,enemy.armor-(enemy.rank==='ELITE'?4:2));
    if(domain?.id==='IRON_GATE'){
      if(domain.skipNextTurn){domain.skipNextTurn=false;domain.skipCounter=true;domain.armor=0;domain.damageBonus=0}
      else{domain.skipCounter=false;domain.armor=domain.armorTarget||10;domain.damageBonus=4}
    }
    const hits=action.hits||1;
    const enrage=domain?.id==='NAMELESS_SANCTUM'&&enemy.bossTurns>=12?Math.min(.2,enemy.bossTurns>=15?.2:.1):0;
    const astraBonus=domain?.id==='FROZEN_CLOCK'?(domain.timeAcceleration||0):0;
    const morganaBonus=domain?.id==='LIFE_BORDER'&&(action.id==='life-drain'||action.id==='border-harvest')&&(domain.cycle||0)>=4?2:0;
    const partyBonus=state.monsterPartyAttackBonus||0;
    return motion.enemyAction(enemy,action,hit=>{
      if(enemy.hp<=0||state.hp<=0)return false;
      hurtPlayer(enemy,Math.ceil(((action.damage||0)+(enemy.actionBuff||0)+(hit===0?partyBonus:0)+((domain?.damageBonus||0)/hits)+astraBonus+morganaBonus)*(1+enrage)));
      if(enemy.hp<=0||state.hp<=0)return false;
      if(hit<hits-1)return true;
      if(partyBonus)state.monsterPartyAttackBonus=0;
      enemy.actionBuff=0;applyActionStatus(enemy,action);
      if(action.type==='attackHeal')enemy.hp=Math.min(enemy.maxHp,enemy.hp+(action.heal||0));
      if(action.type==='attackBlock')enemy.block+=action.block||0;
      if(action.requiresTelegraph){
        enemy.telegraph=null;enemy.forcedNext=null;
        if(action.id==='bell-of-doom'||action.id==='swallow'||action.id==='silent-execution'||action.id==='final-bell'||action.id==='border-harvest'||action.id==='law-collapse'||action.id==='sanctum-collapse')enemy.forcedNext=spec?.actions.find(x=>x.id==='overheat')?.id||null;
      }
      enemy.uses[action.id]=(enemy.uses[action.id]||0)+1;enemy.lastActionId=action.id;
      for(const key of Object.keys(enemy.cooldowns))enemy.cooldowns[key]=Math.max(0,enemy.cooldowns[key]-1);
      if(action.cooldown)enemy.cooldowns[action.id]=action.cooldown;
      if(enemy.kind==='boss')enemy.bossTurns++;
      if(domain?.id==='FROZEN_CLOCK'){
        if(enemy.bossTurns%4===0)domain.timeAcceleration=Math.min(domain.maxTimeAcceleration||3,(domain.timeAcceleration||0)+1);
        if(domain.delayCharge>0)domain.delayCharge--;
      }
      enemy.nextAction=null;queueDomain(enemy);
      return true;
    });
  }
  function updateDomainAtPlayerEnd(enemy){
    if(!enemy?.domain?.active)return;
    const d=enemy.domain;
    if(d.id==='IRON_GATE'){d.cycle=(d.cycle||0)+1;d.damageBonus=d.armor>0?4:0;if(d.brokenThisCycle){d.skipNextTurn=true;d.brokenThisCycle=false}if(d.cycle>=4)d.armorTarget=12}
    if(d.id==='BLOOD_GARDEN'){const required=(d.cycle||0)>=2?12:10;if((state.damageThisTurn||0)>=required)d.bloomGauge=Math.max(0,(d.bloomGauge||0)-1);else{d.bloomGauge=Math.min(3,(d.bloomGauge||0)+1);if(!d.suppressHeal)enemy.hp=Math.min(enemy.maxHp,enemy.hp+6)}if(d.bloomGauge>=3)d.forceAction='bloom-prepare';d.suppressHeal=d.bloomGauge===0}
    if(d.id==='FROZEN_CLOCK'){d.lawBrokenThisTurn=false;if(d.acceleratedPlayed&&d.delayedPlayed){d.breakNext=true;d.delayCharge=1;d.acceleratedPlayed=false;d.delayedPlayed=false}}
    if(d.id==='LIFE_BORDER'){d.cycle=(d.cycle||0)+1;const remains=(state.hand||[]).some(c=>typeof statusCard==='function'?statusCard(c):c.extra==='status'||c.type==='상태');d.suppressOblivion=!remains;if(remains){enemy.block+=8;enemy.hp=Math.min(enemy.maxHp,enemy.hp+4)}else d.breakNext=true}
    if(d.id==='NAMELESS_SANCTUM'){d.lawBrokenThisTurn=false;if(d.adapted?.length===3){d.breakNext=true;d.adapted=[]}const index=d.colors.indexOf(d.currentLaw);d.currentLaw=d.colors[(index+1+d.colors.length)%d.colors.length];d.nextLaw=d.colors[(d.colors.indexOf(d.currentLaw)+1)%d.colors.length];d.redConsumed=false;d.greenConsumed=false;d.blueConsumed=false}
    state.damageThisTurn=0;
  }
  function clearClockLaw(){for(const pile of [state.hand||[],state.draw||[],state.discard||[],state.exhaust||[]])for(const c of pile){if(c.domainBaseCost!=null){c.cost=c.domainBaseCost;delete c.domainBaseCost}delete c.domainRole}}
  function applyClockLaw(enemy){
    if(enemy?.domain?.id!=='FROZEN_CLOCK')return;
    clearClockLaw();if(enemy.domain.lawBrokenThisTurn)return;const eligible=(state.hand||[]).filter(c=>!isSpecialCard(c)&&c.extra!=='status'&&c.type!=='상태');
    if(eligible[0]){eligible[0].domainBaseCost=eligible[0].cost;eligible[0].cost=Math.max(0,eligible[0].cost-1);eligible[0].domainRole='accelerated'}
    if(eligible[1]){eligible[1].domainBaseCost=eligible[1].cost;eligible[1].cost+=1;eligible[1].domainRole='delayed'}
  }
  const previousStart=startBattle;
  startBattle=function(kind){previousStart(kind);const boss=state.enemies?.find(e=>e.kind==='boss');if(boss){normalizeEnemy(boss,kind,1,true);if(boss.domainId==='NAMELESS_SANCTUM')activateDomain(boss);else{boss.domain=null;boss.domainPending=false}}state.damageThisTurn=0;state.monsterPartyAttackBonus=0;state.lawErosionActive=false;state.domainLog='';renderBattle()};
  function finishEnemyTurn(totalTaken){
    if(totalTaken)spawnCombatFx('enemy-attack',totalTaken,'hero');
    if(state.hp<=0&&!triggerDragonHeart()){gameOver();return}
    for(const c of [...state.discard])if(hasCardProperty(c,'회수')){state.discard.splice(state.discard.indexOf(c),1);state.hand.push(c)}
    if(state.potionRegeneration?.turns>0){state.hp=Math.min(state.maxHp,state.hp+Math.ceil(state.maxHp*state.potionRegeneration.percent/100));if(--state.potionRegeneration.turns<=0)state.potionRegeneration=null}
    if(state.dragonWingRecycle){const c=state.exhaust.find(x=>!isSpecialCard(x)&&!statusCard(x)&&!x.temporary&&!x.system);if(c){state.exhaust.splice(state.exhaust.indexOf(c),1);state.draw.push(c)}}
    for(const pile of [state.hand,state.draw,state.discard])for(const c of pile)delete c.potionCostReduction;
    state.potionNextCardFree=false;state.potionAmplify=false;state.potionBlockMultiplier=1;state.dragonWingFree=false;state.turn++;state.previousCardType=null;
    if(!state.dragonScale?.retain)state.block=0;state.block+=(state.dragonScale?.turnBlock||0);state.mana=HEROES[state.hero].resourceMax;if(state.hero===6)state.innerQi=Math.min(HEROES[state.hero].secondaryMax,state.innerQi+3);state.firstAttack=true;
    if(state.turn%3===0)state.mana+=(state.inventory||[]).filter(item=>item.effect==='thirdTurnMana').reduce((sum,item)=>sum+item.amount,0);
    if(state.hero===4){state.summonHp+=1;state.summonBlock+=2}drawCards(5+(state.turn%3===0?(state.inventory||[]).filter(item=>item.effect==='thirdTurnDraw').reduce((sum,item)=>sum+item.amount,0):0));const nextBoss=activeBoss();if(nextBoss?.domain?.breakNext){nextBoss.domain.lawBrokenThisTurn=true;nextBoss.domain.breakNext=false}applyClockLaw(nextBoss);renderBattle();spawnCombatFx('turn',state.turn,'center');
  }
  const previousEnd=endTurn;
  endTurn=function(){
    const run=async()=>{
      const boss=activeBoss();updateDomainAtPlayerEnd(boss);const retained=[];for(const c of state.hand||[]){if(hasCardProperty(c,'증발'))state.exhaust.push(c);else if(hasCardProperty(c,'보존'))retained.push(c);else state.discard.push(c)}state.hand=retained;
      let totalTaken=0;const motion=window.TOE_COMBAT_MOTION;
      for(const enemy of [...aliveEnemies()]){
        if(enemy.hp<=0)continue;
        const intent=intentForData(enemy),action=intent.action,takenBefore=state.hp;
        if(motion?.enabled()){
          const completed=(action?.hits||1)>1&&['attack','attackHeal','attackBlock'].includes(action.type)
            ?await executeMultiHitAnimated(enemy,action,motion)
            :await motion.enemyAction(enemy,action,()=>executeAction(enemy,action));
          if(completed===false)return;
          renderBattle();
        }else executeAction(enemy,action);
        totalTaken+=Math.max(0,takenBefore-state.hp);
        if(enemy.domain?.breakNext){enemy.domain.breakNext=false;enemy.domain.suppressOblivion=true}
        if(state.hp<=0)break;
      }
      finishEnemyTurn(totalTaken);
    };
    const motion=window.TOE_COMBAT_MOTION;
    if(motion?.enabled())return motion.enqueue(run);
    let totalTaken=0;const boss=activeBoss();updateDomainAtPlayerEnd(boss);const retained=[];for(const c of state.hand||[]){if(hasCardProperty(c,'증발'))state.exhaust.push(c);else if(hasCardProperty(c,'보존'))retained.push(c);else state.discard.push(c)}state.hand=retained;
    for(const enemy of aliveEnemies()){const intent=intentForData(enemy),before=state.hp;executeAction(enemy,intent.action);totalTaken+=Math.max(0,before-state.hp);if(enemy.domain?.breakNext){enemy.domain.breakNext=false;enemy.domain.suppressOblivion=true}}
    finishEnemyTurn(totalTaken);
  };
  const previousRender=renderBattle;
  renderBattle=function(...args){previousRender(...args);const boss=activeBoss();if(!boss)return;const d=boss.domain,container=$('#battleEffects');if(!d||!container)return;let detail=`영역 · ${d.name}`;if(d.id==='IRON_GATE')detail+=` · 방어 ${d.armor||0}/10 · ${d.armor>0?'성문 붕괴 대기':'붕괴 완료'}`;if(d.id==='BLOOD_GARDEN')detail+=` · 개화 ${d.bloomGauge||0}/3 · ${d.bloomGauge>=3?'만개 예고':''}`;if(d.id==='FROZEN_CLOCK')detail+=` · 다음: 가속/지연 동시 사용 시 시간 오류`;if(d.id==='LIFE_BORDER')detail+=` · 상태 카드 제거 시 정화`;if(d.id==='NAMELESS_SANCTUM')detail+=` · 현재 ${d.currentLaw||'RED'} · 다음 ${d.nextLaw||'GREEN'} · 적응 ${d.adapted?.length||0}/3`;const span=document.createElement('span');span.className='domain-indicator';span.innerHTML=`<i>◇</i>${detail}`;container.prepend(span)};
  window.TOE_MONSTER_COMBAT={db,specOf,domainOf,normalizeEnemy,activateDomain,chooseAction,intentForData,executeAction,executeMultiHitAnimated,updateDomainAtPlayerEnd,applyClockLaw,clearClockLaw};
})();
