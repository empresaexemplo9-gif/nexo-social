import * as THREE from 'three';
export type MascaraMiniatura={largura:number;altura:number;alpha:Uint8Array;proporcao:number;luminancia?:Float32Array};
export type QuadroMiniatura={x:number;y:number;largura:number;altura:number};

/** Fragmentos soltos de quadros vizinhos não podem alterar a altura ou virar outra peça. */
export function isolarPersonagem(m:MascaraMiniatura):MascaraMiniatura{
  const w=m.largura,h=m.altura,vistos=new Uint8Array(w*h);let maior:number[]=[];
  for(let i=0;i<w*h;i++){
    if(vistos[i]||m.alpha[i]<=24)continue;const fila=[i];vistos[i]=1;
    for(let k=0;k<fila.length;k++){const p=fila[k],x=p%w,y=Math.floor(p/w);for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy,n=yy*w+xx;if(xx>=0&&xx<w&&yy>=0&&yy<h&&!vistos[n]&&m.alpha[n]>24){vistos[n]=1;fila.push(n);}}}
    if(fila.length>maior.length)maior=fila;
  }
  const alpha=new Uint8Array(w*h);for(const i of maior)alpha[i]=m.alpha[i];return{...m,alpha};
}

/** O contorno vem do alfa da arte, incluindo dedos, arcos e espaços entre membros. */
export function esculpirMiniatura(m:MascaraMiniatura,q:QuadroMiniatura){
  const w=m.largura,h=m.altura,n=w*h;
  if(w<2||h<2||m.alpha.length!==n)throw new Error('Máscara de miniatura inválida');
  const ocupados=new Uint8Array(n),distancia=new Float32Array(n);let minX=w,maxX=0,minY=h,maxY=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(m.alpha[y*w+x]>24){ocupados[y*w+x]=1;minX=Math.min(minX,x);maxX=Math.max(maxX,x+1);minY=Math.min(minY,y);maxY=Math.max(maxY,y+1);}
  if(minY===h)throw new Error('Miniatura sem personagem');
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x;if(!ocupados[i])continue;
    distancia[i]=Math.min(x?distancia[i-1]:0,y?distancia[i-w]:0)+1;
  }
  let maior=1;for(let y=h-1;y>=0;y--)for(let x=w-1;x>=0;x--){const i=y*w+x;if(!ocupados[i])continue;distancia[i]=Math.min(distancia[i],Math.min(x<w-1?distancia[i+1]:0,y<h-1?distancia[i+w]:0)+1);maior=Math.max(maior,distancia[i]);}
  for(let passo=0;passo<3;passo++){const anterior=distancia.slice();for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(ocupados[i])distancia[i]=(anterior[i]*4+(x?anterior[i-1]:0)+(x<w-1?anterior[i+1]:0)+(y?anterior[i-w]:0)+(y<h-1?anterior[i+w]:0))/8;}}
  const centro=(minX+maxX)/(2*w),alcance=(maxY-minY)/h,escala=2.65/alcance;
  const frente:number[]=[],verso:number[]=[],uv:number[]=[],indices:number[]=[],reversos:number[]=[],bordas:number[]=[];
  const indice=(x:number,y:number)=>y*(w+1)+x;
  for(let y=0;y<=h;y++)for(let x=0;x<=w;x++){
    let soma=0,amostras=0;for(const dy of [-1,0])for(const dx of [-1,0]){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<w&&yy>=0&&yy<h){soma+=distancia[yy*w+xx];amostras++;}}
    const relevo=Math.sqrt(soma/Math.max(1,amostras)/maior),px=(x/w-centro)*escala*m.proporcao,py=.115+(maxY/h-y/h)*escala;
    let detalhe=.5;if(m.luminancia){let somaLuz=0,total=0;for(let yy=Math.max(0,y-2);yy<=Math.min(h-1,y+1);yy++)for(let xx=Math.max(0,x-2);xx<=Math.min(w-1,x+1);xx++){somaLuz+=m.luminancia[yy*w+xx];total++;}detalhe=somaLuz/Math.max(1,total);}
    frente.push(px,py,.025+relevo*.36+(detalhe-.5)*.012*relevo);verso.push(px,py,-.035-relevo*.23);uv.push(q.x+x/w*q.largura,q.y+(1-y/h)*q.altura);
  }
  const contornos:Array<[number,number]>=[],vizinhos=new Map<number,number[]>();
  const face=(a:number,b:number,c:number,d:number)=>{indices.push(a,c,b,b,c,d);reversos.push(a,b,c,b,d,c);};
  const contorno=(a:number,b:number)=>{contornos.push([a,b]);for(const [p,v] of [[a,b],[b,a]]){const lista=vizinhos.get(p)??[];lista.push(v);vizinhos.set(p,lista);}};
  const parede=(a:number,b:number)=>{
    const f=(i:number)=>frente.slice(i*3,i*3+3),v=(i:number)=>verso.slice(i*3,i*3+3);
    bordas.push(...f(a),...v(a),...f(b),...f(b),...v(a),...v(b));
  };
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(ocupados[y*w+x]){
    const a=indice(x,y),b=indice(x+1,y),c=indice(x,y+1),d=indice(x+1,y+1);face(a,b,c,d);
    if(!x||!ocupados[y*w+x-1])contorno(c,a);if(x===w-1||!ocupados[y*w+x+1])contorno(b,d);
    if(!y||!ocupados[(y-1)*w+x])contorno(a,b);if(y===h-1||!ocupados[(y+1)*w+x])contorno(d,c);
  }
  // Suaviza os degraus do recorte, compartilhando a mesma borda entre as três malhas.
  for(let passo=0;passo<3;passo++){
    const anterior=frente.slice();for(const [i,vs] of Array.from(vizinhos))if(vs.length===2){for(const eixo of [0,1]){const novo=anterior[i*3+eixo]*.55+(anterior[vs[0]*3+eixo]+anterior[vs[1]*3+eixo])*.225;frente[i*3+eixo]=novo;verso[i*3+eixo]=novo;}}
  }
  for(const i of Array.from(vizinhos.keys())){const u=frente[i*3]/(escala*m.proporcao)+centro,v=maxY/h-(frente[i*3+1]-.115)/escala;uv[i*2]=q.x+u*q.largura;uv[i*2+1]=q.y+(1-v)*q.altura;}
  for(const [a,b] of contornos)parede(a,b);
  const geo=(pos:number[],tri?:number[])=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));if(tri){g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(tri);}g.computeVertexNormals();return g;};
  return{frente:geo(frente,indices),verso:geo(verso,reversos),bordas:geo(bordas)};
}
