/* Tower of Echoes v1.2.0 combat-motion metadata. Presentation only. */
(() => {
  const MOTION_TAGS = Object.freeze([
    'ATTACK_QUICK','ATTACK_HEAVY','ATTACK_RANGED','ATTACK_MAGIC','ATTACK_SUMMON','ATTACK_AOE',
    'SKILL_CAST','SKILL_UTILITY','SKILL_BUFF','SKILL_DEBUFF','DEFEND','DODGE','COUNTER',
    'AWAKENING','TRANSCENDENCE'
  ]);
  const COMMON_STATES = Object.freeze({
    player:['IDLE','ATTACK_A','ATTACK_B','SKILL','DEFEND','HIT','HEAVY_HIT','AWAKENING','TRANSCENDENCE'],
    monster:['IDLE','ATTACK','HEAVY_ATTACK','SKILL','DEFEND','HIT','DEATH'],
    boss:['IDLE','ATTACK_A','ATTACK_B','SPECIAL','PHASE_SKILL','DEFEND','HIT','BREAK','DEATH']
  });
  const emblems = {
    '벨':'assets/emblem-bell-final.png','세라핀':'assets/emblem-seraphin-final.png',
    '루미에라':'assets/emblem-lumiera-final.png','베르나':'assets/emblem-verna-final.png',
    '이리스':'assets/emblem-iris-final.png','카렌':'assets/emblem-karen-final.png','이레':'assets/emblem-ire-final.png'
  };
  const player = {
    '벨':{identity:'DUELIST',speed:0.82,accent:'#e84d66',pose:'sword',emblem:emblems['벨'],states:[...COMMON_STATES.player,'COUNTER']},
    '세라핀':{identity:'ARCANE_CASTER',speed:0.94,accent:'#a96cff',pose:'staff',emblem:emblems['세라핀'],states:[...COMMON_STATES.player,'CAST']},
    '루미에라':{identity:'SACRED_DEFENDER',speed:1.02,accent:'#f4cf79',pose:'shield',emblem:emblems['루미에라'],states:[...COMMON_STATES.player,'CAST']},
    '베르나':{identity:'MARKSMAN',speed:0.88,accent:'#7dd6ae',pose:'rifle',emblem:emblems['베르나'],states:[...COMMON_STATES.player,'DODGE']},
    '이리스':{identity:'PUPPET_MASTER',speed:0.98,accent:'#bdc7ef',pose:'puppet',emblem:emblems['이리스'],states:[...COMMON_STATES.player,'SUMMON','CAST']},
    '카렌':{identity:'SPIRIT_WARRIOR',speed:1.08,accent:'#e96e3f',pose:'axe',emblem:emblems['카렌'],states:[...COMMON_STATES.player,'COUNTER']},
    '이레':{identity:'MARTIAL_ARTIST',speed:0.76,accent:'#64c9e8',pose:'fist',emblem:emblems['이레'],states:[...COMMON_STATES.player,'DODGE','COUNTER']}
  };
  const profile = (archetype, accent, options={}) => ({
    archetype, accent, elite:false, boss:false, floating:false,
    states:[...COMMON_STATES.monster], ...options
  });
  const monster = {
    'MON-F1-01':profile('BEAST','#a76d58'),
    'MON-F1-02':profile('HUMANOID','#9c876d',{states:[...COMMON_STATES.monster,'COUNTER']}),
    'MON-F1-03':profile('BEAST_FLYING','#8f74b4',{floating:true,states:[...COMMON_STATES.monster,'SUMMON']}),
    'ELT-F1-01':profile('HUMANOID_KNIGHT','#c35c5c',{elite:true,states:[...COMMON_STATES.monster,'COUNTER','TELEGRAPH']}),
    'MON-F2-01':profile('BEAST','#bd4560'),
    'MON-F2-02':profile('PLANT','#6cad5a',{states:[...COMMON_STATES.monster,'CONTROL']}),
    'MON-F2-03':profile('PLANT_ELEMENTAL','#8cbf56',{states:[...COMMON_STATES.monster,'HEAL']}),
    'ELT-F2-01':profile('PLANT_HUMANOID','#d05b83',{elite:true,states:[...COMMON_STATES.monster,'CONTROL','HEAL','TELEGRAPH']}),
    'BOS-F2-01':profile('ROSE_QUEEN','#d63b65',{boss:true,states:[...COMMON_STATES.boss,'CONTROL']}),
    'MON-F3-01':profile('MECHANICAL_BEAST','#b79768'),
    'MON-F3-02':profile('MECHANICAL_HUMANOID','#9f8a63',{states:[...COMMON_STATES.monster,'COUNTER']}),
    'MON-F3-03':profile('AUTOMATON','#8a8dad',{states:[...COMMON_STATES.monster,'BUFF']}),
    'ELT-F3-01':profile('CLOCKWORK_ELITE','#d0a85c',{elite:true,states:[...COMMON_STATES.monster,'CHARGE','TELEGRAPH']}),
    'BOS-F3-01':profile('CLOCK_WITCH','#74a8d7',{boss:true,states:[...COMMON_STATES.boss,'TIME_CAST']}),
    'MON-F4-01':profile('ABERRANT_HUMANOID','#8f62c8'),
    'MON-F4-02':profile('UNHOLY_FLOATING','#8a79bd',{floating:true,states:[...COMMON_STATES.monster,'CURSE']}),
    'MON-F4-03':profile('UNDEAD_HUMANOID','#718d77',{states:[...COMMON_STATES.monster,'COUNTER']}),
    'ELT-F4-01':profile('UNDEAD_EXECUTIONER','#64606c',{elite:true,states:[...COMMON_STATES.monster,'TELEGRAPH','SURVIVE']}),
    'BOS-F4-01':profile('VEIL_GATEKEEPER','#8962bd',{boss:true,floating:true,states:[...COMMON_STATES.boss,'CURSE','DRAIN']}),
    'MON-F5-01':profile('ELEMENTAL_FIRE','#ff6c49',{floating:true}),
    'MON-F5-02':profile('ELEMENTAL_ICE','#69c9f0',{floating:true}),
    'MON-F5-03':profile('OTHERWORLD_BEAST','#8870d7'),
    'ELT-F5-01':profile('OTHERWORLD_HUMANOID','#7d68c8',{elite:true,states:[...COMMON_STATES.monster,'DISTORT','TELEGRAPH']}),
    'BOS-F5-01':profile('OUTER_GOD_ECHO','#b17cf0',{boss:true,floating:true,states:[...COMMON_STATES.boss,'DISTORT','LAW_CAST']}),
    'BOS-F1-01':profile('ARMORED_GATEKEEPER','#c54b56',{boss:true,states:[...COMMON_STATES.boss,'COUNTER','TELEGRAPH']})
  };
  const heavyActions = new Set([
    'chase','execution','blood-charge','chase-charge','constrict','swallow','bloom','bell-of-doom','heavy-pendulum',
    'final-bell','silent-execution','border-harvest','scorch','devour-chase','law-collapse','sanctum-collapse','blood-execution'
  ]);
  const specialActions = new Set(['domain','bloom-prepare','wind-up-charge','harvest-prepare','collapse-prepare','execution-prepare','charge','death-sentence']);
  function actionTag(enemy, action) {
    if (!action) return 'SKILL_UTILITY';
    if (specialActions.has(action.id) || action.type === 'domain' || action.type === 'telegraph') return enemy?.rank === 'BOSS' ? 'PHASE_SKILL' : 'SKILL_CAST';
    if (action.type === 'block' || action.type === 'blockHeal' || action.type === 'blockBuff' || action.type === 'recover') return 'DEFEND';
    if (action.type === 'counter') return 'COUNTER';
    if (action.type === 'summon') return 'ATTACK_SUMMON';
    if (['status','buff','heal','lawErosion'].includes(action.type)) return action.type === 'status' || action.type === 'lawErosion' ? 'SKILL_DEBUFF' : 'SKILL_BUFF';
    if ((action.hits || 1) > 1) return 'ATTACK_AOE';
    if (heavyActions.has(action.id) || action.damage >= 16) return 'ATTACK_HEAVY';
    if (/ELEMENTAL|OTHERWORLD|WITCH|VEIL|OUTER_GOD/.test(monster[enemy?.monsterId]?.archetype || '')) return 'ATTACK_MAGIC';
    return 'ATTACK_QUICK';
  }
  const allTarget = card => /모든 적/.test(card?.target || card?.effect || card?.description || '');
  const contains = (card, expression) => expression.test(`${card?.name || ''} ${card?.effect || card?.description || ''}`);
  function cardTag(card, heroName) {
    if (!card) return 'SKILL_UTILITY';
    if (card.type === '각성' || card.extra === 'awakening-card') return 'AWAKENING';
    if (card.type === '초월' || card.extra === 'awakening-transcendence') return 'TRANSCENDENCE';
    if (card.type === '강화') return 'SKILL_BUFF';
    if (card.type === '스킬' || card.extra === 'block' || card.extra === 'skill') {
      if (contains(card,/방어|장막|수비|보호|성호|회피/)) return contains(card,/회피/) ? 'DODGE' : 'DEFEND';
      if (contains(card,/표식|출혈|취약|감전|빙결|도발|약화|저주|속박/)) return 'SKILL_DEBUFF';
      if (contains(card,/강화|축복|태세|집중|탄약|내공|신앙|전투혼|회복/)) return 'SKILL_BUFF';
      return heroName === '세라핀' || heroName === '이리스' ? 'SKILL_CAST' : 'SKILL_UTILITY';
    }
    if (allTarget(card)) return 'ATTACK_AOE';
    if (heroName === '세라핀') return 'ATTACK_MAGIC';
    if (heroName === '베르나') return contains(card,/단검|총검/) ? 'ATTACK_QUICK' : 'ATTACK_RANGED';
    if (heroName === '이리스') return 'ATTACK_SUMMON';
    if (heroName === '루미에라') return contains(card,/강림|심판|쇄도|선회/) ? 'ATTACK_AOE' : contains(card,/강타|돌파|징벌/) ? 'ATTACK_HEAVY' : 'ATTACK_QUICK';
    if (heroName === '카렌') return contains(card,/폭풍|횡베기|결정타|내려치기|육박전/) ? 'ATTACK_HEAVY' : 'ATTACK_QUICK';
    if (heroName === '이레') return contains(card,/천지개벽|발경|철산고|쌍장|용권/) ? 'ATTACK_HEAVY' : 'ATTACK_QUICK';
    return contains(card,/최후|성문|플레슈|팡트|전열/) ? 'ATTACK_HEAVY' : contains(card,/반격/) ? 'COUNTER' : 'ATTACK_QUICK';
  }
  window.TOE_COMBAT_MOTION_DATA = {version:'1.2.0',MOTION_TAGS,COMMON_STATES,player,monster,actionTag,cardTag,emblems};
})();
