const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const url=process.env.TOE_QA_URL||'http://127.0.0.1:8000';
const setup=stage=>{
 TOE_COMBAT_MOTION.clear();state.stage=stage;state.hero=0;state.hp=state.maxHp=HEROES[0].maxHp;
 state.deck=starter(HEROES[0]);state.statuses=[];state.inventory=[];state.relics=state.potions=0;
 state.rngState=123456789;state.map=generateMap(17);state.map.active=[...state.map.nodes.values()].find(n=>n.type==='boss').key;
 startBattle('boss');
};
const observe=()=>{
 window.qa={win:0,reward:0,hits:[],frames:[],events:[]};
 const priorWin=winBattle,priorReward=reward,priorDeal=dealToEnemy;
 window.winBattle=function(...args){qa.win++;return priorWin(...args)};
 window.reward=function(...args){qa.reward++;return priorReward(...args)};
 window.dealToEnemy=function(e,d){const result=priorDeal(e,d);qa.hits.push({hp:e.hp,phase:e.phase,t:performance.now()});return result};
 document.addEventListener('animationstart',e=>{if(e.animationName==='toeDeath'){const animation=e.target.getAnimations().find(a=>a.animationName==='toeDeath');qa.events.push({event:'start',t:performance.now(),elapsed:animation.currentTime,duration:animation.effect.getComputedTiming().duration});animation.finished.then(()=>qa.events.push({event:'end',t:performance.now(),elapsed:animation.currentTime}),()=>qa.events.push({event:'cancel',t:performance.now()}))}});
 new MutationObserver(ms=>{for(const m of ms)for(const n of m.removedNodes||[])if(n.matches?.('.enemy-slot')&&!n.isConnected)qa.events.push({event:'remove',t:performance.now()})}).observe(document.querySelector('#enemyParty'),{childList:true});
 let frames=0;function tick(){const n=document.querySelector('.enemy-slot.motion-death');if(n)qa.frames.push(performance.now());if(frames++<300)requestAnimationFrame(tick)}requestAnimationFrame(tick);
};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const summary=[];
 try{for(const viewport of [{width:1920,height:1080},{width:1366,height:768}]){
  for(let stage=0;stage<5;stage++){
   const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[],failures=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});page.on('requestfailed',r=>failures.push(r.url()+':'+r.failure()?.errorText));page.on('response',r=>{if(r.status()>=400)failures.push(r.status()+' '+r.url())});
   await page.goto(url);await page.click('#menuStart');await page.locator('#heroGrid .hero').first().click();await page.click('#startBtn');await page.click('[data-provision="funds"]');await page.evaluate(setup,stage);
   const activation=await page.evaluate(async stage=>{
    let e=state.enemies[0];const api=TOE_MONSTER_COMBAT;
    if(stage<4){
     if(stage===2){for(let i=0;i<3;i++){state.hp=state.maxHp;await endTurn()}}
     else{e.hp=Math.floor(e.maxHp*([.6,.7,0,.75][stage]));dealToEnemy(e,0);renderBattle()}
     assertLocal(api.chooseAction(e).type==='domain','domain prerequisite not reached');state.hp=state.maxHp;await endTurn();
    }
    assertLocal(e.domain?.active,'domain not active');let domain=e.domain;domain.cycle=2;
    const originalImage=enemyImage(e),phases=[];
    for(const [ratio,phase] of [[.60,2],[.25,3]]){
     e.hp=Math.floor(e.maxHp*ratio);e.armor=e.block=e.domain.armor=0;dealToEnemy(e,0);renderBattle();
     assertLocal(e.phase===phase,'HP phase');
     for(let i=0;i<2;i++){assertLocal(api.chooseAction(e).type!=='domain','domain repeated');state.hp=state.maxHp;await endTurn();assertLocal(e.domain===domain,'domain replaced');assertLocal(e.phase===phase,`phase mismatch boss=${stage} expected=${phase} actual=${e.phase} hp=${e.hp}/${e.maxHp} action=${e.lastActionId}`)}
     assertLocal(enemyImage(e)===originalImage,'boss art changed');
     const raw=saveStateJSON();localStorage.setItem(SAVE_KEY,raw);const expected=toeRandom();loadGame();assertLocal(toeRandom()===expected,'RNG restore');
     assertLocal(state.enemies[0].phase===phase,`phase restore boss=${stage} expected=${phase} actual=${state.enemies[0].phase} hp=${state.enemies[0].hp}/${state.enemies[0].maxHp}`);phases.push(phase);
     // load rehydrates objects; subsequent checks use the restored boss below.
     e=state.enemies[0];domain=e.domain;
    }
    return phases;
    function assertLocal(ok,message){if(!ok)throw Error(message)}
   },stage);
   assert.deepEqual(activation,[2,3]);
   // Fresh fixture; instrumentation sees genuine card IMPACT and DOM animation.
   await page.evaluate(setup,stage);await page.evaluate(()=>{
    const e=state.enemies[0];TOE_MONSTER_COMBAT.activateDomain(e);e.hp=1;e.armor=e.block=e.domain.armor=0;dealToEnemy(e,0);
    let c=state.hand.find(c=>c.extra==='attack');if(!c){c=state.deck.find(c=>c.extra==='attack');state.hand.push(c)}state.mana=99;state.firstAttack=false;state.targetId=e.id;renderBattle();window.qaCard=c.id;
   });await page.evaluate(observe);
   await page.evaluate(()=>{window.qaPending=useCard(qaCard,state.enemies[0].id)});
   await page.waitForFunction(()=>state.enemies[0].hp===0&&document.querySelector('.enemy-slot.motion-death'));
   assert.equal(await page.evaluate(()=>aliveEnemies().length),0);
   assert.equal(await page.evaluate(()=>qa.win),0);
   await page.waitForTimeout(80);assert.equal(await page.locator('.enemy-slot.motion-death').count(),1);
   await page.evaluate(()=>qaPending);await page.waitForTimeout(30);
   const death=await page.evaluate(()=>qa);
   assert.equal(death.win,1);assert.equal(death.reward,1);assert.equal(await page.locator('.enemy-slot').count(),0);
   assert.ok(death.frames.length>0);const start=death.events.find(e=>e.event==='start'),end=death.events.find(e=>e.event==='end');assert.ok(start&&end,'CSS animation must finish');assert.ok(end.t>start.t&&end.elapsed>=start.duration,'CSS fade must finish its configured duration');assert.ok(death.events.find(e=>e.event==='remove').t>=end.t);
   const stable=await page.evaluate(()=>saveStateJSON());await page.evaluate(()=>winBattle());assert.equal(await page.evaluate(()=>saveStateJSON()),stable,'duplicate win must not mutate rewards/RNG/guild');
   // Remove observer wrappers by reload, then native multi-hit (Morgana uses single life-drain).
   await page.reload();await page.click('#menuLoad');await page.evaluate(setup,stage);
   await page.evaluate(()=>{
    const e=state.enemies[0];TOE_MONSTER_COMBAT.activateDomain(e);state.hero=6;state.hp=state.maxHp=500;state.block=0;state.counterReduction=0;state.counterDamage=Math.ceil(e.maxHp*.5)+12;state.deck=starter(HEROES[6]);e.hp=Math.floor(e.maxHp*.71);e.armor=e.block=e.domain.armor=0;
    const spec=TOE_MONSTER_COMBAT.specOf(e);e.nextAction=spec.actions.find(a=>a.hits>1)||spec.actions.find(a=>a.id==='life-drain');
    if(!e.nextAction.hits){e.hp=1;state.counterDamage=e.maxHp}renderBattle();
   });await page.evaluate(observe);await page.evaluate(()=>endTurn());await page.waitForTimeout(200);
   const counter=await page.evaluate(()=>({qa,hp:state.enemies[0].hp,room:state.roomState?.phase,busy:TOE_COMBAT_MOTION.isBusy(),deadSlots:document.querySelectorAll('.enemy-slot').length}));
   assert.equal(counter.hp,0);assert.equal(counter.room,'reward');assert.equal(counter.qa.win,1);assert.equal(counter.qa.reward,1);assert.equal(counter.busy,false);assert.equal(counter.deadSlots,0);assert.ok(counter.qa.hits.length<=2);assert.ok(counter.qa.frames.length>0);
   await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>qa.hits.length),counter.qa.hits.length,'no stale IMPACT');
   assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
   summary.push({viewport,stage,boss:`BOS-F${stage+1}-01`,phases:activation,deathMs:+(end.t-start.t).toFixed(1),cssDeathMs:start.duration,visibleSampleMs:+(death.frames.at(-1)-death.frames[0]).toFixed(1),deathFrames:death.frames.length,counterHits:counter.qa.hits.length,combatEnds:counter.qa.win,rewards:counter.qa.reward,consoleErrors:errors.length,httpFailures:failures.length});
   console.log(`boss lifecycle PASS ${viewport.width} BOS-F${stage+1}-01`);await context.close();
  }
 }}finally{await browser.close()}
 if(process.env.TOE_QA_OUTPUT)fs.writeFileSync(process.env.TOE_QA_OUTPUT,JSON.stringify(summary,null,2));
 console.log(JSON.stringify({suite:'boss lifecycle',results:summary},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
