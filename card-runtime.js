/* Canonical 350-card browser adapter. Loaded after monster combat and before Awakening. */
(() => {
  const core = window.TOE_CARD_CORE;
  const database = window.CHARACTER_CARD_DATABASE;
  if (!core || !database?.cards) throw new Error('CARD_RUNTIME_BOOT_FAILED');
  const definitions = new Map(database.cards.map(card => [card.id, card]));
  const heroCards = hero => database.cards.filter(card => card.hero === hero);
  const normal = card => core.NORMAL_TYPES.has(card.type);
  const colors = {일반:'#eee9df',고급:'#69c987',희귀:'#68a9ee',신화:'#b984ef',전설:'#f0bd52'};

  function linkLovers(cards) {
    for (const card of cards) for (const property of card.properties || []) {
      if (property.keyword !== '연인' || property.pairId) continue;
      const pair = cards.find(other => other !== card && (other.cardId === property.pairCard || other.name.replace(/\*/g, '') === property.pairCard));
      if (pair) property.pairId = pair.id;
    }
  }
  function decorate(card) {
    if (card.extra === 'attack') card.art ||= CARD_ART_ATTACK;
    else if (card.extra === 'skill') card.art ||= CARD_ART_DEFENSE;
    else card.art ||= specialCardArt(HEROES[state.hero] || HEROES.find(hero => hero.name === card.hero));
    card.rarity ||= colors[card.rarityName] || '#eee9df';
    return card;
  }
  function make(definition) { return decorate(core.materialize(definition)); }
  function hydrateCard(card) {
    const definition = definitions.get(card?.cardId || card?.sourceCardId);
    if (!definition) return card;
    const canonical = decorate(core.materialize(definition, card.id));
    const merged = Object.assign(canonical, card);
    merged.cardId = definition.id;
    merged.sourceCardId = definition.id;
    if (card.canonicalUpgradeLevel || /\*/.test(card.name || '')) {
      merged.canonicalUpgradeLevel = 0;
      core.applyCanonicalUpgrade(merged, definition);
      for (const key of ['shopSynergy','shopConverted','properties','swiftPlays','potionCostReduction']) if (card[key] != null) merged[key] = card[key];
    }
    return merged;
  }
  function hydrateState() {
    const byId = new Map();
    for (const key of ['deck','hand','draw','discard','exhaust']) {
      state[key] = (state[key] || []).map(card => {
        if (byId.has(card.id)) return byId.get(card.id);
        const hydrated = hydrateCard(card); byId.set(card.id, hydrated); return hydrated;
      });
    }
    linkLovers(state.deck || []);
  }
  function startingDeck(hero) {
    const cards = heroCards(hero.name).filter(card => card.startingDeck).map(make);
    if (cards.length !== 10) throw new Error(`STARTING_DECK_COUNT:${hero.name}:${cards.length}`);
    linkLovers(cards);
    return cards;
  }
  function rewardPool(hero, kind = 'normal') {
    const cards = heroCards(hero.name).filter(card => normal(card) && card.rewardSource === 'battleReward');
    const weight = kind === 'boss' ? {일반:5,고급:20,희귀:35,신화:30,전설:10} : kind === 'elite' ? {일반:20,고급:35,희귀:30,신화:12,전설:3} : {일반:55,고급:30,희귀:12,신화:3,전설:0};
    const candidates = cards.flatMap(card => Array(weight[card.rarity] || 0).fill(card));
    const picked = [], used = new Set();
    while (picked.length < 3 && candidates.length) {
      const definition = candidates[Math.floor(toeRandom() * candidates.length)];
      if (used.has(definition.id)) continue;
      used.add(definition.id); picked.push(make(definition));
    }
    return picked;
  }

  starter = startingDeck;
  const previousUpgrade = upgradeChosenCard;
  upgradeChosenCard = function(card) {
    const definition = definitions.get(card?.cardId || card?.sourceCardId);
    if (!definition) return previousUpgrade(card);
    return core.applyCanonicalUpgrade(card, definition);
  };

  const previousStart = startBattle;
  startBattle = function(kind) {
    hydrateState();
    for (const card of state.deck || []) delete card.resourceCycleTurn;
    state.cardResources = {};
    state.retainNextCards = [];
    state.cardRuntimeErrors = [];
    previousStart(kind);
    state.cardResources = {};
    window.TOE_ARCANA?.beginBattle(state);
  };

  function adjustedAmount(amount, card, operation) {
    let value = amount;
    const normalCard = normal(card);
    if (normalCard && state.potionAmplify && ['damage','block','status','resource'].includes(operation)) value = Math.ceil(value * 1.5);
    if (operation === 'block') value = Math.ceil(value * (state.potionBlockMultiplier || 1));
    return value;
  }
  function discardCards(amount, exceptId) {
    let remaining = amount;
    for (let index = state.hand.length - 1; index >= 0 && remaining > 0; index--) {
      const candidate = state.hand[index];
      if (candidate.id === exceptId) continue;
      state.discard.push(...state.hand.splice(index, 1)); remaining--;
    }
  }
  function damageWithSystems(enemy, amount, card, bonus = 0) {
    const wasAlive = enemy.hp > 0, previousPhase = enemy.phase || 1;
    let damage = adjustedAmount(amount + bonus, card, 'damage');
    const isAttack = card.type === '공격';
    if (isAttack && state.hero === 0) damage += 2;
    if (isAttack && state.hero === 1 && state.firstAttack) damage += 1;
    if (isAttack && state.hero === 3 && enemy.marked) damage += 2;
    if (isAttack && state.firstAttack) damage += (state.inventory || []).filter(item => item.effect === 'firstAttack').reduce((sum, item) => sum + item.amount, 0);
    damage += (state.activeEnhancements || []).filter(effect => effect.kind === 'attack').reduce((sum, effect) => sum + effect.amount, 0);
    if (card.shopSynergy && state.previousCardType === 'attack') damage += 3;
    if (isAttack) damage += state.potionNextAttack || 0;
    if (isAttack && state.potionNextAttackMultiplier) damage = Math.ceil(damage * state.potionNextAttackMultiplier);
    if (isAttack && state.hero === 5 && state.hp <= state.maxHp / 2 && state.firstAttack) damage *= 2;
    const dealt = dealToEnemy(enemy, damage);
    if (wasAlive && enemy.hp <= 0) window.TOE_ARCANA?.onEnemyDefeated(state, enemy.rank || String(enemy.kind || 'NORMAL').toUpperCase());
    else if (enemy.kind === 'boss' && (enemy.phase || 1) > previousPhase) window.TOE_ARCANA?.onBossPhase(state);
    if (isAttack) {
      if (state.firstAttack) {
        state.block += (state.inventory || []).filter(item => item.effect === 'firstAttackBlock').reduce((sum, item) => sum + item.amount, 0);
        if (state.hero === 6) state.innerQi = Math.min(HEROES[state.hero].secondaryMax, state.innerQi + (state.inventory || []).filter(item => item.effect === 'firstAttackQi').reduce((sum, item) => sum + item.amount, 0));
      }
      state.firstAttack = false;
    }
    return dealt;
  }
  function applyRetainQueue() {
    const queue = state.retainNextCards || [];
    for (let i = queue.length - 1; i >= 0; i--) {
      const request = queue[i];
      const candidate = state.hand.find(card => card.branchAffinity === request.branch && !hasCardProperty(card, '보존'));
      if (!candidate) continue;
      candidate.properties ??= [];
      candidate.properties.push({keyword:'보존', temporary:true});
      if (--request.amount <= 0) queue.splice(i, 1);
    }
  }
  useCard = function(id, targetId = '') {
    const index = state.hand.findIndex(card => card.id === id), card = state.hand[index];
    if (!card || !normal(card) || core.isResourceCycleLocked(card, state)) return;
    if (targetId) state.targetId = targetId;
    const target = currentTarget(), enemies = aliveEnemies();
    if (card.type === '공격' && !target) return;
    const {actionCost, innerCost} = core.paymentCost(card, state);
    if (actionCost > state.mana || innerCost > state.innerQi) return;
    state.mana -= actionCost; state.innerQi -= innerCost;
    const trigger = card.type === '공격' ? '매 턴 첫 공격' : card.type === '스킬' ? '스킬 카드를 사용할 때' : '';
    if (trigger) core.triggerPersistent(state, trigger, card, target, enemies);
    const beforeStatus = enemies.reduce((sum, enemy) => sum + Object.values(enemy.statuses || {}).reduce((a, b) => a + b, 0), 0);
    let result;
    const primaryDamage = card.effects.find(effect => effect.op === 'damage')?.amount || 0;
    let firstDamage = true;
    const valueBonus = card.type === '공격' ? Math.max(0, (card.value || 0) - primaryDamage) : 0;
    try {
      result = core.execute(card, {
        state, target, allEnemies: enemies,
        draw: amount => drawCards(amount),
        discard: amount => discardCards(amount, card.id),
        gainBlock: amount => { const gained = adjustedAmount(amount, card, 'block'); state.block += gained; return gained; },
        damage: (enemy, amount) => { const bonus = firstDamage ? valueBonus : 0; firstDamage = false; return damageWithSystems(enemy, amount, card, bonus); }
      });
    } catch (error) {
      state.cardRuntimeErrors.push({cardId:card.cardId, message:error.message});
      console.error(error); return;
    }
    if (card.cardId === 'ire-23') card.resourceCycleTurn = state.turn;
    if (card.type === '스킬') {
      const bonus = (state.inventory || []).filter(item => item.effect === 'skillBlock').reduce((sum, item) => sum + item.amount, 0);
      state.block += bonus; result.block += bonus;
    }
    const afterStatus = enemies.reduce((sum, enemy) => sum + Object.values(enemy.statuses || {}).reduce((a, b) => a + b, 0), 0);
    if (afterStatus > beforeStatus) core.triggerPersistent(state, '첫 번째 상태 부여 시', card, target, enemies);
    if (card.shopSynergy && state.previousCardType === 'skill' && card.type === '스킬') { state.block += 3; result.block += 3; }
    if (card.shopConverted && card.type === '강화' && card.enhancementKind) state.activeEnhancements.push({kind:card.enhancementKind, amount:card.value || 2});
    if (state.hero === 3 && card.type === '공격' && target) {
      for (const enemy of state.enemies) { enemy.marked = false; enemy.markStacks = 0; }
      core.addStatus(target, '표식', 1);
    }
    const usedIndex = state.hand.findIndex(item => item.id === id);
    if (usedIndex < 0) return;
    const used = state.hand.splice(usedIndex, 1)[0];
    state.previousCardType = card.type === '공격' ? 'attack' : card.type === '강화' ? 'enhancement' : 'skill';
    if (hasCardProperty(used, '신속')) used.swiftPlays = (used.swiftPlays || 0) + 1;
    if (used.exhaust || used.type === '강화' || hasCardProperty(used, '소멸')) state.exhaust.push(used);
    else if (hasCardProperty(used, '안식')) state.draw.push(used);
    else state.discard.push(used);
    applyRetainQueue();
    if (normal(card)) window.TOE_ARCANA?.onNormalCardPlayed(state);
    state.potionNextCardFree = false; state.potionAmplify = false;
    if (card.type === '공격') { state.potionNextAttack = 0; state.potionNextAttackMultiplier = 0; }
    const fxTarget = target?.id || '';
    if (result.damage) spawnCombatFx('attack', result.damage, 'enemy', fxTarget);
    if (result.block) spawnCombatFx('guard', result.block, 'hero');
    if (!aliveEnemies().length) { winBattle(); return; }
    currentTarget(); renderBattle(`${card.name}: ${card.effect}`);
  };

  const previousEnd = endTurn;
  endTurn = function() {
    const turn = state.turn;
    const after = () => {
      if (state.turn === turn) return;
      core.resetPersistentTurn(state);
      core.triggerPersistent(state, '턴 시작 시', null, currentTarget(), aliveEnemies());
      window.TOE_ARCANA?.beginTurn(state);
      applyRetainQueue();
      renderBattle();
    };
    const result=previousEnd();
    if(result&&typeof result.then==='function')return result.then(after);
    after();
  };

  const previousLoad = loadGame;
  loadGame = function() { previousLoad(); hydrateState(); window.TOE_ARCANA?.migrate(state); };
  window.TOE_CARD_RUNTIME = {database, definitions, make, startingDeck, rewardPool, hydrateCard, hydrateState, normal};
})();
