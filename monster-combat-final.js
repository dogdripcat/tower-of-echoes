/* Final combat-law hooks loaded after Awakening/Event/Map systems. */
(()=>{
  const runtime=window.TOE_MONSTER_COMBAT;
  if(!runtime)return;
  const activeBoss=()=>state.enemies?.find(enemy=>enemy.kind==='boss'&&enemy.hp>0&&enemy.domain?.active);
  const normalCard=card=>Boolean(card&&!isSpecialCard(card)&&card.extra!=='status'&&card.type!=='상태');
  const currentLaw=()=>{
    const domain=activeBoss()?.domain;
    return domain?.id==='NAMELESS_SANCTUM'&&!domain.lawBrokenThisTurn?domain.currentLaw:null;
  };
  let cardContext=null;

  const priorDeal=dealToEnemy;
  dealToEnemy=function(enemy,damage){
    let adjusted=damage;
    const domain=activeBoss()?.domain;
    if(cardContext?.eligible&&cardContext.law==='RED'&&domain?.id==='NAMELESS_SANCTUM'&&!domain.redConsumed){
      adjusted=Math.ceil(Math.max(0,damage)*.5);
      domain.redConsumed=true;
      cardContext.redHit=true;
    }
    return priorDeal(enemy,adjusted);
  };

  const priorUse=useCard;
  useCard=function(id,targetId=''){
    const card=state.hand?.find(item=>item.id===id);
    if(!card)return;
    const domain=activeBoss()?.domain;
    const law=currentLaw();
    const eligible=normalCard(card);
    const originalValue=card.value;
    const originalEffect=card.effect;
    const originalBlock=state.block;

    if(eligible&&state.lawErosionActive){
      card.value=Math.ceil((card.value||0)*.75);
      card.effect=`${originalEffect||''} · 법칙 침식 적용`;
    }
    cardContext={eligible,law,redHit:false};
    try{
      priorUse(id,targetId);
    }finally{
      cardContext=null;
      if(card.value!==originalValue){card.value=originalValue;card.effect=originalEffect}
    }

    const stillInHand=state.hand?.some(item=>item.id===id);
    const played=!stillInHand;
    if(played&&eligible&&domain?.id==='NAMELESS_SANCTUM'){
      if(law==='GREEN'&&domain.greenConsumed){}
      else if(law==='BLUE'&&state.block>originalBlock){
        const gained=state.block-originalBlock;
        state.block-=Math.ceil(gained*.5);
        domain.blueConsumed=true;
      }
      const consumed=(law==='RED'&&domain.redConsumed)||(law==='GREEN'&&domain.greenConsumed)||(law==='BLUE'&&domain.blueConsumed);
      if(consumed&&!domain.adapted.includes(law))domain.adapted.push(law);
      if(domain.adapted.length===3)domain.breakNext=true;
    }
    if(played&&domain?.id==='FROZEN_CLOCK'&&card.domainRole)domain[`${card.domainRole}Played`]=true;
    if(played&&state.lawErosionActive&&eligible)state.lawErosionActive=false;
    if(played&&targetId){
      const target=state.enemies?.find(enemy=>enemy.id===targetId);
      if(target?.hp>0&&target.counter>0&&(card.extra==='attack'||card.extra==='special')){
        const retaliation=target.counter;
        target.counter=0;
        const blocked=Math.min(state.block,retaliation);
        state.block-=blocked;
        const taken=retaliation-blocked;
        state.hp=Math.max(0,state.hp-taken);
        if(taken)spawnCombatFx('enemy-attack',taken,'hero');
      }
    }
    if(state.hp<=0&&!triggerDragonHeart())gameOver();
    else renderBattle();
  };

  const priorDraw=drawCards;
  drawCards=function(count){
    const domain=activeBoss()?.domain;
    if(cardContext?.eligible&&cardContext.law==='GREEN'&&domain?.id==='NAMELESS_SANCTUM'&&!domain.greenConsumed){
      domain.greenConsumed=true;
      return;
    }
    priorDraw(count);
  };

  const priorRender=renderBattle;
  renderBattle=function(...args){
    priorRender(...args);
    const enemy=activeBoss();
    if(!enemy)return;
    const domain=enemy.domain;
    const message=domain.id==='IRON_GATE'
      ?`영역 방어 ${domain.armor||0} · 다음 공격 피해 +${domain.damageBonus||0}${domain.skipNextTurn?' · 다음 차례 균열':''}`
      :domain.id==='BLOOD_GARDEN'
        ?`개화 ${domain.bloomGauge||0}/3 · 턴 피해 ${state.damageThisTurn||0} · 만개 ${domain.cycle||0}/2`
        :domain.id==='FROZEN_CLOCK'
          ?`가속/지연 카드 동시 사용 · 피해 강화 ${domain.timeAcceleration||0}/3`
          :domain.id==='LIFE_BORDER'
            ?`상태 카드 ${domain.suppressOblivion?'없음 · 영역 약화':'남아 있음 · 방벽/회복'}`
            :`${domain.lawBrokenThisTurn?'법칙 균열 · 이번 턴 무효':`${domain.currentLaw||'RED'} → ${domain.nextLaw||'GREEN'} · 적응 ${domain.adapted?.length||0}/3`}`;
    const indicator=document.createElement('span');
    indicator.className='domain-detail';
    indicator.textContent=message;
    $('#battleEffects')?.append(indicator);
  };

  const priorLoad=loadGame;
  loadGame=function(){
    priorLoad();
    for(const enemy of state.enemies||[]){
      const spec=runtime.specOf(enemy);
      if(!spec)continue;
      const kind=spec.rank==='BOSS'?'boss':spec.rank==='ELITE'?'elite':'normal';
      // Saved HP already includes encounter scaling; restore metadata without scaling again.
      runtime.normalizeEnemy(enemy,kind,state.enemies.length,spec.rank!=='NORMAL',true);
    }
    const boss=state.enemies?.find(enemy=>enemy.kind==='boss'&&enemy.domainId==='NAMELESS_SANCTUM'&&!enemy.domain);
    if(boss)runtime.activateDomain(boss);
    if(document.body.classList.contains('in-battle'))renderBattle();
  };
})();
