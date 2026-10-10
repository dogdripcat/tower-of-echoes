const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const run=(file,c)=>vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),c,{filename:file});
const classes=()=>{const values=new Set();return {add(...a){a.forEach(v=>values.add(v))},remove(...a){a.forEach(v=>values.delete(v))},contains:v=>values.has(v),toggle(v,on){on?values.add(v):values.delete(v)}}};
function motionContext(){
  const hero={classList:classes(),style:{setProperty(){},removeProperty(){}}};
  const body={classList:classes()};body.classList.add('in-battle');
  let plays=0;
  const c={state:{hero:0,hp:100,enemies:[],hand:[{id:'card',type:'공격'}],mana:3,discard:[],exhaust:[],progress:0},
    HEROES:[{name:'벨'}],window:{matchMedia:()=>({matches:true}),renderBattle(){}},
    document:{body,querySelector(s){if(s==='.hero-battle-unit')return hero;if(['#arena','#heroFigure'].includes(s))return {classList:classes(),append(){}};return null},querySelectorAll(){return []},createElement:()=>({style:{setProperty(){}},append(){},remove(){}})},
    setTimeout,clearTimeout,console};
  c.window.useCard=()=>{plays++;c.state.mana--;c.state.discard.push(c.state.hand.pop());c.state.progress++};
  run('combat-motion-data.js',c);run('combat-motion-system.js',c);
  return {c,api:c.window.TOE_COMBAT_MOTION,plays:()=>plays};
}
async function queue(){
  const {c,api,plays}=motionContext();
  let taskRuns=0;
  const task=api.enqueue(()=>{taskRuns++});api.clear();await task;
  assert.equal(taskRuns,0,'pre-execution cancellation must skip the task');
  for(const afterStart of [false,true]){
    const pending=c.window.useCard('card');if(afterStart)await new Promise(resolve=>setTimeout(resolve,0));api.clear();
    assert.equal(await pending,false);assert.equal(plays(),0);assert.equal(c.state.hand.length,1);assert.equal(c.state.mana,3);
    assert.equal(c.state.discard.length,0);assert.equal(c.state.exhaust.length,0);assert.equal(c.state.progress,0);
  }
  const old=api.enqueue(()=>false);api.clear();const next=c.window.useCard('card');await old;
  assert.equal(api.isBusy(),true,'stale task finally must not unlock the new action');
  assert.equal(await next,true);assert.equal(plays(),1,'normal action resolves exactly once');assert.equal(c.state.mana,2);assert.equal(c.state.progress,1);
  let hits=0;
  const enemyUnit={classList:classes(),style:{setProperty(){},removeProperty(){}},dataset:{enemyId:'enemy'}};
  c.document.querySelectorAll=s=>s==='.enemy-slot[data-enemy-id]'?[enemyUnit]:[];
  const enemy={id:'enemy',hp:50};
  assert.equal(await api.enqueue(()=>api.enemyAction(enemy,{hits:3},()=>{hits++})),true);assert.equal(hits,3);
  const cinematic=c.window.useCard;
  c.state.hand=[{id:'card',type:'각성',name:'test'}];
  c.document.createElement=()=>({className:'',style:{setProperty(){}},append(){},remove(){}});
  const arena={append(){},classList:classes()};const prior=c.document.querySelector;
  c.document.querySelector=s=>s==='#arena'?arena:prior(s);
  const pending=cinematic('card');await new Promise(resolve=>setTimeout(resolve,0));api.clear();assert.equal(await pending,false);assert.equal(plays(),1);
  api.clear();
  // Cancel after the delay resolves but before its await continuation reaches IMPACT.
  const race=motionContext(),timers=new Map();let timerId=0;
  race.c.setTimeout=fn=>{timers.set(++timerId,fn);return timerId};race.c.clearTimeout=id=>timers.delete(id);
  const interrupted=race.c.window.useCard('card');
  for(let i=0;i<5;i++)await Promise.resolve();
  assert.equal(timers.size,1);const callback=[...timers.values()][0];callback();race.api.clear();
  assert.equal(await interrupted,false);assert.equal(race.plays(),0,'resolved delay must revalidate token before IMPACT');
}
function idle(){
  const callbacks=new Map();let serial=0,removed=0;
  const hero={classList:classes()},body={classList:classes()};body.classList.add('in-battle');
  const image={classList:classes(),complete:true,naturalWidth:100,naturalHeight:200,offsetWidth:100,offsetHeight:200,offsetLeft:0,offsetTop:0,parentElement:{append(){}}};
  const media={matches:false,addEventListener(){},removeEventListener(){removed++}};
  const c={state:{hp:100,hero:0},window:{matchMedia:()=>media},performance:{now:()=>0},
    document:{body,querySelector:s=>s==='#heroFigure'?image:hero,createElement:()=>({style:{},setAttribute(){},remove(){},getContext:()=>({clearRect(){},drawImage(){}})})},
    requestAnimationFrame(fn){callbacks.set(++serial,fn);return serial},cancelAnimationFrame(id){callbacks.delete(id)}};
  run('living-idle.js',c);const api=c.window.TOE_LIVING_IDLE;
  assert.equal(api.profiles.length,7);assert.equal(new Set(api.profiles.map(JSON.stringify)).size,7);
  const p={intensity:1,torso:1,pelvis:1,hair:0,cloth:0,lag:0};
  assert.ok(api.displacement(p,.3,Math.PI/2)>0);assert.ok(api.displacement(p,.56,Math.PI/2)<0);
  for(let heroId=0;heroId<7;heroId++){
    c.state.hero=heroId;api.sync();api.sync();assert.equal(callbacks.size,1);
    const [id,fn]=callbacks.entries().next().value;callbacks.delete(id);fn(1000);assert.ok(image.classList.contains('living-idle-source'));
    for(const action of ['motion-active','motion-hit','motion-heavy-hit','motion-block-hit','motion-death']){
      hero.classList.add(action);api.sync();assert.equal(callbacks.size,0);assert.equal(image.classList.contains('living-idle-source'),false);
      hero.classList.remove(action);api.sync();assert.equal(callbacks.size,1);
    }
    api.clear();assert.equal(callbacks.size,0);
  }
  c.state.hp=0;api.sync();assert.equal(callbacks.size,0);
  c.state.hp=100;media.matches=true;api.sync();assert.equal(callbacks.size,0);
  media.matches=false;api.sync();assert.equal(callbacks.size,1);
  body.classList.remove('in-battle');api.sync();assert.equal(callbacks.size,0);api.clear();assert.ok(removed>0);
}
function guild(){
  const c={state:{stage:1,gold:0,inventory:[],maxHp:100},window:{EVENT_DATABASE:[],addEventListener(){}},document:{querySelector:()=>null},sync(){},winBattle(){},useBagPotion(){}};
  run('v057-content-data.js',c);run('hub-services.js',c);run('sanctuary-system.js',c);
  const hub=c.window.TOE_HUB,san=c.window.TOE_SANCTUARY;
  const spec=hub.quests.find(q=>q.id==='GQ-SAN-B01');assert.equal(spec.uniqueServices,true);
  hub.progress().activeQuest={...spec,progress:0};san.enter('A');san.spend('merchant:session');san.spend('merchant:buy');
  assert.equal(hub.progress().activeQuest.progress,1);
  const saved=JSON.stringify(c.state);c.state=JSON.parse(saved);san.enter('B');san.spend('merchant:session');assert.equal(hub.progress().activeQuest.progress,1);
  san.spend('inn:rest');assert.equal(hub.progress().activeQuest.progress,2);
  san.spend('alchemist:session');assert.equal(hub.progress().activeQuest,null);assert.equal(hub.progress().completedQuests.length,1);
  hub.progress().activeQuest={id:'ordinary',metric:'sanctuary',target:4,progress:0};san.enter('C');san.spend('merchant:one');san.spend('merchant:two');
  assert.equal(hub.progress().activeQuest.progress,2);assert.equal(hub.progress().activeQuest.facilityLedger,undefined);
}
function syntax(){for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.js')))new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file})}
(async()=>{syntax();idle();guild();await queue();console.log('restoration regression: syntax, 7 idle profiles/lifecycle, queue/impact/cinematic/multi-hit, unique ledger persistence/count contracts PASS')})().catch(e=>{console.error(e);process.exitCode=1});
