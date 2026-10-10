const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const url=process.env.TOE_QA_URL||'http://127.0.0.1:8000';
const fixture=({stage,kind})=>{
 TOE_COMBAT_MOTION.clear();state.stage=stage;state.hero=kind==='counter'?6:0;state.hp=state.maxHp=500;state.deck=starter(HEROES[state.hero]);state.inventory=[];state.relics=state.potions=0;state.statuses=[];state.rngState=123456789;
 state.map=generateMap(17);state.map.active=[...state.map.nodes.values()].find(n=>n.type==='boss').key;startBattle('boss');
 const e=state.enemies[0];TOE_MONSTER_COMBAT.activateDomain(e);e.armor=e.block=e.domain.armor=0;
 const spec=TOE_MONSTER_COMBAT.specOf(e);e.nextAction=spec.actions.find(a=>a.hits>1)||spec.actions.find(a=>a.id==='life-drain');
 if(kind==='counter'){e.hp=Math.floor(e.maxHp*.71);state.counterReduction=0;state.counterDamage=Math.ceil(e.maxHp*.5)+12;if(!e.nextAction.hits){e.hp=1;state.counterDamage=e.maxHp}}
 state.block=0;dealToEnemy(e,0);renderBattle();
 window.qaCard=state.hand.find(c=>c.extra==='attack'&&c.cost<=state.mana)?.id;
 if(kind==='player'&&!qaCard)throw Error('No playable attack card');
 return saveStateJSON();
};
const reset=raw=>{
 TOE_COMBAT_MOTION.clear();const base=loadStateJSON(raw);for(const key of Object.keys(state))if(!(key in base))delete state[key];localStorage.setItem(SAVE_KEY,raw);loadGame();
 window.qaHits=0;
};
const run=kind=>kind==='player'?useCard(qaCard,state.enemies[0].id):endTurn();
const canonical=()=>{
 const saved=JSON.parse(saveStateJSON());
 // Reward instance UUIDs are crypto-generated, not gameplay RNG; compare canonical rewards.
 const reward=saved.roomState?.reward;
 if(reward){if(reward.rewardRelic)delete reward.rewardRelic.id;for(const card of reward.pool||[])delete card.id}
 return saved;
};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const summary=[];
 try{for(const viewport of [{width:1920,height:1080},{width:1366,height:768}]){
  for(let stage=0;stage<5;stage++){
   const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[],failures=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('requestfailed',r=>failures.push(r.url()));page.on('response',r=>{if(r.status()>=400)failures.push(r.status()+' '+r.url())});
   await page.goto(url);await page.click('#menuStart');await page.locator('#heroGrid .hero').first().click();await page.click('#startBtn');await page.click('[data-provision="funds"]');
   for(const [kind,checkpoint] of [['player','before-impact'],['enemy','before-impact'],['enemy','after-first-hit'],['counter','before-impact'],['counter','after-lethal']]){
    const base=await page.evaluate(fixture,{stage,kind});
    await page.evaluate(()=>{const prior=dealToEnemy;window.qaOriginalDeal=prior;window.dealToEnemy=function(...args){qaHits++;return prior(...args)}});
    await page.evaluate(reset,base);await page.evaluate(run,kind);const expected=await page.evaluate(canonical);
    await page.evaluate(reset,base);
    const queued=await page.evaluate(async({kind,checkpoint})=>{
     window.qaAction=kind==='player'?useCard(qaCard,state.enemies[0].id):endTurn();
     if(checkpoint==='after-first-hit'){const hp=state.hp;while(state.hp===hp)await new Promise(r=>requestAnimationFrame(r))}
     if(checkpoint==='after-lethal')while(state.enemies[0].hp>0)await new Promise(r=>requestAnimationFrame(r));
     const busy=TOE_COMBAT_MOTION.isBusy(),before=localStorage.getItem(SAVE_KEY);
     const save=saveGame(),second=saveGame();const deferred=localStorage.getItem(SAVE_KEY)===before;
     const result=await save;await qaAction;
     return {busy,deferred,coalesced:save===second,result,stable:!TOE_COMBAT_MOTION.isBusy()};
    },{kind,checkpoint});
    assert.equal(queued.busy,true);assert.equal(queued.deferred,true);assert.equal(queued.coalesced,true);assert.equal(queued.result,true);assert.equal(queued.stable,true);
    const saved=await page.evaluate(canonical);assert.deepEqual(saved,expected,`${stage}/${kind}/${checkpoint}: action-boundary state vs no-save baseline`);
    // Compare persisted raw state after true browser reload and UI restore.
    await page.reload();await page.click('#menuLoad');const restored=await page.evaluate(canonical);assert.deepEqual(restored,expected,`${stage}/${kind}/${checkpoint}: reload`);
    assert.equal(await page.evaluate(()=>TOE_COMBAT_MOTION.isBusy()),false);
    summary.push({viewport,stage,kind,checkpoint,result:'PASS damage/cards/energy/RNG/domain/room/reload',rng:restored.rngState});
   }
   // Canceled pre-impact request must not overwrite the last complete save.
   const base=await page.evaluate(fixture,{stage,kind:'player'});await page.evaluate(reset,base);
   const canceled=await page.evaluate(async()=>{const before=saveStateJSON(),persisted=localStorage.getItem(SAVE_KEY),action=useCard(qaCard,state.enemies[0].id),save=saveGame();TOE_COMBAT_MOTION.clear();return {action:await action,save:await save,unchanged:localStorage.getItem(SAVE_KEY)===persisted&&saveStateJSON()===before}});
   assert.deepEqual(canceled,{action:false,save:false,unchanged:true});
   console.log(`combat save PASS ${viewport.width} BOS-F${stage+1}-01`);assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);await context.close();
  }
 }}finally{await browser.close()}
 if(process.env.TOE_QA_OUTPUT)fs.writeFileSync(process.env.TOE_QA_OUTPUT,JSON.stringify(summary,null,2));
 console.log(JSON.stringify({suite:'combat stable-boundary save',cases:summary.length,results:summary},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
