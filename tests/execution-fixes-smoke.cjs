const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const url=process.env.TOE_QA_URL||'http://127.0.0.1:8013';
const fixture=({hero=0,stage=0,kind='boss'}={})=>{
 TOE_COMBAT_MOTION.clear();state.hero=hero;state.stage=stage;state.hp=state.maxHp=500;state.deck=starter(HEROES[hero]);state.inventory=[];state.relics=state.potions=0;state.statuses=[];state.potionAmplify=false;state.potionBlockMultiplier=1;state.potionNextCardFree=false;state.dragonWingFree=false;state.rngState=123456789;
 state.map=generateMap(17);state.map.active=[...state.map.nodes.values()].find(n=>n.type==='boss').key;startBattle(kind);
};
const restore=async page=>{
 await page.evaluate(()=>localStorage.setItem(SAVE_KEY,saveStateJSON()));await page.reload();await page.click('#menuLoad');await page.waitForFunction(()=>document.body.classList.contains('in-battle'));
};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const results=[];
 try{for(const viewport of [{width:1920,height:1080},{width:1366,height:768}]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage(),errors=[],failures=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('requestfailed',r=>failures.push(r.url()+':'+r.failure()?.errorText));page.on('response',r=>{if(r.status()>=400)failures.push(r.status()+' '+r.url())});
  await page.goto(url);await page.click('#menuStart');await page.locator('#heroGrid .hero').first().click();await page.click('#startBtn');await page.click('[data-provision="funds"]');
  const hp=[];for(let stage=0;stage<5;stage++){
   await page.evaluate(fixture,{stage});hp.push(await page.evaluate(()=>state.enemies[0].maxHp));
   await page.evaluate(()=>{const e=state.enemies[0];e.hp=Math.floor(e.maxHp*.4);TOE_MONSTER_COMBAT.activateDomain(e);dealToEnemy(e,0);renderBattle()});
   const before=await page.evaluate(()=>JSON.stringify({hp:state.enemies[0].hp,maxHp:state.enemies[0].maxHp,phase:state.enemies[0].phase,domain:state.enemies[0].domain}));
   await page.waitForTimeout(150);await restore(page);assert.equal(await page.evaluate(()=>JSON.stringify({hp:state.enemies[0].hp,maxHp:state.enemies[0].maxHp,phase:state.enemies[0].phase,domain:state.enemies[0].domain})),before);
  }assert.deepEqual(hp,[180,270,360,460,600]);
  await page.evaluate(fixture,{hero:6,kind:'normal'});
  await page.evaluate(()=>{const api=TOE_CARD_RUNTIME;state.deck=[api.make(api.definitions.get('ire-23')),api.make(api.definitions.get('ire-23'))];for(const c of state.deck)c.properties=[{keyword:'안식'},{keyword:'신속'}];state.hand=[state.deck[0]];state.draw=[state.deck[1]];state.discard=[];state.exhaust=[];state.mana=3;renderBattle()});
  await page.evaluate(async()=>{for(let i=0;i<2;i++)await useCard(state.hand.find(c=>!TOE_CARD_CORE.isResourceCycleLocked(c,state)).id)});
  const ire=await page.evaluate(()=>({mana:state.mana,locked:state.deck.every(c=>TOE_CARD_CORE.isResourceCycleLocked(c,state)),disabled:[...document.querySelectorAll('#hand .card')].every(c=>c.disabled)}));assert.deepEqual(ire,{mana:3,locked:true,disabled:true});
  // Test the final runtime adapter repeatedly; animations are disabled only for rejected calls.
  await page.evaluate(async()=>{document.body.classList.remove('in-battle');const before=saveStateJSON();for(let i=0;i<150;i++)await useCard(state.hand[i%state.hand.length].id);if(saveStateJSON()!==before)throw Error('Rejected Ire loop changed state');renderBattle()});
  await page.waitForTimeout(150);await restore(page);assert.equal(await page.evaluate(()=>state.deck.every(c=>TOE_CARD_CORE.isResourceCycleLocked(c,state))),true);
  await page.evaluate(async()=>{state.hp=500;await endTurn();if(state.deck.some(c=>TOE_CARD_CORE.isResourceCycleLocked(c,state)))throw Error('Turn guard did not reset')});
  await page.evaluate(fixture,{hero:6,kind:'normal'});
  const normal=await page.evaluate(async()=>{const c=TOE_CARD_RUNTIME.make(TOE_CARD_RUNTIME.definitions.get('ire-02'));c.properties=[{keyword:'안식'},{keyword:'신속'}];c.swiftPlays=1;state.hand=[c];state.draw=[];state.discard=[];renderBattle();const shown=Number(document.querySelector('#hand .cost').textContent),before=state.mana;await useCard(c.id);return {shown,paid:before-state.mana,rest:state.draw.some(x=>x.id===c.id),swift:c.swiftPlays}});assert.deepEqual(normal,{shown:0,paid:0,rest:true,swift:2});
  const blocks=[];for(const [bonus,mult,amp,expected] of [[0,1,false,10],[3,1,false,13],[0,2,false,20],[0,1,true,15],[3,2,true,33]]){
   await page.evaluate(fixture,{kind:'normal'});
   blocks.push(await page.evaluate(async({bonus,mult,amp})=>{const definition=CHARACTER_CARD_DATABASE.cards.find(c=>c.type==='스킬');const c=TOE_CARD_RUNTIME.make({...definition,id:'qa-block-10',cost:{action:1,inner:0},effects:[{op:'gainBlock',amount:10}]});state.hand=[c];state.block=0;state.inventory=bonus?[{effect:'skillBlock',amount:bonus}]:[];state.potionBlockMultiplier=mult;state.potionAmplify=amp;renderBattle();await useCard(c.id);return state.block},{bonus,mult,amp}));assert.equal(blocks.at(-1),expected);
  }
  const clock=[];for(const swift of [0,1]){
   await page.evaluate(fixture,{stage:2});
   await page.evaluate(swift=>{const api=TOE_CARD_RUNTIME;state.deck=['bell-03','bell-04'].map(id=>api.make(api.definitions.get(id)));state.hand=[...state.deck];state.draw=[];state.discard=[];for(const c of state.deck){c.properties=[{keyword:'신속'}];c.swiftPlays=swift}TOE_MONSTER_COMBAT.activateDomain(state.enemies[0]);TOE_MONSTER_COMBAT.applyClockLaw(state.enemies[0]);renderBattle()},swift);
   const before=await page.evaluate(()=>state.hand.map(c=>({id:c.id,cost:c.cost,actionCost:c.actionCost,delta:c.domainCostDelta,shown:TOE_CARD_CORE.paymentCost(c,state).actionCost})));
   assert.deepEqual(before.map(c=>c.delta),[-1,1]);assert.deepEqual(before.map(c=>c.shown),swift?[0,1]:[0,2]);
   await page.waitForTimeout(150);await restore(page);assert.deepEqual(await page.evaluate(()=>state.hand.map(c=>({id:c.id,cost:c.cost,actionCost:c.actionCost,delta:c.domainCostDelta,shown:TOE_CARD_CORE.paymentCost(c,state).actionCost}))),before);
   for(let i=0;i<2;i++){
    const result=await page.evaluate(async()=>{const c=state.hand[0];renderBattle();const shown=Number(document.querySelector('#hand .cost').textContent),before=state.mana;await useCard(c.id);return {role:c.domainRole,shown,paid:before-state.mana,cost:c.cost,actionCost:c.actionCost}});assert.equal(result.shown,result.paid);assert.equal(result.cost,result.actionCost);clock.push(result);
   }
   await page.evaluate(async()=>{await endTurn();for(const c of state.deck)if(c.cost!==c.actionCost)throw Error('Original cost polluted by turn transition');for(const pile of [state.draw,state.discard,state.exhaust])for(const c of pile)if(c.domainRole!==undefined)throw Error('Old turn clock role retained outside hand');TOE_MONSTER_COMBAT.clearClockLaw();for(const c of state.deck)if(c.domainCostDelta!==undefined||c.domainRole!==undefined)throw Error('Clock reset failed');TOE_MONSTER_COMBAT.applyClockLaw(state.enemies[0]);startBattle('normal');for(const c of state.deck)if(c.domainCostDelta!==undefined||c.domainRole!==undefined||c.cost!==c.actionCost)throw Error('Clock polluted next battle')});
  }
  await page.waitForTimeout(300);assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);results.push({viewport,hp,ire,ireAttempts:152,normal,blocks,clock,consoleErrors:0,httpFailures:0});await context.close();
 }}finally{await browser.close()}console.log(JSON.stringify({results},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
