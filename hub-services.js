/* Run-scoped Confessor and Guild services inside the Sanctuary. */
(()=>{
  const $=selector=>document.querySelector(selector);
  const defaults={confessorUsedFloors:[],guildOffers:{},acceptedFloors:[],activeQuest:null,completedQuests:[],claimedQuests:[],benefits:{}};
  const progress=()=>{state.hubProgress??={};for(const [key,value] of Object.entries(defaults))if(state.hubProgress[key]===undefined)state.hubProgress[key]=Array.isArray(value)?[]:value&&typeof value==='object'?{}:value;return state.hubProgress};
  const floor=()=>state.stage+1;
  const confessorPrices={purification:[130,155,180,205,230],consecration:[90,110,130,150,170]};
  const fallbackQuests=[
    {id:'normal',name:'길목의 위협',objective:'일반 전투 2회 승리',target:2,metric:'normal',grade:'C'},
    {id:'elite',name:'강자의 증표',objective:'정예 전투 1회 승리',target:1,metric:'elite',grade:'C'},
    {id:'hard',name:'험로 돌파',objective:'어려운 조우 1회 승리',target:1,metric:'hard',grade:'B'},
    {id:'potionless',name:'절제된 승리',objective:'포션 없이 전투 2회 승리',target:2,metric:'potionless',grade:'C'},
    {id:'healthy',name:'온전한 귀환',objective:'HP 60% 이상으로 전투 2회 승리',target:2,metric:'healthy',grade:'C'}
  ];
  const quests=window.GUILD_QUEST_DATABASE||fallbackQuests;
  const hash=text=>{let h=2166136261;for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
  const questGoldRanges={F:[35,55],E:[50,75],D:[70,100],C:[95,135],B:[125,175],A:[165,230],S:[220,300]};
  const questGold=(quest,key=String(floor()))=>{
    const [min,max]=questGoldRanges[quest.grade]||questGoldRanges.C;
    return min+hash(`${state.map_seed||state.map?.seed||0}:${key}:${quest.id}:guild-gold`)%(max-min+1);
  };
  const blessingName=blessing=>typeof blessing==='string'?blessing:blessing?.name||'이름 없는 축복';

  function offers(){
    const p=progress(),key=String(floor());
    if(Array.isArray(p.guildOffers[key])&&p.guildOffers[key].length===5&&p.guildOffers[key].every(offer=>offer&&typeof offer==='object'&&Number.isFinite(offer.gold)))return p.guildOffers[key];
    const eligible=quests.filter(q=>(!q.floor||q.floor<=floor())&&(!q.requiresTranscendence||p.transcendence||state.deck?.some(card=>card.extra==='awakening-transcendence')));
    const seed=hash(`${state.map_seed||state.map?.seed||0}:${key}:guild`),ordered=[...eligible].sort((a,b)=>hash(`${seed}:${a.id}`)-hash(`${seed}:${b.id}`)),chosen=[];
    for(const quest of ordered){if(chosen.some(item=>item.kind===quest.kind))continue;chosen.push(quest);if(chosen.length===5)break}
    if(chosen.length<5)for(const quest of ordered){if(chosen.includes(quest))continue;chosen.push(quest);if(chosen.length===5)break}
    p.guildOffers[key]=chosen.map(quest=>({id:quest.id,gold:questGold(quest,key)}));sync?.();return p.guildOffers[key];
  }
  function grantQuestReward(quest){
    if(!quest||quest.claimed)return false;
    const p=progress(),claimKey=quest.contractId||`${quest.floor||0}:${quest.id||quest.name}`;
    if(p.claimedQuests.includes(claimKey)||p.claimedQuests.includes(quest.id||quest.name))return false;
    quest.claimed=true;state.gold+=(Number(quest.gold)||0);
    if(quest.benefit)p.benefits[quest.benefit]=true;
    if(quest.reward?.type==='TEMP_ACTIVITY')window.TOE_SANCTUARY?.queueActivityVisits(quest.reward.visits||1);
    if(quest.reward?.type==='MAX_ACTIVITY')window.TOE_SANCTUARY?.queueActivityUpgrade(quest.reward.amount||1);
    p.completedQuests.push({...quest});p.claimedQuests.push(claimKey);if(p.activeQuest===quest)p.activeQuest=null;sync?.();return true;
  }
  function claim(){const quest=progress().activeQuest;return Boolean(quest?.completed&&grantQuestReward(quest))}
  function trackProgress(metric,amount=1,facility=null){
    const quest=progress().activeQuest;if(!quest||quest.completed||(quest.metric||quest.kind||quest.id)!==metric)return false;
    if(quest.uniqueServices||quest.id==='GQ-SAN-B01'){
      if(!['merchant','blacksmith','enchanter','alchemist','confessor','guild','inn'].includes(facility))return false;
      quest.facilityLedger=Array.isArray(quest.facilityLedger)?[...new Set(quest.facilityLedger)]:[];
      if(quest.facilityLedger.includes(facility))return false;
      quest.facilityLedger.push(facility);amount=1;quest.progress=quest.facilityLedger.length-1;
    }
    quest.progress=Math.min(quest.target,(quest.progress||0)+Math.max(0,Number(amount)||0));
    if(quest.progress>=quest.target){quest.completed=true;grantQuestReward(quest)}else sync?.();return true;
  }
  function trackBattle(kind,difficulty,hp,potions){
    const quest=progress().activeQuest;if(!quest||quest.completed)return;
    const matches={normal:kind==='normal',elite:kind==='elite',hard:kind==='normal'&&difficulty==='HARD',potionless:potions===0,healthy:hp>=state.maxHp*.6,boss:kind==='boss',survival:true};
    const metric=quest.metric||quest.kind||quest.id;if(matches[metric])trackProgress(metric,1);
  }
  function shell(role,title,line,background,portrait,nav,bindNav,back){
    $('#modal').className=`modal specialist-modal hub-room ${role}`;
    $('#modal').innerHTML=`${nav}<div class="specialist-header"><div><span class="tag">${role==='confessor'?'성당 · 고해소':'길드 회관'}</span><h2>${title}</h2><p>${line}</p></div>${window.TOE_SANCTUARY?.statusHTML()||''}</div><div class="hub-room-scene" style="--room-bg:url('${background}')"><img src="${portrait}" alt="${title} 전신 일러스트"></div><div id="hubServices" class="specialist-services"></div><div id="hubSelect" class="hub-select"></div><div class="merchant-footer"><span id="specialistNotice"></span><button type="button" class="primary" id="specialistLeave">성역으로</button></div>`;
    bindNav();$('#specialistLeave').onclick=()=>back();
  }
  function choose(title,rows,onSelect){
    const host=$('#hubSelect');host.innerHTML=`<h3>${title}</h3>${rows.map((row,index)=>`<button type="button" data-option="${index}">${row.name||row.label||blessingName(row)}</button>`).join('')}<button type="button" id="hubCancel">취소</button>`;
    host.querySelectorAll('[data-option]').forEach(button=>button.onclick=()=>onSelect(rows[Number(button.dataset.option)]));$('#hubCancel').onclick=()=>host.innerHTML='';
  }
  function deterministicBlessings(){
    const definitions=(window.EVENT_DATABASE||[]).filter(event=>event.category==='blessing').map(event=>({id:event.event_id||event.id||event.name,name:event.name,desc:event.notes||'교단의 축복'}));
    const seed=hash(`${state.map_seed||state.map?.seed||0}:${floor()}:confessor`);return [...definitions].sort((a,b)=>hash(`${seed}:${a.id}`)-hash(`${seed}:${b.id}`)).slice(0,3);
  }
  function openConfessor(nav,bindNav,back,message=''){
    const p=progress(),used=p.confessorUsedFloors.includes(floor()),prices={purification:confessorPrices.purification[state.stage],consecration:confessorPrices.consecration[state.stage]};
    shell('confessor','고해사','“고해를 마치시면, 정화와 축성 중 필요한 의식을 집행하겠습니다.”','assets/confessor-chapel-v2.png','assets/npc-confessor-cutout-v1.png',nav,bindNav,back);
    const services=[['purification','정화','현재 런 저주 1개를 선택해 제거합니다.',Boolean(state.curses?.length)],['consecration','축성','축복 1개를 고정하거나 다른 축복으로 변경합니다.',Boolean(state.blessings?.length)]];
    $('#hubServices').innerHTML=services.map(([id,name,desc,eligible])=>`<button type="button" data-service="${id}" ${used||!eligible||state.gold<prices[id]||!window.TOE_SANCTUARY?.activityAvailable()?'disabled':''}><span><strong>${name}</strong><small>${desc}</small></span><b>${prices[id]}G · 활동력 1</b></button>`).join('')+'<button type="button" data-confessor-back><strong>돌아간다</strong><small>성역으로 돌아갑니다.</small></button>';
    $('#specialistNotice').textContent=message||`계층당 의식 1회 · ${used?'이번 계층에서 이미 사용했습니다.':'사용 가능'}`;
    const complete=(id,run)=>{if(p.confessorUsedFloors.includes(floor())||state.gold<prices[id])return false;if(!window.TOE_SANCTUARY?.spend(`confessor:${id}`))return false;if(run()===false){window.TOE_SANCTUARY?.refund();return false}state.gold-=prices[id];p.confessorUsedFloors.push(floor());sync?.();openConfessor(nav,bindNav,back,`${services.find(service=>service[0]===id)[1]} 의식 완료`);return true};
    $('#hubServices').querySelector('[data-confessor-back]').onclick=()=>back();
    $('#hubServices').querySelectorAll('[data-service]').forEach(button=>button.onclick=()=>{
      const id=button.dataset.service;
      if(id==='purification')choose('정화할 런 저주',state.curses,curse=>complete(id,()=>state.curses.splice(state.curses.indexOf(curse),1)));
      if(id==='consecration')choose('축성할 축복',state.blessings,blessing=>{
        $('#hubSelect').innerHTML=`<h3>${blessingName(blessing)}</h3><button type="button" data-consecrate="lock">축복을 고정한다</button><button type="button" data-consecrate="change">다른 축복으로 변경한다</button><button type="button" id="hubCancel">취소</button>`;
        $('#hubSelect').querySelector('[data-consecrate="lock"]').onclick=()=>complete(id,()=>{if(typeof blessing==='string'){const index=state.blessings.indexOf(blessing);state.blessings[index]={name:blessing,locked:true}}else blessing.locked=true});
        $('#hubSelect').querySelector('[data-consecrate="change"]').onclick=()=>choose('새 축복 1개 선택',deterministicBlessings().filter(candidate=>candidate.name!==blessingName(blessing)),replacement=>complete(id,()=>state.blessings.splice(state.blessings.indexOf(blessing),1,replacement)));
        $('#hubCancel').onclick=()=>$('#hubSelect').innerHTML='';
      });
    });
  }
  function openGuild(nav,bindNav,back,message='',view='lobby'){
    const p=progress();shell('guild','길드 회관','“새 의뢰를 확인하시거나 진행 중인 계약을 살펴보시겠어요?”','assets/guild-hall-v2.png','assets/npc-guild-receptionist-cutout-v1.png',nav,bindNav,back);
    const active=p.activeQuest,canAccept=!active&&!p.acceptedFloors.includes(floor())&&p.acceptedFloors.length<5&&Boolean(window.TOE_SANCTUARY?.activityAvailable()),available=offers().map(offer=>({quest:quests.find(quest=>quest.id===offer.id),gold:offer.gold})).filter(offer=>Boolean(offer.quest));
    const activeHtml=active?`<div class="hub-quest"><strong>${active.name} [${active.grade||'C'}]</strong><span>${active.objective} · ${active.progress}/${active.target}</span><small>의뢰 진행 중 · 완료 즉시 보상이 지급됩니다.</small></div>`:'<p>진행 중인 의뢰가 없습니다.</p>';
    const offerHtml=available.map(({quest,gold})=>`<button type="button" data-quest="${quest.id}" ${canAccept?'':'disabled'}><span><strong>${quest.name} [${quest.grade||'C'}]</strong><small>${quest.objective}${quest.reward?` · ${quest.reward.type==='MAX_ACTIVITY'?'활동력 최대 +1':`다음 성역 ${quest.reward.visits}회 활동력 +1`}`:''}</small></span><b>${gold}G · 활동력 1</b></button>`).join('');
    $('#hubServices').classList.toggle('guild-offer-list',view==='offers');
    $('#hubServices').innerHTML=view==='lobby'?'<button type="button" data-guild-view="offers"><strong>새 의뢰 확인</strong><small>이번 계층의 무작위 의뢰 5종을 확인합니다.</small></button><button type="button" data-guild-view="active"><strong>진행 중인 의뢰</strong><small>현재 계약과 진행도를 확인합니다.</small></button><button type="button" data-guild-back><strong>돌아간다</strong><small>성역으로 돌아갑니다.</small></button>':view==='active'?activeHtml:offerHtml;
    $('#specialistNotice').textContent=message||'의뢰는 정확히 5개가 제시되며, 완료 즉시 보상이 한 번만 지급됩니다.';
    $('#hubServices').querySelectorAll('[data-guild-view]').forEach(button=>button.onclick=()=>openGuild(nav,bindNav,back,'',button.dataset.guildView));$('#hubServices').querySelector('[data-guild-back]')?.addEventListener('click',()=>back());
    $('#hubServices').querySelectorAll('[data-quest]').forEach(button=>button.onclick=()=>{if(!canAccept||p.activeQuest)return;const offer=offers().find(item=>item.id===button.dataset.quest),quest=quests.find(item=>item.id===button.dataset.quest);if(!offer||!quest||!window.TOE_SANCTUARY?.spend('guild:accept'))return;p.activeQuest={...quest,floor:floor(),contractId:`${floor()}:${quest.id}`,gold:offer.gold,progress:0,completed:false,claimed:false};p.acceptedFloors.push(floor());sync?.();openGuild(nav,bindNav,back,`${quest.name} 의뢰를 수주했습니다.`)});
  }
  const priorWin=winBattle,priorPotion=useBagPotion;
  useBagPotion=function(...args){const before=(state.inventory||[]).filter(item=>item.type==='potion').length,result=priorPotion.apply(this,args),after=(state.inventory||[]).filter(item=>item.type==='potion').length;if(document.body.classList.contains('in-battle')&&after<before)state.potionsUsedInCombat=(state.potionsUsedInCombat||0)+before-after;return result};
  winBattle=function(...args){trackBattle(state.encounterKind,state.encounterDifficulty,state.hp,state.potionsUsedInCombat||0);return priorWin.apply(this,args)};
  const priorCardUse=window.useCard;if(priorCardUse)window.useCard=function(id,...args){
    const card=state.hand?.find(item=>item.id===id),aliveBefore=new Set((state.enemies||[]).filter(enemy=>enemy.hp>0).map(enemy=>enemy.id));
    const blockBefore=state.block||0,statusBefore=(state.enemies||[]).reduce((sum,enemy)=>sum+Object.values(enemy.statuses||{}).reduce((total,value)=>total+(Number(value)||0),0),0);
    const result=priorCardUse.call(this,id,...args),played=Boolean(card&&!state.hand?.some(item=>item.id===id));
    if(played){
      if(card.type?.includes('공격'))trackProgress('attack',(state.enemies||[]).filter(enemy=>aliveBefore.has(enemy.id)&&enemy.hp<=0).length);
      else if(card.type?.includes('스킬'))trackProgress('skill',1);
      else if(card.type?.includes('강화'))trackProgress('enhance',1);
      trackProgress('block',Math.max(0,(state.block||0)-blockBefore));
      const statusAfter=(state.enemies||[]).reduce((sum,enemy)=>sum+Object.values(enemy.statuses||{}).reduce((total,value)=>total+(Number(value)||0),0),0);
      trackProgress('status',Math.max(0,statusAfter-statusBefore));
    }
    return result;
  };
  window.addEventListener?.('toe:guild-progress',event=>trackProgress(event.detail?.metric,event.detail?.amount??1,event.detail?.facility));
  window.TOE_HUB={progress,offers,claim,grantQuestReward,trackBattle,trackProgress,questGold,questGoldRanges,quests,open(role,nav,bindNav,back){if(role==='confessor')openConfessor(nav,bindNav,back);else openGuild(nav,bindNav,back)}};
})();
