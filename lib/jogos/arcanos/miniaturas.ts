import * as THREE from 'three';
import type {CartaNova,ArteNova} from './grimorios';
import {arteDaMiniatura} from './miniaturas-atlas';
import {esculpirMiniatura,isolarPersonagem,type MascaraMiniatura} from './relevo-alpha';
const BRILHOS={fogo:0xff982f,agua:0x61c8d4,terra:0xa6b574,ar:0xb8e2ef,luz:0xffd88c,escuridao:0xac72db};
export type QualidadeMiniatura='tabuleiro'|'detalhe';

export function regiaoDaArte(arte:ArteNova){
  const cols=arte.colunas??1,rows=arte.linhas??1,pos=arte.posicao??0;
  return{x:(pos%cols)/cols,y:1-(Math.floor(pos/cols)+1)/rows,largura:1/cols,altura:1/rows};
}
function adicionarPersonagem(g:THREE.Group,c:CartaNova,mascara:MascaraMiniatura){
  const arte=arteDaMiniatura(c),geos=esculpirMiniatura(mascara,regiaoDaArte(arte));
  const frente=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9,metalness:.02,emissive:0xffffff,emissiveIntensity:.3,alphaTest:.05,alphaToCoverage:true,side:THREE.FrontSide});frente.userData.recorte='personagem';
  const verso=new THREE.MeshStandardMaterial({color:0x303a40,roughness:.72,metalness:.28});
  const borda=new THREE.MeshStandardMaterial({color:0x484345,roughness:.8,metalness:.12,side:THREE.DoubleSide});
  const f=new THREE.Mesh(geos.frente,frente),v=new THREE.Mesh(geos.verso,verso),b=new THREE.Mesh(geos.bordas,borda);
  if(c.id==='fogo-dhorun'){for(const m of [f,v,b])m.scale.setScalar(.82);}else if(c.id==='fogo-rhazdor'){for(const m of [f,v,b])m.scale.setScalar(1.08);}
  g.add(f,v,b);
  // Apenas os vértices usados entram no enquadramento; margens transparentes não o ampliam.
  const caixa=new THREE.Box3();
  g.traverse(obj=>{if(obj instanceof THREE.Mesh){obj.updateMatrix();const pos=obj.geometry.getAttribute('position'),indices=obj.geometry.getIndex(),vetor=new THREE.Vector3();for(let i=0;i<(indices?.count??pos.count);i++){vetor.fromBufferAttribute(pos,indices?indices.getX(i):i).applyMatrix4(obj.matrix);caixa.expandByPoint(vetor);}}});
  const tam=caixa.getSize(new THREE.Vector3());g.userData.dimensoes={largura:tam.x,altura:tam.y,profundidade:tam.z};g.userData.mascaraPronta=true;
}

/** A pintura detalhada é derivada do card; a malha tem frente, verso e contorno fechado. */
export function criarMiniatura(carta:CartaNova,mascara?:MascaraMiniatura,qualidade:QualidadeMiniatura='tabuleiro'):THREE.Group{
  const arte=arteDaMiniatura(carta),g=new THREE.Group();g.name=carta.id;
  g.userData={personagem:carta.id,funcao:carta.funcao,arte:carta.arte.src,arteMiniatura:arte.src,tipo:'relevo',qualidade,texturizada:false,descartada:false,dimensoes:{largura:1.26,altura:2.9,profundidade:.7}};
  const base=new THREE.MeshStandardMaterial({color:0x111921,roughness:.67,metalness:.28}),metal=new THREE.MeshStandardMaterial({color:0x797d83,roughness:.32,metalness:.82}),pedra=new THREE.MeshStandardMaterial({color:0x25313d,roughness:.9,metalness:.03}),brilho=new THREE.MeshStandardMaterial({color:BRILHOS[carta.elemento],emissive:BRILHOS[carta.elemento],emissiveIntensity:1.15,roughness:.38,metalness:.3});
  const m=new THREE.Mesh(new THREE.CylinderGeometry(.58,.63,.075,64),base);m.position.y=.04;g.add(m);
  const topo=new THREE.Mesh(new THREE.CylinderGeometry(.55,.58,.024,64),metal);topo.position.y=.088;g.add(topo);
  const piso=new THREE.Mesh(new THREE.CylinderGeometry(.525,.525,.012,64),pedra);piso.position.y=.105;g.add(piso);
  const aro=new THREE.Mesh(new THREE.TorusGeometry(.554,.009,8,64),brilho);aro.rotation.x=Math.PI/2;aro.position.y=.102;g.add(aro);
  const interno=new THREE.Mesh(new THREE.TorusGeometry(.455,.004,6,64),metal);interno.rotation.x=Math.PI/2;interno.position.y=.113;g.add(interno);
  const runas=new THREE.InstancedMesh(new THREE.BoxGeometry(.026,.003,.045),brilho,12),matriz=new THREE.Matrix4();
  for(let i=0;i<12;i++){const a=i*Math.PI/6;matriz.makeRotationY(a+Math.PI/4);matriz.setPosition(Math.sin(a)*.493,.114,Math.cos(a)*.493);runas.setMatrixAt(i,matriz);}g.add(runas);
  if(mascara)adicionarPersonagem(g,carta,mascara);return g;
}
function lerMascara(textura:THREE.Texture,arte:ArteNova,qualidade:QualidadeMiniatura):MascaraMiniatura{
  const img=textura.image as HTMLImageElement,r=regiaoDaArte(arte),w=qualidade==='detalhe'?240:96,h=w*2,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Não foi possível preparar a miniatura');
  ctx.imageSmoothingQuality='high';ctx.drawImage(img,r.x*img.width,(1-r.y-r.altura)*img.height,r.largura*img.width,r.altura*img.height,0,0,w,h);
  const pixels=ctx.getImageData(0,0,w,h).data,alpha=new Uint8Array(w*h),luminancia=new Float32Array(w*h);for(let i=0;i<alpha.length;i++){alpha[i]=pixels[i*4+3];luminancia[i]=(pixels[i*4]*.2126+pixels[i*4+1]*.7152+pixels[i*4+2]*.0722)/255;}
  return isolarPersonagem({largura:w,altura:h,alpha,luminancia,proporcao:(img.width*r.largura)/(img.height*r.altura)});
}
type Atlas={textura:Promise<THREE.Texture>;referencias:number};const atlas=new Map<string,Atlas>();
/** Textura e promessa compartilhadas; uma única transferência por grimório. */
export async function texturizarMiniatura(grupo:THREE.Group,carta:CartaNova){
  if(grupo.userData.descartada||grupo.userData.atlas)return;const arte=arteDaMiniatura(carta);
  let entrada=atlas.get(arte.src);if(!entrada){entrada={referencias:0,textura:new THREE.TextureLoader().loadAsync(arte.src).then(t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;return t;})};atlas.set(arte.src,entrada);}
  entrada.referencias++;grupo.userData.atlas=arte.src;
  try{
    const t=await entrada.textura;if(grupo.userData.descartada)return;
    if(!grupo.userData.mascaraPronta)adicionarPersonagem(grupo,carta,lerMascara(t,arte,grupo.userData.qualidade));
    grupo.traverse(obj=>{if(obj instanceof THREE.Mesh){const mat=obj.material as THREE.MeshStandardMaterial;if(mat.userData.recorte){mat.map=t;mat.emissiveMap=t;mat.needsUpdate=true;}}});grupo.userData.texturizada=true;
  }catch(erro){if(!grupo.userData.descartada){console.error('Não foi possível carregar a miniatura',carta.id,erro);soltarAtlas(grupo);grupo.userData.falhaTextura=true;}}
}
function soltarAtlas(g:THREE.Group){const src=g.userData.atlas;if(!src)return;delete g.userData.atlas;const e=atlas.get(src);if(e&&--e.referencias===0){atlas.delete(src);void e.textura.then(t=>t.dispose()).catch(()=>{});}}
export function liberarMiniatura(grupo:THREE.Group){
  grupo.userData.descartada=true;soltarAtlas(grupo);const mats=new Set<THREE.Material>();grupo.traverse(obj=>{if(obj instanceof THREE.Mesh){if(obj instanceof THREE.InstancedMesh)obj.dispose();obj.geometry.dispose();(Array.isArray(obj.material)?obj.material:[obj.material]).forEach(m=>mats.add(m));}});mats.forEach(m=>m.dispose());grupo.clear();
}
