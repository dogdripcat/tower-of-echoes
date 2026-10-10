/* Single-image, smooth row deformation; original art and action poses stay intact. */
(()=>{
  const profiles=Object.freeze([
    {period:4.2,intensity:.72,pelvis:.55,torso:.85,hair:.32,cloth:.48,lag:.65},
    {period:5.1,intensity:.58,pelvis:.38,torso:.7,hair:.52,cloth:.62,lag:.9},
    {period:4.8,intensity:.42,pelvis:.3,torso:.55,hair:.24,cloth:.38,lag:.8},
    {period:3.9,intensity:.5,pelvis:.45,torso:.66,hair:.27,cloth:.3,lag:.55},
    {period:5.5,intensity:.48,pelvis:.34,torso:.6,hair:.46,cloth:.7,lag:1.05},
    {period:4.4,intensity:.88,pelvis:.65,torso:.95,hair:.35,cloth:.4,lag:.6},
    {period:3.6,intensity:.62,pelvis:.58,torso:.75,hair:.22,cloth:.28,lag:.45}
  ]);
  let frame=null,canvas=null,image=null,media=null,epoch=0;
  const bell=(y,center,width)=>Math.exp(-(((y-center)/width)**2));
  function displacement(profile,y,phase){
    const breath=Math.sin(phase),follow=Math.sin(phase-profile.lag);
    return profile.intensity*(breath*(profile.torso*bell(y,.3,.22)-profile.pelvis*bell(y,.56,.15))+
      follow*(profile.hair*bell(y,.16,.14)+profile.cloth*bell(y,.72,.2)));
  }
  function stop(){
    if(frame!==null)cancelAnimationFrame(frame);frame=null;
    canvas?.remove();canvas=null;image?.classList.remove('living-idle-source');image=null;
  }
  function clear(){stop();media?.removeEventListener?.('change',sync);media=null}
  function allowed(){
    const unit=document.querySelector('.hero-battle-unit');
    return state.hp>0&&document.body.classList.contains('in-battle')&&!window.TOE_COMBAT_MOTION?.isBusy()&&
      unit&&!['motion-active','motion-hit','motion-heavy-hit','motion-block-hit','motion-death'].some(c=>unit.classList.contains(c));
  }
  function tick(time){
    frame=null;
    if(!allowed()||media?.matches){stop();return}
    const current=document.querySelector('#heroFigure');
    if(current!==image){stop();sync();return}
    if(image.complete&&image.naturalWidth&&image.offsetHeight){
      if(!canvas){canvas=document.createElement('canvas');canvas.className='living-idle-canvas';canvas.setAttribute('aria-hidden','true');image.parentElement.append(canvas)}
      const w=image.offsetWidth,h=image.offsetHeight,padding=4;
      if(canvas.width!==w+padding*2||canvas.height!==h+padding*2){canvas.width=w+padding*2;canvas.height=h+padding*2}
      canvas.style.left=`${image.offsetLeft-padding}px`;canvas.style.top=`${image.offsetTop-padding}px`;
      const ctx=canvas.getContext('2d'),profile=profiles[state.hero];
      if(!ctx||!profile){stop();return}
      const phase=(time-epoch)/1000/profile.period*Math.PI*2;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      const drawW=Math.min(w,h*image.naturalWidth/image.naturalHeight),drawH=Math.min(h,w*image.naturalHeight/image.naturalWidth);
      const x=padding+(w-drawW)/2,top=padding+h-drawH;
      // Adjacent rows keep identical vertical boundaries; no clipped layer seams.
      for(let row=0;row<Math.ceil(drawH);row++){
        const height=Math.min(1,drawH-row),sourceY=row/drawH*image.naturalHeight;
        ctx.drawImage(image,0,sourceY,image.naturalWidth,height/drawH*image.naturalHeight,
          x+displacement(profile,row/drawH,phase),top+row,drawW,height);
      }
      canvas.style.translate=`0 ${-Math.sin(phase)*profile.intensity*.6}px`;
      image.classList.add('living-idle-source');
    }
    frame=requestAnimationFrame(tick);
  }
  function sync(){
    if(!allowed()){stop();return}
    if(!media){media=window.matchMedia?.('(prefers-reduced-motion: reduce)');media?.addEventListener?.('change',sync)}
    if(media?.matches){stop();return}
    if(frame!==null)return;
    image=document.querySelector('#heroFigure');if(!image)return;
    epoch=performance.now();frame=requestAnimationFrame(tick);
  }
  window.TOE_LIVING_IDLE={profiles,displacement,sync,stop,clear,isRunning:()=>frame!==null};
})();
