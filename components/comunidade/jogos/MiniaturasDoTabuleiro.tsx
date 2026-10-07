'use client';

import React, { useEffect, useRef, useState } from 'react';
import type * as THREE from 'three';
import { cartaNova } from '@/lib/jogos/arcanos/grimorios';
import type { Combatente } from '@/lib/jogos/arcanos/motor-grimorios';
import styles from './CampoDeBatalha.module.css';
import {ELEVACAO_TABULEIRO,posicaoNoTabuleiro,escalaNoTabuleiro} from '@/lib/jogos/arcanos/camera-tabuleiro';

type Props = { campo: Combatente[]; palco: React.RefObject<HTMLDivElement>; angulo: number; animacoes: boolean; lado: number; exercitoVisivel: string };
type Cena = { atualizar: (props: Props) => void; encerrar: () => void };

/** Uma única cena WebGL para todas as peças; os botões das cartas seguem acessíveis. */
export default function MiniaturasDoTabuleiro(props: Props) {
  const canvas = useRef<HTMLCanvasElement>(null), cena = useRef<Cena | null>(null), ultimas = useRef(props);
  ultimas.current = props;
  const [modo, setModo] = useState('carregando');
  useEffect(() => {
    let encerrada = false;
    const iniciar = async () => {
      const [T, modelos, ambiente] = await Promise.all([import('three'), import('@/lib/jogos/arcanos/miniaturas'), import('three/addons/environments/RoomEnvironment.js')]);
      const area = ultimas.current.palco.current, tela = canvas.current;
      if (encerrada || !area || !tela) return;
      let renderer: THREE.WebGLRenderer;
      try { renderer = new T.WebGLRenderer({ canvas: tela, alpha: true, antialias: true, powerPreference: 'low-power' }); }
      catch { setModo('sem-3d'); return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.autoClear = false;
      const mundo = new T.Scene(), camera = new T.OrthographicCamera(-.5, .5, .5, -.5, .1, 6000);
      tela.dataset.camera='superior';tela.dataset.elevacao='55';
      const pmrem = new T.PMREMGenerator(renderer), sala = new ambiente.RoomEnvironment();
      const reflexos = pmrem.fromScene(sala); mundo.environment = reflexos.texture;
      sala.dispose(); pmrem.dispose(); mundo.environmentIntensity = .5;
      mundo.add(new T.HemisphereLight(0xe0efff, 0x303849, 1.1));
      const sol = new T.DirectionalLight(0xffebd5, 2.5); sol.position.set(-200, 600, 500); mundo.add(sol);
      const contraluz = new T.DirectionalLight(0x9bcaff, 1.5); contraluz.position.set(500, 200, -300); mundo.add(contraluz);
      const pecas = new Map<string, THREE.Group>();
      let quadro = 0, altura = 1, largura = 1, dados = ultimas.current, ultimaPintura = 0;
      const movimento = window.matchMedia('(prefers-reduced-motion: reduce)');
      const posicionar = () => {
        const caixa = tela.getBoundingClientRect();
        if (!caixa.width || !caixa.height) return;
        if (largura !== caixa.width || altura !== caixa.height) {
          largura = caixa.width; altura = caixa.height;
          renderer.setSize(largura, altura, false); camera.left=-largura/2;camera.right=largura/2;camera.top=altura/2;camera.bottom=-altura/2;
          camera.position.set(largura/2,1800*Math.sin(ELEVACAO_TABULEIRO),1800*Math.cos(ELEVACAO_TABULEIRO));camera.lookAt(largura/2,0,0);camera.updateProjectionMatrix();
        }
        const bases = new Map(Array.from(area.querySelectorAll<HTMLElement>('[data-miniatura-base]')).map(el => [el.dataset.miniaturaBase!, el]));
        const campo = area.querySelector('[data-area-formacoes]')?.getBoundingClientRect();
        if (campo) { renderer.setScissor(campo.left-caixa.left, altura-(campo.bottom-caixa.top), campo.width, campo.height); renderer.setScissorTest(true); }
        for (const [id, peca] of Array.from(pecas)) {
          const el=bases.get(id),base = el?.getBoundingClientRect(),carta=el?.parentElement?.querySelector('[data-miniatura-carta]')?.getBoundingClientRect();
          if (!base || !base.width || !base.height || (campo && (base.bottom < campo.top || base.top > campo.bottom || base.right < campo.left || base.left > campo.right))) { peca.visible = false; continue; }
          peca.visible = !!peca.userData.texturizada;
          const ponto=posicaoNoTabuleiro(base.left+base.width/2-caixa.left,carta?carta.top+carta.height/2-caixa.top:base.bottom-caixa.top,altura);
          peca.position.set(ponto.x,ponto.y,ponto.z);
          const tamanho = peca.userData.dimensoes;
          peca.scale.setScalar(escalaNoTabuleiro(base.width,base.height,tamanho));
          peca.rotation.set(0, dados.angulo, 0);
        }
      };
      const desenhar = () => {
        quadro = 0;
        if (encerrada) return;
        const agora = performance.now();
        if (agora - ultimaPintura >= 40 || !dados.animacoes || movimento.matches) {
          renderer.setScissorTest(false); renderer.clear(); renderer.setScissorTest(true);
          renderer.render(mundo, camera); ultimaPintura = agora;
        }
        if (dados.animacoes && !movimento.matches && !document.hidden) {
          // A luz e a arma têm volume real; uma oscilação pequena dá vida às peças.
          for (const peca of Array.from(pecas.values())) peca.rotation.y = dados.angulo + Math.sin(performance.now() / 2200 + peca.id) * .025;
          quadro = requestAnimationFrame(desenhar);
        }
      };
      const pedirQuadro = () => { if (!quadro) quadro = requestAnimationFrame(desenhar); };
      const atualizar = (p: Props) => {
        dados = p;
        const vivos = new Set(p.campo.filter(unidade => unidade.vida > 0).map(unidade => unidade.id));
        for (const [id, peca] of Array.from(pecas)) if (!vivos.has(id)) { mundo.remove(peca); modelos.liberarMiniatura(peca); pecas.delete(id); }
        for (const unidade of p.campo) if (unidade.vida > 0 && !pecas.has(unidade.id)) {
          const peca = modelos.criarMiniatura(cartaNova(unidade.carta)); mundo.add(peca); pecas.set(unidade.id, peca);
          void modelos.texturizarMiniatura(peca, cartaNova(unidade.carta)).then(() => {
            if (!encerrada && !peca.userData.descartada) {
              tela.dataset.pecasTexturizadas = String(Array.from(pecas.values()).filter(p => p.userData.texturizada).length);
              posicionar();
              pedirQuadro();
            }
          });
        }
        tela.dataset.pecasVivas = String(pecas.size);
        tela.dataset.pecasTexturizadas = String(Array.from(pecas.values()).filter(p => p.userData.texturizada).length);
        posicionar(); pedirQuadro();
      };
      const redimensionar = () => { posicionar(); pedirQuadro(); };
      const observer = new ResizeObserver(redimensionar); observer.observe(area);
      area.addEventListener('scroll', redimensionar, true);
      const contextoPerdido = (ev: Event) => { ev.preventDefault(); setModo('sem-3d'); cancelAnimationFrame(quadro); quadro = 0; };
      const contextoRestaurado = () => { setModo('webgl'); redimensionar(); };
      tela.addEventListener('webglcontextlost', contextoPerdido); tela.addEventListener('webglcontextrestored', contextoRestaurado);
      document.addEventListener('visibilitychange', pedirQuadro); movimento.addEventListener('change', pedirQuadro);
      cena.current = { atualizar, encerrar: () => {
        cancelAnimationFrame(quadro); observer.disconnect();
        area.removeEventListener('scroll', redimensionar, true);
        tela.removeEventListener('webglcontextlost', contextoPerdido); tela.removeEventListener('webglcontextrestored', contextoRestaurado);
        document.removeEventListener('visibilitychange', pedirQuadro); movimento.removeEventListener('change', pedirQuadro);
        pecas.forEach(modelos.liberarMiniatura); pecas.clear(); mundo.clear(); reflexos.dispose(); renderer.dispose(); renderer.forceContextLoss();
      } };
      setModo('webgl'); atualizar(ultimas.current);
    };
    void iniciar().catch(() => !encerrada && setModo('sem-3d'));
    return () => { encerrada = true; cena.current?.encerrar(); cena.current = null; };
  }, []);
  useEffect(() => { cena.current?.atualizar(props); }, [props.campo, props.angulo, props.animacoes, props.lado, props.exercitoVisivel]); // eslint-disable-line react-hooks/exhaustive-deps
  return <>
    <canvas ref={canvas} className={styles.miniaturas} data-renderizacao={modo} aria-hidden="true" />
    {modo !== 'webgl' && <span className={styles.aviso3d} role="status">{modo === 'carregando' ? 'Preparando miniaturas 3D…' : '3D indisponível neste aparelho. As cartas continuam jogáveis.'}</span>}
  </>;
}
