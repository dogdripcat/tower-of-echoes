(()=>{
  const $c=id=>document.getElementById(id);
  const categories=[['heroes','등반자의 연대기','⚜','캐릭터 배경설명'],['cards','전투의 서','▤','카드 목록'],['relics','유물 도감','◆','유물 목록'],['monsters','탑의 생물지','☠','몬스터 목록'],['bosses','왕좌의 기록','♛','보스몬스터 목록'],['events','갈림길의 이야기','✧','이벤트 목록'],['elites','정예의 명부','♜','엘리트 몬스터 목록'],['hub','거점의 인물과 장소','⌂','고해사 · 길드 홀'],['history','등반 일지','◷','도전기록']];
  const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const historyKey='tower-of-echoes-history-v1';
  const readHistory=()=>{try{const value=JSON.parse(localStorage.getItem(historyKey)||'[]');return Array.isArray(value)?value:[]}catch{return []}};
  const writeHistory=rows=>{try{localStorage.setItem(historyKey,JSON.stringify(rows.slice(-100)))}catch{}};
  const book=$c('codexShelves'),reader=$c('codexReader'),list=$c('codexList');
  book.innerHTML=categories.map(([id,title,icon,subtitle])=>`<button class="codex-book" type="button" data-book="${id}"><span class="codex-book-icon" aria-hidden="true">${icon}</span><strong>${title}</strong><small>${subtitle}</small></button>`).join('');
  let current='',cards=null,events=null,characterLore=null,hubArt=null,request=0;
  const loadJson=async(path)=>{const response=await fetch(path);if(!response.ok)throw Error('데이터를 읽을 수 없습니다.');return response.json()};
  const make=(name,meta,desc,img='',group='전체',rarity='',type='')=>({name,meta,desc,img,group,rarity,type});
  const entries=()=>{
    if(current==='heroes')return HEROES.map((h,i)=>make(h.name,`HP ${h.maxHp} · ${h.resource} ${h.resourceMax}${h.secondary?` · ${h.secondary} ${h.secondaryMax}`:''} · 시작 유물 ${h.relic}`,`${HERO_DESCRIPTIONS[i]}\n시작 유물 효과: ${h.passive}`,h.image,h.name));
    if(current==='hub')return (hubArt?.assets||[]).map(a=>make(a.name,a.role,a.description,a.image,a.group||'거점'));
    if(current==='cards')return (cards?.cards||[]).map(c=>make(c.name,`${c.hero} · ${c.rarity} · ${c.type}${c.keywords?.length?' · '+c.keywords.join('·'):''} · 행동력 ${c.cost?.action||0}${c.cost?.inner?' / 내공 '+c.cost.inner:''}`,`${c.description}\n강화 (${c.upgrade?.keyword||'위력'}): ${c.upgradeEffect||'—'}\n갈래: ${c.branchAffinity||'공통'}`,c.art,c.hero,c.rarity,c.type));
    if(current==='relics')return [...HEROES.map(h=>make(h.relic,`${h.name} · 시작 유물`,h.passive,'','시작 유물')),...BAG_ITEM_LIBRARY.relic.map(r=>make(r.name,`${r.category||'일반'} · ${r.rarity} · 가방 ${r.w}×${r.h}${r.sellPrice?' · 판매가 '+r.sellPrice+'골드':''}`,r.desc,'',r.category||'일반'))];
    if(['monsters','elites','bosses'].includes(current))return STAGES.flatMap((stage,i)=>{const records=current==='monsters'?stage.enemies:current==='elites'?[stage.elite]:[stage.boss];return records.map(([name,type,hp,attack])=>make(name,`${i+1}계층 ${stage.name} · ${type} · HP ${hp} · 공격 ${attack}`,current==='bosses'?'계층을 지배하는 보스 몬스터입니다.':current==='elites'?'계층의 강력한 정예 몬스터입니다.':'이 계층에서 조우하는 몬스터입니다.',current==='bosses'?BOSS_IMAGES[i]:ENEMY_IMAGES[name],stage.name))});
    if(current==='events')return (events?.events||[]).map(e=>make(e.name||e.title,`${e.category||'이벤트'} · ${e.choices?.length||0}가지 선택`,`${e.notes||e.description||''}\n${(e.choices||[]).map(c=>`• ${c.label||c.name}${c.reward?`: ${c.reward}`:''}`).join('\n')}`));
    if(current==='history')return readHistory().slice().reverse().map((r,i)=>make(`${r.hero} · ${r.result==='victory'?'등반 성공':r.result==='defeat'?'등반 실패':'등반 중'}`,`${r.stage}계층 · ${new Date(r.date).toLocaleString('ko-KR')}`,`도달 계층: ${r.floor||''} · 최종 골드: ${r.gold??0} · 덱: ${r.deck??0}장`, '',r.hero));
    return [];
  };
  function render(){const all=entries(),q=$c('codexSearch').value.trim().toLocaleLowerCase(),filter=$c('codexFilter').value;const rarity=$c('codexRarity').value,type=$c('codexType').value;const shown=all.filter(x=>(!filter||x.group===filter)&&(!rarity||x.rarity===rarity)&&(!type||x.type===type)&&(!q||`${x.name} ${x.meta} ${x.desc}`.toLocaleLowerCase().includes(q)));$c('codexTotal').textContent=`${shown.length} / ${all.length}`;list.innerHTML=shown.length?shown.map(x=>`<article class="codex-entry${current==='hub'?' hub-art-entry':''}">${x.img?`<img src="${safe(x.img)}" alt="${safe(x.name)}" loading="lazy">`:''}<h3>${safe(x.name)}</h3><small>${safe(x.meta)}</small><p>${safe(x.desc)}</p></article>`).join(''):`<p class="codex-empty">${all.length?'검색 결과가 없습니다.':current==='history'?'아직 기록된 등반이 없습니다. 이 브라우저에서 새 등반을 시작하면 여기에 기록됩니다.':'표시할 데이터가 없습니다.'}</p>`}
  const filters=()=>{const options=[...new Set(entries().map(x=>x.group).filter(x=>x!=='전체'))];$c('codexFilter').innerHTML='<option value="">전체 보기</option>'+options.map(x=>`<option value="${safe(x)}">${safe(x)}</option>`).join('');$c('codexFilter').hidden=!options.length;
    for(const [id,key,label] of [['codexRarity','rarity','모든 등급'],['codexType','type','모든 유형']]){
      const select=$c(id);select.innerHTML=`<option value="">${label}</option>`+[...new Set(current==='cards'?entries().map(x=>x[key]):[])].filter(Boolean).map(x=>`<option value="${safe(x)}">${safe(x)}</option>`).join('');select.hidden=current!=='cards';select.value='';
    }
  };
  async function openBook(id){const token=++request;current=id;book.classList.add('hidden');reader.classList.remove('hidden');$c('codexTitle').textContent=categories.find(c=>c[0]===id)[1];$c('codexSearch').value='';list.innerHTML='<p class="codex-empty">서고를 펼치는 중…</p>';try{if(id==='cards'&&!cards)cards=await loadJson('data/character-cards.json');if(id==='events'&&!events)events=await loadJson('data/events.json');if(id==='heroes'&&!characterLore)characterLore=await loadJson('data/character-lore.json');if(id==='hub'&&!hubArt)hubArt=await loadJson('data/hub-art.json');if(token!==request)return;filters();render()}catch{list.innerHTML='<p class="codex-empty">자료를 읽지 못했습니다. 연결을 확인하고 다시 열어주세요.</p>'; $c('codexTotal').textContent='—'}}
  book.addEventListener('click',event=>{const id=event.target.closest('[data-book]')?.dataset.book;if(id)openBook(id)});
  $c('codexSearch').oninput=render;$c('codexFilter').onchange=render;$c('codexRarity').onchange=render;$c('codexType').onchange=render;
  $c('codexClose').onclick=()=>{++request;reader.classList.add('hidden');book.classList.remove('hidden')};
  $c('menuCodex').onclick=()=>{$c('startScreen').classList.add('hidden');$c('codexScreen').classList.remove('hidden');document.body.classList.add('menu-open');$c('codexExit').focus()};
  $c('codexExit').onclick=()=>{++request;$c('codexScreen').classList.add('hidden');$c('startScreen').classList.remove('hidden');$c('codexClose').click();$c('menuCodex').focus()};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$c('codexScreen').classList.contains('hidden')){e.preventDefault();if(!reader.classList.contains('hidden'))$c('codexClose').click();else $c('codexExit').click()}});
  // Challenge history stays separate from the saved run and records one row per climb.
  let active=null;
  $c('startBtn').addEventListener('click',()=>{const h=HEROES[state.hero];if(!h)return;active=crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`;const rows=readHistory();rows.push({id:active,hero:h.name,result:'active',stage:1,floor:STAGES[0].name,date:new Date().toISOString(),gold:state.gold,deck:state.deck.length});writeHistory(rows)});
  function finish(result){const rows=readHistory(),last=active?rows.findLastIndex(x=>x.id===active):rows.findLastIndex(x=>x.result==='active'&&x.hero===HEROES[state.hero]?.name);if(last>=0){rows[last]={...rows[last],result,stage:state.stage+1,floor:STAGES[state.stage]?.name,gold:state.gold,deck:state.deck.length,date:new Date().toISOString()}}else rows.push({id:crypto.randomUUID?.()||String(Date.now()),hero:HEROES[state.hero]?.name||'알 수 없음',result,stage:state.stage+1,floor:STAGES[state.stage]?.name,gold:state.gold,deck:state.deck.length,date:new Date().toISOString()});writeHistory(rows);active=null}
  const originalVictory=victory,originalGameOver=gameOver;
  victory=function(...args){finish('victory');return originalVictory.apply(this,args)};
  gameOver=function(...args){finish('defeat');return originalGameOver.apply(this,args)};
})();
