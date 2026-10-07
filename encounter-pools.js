/* Final 25-roster encounter pools. Size and combat AI remain in their own masters. */
(()=>{
  const floors=[
    {easy:[['굶주린 들개'],['성벽 박쥐'],['녹슨 병사']],standard:[['굶주린 들개','녹슨 병사'],['성벽 박쥐','굶주린 들개'],['성벽 박쥐','녹슨 병사']],hard:[['녹슨 병사','굶주린 들개','성벽 박쥐'],['녹슨 병사','굶주린 들개','굶주린 들개']]},
    {easy:[['피꽃 사냥개'],['독화분 정령'],['가시 덩굴']],standard:[['피꽃 사냥개','독화분 정령'],['가시 덩굴','피꽃 사냥개'],['가시 덩굴','독화분 정령']],hard:[['가시 덩굴','피꽃 사냥개','독화분 정령'],['피꽃 사냥개','피꽃 사냥개','독화분 정령']]},
    {easy:[['태엽쥐'],['종지기 인형'],['톱니 고블린']],standard:[['태엽쥐','톱니 고블린'],['종지기 인형','톱니 고블린'],['태엽쥐','종지기 인형']],hard:[['톱니 고블린','종지기 인형','태엽쥐'],['톱니 고블린','태엽쥐','태엽쥐']]},
    {easy:[['균열 고블린'],['고해의 망령'],['문지기 시체병']],standard:[['문지기 시체병','균열 고블린'],['고해의 망령','문지기 시체병'],['균열 고블린','고해의 망령']],hard:[['문지기 시체병','고해의 망령','균열 고블린'],['문지기 시체병','균열 고블린','균열 고블린']]},
    {easy:[['성운 화염령'],['공허 빙정령'],['별을 먹는 들개']],standard:[['성운 화염령','공허 빙정령'],['별을 먹는 들개','성운 화염령'],['별을 먹는 들개','공허 빙정령']],hard:[['성운 화염령','공허 빙정령','별을 먹는 들개'],['별을 먹는 들개','별을 먹는 들개','성운 화염령']]}
  ];
  const weights={early:[55,40,5],mid:[20,55,25],late:[10,50,40]};
  const goldValues=[
    [12,15,10,55,100], [16,17,14,68,125], [17,21,19,82,150],
    [21,23,26,100,180], [25,27,30,122,220]
  ];
  function choose(kind,stage,row,random=Math.random,history=[]){
    if(kind!=='normal')return{difficulty:kind.toUpperCase(),names:[kind==='elite'?STAGES[stage].elite[0]:STAGES[stage].boss[0]]};
    const segment=row<=4?'early':row<=10?'mid':'late',roll=random()*100,w=weights[segment];
    const difficulty=roll<w[0]?'easy':roll<w[0]+w[1]?'standard':'hard';
    const pool=floors[stage][difficulty],available=pool.filter(names=>!history.includes(names.join('|')));
    const names=(available.length?available:pool)[Math.floor(random()*(available.length||pool.length))];
    return{difficulty:difficulty.toUpperCase(),names};
  }
  buildEncounter=function(kind){
    const history=state.recentEncounters?.[state.stage]||[],choice=choose(kind,state.stage,state.node||0,Math.random,history);
    state.encounterDifficulty=choice.difficulty;
    if(kind==='normal'){
      state.recentEncounters??={};state.recentEncounters[state.stage]=[...history,choice.names.join('|')].slice(-2);
    }
    const stage=STAGES[state.stage],templates=choice.names.map(name=>[...stage.enemies,stage.elite,stage.boss].find(row=>row[0]===name));
    if(templates.some(row=>!row))throw Error(`Encounter pool contains unknown monster: ${choice.names}`);
    state.encounterGold=templates.reduce((sum,row)=>sum+goldValues[state.stage][[...stage.enemies,stage.elite,stage.boss].findIndex(item=>item[0]===row[0])],0);
    state.combatStartHp=state.hp;state.potionsUsedInCombat=0;
    return templates.map((template,i)=>createEnemy(template,kind,templates.length,i===0,i));
  };
  window.TOE_ENCOUNTER_POOLS={floors,weights,goldValues,choose};
})();
