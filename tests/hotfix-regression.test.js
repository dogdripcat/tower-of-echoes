const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = file => fs.readFileSync(path.join(root, file), 'utf8');
const run = (file, context) => vm.runInNewContext(source(file), context, {filename:file});

function sanctuaryContext() {
  const nodes = new Map();
  const node = key => {
    if (!nodes.has(key)) nodes.set(key, {className:'', innerHTML:'', dataset:{}, addEventListener(type, handler) { this[type] = handler; }});
    return nodes.get(key);
  };
  const context = {
    state:{stage:0, inventory:[], gold:500, maxHp:100, hp:40},
    window:{}, sync(){},
    document:{getElementById:node, querySelector:node, querySelectorAll(){ return []; }},
    console
  };
  run('sanctuary-system.js', context);
  return {context, node};
}

function testSanctuaryStateIdentity() {
  const {context, node} = sanctuaryContext();
  const api = context.window.TOE_SANCTUARY;
  api.enter('S-1');
  const original = context.state.sanctuary;
  assert.equal(api.ensure(), original, 'ensure must preserve the live sanctuary object');
  api.openInn('', () => {}, () => {}, '', 'rest');
  node('[data-inn-rest]').click();
  assert.equal(context.state.sanctuary.innUsed, true);
  assert.equal(context.state.sanctuary.activity, 2);
  api.openInn('', () => {}, () => {}, '', 'rest');
  node('[data-inn-rest]').click();
  assert.equal(context.state.sanctuary.activity, 2, 'inn cannot charge twice in one sanctuary');
  api.enter('S-2');
  assert.equal(api.beginSession('merchant'), true);
  assert.equal(api.beginSession('merchant'), true);
  assert.equal(context.state.sanctuary.activity, 2, 'merchant charges once per sanctuary session');
  assert.equal(api.beginSession('alchemist'), true);
  assert.equal(api.beginSession('alchemist'), true);
  assert.equal(context.state.sanctuary.activity, 1, 'alchemist charges once per sanctuary session');
}

function guildContext() {
  const quests = Array.from({length:8}, (_, index) => ({id:`q${index}`, name:`Q${index}`, kind:`k${index}`, metric:index ? 'skill' : 'attack', target:2}));
  const context = {
    state:{stage:0, map_seed:17, gold:0, maxHp:100, hand:[], enemies:[]},
    window:{GUILD_QUEST_DATABASE:quests, addEventListener(){}},
    document:{querySelector(){ return null; }}, sync(){}, console,
    winBattle(){}, useBagPotion(){}
  };
  context.window.useCard = function(id) {
    if (!['play', 'kill'].includes(id)) return undefined;
    if (id === 'kill' && context.state.enemies[0]) context.state.enemies[0].hp = 0;
    context.state.hand = context.state.hand.filter(card => card.id !== id);
    return undefined;
  };
  run('hub-services.js', context);
  return context;
}

function testGuildGuards() {
  const context = guildContext();
  const api = context.window.TOE_HUB;
  const offers = api.offers();
  assert.equal(offers.length, 5, 'guild must cache exactly five offers');
  assert.ok(offers.every(offer => offer && typeof offer === 'object' && Number.isFinite(offer.gold)), 'generated offers must persist their resolved rewards');
  assert.ok(offers.every(offer => offer.gold >= 95 && offer.gold <= 135), 'default C-rank offers must use the configured range');
  assert.deepEqual(api.offers(), offers, 'opening the guild again must not reroll offers or rewards');
  for (const [grade, range] of Object.entries(api.questGoldRanges)) {
    const gold = api.questGold({id:`grade-${grade}`, grade}, '1');
    assert.ok(gold >= range[0] && gold <= range[1], `${grade}-rank reward must stay inside its range`);
    assert.equal(api.questGold({id:`grade-${grade}`, grade}, '1'), gold, `${grade}-rank reward must be deterministic`);
  }
  const reward = {id:'reward', floor:1, contractId:'1:reward', gold:75, completed:true, claimed:false};
  assert.equal(api.grantQuestReward(reward), true);
  assert.equal(api.grantQuestReward({...reward, claimed:false}), false, 'a cloned contract cannot be claimed twice');
  assert.equal(context.state.gold, 75);

  const active = {id:'skill', metric:'skill', target:2, progress:0};
  api.progress().activeQuest = active;
  context.state.hand = [{id:'blocked', type:'스킬'}];
  context.window.useCard('blocked');
  assert.equal(active.progress, 0, 'a rejected card play cannot advance a quest');
  context.state.hand = [{id:'play', type:'스킬'}];
  context.window.useCard('play');
  assert.equal(active.progress, 1);

  const attack = {id:'attack', metric:'attack', target:2, progress:0};
  api.progress().activeQuest = attack;
  context.state.enemies = [{id:'enemy', hp:10}];
  context.state.hand = [{id:'play', type:'일반 · 공격'}];
  context.window.useCard('play');
  assert.equal(attack.progress, 0, 'playing an attack card without a kill cannot advance a kill quest');
  context.state.hand = [{id:'kill', type:'일반 · 공격'}];
  context.window.useCard('kill');
  assert.equal(attack.progress, 1, 'an attack kill must be counted from the actual hp transition');
}

function monsterContext() {
  const spec = {id:'test', name:'test', hp:40, rank:'NORMAL', actions:[], ai:{}};
  const context = {
    state:{stage:0, hero:6, hp:100, block:0, counterDamage:20, enemies:[], inventory:[]},
    STAGES:[{types:['test'], enemies:[['test','test',40]], elite:['elite','test',100]}],
    window:{MONSTER_COMBAT_DATABASE:{monsters:[spec], domains:{}}},
    buildEncounter(){ return []; }, dealToEnemy(enemy, damage){ enemy.hp=Math.max(0,enemy.hp-damage); return damage; },
    intentFor(){}, startBattle(){}, endTurn(){}, renderBattle(){}, aliveEnemies(){ return context.state.enemies.filter(enemy => enemy.hp > 0); },
    console, crypto:{randomUUID(){ return 'id'; }}
  };
  run('monster-combat-system.js', context);
  return context;
}

async function testDeadEnemyGuards() {
  const context = monsterContext();
  const api = context.window.TOE_MONSTER_COMBAT;
  const loaded = {id:'dead', name:'test', hp:0, maxHp:40, kind:'normal'};
  api.normalizeEnemy(loaded, 'normal', 1, false);
  assert.equal(loaded.hp, 0, 'load normalization must preserve defeated enemies');

  const enemy = {id:'e', name:'test', hp:5, maxHp:40, kind:'normal', uses:{}, cooldowns:{}};
  const action = {id:'double', name:'double', type:'attack', damage:10, hits:2};
  let impacts = 0;
  const motion = {enemyAction(target, move, onImpact) { for(let hit=0; hit<move.hits; hit++){ impacts++; if(onImpact(hit)===false) break; } return Promise.resolve(true); }};
  await api.executeMultiHitAnimated(enemy, action, motion);
  assert.equal(enemy.hp, 0);
  assert.equal(impacts, 1, 'an enemy killed by counter damage cannot continue a multi-hit action');
  assert.equal(context.state.hp, 90);
}

async function testMotionCancellationSettlesDelay() {
  const context = {
    state:{enemies:[]},
    window:{TOE_COMBAT_MOTION_DATA:{MOTION_TAGS:[], player:{}, monster:{}}, matchMedia(){ return {matches:false}; }},
    document:{body:{classList:{contains(){ return false; }, toggle(){}}}, querySelector(){ return null; }, querySelectorAll(){ return []; }},
    setTimeout, clearTimeout, Promise, Map, Set, console
  };
  run('combat-motion-system.js', context);
  const pending = context.window.TOE_COMBAT_MOTION.delay(10000);
  context.window.TOE_COMBAT_MOTION.clear();
  assert.equal(await pending, false, 'clearing motion must settle pending delays as cancelled');
}

function testInlineScriptsParse() {
  const html = source('index.html');
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  assert.ok(inline.length > 0);
  inline.forEach((match, index) => new vm.Script(match[1], {filename:`index.html:inline-${index + 1}`}));
}

function testSavedRngContinuesDeterministically() {
  const html = source('index.html');
  const definitions = html.match(/function freshRngSeed\(\)[^\n]+\nfunction toeRandom\(\)[^\n]+/)[0];
  const context = {state:{rngState:123456789}, crypto:{getRandomValues(words){ words[0]=1; return words; }}, Uint32Array};
  vm.runInNewContext(definitions, context);
  context.toeRandom();
  const saved = context.state.rngState;
  const expected = context.toeRandom();
  context.state.rngState = saved;
  assert.equal(context.toeRandom(), expected, 'loading a saved RNG state must reproduce the next outcome');
}

function testRoomStatePersistsThroughSaveLoad() {
  const html = source('index.html');
  const definitions = html.match(/function saveStateJSON\(\)[\s\S]+?function loadStateJSON\(raw\)[\s\S]+?\n}/)[0];
  const context = {
    state:{
      hero:0,
      inventory:[],
      roomState:{
        nodeKey:'3-1', nodeType:'combat', phase:'reward',
        reward:{goldReward:45, claimedGold:true, picked:true, claimedExtras:['potion'], afterAction:'finishMapRoom'}
      },
      map:{nodes:new Map([['3-1',{key:'3-1'}]]), visited:new Set(['3-1']), active:'3-1'}
    },
    POTION_DATABASE:[], POTION_SLOT_LIMIT:3, crypto:{randomUUID(){ return 'id'; }},
    Map, Set, JSON, Math
  };
  vm.runInNewContext(definitions, context);
  const loaded = context.loadStateJSON(context.saveStateJSON());
  assert.equal(loaded.roomState.phase, 'reward');
  assert.equal(loaded.roomState.reward.claimedGold, true, 'claimed reward flags must survive load');
  assert.deepEqual([...loaded.roomState.reward.claimedExtras], ['potion']);
  assert.equal(loaded.map.active, '3-1', 'the active room must survive load');
  assert.ok(loaded.map.nodes instanceof Map && loaded.map.visited instanceof Set, 'map collections must be restored');
}

(async () => {
  testSanctuaryStateIdentity();
  testGuildGuards();
  await testDeadEnemyGuards();
  await testMotionCancellationSettlesDelay();
  testInlineScriptsParse();
  testSavedRngContinuesDeterministically();
  testRoomStatePersistsThroughSaveLoad();
  console.log('hotfix regression tests passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
