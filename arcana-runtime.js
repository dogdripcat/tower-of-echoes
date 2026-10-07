/* Arcana framework only. Authoritative 22-card effects are unavailable in project sources. */
(() => {
  const STATUS = 'ARCANA_CONTENT_BLOCKED';
  const RULES = Object.freeze({
    maxGauge:100,
    normalCardGain:1,
    normalCardTurnCap:6,
    normalKillGain:5,
    eliteKillGain:12,
    bossPhaseGain:15,
    bossKillGain:25,
    eventDeltaRange:[-20,25],
    activationReset:0,
    gaugeDuringResolution:false,
    worldExtraTurnGauge:false,
    maxActive:1,
    tentChoices:3,
    tentMaxPerFloor:1,
    tentMaxPerRun:5,
    orientationSystem:false
  });
  function migrate(state) {
    state.arcanaMax = RULES.maxGauge;
    state.arcanaGauge = Math.max(0, Math.min(RULES.maxGauge, Number(state.arcanaGauge) || 0));
    state.arcanaCardsPlayedThisTurn = Math.max(0, Number(state.arcanaCardsPlayedThisTurn) || 0);
    state.arcanaResolving = Boolean(state.arcanaResolving);
    state.arcanaContentStatus = STATUS;
  }
  function addGauge(state, amount, source) {
    migrate(state);
    if (state.arcanaResolving) return 0;
    if (source === 'normalCard') {
      if (state.arcanaCardsPlayedThisTurn >= RULES.normalCardTurnCap) return 0;
      state.arcanaCardsPlayedThisTurn++;
    }
    const before = state.arcanaGauge;
    state.arcanaGauge = Math.max(0, Math.min(RULES.maxGauge, before + amount));
    return state.arcanaGauge - before;
  }
  const beginBattle = state => { migrate(state); state.arcanaCardsPlayedThisTurn = 0; state.arcanaResolving = false; };
  const beginTurn = state => { migrate(state); state.arcanaCardsPlayedThisTurn = 0; };
  const onNormalCardPlayed = state => addGauge(state, RULES.normalCardGain, 'normalCard');
  function onEnemyDefeated(state, rank = 'NORMAL') {
    return addGauge(state, rank === 'BOSS' ? RULES.bossKillGain : rank === 'ELITE' ? RULES.eliteKillGain : RULES.normalKillGain, 'kill');
  }
  const onBossPhase = state => addGauge(state, RULES.bossPhaseGain, 'bossPhase');
  function render(state) {
    const gauge = document.getElementById('arcanaGauge'), button = document.getElementById('arcanaToggle');
    if (gauge) gauge.textContent = String(Math.max(0, Math.min(RULES.maxGauge, state.arcanaGauge || 0)));
    if (button) {
      button.dataset.contentStatus = STATUS;
      button.title = state.arcana?.name ? `${state.arcana.name} · 게이지 ${state.arcanaGauge || 0}/100` : `아르카나 게이지 ${state.arcanaGauge || 0}/100 · 원본 22종 효과 데이터 복구 대기`;
    }
  }
  const previousSync = typeof sync === 'function' ? sync : null;
  if (previousSync) sync = function() { previousSync(); migrate(state); render(state); };
  document.getElementById('arcanaToggle')?.addEventListener('click', () => {
    if (typeof showMenuNotice === 'function') showMenuNotice('아르카나', state.arcana?.name ? `${state.arcana.name} · 게이지 ${state.arcanaGauge || 0}/100` : '아르카나 22종의 권위 있는 원본 효과 데이터가 없어 선택·발동은 잠겨 있습니다.');
  });
  window.ARCANA_CONTENT_STATUS = STATUS;
  window.ARCANA_RULES = RULES;
  window.TOE_ARCANA = {STATUS, RULES, migrate, addGauge, beginBattle, beginTurn, onNormalCardPlayed, onEnemyDefeated, onBossPhase, render};
})();
