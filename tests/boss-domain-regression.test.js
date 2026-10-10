const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const db=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../data/monster-combat.json'),'utf8'));
const context={state:{stage:0,hp:500,block:0,enemies:[],inventory:[]},window:{MONSTER_COMBAT_DATABASE:db},STAGES:[{enemies:[],elite:['none','',100]}],console,
 buildEncounter(){return []},dealToEnemy(e,d){e.hp=Math.max(0,e.hp-d);return d},intentFor(){},startBattle(){},endTurn(){},renderBattle(){},aliveEnemies(){return context.state.enemies.filter(e=>e.hp>0)}};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../monster-combat-system.js'),'utf8'),context);
const api=context.window.TOE_MONSTER_COMBAT;
for(let floor=1;floor<=5;floor++){
 const spec=db.monsters.find(m=>m.id===`BOS-F${floor}-01`);
 let e={id:spec.id,monsterId:spec.id,name:spec.name,kind:'boss',rank:'BOSS',hp:100,maxHp:100,domainId:spec.domainId,phase:1,bossTurns:0,actions:spec.actions,uses:{},cooldowns:{},block:0,armor:0};
 context.state.enemies=[e];
 if(floor===5)assert.equal(api.activateDomain(e),true);
 else{
  assert.notEqual(api.chooseAction(e).type,'domain',`${spec.id}: activation must respect prerequisite`);
  if(floor===3)e.bossTurns=3;else e.hp={1:60,2:70,4:75}[floor];
  assert.equal(api.chooseAction(e).type,'domain');
  api.executeAction(e,api.chooseAction(e));
 }
 let domain=e.domain;assert.equal(domain.active,true);
 domain.cycle=3;domain.adapted=['RED'];
 for(const [hp,phase] of [[69,2],[34,3]]){
  e.hp=hp;context.dealToEnemy(e,0);assert.equal(e.phase,phase);
  const before=JSON.stringify(domain);assert.equal(api.activateDomain(e),false);assert.equal(JSON.stringify(domain),before);
  for(let turn=0;turn<3;turn++){
   e.nextAction={id:'domain',type:'domain'};const next=api.intentForData(e).action;
   assert.notEqual(next.type,'domain',`${spec.id}: stale domain intent must be discarded`);
   // Stable HP isolates phase/activation from legitimate healing actions.
   api.executeAction(e,spec.actions.find(a=>a.type==='attack'&&!a.requiresTelegraph));
   assert.equal(e.domain,domain);assert.equal(e.domain.cycle,3);assert.equal(e.phase,phase);
  }
  e=JSON.parse(JSON.stringify(e));context.state.enemies=[e];domain=e.domain;const savedHp=e.hp,savedMax=e.maxHp;api.normalizeEnemy(e,'boss',1,true,true);assert.equal(e.hp,savedHp);assert.equal(e.maxHp,savedMax);e.phase=1;api.phaseUpdate(e);assert.equal(e.phase,phase,'restore must recalculate phase from HP');
 }
}
console.log('boss domain regression: 5 bosses, activation prerequisites/once-only, stale intent, phase 2/3, restore PASS');
