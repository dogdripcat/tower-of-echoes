/* Shared deterministic card interpreter. Browser runtime and validation use this exact module. */
((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TOE_CARD_CORE = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const NORMAL_TYPES = new Set(['공격', '스킬', '강화']);
  const SPECIAL_TYPES = new Set(['각성', '초월']);
  const SUPPORTED_OPS = new Set([
    'damage', 'gainBlock', 'conditionalDamage', 'conditionalBlock', 'draw', 'discard',
    'applyStatus', 'branchResource', 'conditionalResource', 'persistent', 'retainNextCard',
    'selectDeckCards', 'grantCardAwakening', 'requireAwakenedSelection', 'selectAwakenedCard'
  ]);
  const rarityColor = {일반:'#eee9df',고급:'#69c987',희귀:'#68a9ee',신화:'#b984ef',전설:'#f0bd52'};
  const tone = {공격:'#5c202b',스킬:'#173950',강화:'#47315b',각성:'#292038',초월:'#493d24'};
  const clone = value => JSON.parse(JSON.stringify(value));
  const uuid = () => globalThis.crypto?.randomUUID?.() || `card-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const cardType = type => NORMAL_TYPES.has(type) || SPECIAL_TYPES.has(type) ? type : null;
  const extraFor = type => type === '공격' ? 'attack' : type === '강화' ? 'enhancement' : type === '각성' ? 'awakening-card' : type === '초월' ? 'awakening-transcendence' : 'skill';
  const primaryValue = effects => effects.find(effect => ['damage','gainBlock','conditionalBlock','persistent'].includes(effect.op))?.amount || 0;

  function materialize(definition, instanceId = uuid()) {
    if (!definition || !cardType(definition.type)) throw new Error(`CARD_DEFINITION_INVALID:${definition?.id || 'unknown'}`);
    const card = {
      id: instanceId,
      cardId: definition.id,
      sourceCardId: definition.id,
      hero: definition.hero,
      name: definition.name,
      type: definition.type,
      canonicalType: definition.type,
      rarityName: definition.rarity,
      rarity: rarityColor[definition.rarity] || '#eee9df',
      tone: tone[definition.type] || '#302733',
      cost: definition.cost.action,
      actionCost: definition.cost.action,
      innerCost: definition.cost.inner || 0,
      target: definition.target,
      effect: definition.description,
      description: definition.description,
      value: primaryValue(definition.effects || []),
      extra: extraFor(definition.type),
      branchAffinity: definition.branchAffinity,
      keyword: definition.branchAffinity === '공통' ? '' : definition.branchAffinity,
      keywords: clone(definition.keywords || []),
      properties: clone(definition.properties || []),
      effects: clone(definition.effects || []),
      baseEffects: clone(definition.effects || []),
      upgradedEffects: clone(definition.upgradedEffects || definition.effects || []),
      upgradeDefinition: clone(definition.upgrade || null),
      mechanicTags: clone(definition.mechanicTags || []),
      rewardSource: definition.rewardSource,
      startingDeck: Boolean(definition.startingDeck),
      art: '',
      canonicalUpgradeLevel: 0
    };
    if (SPECIAL_TYPES.has(card.type)) {
      card.exhaust = true;
      const prefix = ({벨:'BEL',세라핀:'SER',루미에라:'LUM',베르나:'VER',이리스:'IRI',카렌:'KAR',이레:'IRE'})[definition.hero];
      card.awakeningId = card.type === '초월' ? `${prefix}-TRN-01` : definition.id;
    }
    return card;
  }

  function applyCanonicalUpgrade(card, definition) {
    if (!card || !definition?.upgrade?.result || card.canonicalUpgradeLevel) return false;
    const result = definition.upgrade.result;
    card.canonicalUpgradeLevel = 1;
    if (!card.name.endsWith('*')) card.name += '*';
    card.type = result.type;
    card.canonicalType = result.type;
    card.extra = extraFor(result.type);
    card.actionCost = result.cost.action;
    card.innerCost = result.cost.inner || 0;
    card.cost = card.actionCost;
    card.target = result.target;
    card.effect = result.description;
    card.description = result.description;
    card.effects = clone(definition.upgradedEffects || result.effects || definition.effects || []);
    card.value = primaryValue(card.effects);
    card.upgradeKeyword = definition.upgrade.keyword;
    return true;
  }

  const statusValue = (target, status) => {
    if (!target) return 0;
    if (status === '방어') return (target.statuses?.[status] || 0) + (target.block || 0);
    if (status === '표식') return target.statuses?.[status] || target.markStacks || (target.marked ? 1 : 0);
    if (status === '출혈') return target.statuses?.[status] || target.bleed || 0;
    return target.statuses?.[status] || 0;
  };
  const ownResource = (state, name) => {
    if (name === '마나' || name === '행동력') return state.mana || 0;
    if (name === '내공') return state.innerQi || 0;
    return state.cardResources?.[name] || 0;
  };
  const changeResource = (state, name, delta) => {
    if (name === '마나' || name === '행동력') state.mana = Math.max(0, (state.mana || 0) + delta);
    else if (name === '내공') state.innerQi = Math.max(0, (state.innerQi || 0) + delta);
    else { state.cardResources ??= {}; state.cardResources[name] = Math.max(0, (state.cardResources[name] || 0) + delta); }
  };
  function condition(state, target, allEnemies, text, consume = true) {
    if (!text || ['단일 대상 적중','피해 적중'].includes(text)) return Boolean(target);
    let match = text.match(/^대상의 (.+) 보유$/);
    if (match) return statusValue(target, match[1]) > 0;
    match = text.match(/^(.+) 대상 존재$/);
    if (match) return allEnemies.some(enemy => enemy.hp > 0 && statusValue(enemy, match[1]) > 0);
    match = text.match(/^(.+) 1 소모 가능$/) || text.match(/^(.+) 1 소모$/);
    if (match) {
      const resource = match[1], available = ownResource(state, resource);
      if (available < 1) return false;
      if (consume) changeResource(state, resource, -1);
      return true;
    }
    throw new Error(`CARD_CONDITION_UNSUPPORTED:${text}`);
  }
  function addStatus(target, name, stacks) {
    if (!target) return;
    target.statuses ??= {};
    target.statuses[name] = (target.statuses[name] || 0) + stacks;
    if (name === '표식') { target.marked = true; target.markStacks = target.statuses[name]; }
    if (name === '출혈') target.bleed = target.statuses[name];
  }

  function execute(card, context) {
    const {state, target, allEnemies = [], draw = () => {}, discard = () => {}, damage = () => 0, effects = card.effects || []} = context;
    const result = {damage:0, block:0, drawn:0, discarded:0, statuses:0, resources:0, persistent:0};
    const targetsFor = effect => effect.target === '모든 적' ? allEnemies.filter(enemy => enemy.hp > 0) : [target].filter(Boolean);
    for (const effect of effects) {
      if (!SUPPORTED_OPS.has(effect.op)) throw new Error(`CARD_OP_UNSUPPORTED:${card.cardId || card.id}:${effect.op}`);
      if (['selectDeckCards','grantCardAwakening','requireAwakenedSelection','selectAwakenedCard'].includes(effect.op)) continue;
      if (effect.op === 'damage') for (const enemy of targetsFor(effect)) result.damage += damage(enemy, effect.amount, card) || 0;
      else if (effect.op === 'conditionalDamage') {
        if (condition(state, target, allEnemies, effect.condition)) result.damage += damage(target, effect.amount, card) || 0;
      } else if (effect.op === 'gainBlock') { state.block = (state.block || 0) + effect.amount; result.block += effect.amount; }
      else if (effect.op === 'conditionalBlock') {
        if (condition(state, target, allEnemies, effect.condition)) { state.block = (state.block || 0) + effect.amount; result.block += effect.amount; }
      } else if (effect.op === 'draw') {
        if (!effect.condition || condition(state, target, allEnemies, effect.condition)) { draw(effect.amount); result.drawn += effect.amount; }
      } else if (effect.op === 'discard') { discard(effect.amount); result.discarded += effect.amount; }
      else if (effect.op === 'applyStatus') {
        const statusTarget = /자신/.test(effect.target || '') ? state : target;
        addStatus(statusTarget, effect.status, effect.stacks); result.statuses += effect.stacks;
      } else if (effect.op === 'branchResource') {
        if (!effect.condition || condition(state, target, allEnemies, effect.condition, false)) { changeResource(state, effect.resource, effect.amount); result.resources += effect.amount; }
      } else if (effect.op === 'conditionalResource') {
        if (condition(state, target, allEnemies, effect.condition, false)) { changeResource(state, effect.resource, effect.amount); result.resources += effect.amount; }
      } else if (effect.op === 'persistent') {
        state.activeEnhancements ??= [];
        state.activeEnhancements.push({...clone(effect), cardId:card.cardId, triggersThisTurn:0}); result.persistent++;
      } else if (effect.op === 'retainNextCard') {
        state.retainNextCards ??= [];
        state.retainNextCards.push({branch:effect.branch, amount:effect.amount || 1});
      }
    }
    return result;
  }

  function triggerPersistent(state, trigger, card, target, allEnemies = []) {
    const fired = [];
    for (const effect of state.activeEnhancements || []) {
      if (effect.trigger !== trigger || (effect.triggersThisTurn || 0) >= (effect.maxTriggersPerTurn || 1)) continue;
      effect.triggersThisTurn = (effect.triggersThisTurn || 0) + 1;
      changeResource(state, effect.benefit, effect.amount);
      fired.push(effect);
    }
    return fired;
  }
  const resetPersistentTurn = state => { for (const effect of state.activeEnhancements || []) effect.triggersThisTurn = 0; };
  function validate(database) {
    const errors = [];
    for (const card of database.cards || []) {
      if (!cardType(card.type)) errors.push(`${card.id}:TYPE:${card.type}`);
      for (const effect of [...(card.effects || []), ...(card.upgradedEffects || [])]) if (!SUPPORTED_OPS.has(effect.op)) errors.push(`${card.id}:OP:${effect.op}`);
    }
    return errors;
  }
  return {NORMAL_TYPES, SPECIAL_TYPES, SUPPORTED_OPS, materialize, applyCanonicalUpgrade, execute, triggerPersistent, resetPersistentTurn, validate, condition, addStatus, ownResource, changeResource, extraFor};
});
