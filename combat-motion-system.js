/* Tower of Echoes v1.2.0 motion queue and visual Impact Event runtime. */
(() => {
  const data = window.TOE_COMBAT_MOTION_DATA;
  if (!data) throw new Error('COMBAT_MOTION_DATA_MISSING');
  const timers = new Map();
  let chain = Promise.resolve();
  let busy = false;
  let actionSerial = 0;
  const tagClass = tag => `motion-${String(tag || 'SKILL_UTILITY').toLowerCase().replaceAll('_','-')}`;
  const delay = milliseconds => new Promise(resolve => {
    const id = setTimeout(() => { timers.delete(id); resolve(true); }, Math.max(0, milliseconds));
    timers.set(id, resolve);
  });
  const later = (callback,milliseconds) => {
    const id=setTimeout(()=>{timers.delete(id);callback()},Math.max(0,milliseconds));timers.set(id,null);return id;
  };
  const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const enabled = () => Boolean(document.body?.classList?.contains('in-battle') && document.querySelector('#arena') && document.querySelector('#heroFigure'));
  const scaleTime = milliseconds => reduced() ? Math.min(180, Math.round(milliseconds * .28)) : milliseconds;
  function setLocked(value) {
    busy = value;
    if(value)window.TOE_LIVING_IDLE?.stop();
    document.body?.classList?.toggle('combat-motion-locked', value);
    const end = document.querySelector('#endTurn');
    if (end) end.disabled = value;
  }
  function enqueue(task) {
    if (busy) return Promise.resolve(false);
    setLocked(true);
    const serial = ++actionSerial;
    chain = chain.catch(() => {}).then(() => serial === actionSerial ? task(() => serial === actionSerial) : false).catch(error => {
      console.error('COMBAT_MOTION_ERROR', error);
      return false;
    }).finally(() => {
      if (serial === actionSerial) {setLocked(false);cleanupTransient();window.TOE_LIVING_IDLE?.sync()}
    });
    return chain;
  }
  function cleanupTransient() {
    document.querySelectorAll('.motion-projectile,.motion-impact-marker,.motion-state-label,.motion-application-burst,.combat-cinematic').forEach(node => node.remove());
    document.querySelectorAll('.motion-active,.motion-hit,.motion-heavy-hit,.motion-block-hit,.motion-death').forEach(node => {
      node.classList.remove('motion-active','motion-hit','motion-heavy-hit','motion-block-hit','motion-death',...data.MOTION_TAGS.map(tagClass));
      node.style.removeProperty('--motion-duration');
      node.style.removeProperty('--motion-accent');
    });
    document.querySelector('#arena')?.classList.remove('motion-heavy-impact');
  }
  function unitElement(side, id='') {
    if (side === 'hero') return document.querySelector('.hero-battle-unit');
    if (id) return [...document.querySelectorAll('.enemy-slot[data-enemy-id]')].find(node=>node.dataset.enemyId===id)||null;
    return document.querySelector('.enemy-slot');
  }
  function pointFor(side, id='') {
    const arena = document.querySelector('#arena'), unit = unitElement(side,id);
    if (!arena || !unit) return {x:side === 'hero' ? 25 : 75,y:45,percent:true};
    const a=arena.getBoundingClientRect(), b=(unit.querySelector('.enemy-art-wrap,.figure')||unit).getBoundingClientRect();
    return {x:b.left+b.width/2-a.left,y:b.top+b.height*.48-a.top,percent:false};
  }
  function impactMarker(side,id,kind='damage',accent='#fff') {
    const arena=document.querySelector('#arena');if(!arena)return;
    const point=pointFor(side,id), marker=document.createElement('i');
    marker.className=`motion-impact-marker ${kind}`;marker.style.setProperty('--motion-accent',accent);
    marker.style.left=point.percent?`${point.x}%`:`${point.x}px`;marker.style.top=point.percent?`${point.y}%`:`${point.y}px`;
    arena.append(marker);later(()=>marker.remove(),500);
  }
  function projectile(side,tag,accent,duration) {
    if (!['ATTACK_RANGED','ATTACK_MAGIC','ATTACK_SUMMON','ATTACK_AOE','SKILL_DEBUFF'].includes(tag)) return;
    const arena=document.querySelector('#arena');if(!arena)return;
    const node=document.createElement('i');
    node.className=`motion-projectile${side==='enemy'?' enemy':''}${tag==='ATTACK_MAGIC'||tag==='ATTACK_AOE'?' magic':''}${tag==='ATTACK_SUMMON'?' summon':''}`;
    node.style.setProperty('--motion-accent',accent);node.style.setProperty('--projectile-duration',`${Math.max(.16,duration*.43)}s`);arena.append(node);
    later(()=>node.remove(),scaleTime(duration*620));
  }
  function label(text,accent) {
    const arena=document.querySelector('#arena');if(!arena||!text)return;
    const node=document.createElement('span');node.className='motion-state-label';node.textContent=text;node.style.setProperty('--motion-accent',accent);arena.append(node);later(()=>node.remove(),760);
  }
  function applicationBurst(color='blue',transcended=false){
    const arena=document.querySelector('#arena');if(!arena)return;
    const palette={red:'#ff4059',green:'#55e99a',blue:'#5bbcff'},node=document.createElement('i');
    node.className='motion-application-burst';node.style.setProperty('--motion-accent',transcended?'#ffffff':palette[color]||color);arena.append(node);later(()=>node.remove(),700);
  }
  function react(side,id,{heavy=false,blocked=false,dead=false,accent='#fff'}={}) {
    const unit=unitElement(side,id);if(!unit)return;
    if(side==='hero')window.TOE_LIVING_IDLE?.stop();
    const className=dead?'motion-death':blocked?'motion-block-hit':heavy?'motion-heavy-hit':'motion-hit';
    unit.style.setProperty('--motion-accent',accent);unit.classList.add(className);
    later(()=>{unit.classList.remove(className);if(side==='hero')window.TOE_LIVING_IDLE?.sync()},dead?650:heavy?580:420);
    impactMarker(side,id,blocked?'block':'damage',accent);
    if(heavy&&!blocked){const arena=document.querySelector('#arena');arena?.classList.remove('motion-heavy-impact');void arena?.offsetWidth;arena?.classList.add('motion-heavy-impact')}
  }
  function durationFor(tag, profile, rank='NORMAL') {
    const base = tag==='TRANSCENDENCE'?2.35:tag==='AWAKENING'?1.0:tag==='ATTACK_HEAVY'||tag==='ATTACK_AOE'||tag==='PHASE_SKILL'?0.92:tag==='DEFEND'||tag==='SKILL_BUFF'?0.68:0.72;
    const rankBoost=rank==='BOSS'?1.18:rank==='ELITE'?1.12:1;
    return Math.min(tag==='TRANSCENDENCE'?2.8:rank==='BOSS'?1.55:1.1,base*(profile?.speed||1)*rankBoost);
  }
  async function cinematic(kind, title, color, hero) {
    const arena=document.querySelector('#arena');if(!arena)return;
    const profile=data.player[hero]||{}, duration=durationFor(kind,profile);
    const node=document.createElement('div');node.className=`combat-cinematic ${kind==='TRANSCENDENCE'?'transcendence':'awakening'}`;
    node.style.setProperty('--cinematic-color',color||profile.accent||'#fff');node.style.setProperty('--cinematic-duration',`${duration}s`);
    const key=document.createElement('img');key.className='combat-cinematic-keyart';key.src=HEROES[state.hero]?.image||'';key.alt='';
    const emblem=document.createElement('img');emblem.className='combat-cinematic-emblem';emblem.src=profile.emblem||'';emblem.alt='';
    const heading=document.createElement('strong');heading.className='combat-cinematic-title';heading.textContent=title;
    node.append(key,emblem,heading);arena.append(node);const completed=await delay(scaleTime(duration*1000));node.remove();return completed;
  }
  function enemySnapshot() { return new Map((state.enemies||[]).map(enemy=>[enemy.id,{hp:enemy.hp,block:enemy.block,status:JSON.stringify(enemy.statuses||{}),bleed:enemy.bleed||0,phase:enemy.phase||1}])); }
  async function playerAction(card,targetId,resolve,valid=()=>true) {
    if(!valid()||!enabled()||state.hp<=0)return false;
    const hero=HEROES[state.hero]?.name, profile=data.player[hero]||{}, tag=data.cardTag(card,hero), accent=state.awakeningState?.selectedIds?.includes(card.id)?({red:'#ff4059',green:'#55e99a',blue:'#5bbcff'}[state.awakeningState.color]||profile.accent):profile.accent;
    if(tag==='AWAKENING'||tag==='TRANSCENDENCE'){
      const path=(card.name||'').replace(/\*+$/,'');
      if(!await cinematic(tag,path,tag==='TRANSCENDENCE'?'#ffffff':accent,hero))return false;
      if(!valid()||!enabled()||state.hp<=0)return false;
      resolve();return true;
    }
    const duration=durationFor(tag,profile), unit=unitElement('hero');
    if(!unit){if(!valid())return false;resolve();return true}
    unit.classList.add('motion-active',tagClass(tag));unit.style.setProperty('--motion-duration',`${duration}s`);unit.style.setProperty('--motion-accent',accent);
    if(['DEFEND','SKILL_BUFF','COUNTER'].includes(tag))label(card.name,accent);
    projectile('hero',tag,accent,duration);
    const impactAt=['ATTACK_RANGED','ATTACK_MAGIC','ATTACK_SUMMON','ATTACK_AOE'].includes(tag)?.58:tag==='ATTACK_HEAVY'?.54:.48;
    if((await delay(scaleTime(duration*1000*impactAt)))===false)return false;
    if(!valid()||!enabled()||state.hp<=0)return false;
    const before=enemySnapshot(),heroBlock=state.block||0;
    let deferredWin=false, actualWin=window.winBattle;
    if(typeof actualWin==='function')window.winBattle=()=>{deferredWin=true};
    try{resolve()}finally{if(actualWin)window.winBattle=actualWin}
    const attack=tag.startsWith('ATTACK_')||tag==='COUNTER';
    if(attack){
      for(const enemy of state.enemies||[]){const old=before.get(enemy.id);if(!old)continue;const damaged=enemy.hp<old.hp||enemy.block<old.block;if(damaged)react('enemy',enemy.id,{heavy:['ATTACK_HEAVY','ATTACK_AOE'].includes(tag),blocked:enemy.hp===old.hp&&enemy.block<old.block,dead:enemy.hp<=0,accent});if((enemy.phase||1)>(old.phase||1))label(`PHASE ${enemy.phase}`,accent);}
    }else if((state.block||0)>heroBlock){impactMarker('hero','', 'block',accent)}
    else if(tag==='SKILL_DEBUFF')impactMarker('enemy',targetId,'status',accent);
    if((await delay(scaleTime(duration*1000*(1-impactAt))))===false)return false;
    unit.classList.remove('motion-active',tagClass(tag));
    if(deferredWin&&actualWin)actualWin();
    return true;
  }
  async function enemyAction(enemy,action,onImpact) {
    const serial=actionSerial,valid=()=>serial===actionSerial&&enabled()&&state.hp>0&&enemy.hp>0;
    if(!valid())return false;
    const profile=data.monster[enemy.monsterId]||{}, tag=data.actionTag(enemy,action), duration=durationFor(tag,profile,enemy.rank), accent=profile.accent||'#e96c75';
    const unit=unitElement('enemy',enemy.id);if(!unit){for(let i=0;i<(action.hits||1);i++){if(!valid())return false;if(onImpact(i)===false)return false}return true}
    unit.classList.add('motion-active',tagClass(tag));unit.style.setProperty('--motion-duration',`${duration}s`);unit.style.setProperty('--motion-accent',accent);
    if(['PHASE_SKILL','SKILL_CAST','COUNTER','DEFEND'].includes(tag))label(action.name,accent);
    projectile('enemy',tag,accent,duration);
    const hits=Math.max(1,action.hits||1), first=duration*1000*((tag==='ATTACK_HEAVY'||tag==='ATTACK_AOE') ? 0.55 : 0.48), spacing=Math.min(170,duration*1000*.17);
    if((await delay(scaleTime(first)))===false)return false;
    for(let hit=0;hit<hits;hit++){
      if(!valid())return false;
      const hp=state.hp, block=state.block, enemyHp=enemy.hp;if(onImpact(hit)===false){unit.classList.remove('motion-active',tagClass(tag));return false}
      const damaged=state.hp<hp||state.block<block;
      if(damaged)react('hero','',{heavy:tag==='ATTACK_HEAVY'||tag==='ATTACK_AOE',blocked:state.hp===hp&&state.block<block,accent});
      else if(['DEFEND','SKILL_BUFF'].includes(tag))impactMarker('enemy',enemy.id,'block',accent);
      else if(tag==='SKILL_DEBUFF')impactMarker('hero','','status',accent);
      if(enemy.hp<enemyHp)react('enemy',enemy.id,{heavy:false,dead:enemy.hp<=0,accent:'#8ddcff'});
      if(hit<hits-1&&(await delay(scaleTime(spacing)))===false)return false;
    }
    if((await delay(scaleTime(Math.max(80,duration*1000-first-spacing*(hits-1)))))===false)return false;
    unit.classList.remove('motion-active',tagClass(tag));
    return true;
  }
  function clear() {
    window.TOE_LIVING_IDLE?.clear();
    for(const [id,resolve] of timers){clearTimeout(id);resolve?.(false)}timers.clear();actionSerial++;setLocked(false);cleanupTransient();chain=Promise.resolve();
  }
  const previousUse=window.useCard;
  window.useCard=function(id,targetId=''){
    const card=state.hand?.find(item=>item.id===id);
    if(!card||!enabled())return previousUse(id,targetId);
    if(busy)return false;
    return enqueue(valid=>playerAction(card,targetId,()=>previousUse(id,targetId),valid));
  };
  const previousRender=window.renderBattle;
  window.renderBattle=function(...args){
    const result=previousRender(...args);
    for(const enemy of state.enemies||[]){
      const slot=unitElement('enemy',enemy.id);if(!slot)continue;
      slot.classList.toggle('motion-cue-counter',(enemy.counter||0)>0);
      slot.classList.toggle('motion-cue-armor',(enemy.armor||0)>0||(enemy.domain?.armor||0)>0);
      slot.classList.toggle('motion-cue-marked',Boolean(enemy.marked));
    }
    window.TOE_LIVING_IDLE?.sync();
    return result;
  };
  for(const name of ['showRoute']){
    const previous=window[name];if(typeof previous==='function')window[name]=function(...args){clear();return previous.apply(this,args)};
  }
  window.TOE_COMBAT_MOTION={data,enabled,isBusy:()=>busy,enqueue,delay,playerAction,enemyAction,react,impactMarker,cinematic,applicationBurst,clear,durationFor};
  const endTurnButton=document.querySelector('#endTurn');
  if(endTurnButton)endTurnButton.onclick=()=>window.endTurn();
})();
