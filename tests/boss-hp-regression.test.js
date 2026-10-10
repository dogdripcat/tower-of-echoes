const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),db=JSON.parse(fs.readFileSync(path.join(root,'data/monster-combat.json'))),node={classList:{add(){},remove(){}}};
const context={HEROES:[{resourceMax:3}],window:{MONSTER_COMBAT_DATABASE:db},state:{stage:0,node:0,hero:0,hp:100,maxHp:100,inventory:[],deck:[],enemies:[]},document:{body:node},$(selector){return selector==='#battleEffects'?null:node},crypto:{randomUUID(){return 'enemy'}},toeRandom(){return .9},orderVanguard:x=>x,shuffle:x=>x,drawCards(){},renderBattle(){},startStageBgm(){},dealToEnemy(e,d){e.hp-=d;return d},aliveEnemies(){return context.state.enemies.filter(e=>e.hp>0)},endTurn(){},console};
vm.runInNewContext(html.slice(html.indexOf('const STAGES=['),html.indexOf("const GAME_VERSION="))+'globalThis.STAGES=STAGES;',context);
vm.runInNewContext(html.slice(html.indexOf('function randomBetween('),html.indexOf('function intentFor(enemy)')),context);
vm.runInNewContext(html.slice(html.indexOf('startBattle=function(kind){'),html.indexOf('function dealToEnemy(enemy,damage){')),context);
vm.runInNewContext(fs.readFileSync(path.join(root,'encounter-pools.js'),'utf8'),context);
let normalizations=0;const create=context.createEnemy;context.createEnemy=(...args)=>new Proxy(create(...args),{set(e,key,value){if(key==='maxHp')normalizations++;e[key]=value;return true}});
vm.runInNewContext(fs.readFileSync(path.join(root,'monster-combat-system.js'),'utf8'),context);
const api=context.window.TOE_MONSTER_COMBAT;
for(let stage=0;stage<5;stage++){
 context.state.stage=stage;const boss=db.monsters.find(m=>m.id===`BOS-F${stage+1}-01`);normalizations=0;context.startBattle('boss');let e=context.state.enemies[0];
 assert.equal(e.maxHp,boss.hp);assert.equal(e.hp,boss.hp);assert.equal(normalizations,1,'battle initialization must normalize once');
 const saved=JSON.parse(JSON.stringify(e));saved.hp=Math.floor(saved.maxHp*.4);api.normalizeEnemy(saved,'boss',1,true,true);assert.equal(saved.maxHp,boss.hp);assert.equal(saved.hp,Math.floor(boss.hp*.4));
 api.normalizeEnemy(e,'boss',1,true);assert.equal(e.maxHp,boss.hp,'re-entry must be idempotent');
 const eliteHp=context.STAGES[stage].elite[2];context.STAGES[stage].elite[2]=1;const scaled=create(context.STAGES[stage].boss,'boss',1,true);scaled.hp=scaled.maxHp=Math.round(scaled.maxHp*1.5);api.normalizeEnemy(scaled,'boss',1,true);assert.equal(scaled.maxHp,Math.round(boss.hp*1.5),'retain intended encounter scaling once without elite fallback');api.normalizeEnemy(scaled,'boss',1,true);assert.equal(scaled.maxHp,Math.round(boss.hp*1.5));context.STAGES[stage].elite[2]=eliteHp;
 for(const kind of ['normal','elite']){const list=context.buildEncounter(kind);for(const enemy of list){const spec=api.specOf(enemy),template=[...context.STAGES[stage].enemies,context.STAGES[stage].elite].find(t=>t[0]===enemy.name),created=create(template,kind,list.length,enemy.slot===0,enemy.slot);const expected=Math.round(spec.hp*created.maxHp/template[2]);assert.equal(enemy.maxHp,expected,`${kind} initial scaling preserved`);assert.equal(enemy.hp,expected)}}
}
console.log('boss HP regression: F1–F5 DB/base/actual, single normalization, idempotence, 1.5 scaling, no elite fallback, normal/elite and restore PASS');
