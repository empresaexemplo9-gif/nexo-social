import * as THREE from 'three';
import type {CartaNova,ArteNova} from './grimorios';
import {arteDaMiniatura} from './miniaturas-atlas';
import {esculpirMiniatura,isolarPersonagem,type MascaraMiniatura} from './relevo-alpha';
const BRILHOS={fogo:0xff982f,agua:0x61c8d4,terra:0xa6b574,ar:0xb8e2ef,luz:0xffd88c,escuridao:0xac72db};

export function regiaoDaArte(arte:ArteNova){
  const cols=arte.colunas??1,rows=arte.linhas??1,pos=arte.posicao??0;
  return{x:(pos%cols)/cols,y:1-(Math.floor(pos/cols)+1)/rows,largura:1/cols,altura:1/rows};
}
function adicionarPersonagem(g:THREE.Group,c:CartaNova,mascara:MascaraMiniatura){
  const arte=arteDaMiniatura(c),geos=esculpirMiniatura(mascara,regiaoDaArte(arte));
  const frente=new THREE.MeshBasicMaterial({color:0xffffff,alphaTest:.10,side:THREE.FrontSide});frente.userData.recorte='personagem';
  const verso=new THREE.MeshStandardMaterial({color:0x454640,roughness:.68,metalness:.25});
  const borda=new THREE.MeshStandardMaterial({color:0x766b50,roughness:.5,metalness:.6,side:THREE.DoubleSide});
  const f=new THREE.Mesh(geos.frente,frente),v=new THREE.Mesh(geos.verso,verso),b=new THREE.Mesh(geos.bordas,borda);
  if(c.id==='fogo-dhorun'){for(const m of [f,v,b])m.scale.setScalar(.82);}else if(c.id==='fogo-rhazdor'){for(const m of [f,v,b])m.scale.setScalar(1.08);}
  g.add(f,v,b);
  // Apenas os vértices usados entram no enquadramento; margens transparentes não o ampliam.
  const caixa=new THREE.Box3();
  g.traverse(obj=>{if(obj instanceof THREE.Mesh){obj.updateMatrix();const pos=obj.geometry.getAttribute('position'),indices=obj.geometry.getIndex(),vetor=new THREE.Vector3();for(let i=0;i<(indices?.count??pos.count);i++){vetor.fromBufferAttribute(pos,indices?indices.getX(i):i).applyMatrix4(obj.matrix);caixa.expandByPoint(vetor);}}});
  const tam=caixa.getSize(new THREE.Vector3());g.userData.dimensoes={largura:tam.x,altura:tam.y,profundidade:tam.z};g.userData.mascaraPronta=true;
}

/** A pintura detalhada é derivada do card; a malha tem frente, verso e contorno fechado. */
export function criarMiniatura(carta:CartaNova,mascara?:MascaraMiniatura):THREE.Group{
  const arte=arteDaMiniatura(carta),g=new THREE.Group();g.name=carta.id;
  g.userData={personagem:carta.id,funcao:carta.funcao,arte:carta.arte.src,arteMiniatura:arte.src,tipo:'relevo',texturizada:false,descartada:false,dimensoes:{largura:1.46,altura:2.9,profundidade:.6}};
  const base=new THREE.MeshStandardMaterial({color:0x272523,roughness:.78,metalness:.2}),metal=new THREE.MeshStandardMaterial({color:0x9c8257,roughness:.48,metalness:.7}),brilho=new THREE.MeshStandardMaterial({color:BRILHOS[carta.elemento],emissive:BRILHOS[carta.elemento],emissiveIntensity:.45});
  const m=new THREE.Mesh(new THREE.CylinderGeometry(.68,.73,.075,40),base);m.position.y=.04;g.add(m);
  const topo=new THREE.Mesh(new THREE.CylinderGeometry(.65,.68,.024,40),metal);topo.position.y=.088;g.add(topo);
  const aro=new THREE.Mesh(new THREE.TorusGeometry(.655,.014,6,40),brilho);aro.rotation.x=Math.PI/2;aro.position.y=.105;g.add(aro);
  if(mascara)adicionarPersonagem(g,carta,mascara);return g;
}
function lerMascara(textura:THREE.Texture,arte:ArteNova):MascaraMiniatura{
  const img=textura.image as HTMLImageElement,r=regiaoDaArte(arte),n=128,canvas=document.createElement('canvas');canvas.width=n;canvas.height=n;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Não foi possível preparar a miniatura');
  ctx.drawImage(img,r.x*img.width,(1-r.y-r.altura)*img.height,r.largura*img.width,r.altura*img.height,0,0,n,n);
  const pixels=ctx.getImageData(0,0,n,n).data,alpha=new Uint8Array(n*n);for(let i=0;i<alpha.length;i++)alpha[i]=pixels[i*4+3];
  return isolarPersonagem({largura:n,altura:n,alpha,proporcao:(img.width*r.largura)/(img.height*r.altura)});
}
type Atlas={textura:Promise<THREE.Texture>;referencias:number};const atlas=new Map<string,Atlas>();
/** Textura e promessa compartilhadas; uma única transferência por grimório. */
export async function texturizarMiniatura(grupo:THREE.Group,carta:CartaNova){
  if(grupo.userData.descartada||grupo.userData.atlas)return;const arte=arteDaMiniatura(carta);
  let entrada=atlas.get(arte.src);if(!entrada){entrada={referencias:0,textura:new THREE.TextureLoader().loadAsync(arte.src).then(t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;})};atlas.set(arte.src,entrada);}
  entrada.referencias++;grupo.userData.atlas=arte.src;
  try{
    const t=await entrada.textura;if(grupo.userData.descartada)return;
    if(!grupo.userData.mascaraPronta)adicionarPersonagem(grupo,carta,lerMascara(t,arte));
    grupo.traverse(obj=>{if(obj instanceof THREE.Mesh){const mat=obj.material as THREE.MeshBasicMaterial;if(mat.userData.recorte){mat.map=t;mat.needsUpdate=true;}}});grupo.userData.texturizada=true;
  }catch(erro){if(!grupo.userData.descartada){console.error('Não foi possível carregar a miniatura',carta.id,erro);soltarAtlas(grupo);grupo.userData.falhaTextura=true;}}
}
function soltarAtlas(g:THREE.Group){const src=g.userData.atlas;if(!src)return;delete g.userData.atlas;const e=atlas.get(src);if(e&&--e.referencias===0){atlas.delete(src);void e.textura.then(t=>t.dispose()).catch(()=>{});}}
export function liberarMiniatura(grupo:THREE.Group){
  grupo.userData.descartada=true;soltarAtlas(grupo);const mats=new Set<THREE.Material>();grupo.traverse(obj=>{if(obj instanceof THREE.Mesh){obj.geometry.dispose();(Array.isArray(obj.material)?obj.material:[obj.material]).forEach(m=>mats.add(m));}});mats.forEach(m=>m.dispose());grupo.clear();
}
