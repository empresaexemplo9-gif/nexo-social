'use client';
import {useEffect,useRef,useState} from 'react';
import type {CartaNova} from '@/lib/jogos/arcanos/grimorios';

/** Inspeção em tamanho grande, usando o mesmo modelo que fica no tabuleiro. */
export default function MiniaturaEmDetalhe({carta}:{carta:CartaNova}){
  const canvas=useRef<HTMLCanvasElement>(null),girar=useRef<(angulo:number)=>void>(),[angulo,setAngulo]=useState(0),[pronta,setPronta]=useState(false),[falha,setFalha]=useState(false);
  useEffect(()=>{
    let encerrada=false,limpar=()=>{};setPronta(false);setFalha(false);setAngulo(0);
    void (async()=>{
      const [T,modelos]=await Promise.all([import('three'),import('@/lib/jogos/arcanos/miniaturas')]);
      if(encerrada||!canvas.current)return;
      let renderer;try{renderer=new T.WebGLRenderer({canvas:canvas.current,alpha:true,antialias:true});}catch{setFalha(true);return;}
      renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;
      const cena=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.1,30),peca=modelos.criarMiniatura(carta);
      camera.position.set(0,1.45,5.8);camera.lookAt(0,1.4,0);cena.add(peca);
      cena.add(new T.HemisphereLight(0xe0efff,0x514333,.8));const luz=new T.DirectionalLight(0xffedce,1.4);luz.position.set(-3,5,4);cena.add(luz);
      const desenhar=()=>{
        if(encerrada||!canvas.current)return;const r=canvas.current.getBoundingClientRect();if(!r.width||!r.height)return;
        renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderer.render(cena,camera);
      };
      girar.current=a=>{peca.rotation.y=a;desenhar();};const observer=new ResizeObserver(desenhar);observer.observe(canvas.current);
      limpar=()=>{girar.current=undefined;observer.disconnect();modelos.liberarMiniatura(peca);cena.clear();renderer.dispose();renderer.forceContextLoss();};
      await modelos.texturizarMiniatura(peca,carta);if(!encerrada){if(peca.userData.texturizada){setPronta(true);desenhar();}else setFalha(true);}
    })().catch(()=>{if(!encerrada){limpar();setFalha(true);}});
    return()=>{encerrada=true;limpar();};
  },[carta]);
  useEffect(()=>girar.current?.(angulo),[angulo]);
  return <section aria-label={'Miniatura de '+carta.nome} style={{color:'#f5dfae'}} className="rounded-2xl border border-white/20 bg-[radial-gradient(ellipse_at_center,#263e43,#0b141e_75%)] p-3">
    <p className="text-center text-xs uppercase tracking-widest">Miniatura · relevo 3D</p>
    <canvas ref={canvas} className="h-[340px] w-full sm:h-[420px]" aria-label={'Miniatura em relevo de '+carta.nome} data-miniatura-detalhe={pronta?'pronta':'carregando'}/>
    {!pronta&&<p role="status" className="text-center text-xs">{falha?'A miniatura está indisponível neste aparelho.':'Preparando miniatura…'}</p>}
    <div className="flex items-center justify-center gap-3 text-xs">
      <button className="rounded border border-white/30 px-4 py-2" aria-label="Girar miniatura para a esquerda" onClick={()=>setAngulo(a=>a-.3)}>↶</button>
      <button className="rounded border border-white/30 px-3 py-2" onClick={()=>setAngulo(0)}>Ver de frente</button>
      <button className="rounded border border-white/30 px-4 py-2" aria-label="Girar miniatura para a direita" onClick={()=>setAngulo(a=>a+.3)}>↷</button>
    </div>
  </section>;
}
