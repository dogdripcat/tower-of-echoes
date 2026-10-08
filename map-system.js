/* Tower of Echoes v1.1.0 — deterministic path-first branching map generator. */
(()=>{
  const WEIGHTS={monster:41,event:24,sanctuary:15,elite:10,treasure:7,empty:3};
  const FLOOR_BG=['stage-entry-castle.webp','stage-entry-rose.webp','stage-entry-clock.webp','stage-entry-void.webp','stage-entry-outer.webp'];
  const INFO={
    gatekeeper:{icon:'◇',label:'관문지기·보급품'},monster:{icon:'☠',label:'일반 전투'},event:{icon:'?',label:'이벤트'},
    sanctuary:{icon:'✦',label:'성역'},elite:{icon:'☠',label:'엘리트'},
    treasure:{icon:TREASURE_CHEST_ICON,label:'보물'},empty:{icon:'·',label:'이동'},boss:{icon:'◆',label:'계층 보스'}
  };
  const stageBackground=stage=>`assets/${FLOOR_BG[stage]}`;
  function rng(seed){let x=(seed>>>0)||0x9e3779b9;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}}
  function shuffle(a,random){for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
  function weighted(types,random){const total=types.reduce((s,t)=>s+WEIGHTS[t],0);let roll=random()*total;for(const t of types){roll-=WEIGHTS[t];if(roll<0)return t}return types[types.length-1]}
  const routeStateCache=new Map();
  function combinations(size,count,start=0,prefix=[],result=[]){
    if(prefix.length===count){result.push(prefix.slice());return result}
    for(let value=start;value<size;value++)combinations(size,count,value+1,prefix.concat(value),result);
    return result;
  }
  function compositions(total,parts,prefix=[],result=[]){
    if(parts===1){result.push(prefix.concat(total));return result}
    for(let value=1;value<=total-parts+1;value++)compositions(total-value,parts-1,prefix.concat(value),result);
    return result;
  }
  function routeStates(routeCount,width){
    const cacheKey=`${routeCount}:${width}`;if(routeStateCache.has(cacheKey))return routeStateCache.get(cacheKey);
    const result=[];
    for(const columns of combinations(7,width))for(const counts of compositions(routeCount,width)){
      const state=[];columns.forEach((column,index)=>{for(let n=0;n<counts[index];n++)state.push(column)});result.push(state)
    }
    routeStateCache.set(cacheKey,result);return result;
  }
  function uniqueColumns(state){return [...new Set(state)]}
  function widthPlan(rowCount,random){
    const widths=Array(rowCount).fill(3);widths[0]=3;widths[rowCount-1]=random()<.58?3:2;
    const minimum=widths.reduce((sum,width)=>sum+width,0),maximum=widths[0]+widths[rowCount-1]+(rowCount-2)*5;
    const low=Math.max(42,minimum),high=Math.min(52,maximum),target=low+Math.floor(random()*(high-low+1));
    let extra=target-minimum;const middle=shuffle(Array.from({length:rowCount-2},(_,index)=>index+1),random);
    while(extra>0){let changed=false;for(const index of middle){if(!extra)break;if(widths[index]<5){widths[index]++;extra--;changed=true}}if(!changed)break;shuffle(middle,random)}
    return{widths,target};
  }
  function transitionDegree(previous,next){
    const outgoing=new Map();
    for(let index=0;index<previous.length;index++){if(!outgoing.has(previous[index]))outgoing.set(previous[index],new Set());outgoing.get(previous[index]).add(next[index])}
    return Math.max(...[...outgoing.values()].map(targets=>targets.size));
  }
  function chooseRouteState(previous,width,random,history,profile,allowThreeWay){
    const previousColumns=uniqueColumns(previous).join(','),recent=history.slice(-2).map(state=>uniqueColumns(state).join(','));
    const previousMean=previous.reduce((sum,value)=>sum+value,0)/previous.length;
    const candidates=routeStates(previous.length,width).filter(candidate=>{
      if(candidate.some((column,index)=>Math.abs(column-previous[index])>2))return false;
      if(transitionDegree(previous,candidate)>(allowThreeWay?3:2))return false;
      const key=uniqueColumns(candidate).join(',');if(recent.length===2&&recent.every(value=>value===key))return false;
      return true;
    }).map(candidate=>{
      const columns=uniqueColumns(candidate),mean=candidate.reduce((sum,value)=>sum+value,0)/candidate.length;
      const movement=candidate.reduce((sum,value,index)=>sum+Math.abs(value-previous[index]),0);
      const unchanged=candidate.every((value,index)=>value===previous[index]);
      const straightPenalty=candidate.reduce((sum,value,index)=>sum+(history.length>=3&&history.slice(-3).every(state=>state[index]===value)?5:0),0);
      const repeatedColumns=columns.join(',')===previousColumns?3:0;
      const focus=[1.8,3,4.2,3,3][profile],focusPenalty=Math.abs(mean-focus)*(profile===3?.3:1);
      const spread=columns.at(-1)-columns[0],spreadPenalty=profile===3?Math.max(0,5-spread)*1.5:Math.max(0,3-spread)*.4;
      const shiftPenalty=Math.abs(mean-previousMean)>1.35?4:0;
      const score=movement*.7+straightPenalty+repeatedColumns+focusPenalty+spreadPenalty+shiftPenalty+(unchanged?10:0);
      return{candidate,score};
    }).sort((a,b)=>a.score-b.score);
    const pool=candidates.slice(0,Math.min(18,candidates.length));
    return(pool[Math.floor(random()*pool.length)]||candidates[0]).candidate;
  }
  function addEdge(a,b,edges,row){
    if(a.out.has(b.key))return;a.out.add(b.key);b.parents.add(a.key);edges.push({a:a.key,b:b.key,floor:row});
  }
  function buildPathTopology(nodes,edges,stage,seed,random,rowCount){
    const routeCount=random()<.55?6:5,profile=Math.floor(random()*5),plan=widthPlan(rowCount,random),history=[];
    const focusSets=[[0,2,4],[1,3,5],[2,4,6],[0,3,6],[1,3,6]],columns=focusSets[profile];
    let previousState=Array.from({length:routeCount},(_,index)=>columns[Math.min(columns.length-1,Math.floor(index*columns.length/routeCount))]);
    history.push(previousState);let previousNodes=uniqueColumns(previousState).map(column=>createNode(nodes,1,column,stage,seed));
    for(let row=2;row<=rowCount;row++){
      const allowThreeWay=random()<.07,nextState=chooseRouteState(previousState,plan.widths[row-1],random,history,profile,allowThreeWay);
      const currentNodes=new Map(uniqueColumns(nextState).map(column=>[column,createNode(nodes,row,column,stage,seed)]));
      const previousByColumn=new Map(previousNodes.map(node=>[node.column,node]));
      for(let route=0;route<routeCount;route++)addEdge(previousByColumn.get(previousState[route]),currentNodes.get(nextState[route]),edges,row-1);
      previousState=nextState;previousNodes=[...currentNodes.values()];history.push(nextState);
    }
    return{first:uniqueColumns(history[0]).map(column=>nodes.get(`1-${column}`)),last:previousNodes,widths:plan.widths,targetNodes:plan.target,routeCount,profile};
  }
  function jitter(seed,floor,column,salt){let value=(seed^(floor*0x9e3779b1)^(column*0x85ebca6b)^salt)>>>0;value=Math.imul(value^(value>>>16),0x7feb352d);value=Math.imul(value^(value>>>15),0x846ca68b);return((value^(value>>>16))>>>0)/4294967296}
  function createNode(nodes,floor,column,stage,seed=0){
    const key=`${floor}-${column}`;
    if(nodes.has(key))return nodes.get(key);
    const node={key,node_id:`F${stage+1}-R${floor}-C${column}`,floor,row:floor,column,col:column,type:null,node_type:null,
      out:new Set(),parents:new Set(),neighbors:[],visited:false,locked:false,encounter_id:null,event_category:null,
      elite:false,boss:false,shop:false,rest:false,treasure:false,guaranteed:false,background_key:stageBackground(stage),notes:'',
      visual_x_offset:floor>0?(jitter(seed,floor,column,0xa341316c)*.56-.28):0,visual_y_offset:floor>0?(jitter(seed,floor,column,0xc8013ea4)*.7-.35):0};
    nodes.set(key,node);return node;
  }
  function connect(a,b){a.out.add(b.key);b.parents.add(a.key)}
  function parentType(node,nodes){return [...node.parents].map(key=>nodes.get(key)?.type).filter(Boolean)}
  function makeFloor(stage,seed){
    const random=rng(seed+stage*7919),nodes=new Map(),edges=[];
    const gate=createNode(nodes,0,3,stage,seed);gate.type=gate.node_type='gatekeeper';gate.guaranteed=true;gate.notes='관문지기와 보급품 선택';
    const baseRows=14+(seed%5),lastRandomRow=baseRows-2,topology=buildPathTopology(nodes,edges,stage,seed,random,lastRandomRow);
    for(const start of topology.first)addEdge(gate,start,edges,0);
    const previous=topology.last;
    const needAwakening=stage===2&&!state.eventProgress?.awakening;
    const needTranscendence=stage===4&&!state.eventProgress?.transcendence;
    const forcedKind=needAwakening?'awakening':needTranscendence?'transcendence':null;
    const finalRow=forcedKind?baseRows:baseRows-1;
    const boss=createNode(nodes,finalRow,3,stage,seed);boss.type=boss.node_type='boss';boss.boss=true;boss.guaranteed=true;boss.notes='계층 보스';boss.visual_x_offset=boss.visual_y_offset=0;
    if(forcedKind){
      const forced=createNode(nodes,baseRows-1,3,stage,seed);forced.type=forced.node_type='event';forced.guaranteed=true;forced.inserted=true;forced.forcedEvent=forcedKind;forced.event_category=forcedKind;forced.notes=forcedKind==='awakening'?'강제 각성 이벤트':'강제 초월 이벤트';forced.visual_x_offset=forced.visual_y_offset=0;
      for(const from of previous)addEdge(from,forced,edges,lastRandomRow);
      addEdge(forced,boss,edges,baseRows-1);
    }else for(const from of previous)addEdge(from,boss,edges,lastRandomRow);
    const ordered=[...nodes.values()].sort((a,b)=>a.floor-b.floor||a.column-b.column);
    const randomNodes=ordered.filter(n=>n.floor>0&&!n.boss&&!n.forcedEvent);
    function candidates(node){const types=Object.keys(WEIGHTS);if(node.row<=2||node.row===lastRandomRow)return types.filter(t=>t!=='elite');return types}
    function hasAncestorCombat(node){let current=node,depth=0;while(depth<2&&current.parents.size){const p=nodes.get([...current.parents][0]);if(p?.type!=='monster')return false;current=p;depth++}return depth===2}
    for(const node of randomNodes){
      let allowed=candidates(node);if(hasAncestorCombat(node))allowed=allowed.filter(t=>t!=='monster');
      const parents=parentType(node,nodes);allowed=allowed.filter(t=>!parents.includes(t)||!['elite','sanctuary','treasure'].includes(t));
      node.type=node.node_type=weighted(allowed.length?allowed:candidates(node),random);
    }
    function repair(type,predicate){const pool=randomNodes.filter(n=>predicate(n)&&n.type!==type).sort((a,b)=>a.row-b.row);if(!pool.length)return false;const node=pool[Math.floor(random()*pool.length)];node.type=node.node_type=type;return true}
    for(let i=randomNodes.filter(n=>n.type==='sanctuary').length;i<2;i++)repair('sanctuary',n=>n.row>=3&&n.row<=12);
    const eliteTarget=stage>=2?2:1;for(let i=randomNodes.filter(n=>n.type==='elite').length;i<eliteTarget;i++)repair('elite',n=>n.row>=3&&n.row<lastRandomRow);
    if(!randomNodes.some(n=>n.type==='treasure'))repair('treasure',n=>n.row>=4&&n.row<=12);
    for(const node of ordered){node.elite=node.type==='elite';node.boss=node.type==='boss';node.sanctuary=node.type==='sanctuary';node.shop=false;node.rest=false;node.treasure=node.type==='treasure';node.spawn_weight=node.type in WEIGHTS?WEIGHTS[node.type]:0;node.encounter_id=node.type==='event'?`${stage+1}-${node.key}`:null;node.background_key=stageBackground(stage);node.neighbors=[...node.out]}
    const visited=new Set([gate.key]);
    return{schemaVersion:5,seed,map_seed:seed,stage,row_count:baseRows,base_row_count:baseRows,logical_width:7,route_count:topology.routeCount,topology_profile:topology.profile,progression_node_count:topology.targetNodes,nodes,edges,visited,current:gate.key,active:null,insertedGuaranteed:Boolean(forcedKind),background_key:stageBackground(stage)};
  }
  function normalizeMap(map){
    if(!map)return map;
    if(!(map.nodes instanceof Map)){const entries=Array.isArray(map.nodes)?map.nodes.map(n=>[n.key||n.node_id,n]):Object.entries(map.nodes||{});map.nodes=new Map(entries)}
    if(!(map.visited instanceof Set))map.visited=new Set(map.visited||[]);
    for(const node of map.nodes.values()){node.key??=node.node_id;node.row??=node.floor??0;node.column??=node.col??0;node.col??=node.column??0;node.visual_x_offset??=0;node.visual_y_offset??=0;node.type??=node.node_type||'empty';if(node.type==='merchant'||node.type==='rest')node.type='sanctuary';node.node_type=node.type;node.shop=false;node.rest=false;node.sanctuary=node.type==='sanctuary';node.out=node.out instanceof Set?node.out:new Set(node.out||node.neighbors||[]);node.parents=node.parents instanceof Set?node.parents:new Set(node.parents||[]);node.neighbors=[...node.out]}
    map.edges??=[];if(!map.edges.length)for(const node of map.nodes.values())for(const child of node.out)map.edges.push({a:node.key,b:child,floor:node.floor});
    map.current??=[...map.nodes.values()].find(n=>n.type==='gatekeeper')?.key||null;map.active??=null;if(map.active&&map.nodes.get(map.active)?.type==='sanctuary'&&map.visited.has(map.active)&&state.roomState?.nodeKey!==map.active){map.current=map.active;map.active=null}map.schemaVersion=Math.max(map.schemaVersion||4,4);return map;
  }
  function generateMap(seed){const actual=Number.isFinite(seed)?seed:(state.map_seed=Math.floor(toeRandom()*0x100000000)>>>0);return makeFloor(state.stage,actual)}
  function mapPosition(node,maxFloor){return{x:8+(node.column+(node.visual_x_offset||0))*14,y:94-(node.floor/maxFloor)*88+(node.visual_y_offset||0)}}
  function showMap(){
    normalizeMap(state.map);if(!state.map)return;document.body.classList.remove('in-battle');$('#battleScreen').classList.add('hidden');$('#overlay').classList.remove('hidden');
    const maxFloor=Math.max(...[...state.map.nodes.values()].map(n=>n.floor),14),reachable=new Set(reachableKeys()),s=STAGES[state.stage];
    const lines=state.map.edges.map(e=>{const a=mapPosition(state.map.nodes.get(e.a),maxFloor),b=mapPosition(state.map.nodes.get(e.b),maxFloor),used=state.map.visited.has(e.a)&&state.map.visited.has(e.b)?' visited':'';return `<line class="map-line${used}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`}).join('');
    const nodes=[...state.map.nodes.values()].map(n=>{const p=mapPosition(n,maxFloor),isReach=reachable.has(n.key),visited=state.map.visited.has(n.key),info=INFO[n.type]||INFO.empty;return `<button class="map-node ${n.type} ${n.guaranteed?'guaranteed':''} ${isReach?'reachable':''} ${visited?'visited':''}" style="left:${p.x}%;top:${p.y}%" data-map-node="${n.key}" title="${n.floor===0?'관문지기·보급품':`${n.floor}행 · ${info.label}`}" aria-label="${info.label}" ${isReach?'':'disabled'}>${info.icon}</button>`}).join('');
    const floors=Array.from({length:maxFloor+1},(_,i)=>{const y=94-(i/maxFloor)*88;const label=i===0?'관문':i===maxFloor?'보스':`${i}행`;return `<span class="floor-mark" style="top:${y}%">${label}</span>`}).join('');
    $('#stageLabel').textContent=`${state.stage+1}스테이지 · ${s.name} · 지도`;$('#modal').className='modal map-modal';
    $('#modal').innerHTML=`<div class="map-head"><div><span class="tag">${state.stage+1}스테이지</span><h2>${s.name}</h2><p>밝게 표시된 다음 방을 선택하십시오.</p></div><div class="map-legend"><span>☠ 전투</span><span class="legend-elite">☠ 엘리트</span><span>? 이벤트</span><span>✦ 성역</span><span>${TREASURE_CHEST_ICON} 보물</span><span>◇ 관문지기</span></div></div><div class="tower-map"><svg class="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none">${lines}</svg>${floors}${nodes}</div><p class="map-note">관문지기·보급품은 계층 시작에 고정되며, 상점과 휴식 기능은 성역에 통합됩니다.</p>`;
    document.querySelectorAll('[data-map-node]').forEach(b=>b.onclick=()=>enterMapNode(b.dataset.mapNode));
  }
  function enterMapNode(key){
    normalizeMap(state.map);if(!reachableKeys().includes(key))return;const node=state.map.nodes.get(key);state.map.active=key;state.map.visited.add(key);state.node=node.floor;state.roomState={nodeKey:key,nodeType:node.type,phase:'entered'};sync?.();
    if(node.forcedEvent){const e=TOE_EVENT_SYSTEM?.characterEvent(node.forcedEvent);if(e&&TOE_EVENT_SYSTEM.show)TOE_EVENT_SYSTEM.show(e,finishMapRoom);else finishMapRoom();return}
    if(node.type==='monster')startBattle('normal');else if(node.type==='elite')startBattle('elite');else if(node.type==='sanctuary')sanctuaryRoom(node.node_id||node.key);else if(node.type==='treasure')treasureRoom();else if(node.type==='event')eventRoom();else if(node.type==='boss')showBossGate();else finishMapRoom();
  }
  function finishMapRoom(){window.TOE_COMBAT_MOTION?.clear();normalizeMap(state.map);const node=state.map.nodes.get(state.map.active);if(!node)return;window.TOE_HUB?.trackProgress('map',1);state.map.current=node.key;state.map.active=null;state.roomState=null;if(node.boss)showBossGate();else showMap()}
  function restoreRoomState(){
    normalizeMap(state.map);const room=state.roomState,node=state.map?.nodes?.get(room?.nodeKey||state.map?.active);if(!room||!node)return false;
    state.map.active=room.nodeKey||node.key;
    if(room.phase==='reward'){
      const actions={finishMapRoom,beginStage,victory},action=actions[room.reward?.afterAction]||finishMapRoom;
      reward(Boolean(room.reward?.boss),action);return true;
    }
    if(room.phase==='event'){
      const event=window.TOE_EVENT_SYSTEM?.find?.(room.eventId);if(event){window.TOE_EVENT_SYSTEM.show(event,finishMapRoom);return true}
    }
    if(room.phase==='treasure'){treasureRoom();return true}
    if(room.phase==='battle'&&Array.isArray(state.enemies)&&!state.enemies.some(enemy=>enemy.hp>0)){winBattle();return true}
    if(node.forcedEvent){const event=window.TOE_EVENT_SYSTEM?.characterEvent(node.forcedEvent);if(event){window.TOE_EVENT_SYSTEM.show(event,finishMapRoom);return true}}
    if(node.type==='event'){eventRoom();return true}
    if(node.type==='sanctuary'){sanctuaryRoom(node.node_id||node.key);return true}
    if(node.type==='treasure'){treasureRoom();return true}
    if(node.type==='boss'){showBossGate();return true}
    return false;
  }
  const oldLoad=window.loadGame;
  window.generateMap=generateMap;window.showMap=showMap;window.enterMapNode=enterMapNode;window.finishMapRoom=finishMapRoom;window.restoreRoomState=restoreRoomState;window.normalizeMapState=normalizeMap;window.TOE_MAP_GENERATOR={generateMap,makeFloor,weights:{...WEIGHTS}};
  const oldBossGate=window.showBossGate;if(oldBossGate)window.showBossGate=function(){const bg=state.map?.background_key||stageBackground(state.stage);$('#overlay').style.setProperty('--boss-entry',`url('${bg}')`);return oldBossGate()};
  if(oldLoad)window.loadGame=function(){oldLoad();normalizeMap(state.map);if(state.map?.seed)state.map_seed=state.map.seed};
  state.map_seed??=null;
})();
