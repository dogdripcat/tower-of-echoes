/* PC Chromium smoke against a local static server. PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH can select a Windows Chrome/Edge binary. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const summary=[];
  try{for(const viewport of [{width:1920,height:1080},{width:1366,height:768}]){
    const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[],failures=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
    page.on('requestfailed',r=>failures.push(`${r.url()}: ${r.failure()?.errorText}`));
    page.on('response',r=>{if(r.status()>=400)failures.push(`${r.status()} ${r.url()}`)});
    await page.goto(process.env.TOE_QA_URL||'http://127.0.0.1:8000');
    await page.click('#menuStart');await page.locator('#heroGrid .hero').first().click();await page.evaluate(()=>state.rngState=123456789);await page.click('#startBtn');
    await page.locator('[data-provision="funds"]').waitFor();await page.click('[data-provision="funds"]');await page.locator('[data-map-node]').first().waitFor();
    // Follow a generated reachable combat room through the UI.
    const next=await page.evaluate(()=>{
      const battle=()=>reachableKeys().find(key=>['monster','elite'].includes(state.map.nodes.get(key).type));
      if(battle())return battle();
      // First rows may contain only services/events. Use a deterministic combat fixture without constraining the generator.
      for(let seed=1;seed<=64;seed++){state.map_seed=seed;state.map=generateMap(seed);if(battle()){showMap();return battle()}}
    });
    assert.ok(next,'a seeded QA map must offer a reachable battle');await page.locator(`[data-map-node="${next}"]`).click();
    await page.waitForFunction(()=>TOE_LIVING_IDLE.isRunning()&&document.querySelector('.living-idle-canvas'));
    assert.equal(await page.locator('.living-idle-canvas').count(),1);
    const index=await page.evaluate(()=>state.hand.findIndex(c=>c.cost<=state.mana&&c.extra==='attack'));
    assert.ok(index>=0);const card=page.locator('#hand .card').nth(index);
    await card.focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>TOE_COMBAT_MOTION.isBusy());
    assert.equal(await page.locator('.living-idle-canvas').count(),0);
    await page.waitForFunction(()=>!TOE_COMBAT_MOTION.isBusy()&&TOE_LIVING_IDLE.isRunning());
    await page.evaluate(async()=>{
      const snapshot=()=>JSON.stringify({hand:state.hand,mana:state.mana,innerQi:state.innerQi,discard:state.discard,exhaust:state.exhaust,enemies:state.enemies,progress:state.hubProgress});
      const card=state.hand.find(c=>c.cost<=state.mana);if(!card)throw Error('No cancel fixture card');
      for(const phase of ['pre-execution','pre-impact']){
        const before=snapshot(),pending=useCard(card.id);if(phase==='pre-impact')await new Promise(resolve=>setTimeout(resolve,0));TOE_COMBAT_MOTION.clear();
        if(await pending!==false||snapshot()!==before)throw Error(`Cancellation mutated state: ${phase}`);
      }
      renderBattle();
    });
    await page.waitForFunction(()=>TOE_LIVING_IDLE.isRunning());
    await page.click('#endTurn');await page.waitForFunction(()=>!TOE_COMBAT_MOTION.isBusy()&&TOE_LIVING_IDLE.isRunning());
    for(let hero=0;hero<7;hero++){
      await page.evaluate(h=>{state.hero=h;state.hp=state.maxHp=HEROES[h].maxHp;state.deck=starter(HEROES[h]);startBattle('normal')},hero);
      await page.waitForFunction(()=>document.querySelector('#heroFigure').complete&&document.querySelector('.living-idle-canvas'));
      assert.equal(await page.locator('.living-idle-canvas').count(),1);
    }
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!TOE_LIVING_IDLE.isRunning());
    assert.equal(await page.locator('.living-idle-canvas').count(),0);
    await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>TOE_LIVING_IDLE.isRunning());
    await page.evaluate(()=>{state.hp=0;renderBattle()});assert.equal(await page.evaluate(()=>TOE_LIVING_IDLE.isRunning()),false);
    await page.evaluate(()=>{state.hp=state.maxHp;renderBattle()});await page.waitForFunction(()=>TOE_LIVING_IDLE.isRunning());
    // Real serialization, localStorage, loadGame and RNG continuation.
    await page.evaluate(()=>{
      state.roomState={nodeKey:state.map.active,nodeType:'combat',phase:'battle'};
      localStorage.setItem(SAVE_KEY,saveStateJSON());const expected=toeRandom();loadGame();if(toeRandom()!==expected)throw Error('RNG continuation mismatch');
      if(!document.body.classList.contains('in-battle'))throw Error('Battle load failed');
    });await page.waitForFunction(()=>TOE_LIVING_IDLE.isRunning());
    const mapChecks=await page.evaluate(()=>{
      const originalStage=state.stage,originalRng=state.rngState,originalSeed=state.map_seed;let count=0;
      const serialize=m=>JSON.stringify(m,(k,v)=>v instanceof Map?[...v]:v instanceof Set?[...v]:v);
      for(let stage=0;stage<5;stage++){state.stage=stage;for(const seed of [1,17,123456]){
        const map=generateMap(seed),same=generateMap(seed);if(serialize(map)!==serialize(same))throw Error('Map determinism failed');
        const gate=[...map.nodes.values()].find(n=>n.type==='gatekeeper'),boss=[...map.nodes.values()].find(n=>n.type==='boss');
        if(!gate||!boss)throw Error('Map endpoints missing');const visited=new Set(),pending=[gate.key];
        while(pending.length){const key=pending.pop();if(visited.has(key))continue;visited.add(key);const node=map.nodes.get(key);if(!node)throw Error('Missing edge target');for(const child of node.out)pending.push(child)}
        if(!visited.has(boss.key)||visited.size!==map.nodes.size)throw Error('Unreachable map room');count++;
      }
      for(const kind of ['normal','elite','boss']){const enemies=buildEncounter(kind);if(!enemies.length||enemies.some(e=>!e.id||e.hp<=0))throw Error('Invalid encounter')}}
      state.stage=originalStage;state.rngState=originalRng;state.map_seed=originalSeed;return count;
    });assert.equal(mapChecks,15);
    await page.evaluate(()=>{
      const hub=TOE_HUB,prior=state.hubProgress;state.hubProgress={};
      hub.progress().activeQuest={...hub.quests.find(q=>q.id==='GQ-SAN-B01'),progress:0};
      hub.trackProgress('sanctuary',1,'merchant');hub.trackProgress('sanctuary',1,'merchant');
      if(hub.progress().activeQuest.progress!==1)throw Error('Duplicate facility counted');
      const loaded=loadStateJSON(saveStateJSON());state.hubProgress=loaded.hubProgress;
      hub.trackProgress('sanctuary',1,'merchant');hub.trackProgress('sanctuary',1,'inn');
      if(hub.progress().activeQuest.progress!==2)throw Error('Unique ledger load failed');
      state.hubProgress=prior;
    });await page.waitForFunction(()=>TOE_LIVING_IDLE.isRunning()); // Parsing a save stays free of presentation side effects.
    await page.evaluate(()=>renderBattle());await page.waitForFunction(()=>TOE_LIVING_IDLE.isRunning());
    await page.evaluate(()=>{showMap();if(TOE_LIVING_IDLE.isRunning()||document.querySelector('.living-idle-canvas'))throw Error('Map cleanup failed');startBattle('normal')});
    await page.waitForFunction(()=>document.querySelector('.living-idle-canvas'));
    await page.click('#battleMenuToggle');await page.click('[data-battle-menu="title"]');await page.click('#confirmExit');
    assert.equal(await page.evaluate(()=>TOE_LIVING_IDLE.isRunning()),false);assert.equal(await page.locator('.living-idle-canvas').count(),0);
    await page.click('#menuLoad');await page.waitForFunction(()=>TOE_LIVING_IDLE.isRunning());
    // Real victory exits to rewards and tears down idle.
    await page.evaluate(()=>{for(const enemy of state.enemies)enemy.hp=0;winBattle()});
    assert.equal(await page.evaluate(()=>TOE_LIVING_IDLE.isRunning()),false);
    await page.waitForTimeout(300);assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
    summary.push({viewport,flow:'title/select/new run/map/battle/action/cancel/recovery/end turn/7 heroes/reduced motion/HP0/save/load/RNG/map/encounters/guild/title/load/victory PASS',mapSeeds:mapChecks,consoleErrors:errors.length,httpFailures:failures.length});
    await context.close();
  }}finally{await browser.close()}
  console.log(JSON.stringify({platform:process.platform,browser:'Chromium',results:summary},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
