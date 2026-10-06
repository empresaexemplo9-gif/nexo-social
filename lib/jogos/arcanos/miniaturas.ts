import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { CartaNova } from './grimorios';

// Miniaturas modeladas em geometria, com identidade e equipamento por personagem.
// As ilustrações originais continuam impressas nas cartas que sustentam as peças.
type Aparencia = { pele: number; cabelo: number; penteado: 'curto' | 'longo' | 'tranca' | 'careca'; barba?: boolean; robustez?: number; pedra?: boolean };
const clara = 0xdab394, morena = 0xac7758, negra = 0x704431;
const APARENCIAS: Record<string, Aparencia> = {
  dhorun: { pele: morena, cabelo: 0x9f4821, penteado: 'tranca', barba: true, robustez: 1.3 },
  rhazdor: { pele: 0x383031, cabelo: 0x383031, penteado: 'careca', robustez: 1.45, pedra: true },
  seryth: { pele: clara, cabelo: 0x9a341c, penteado: 'longo' }, ithram: { pele: negra, cabelo: 0xa9a19a, penteado: 'careca', barba: true },
  alena: { pele: morena, cabelo: 0x74351f, penteado: 'longo' }, vaelor: { pele: clara, cabelo: 0xdad6c9, penteado: 'longo', barba: true },
  branna: { pele: negra, cabelo: 0x211718, penteado: 'tranca' }, kael: { pele: morena, cabelo: 0x241c17, penteado: 'curto', barba: true },
  mirva: { pele: clara, cabelo: 0x1a191c, penteado: 'curto' }, tarek: { pele: morena, cabelo: 0x3c211c, penteado: 'longo', barba: true },
  thalgor: { pele: morena, cabelo: 0x201b18, penteado: 'curto', barba: true, robustez: 1.25 }, neruma: { pele: negra, cabelo: 0x191819, penteado: 'tranca', robustez: 1.18 },
  lysara: { pele: morena, cabelo: 0x35261d, penteado: 'longo' }, orveth: { pele: morena, cabelo: 0xa3a39b, penteado: 'longo', barba: true },
  maelia: { pele: morena, cabelo: 0x1b1817, penteado: 'longo' }, iren: { pele: 0xc49368, cabelo: 0x25201c, penteado: 'careca', barba: true },
  varessa: { pele: negra, cabelo: 0x211b19, penteado: 'tranca' }, darian: { pele: morena, cabelo: 0x26201d, penteado: 'curto', barba: true },
  nymera: { pele: clara, cabelo: 0x75482c, penteado: 'tranca' }, taeron: { pele: negra, cabelo: 0x22201b, penteado: 'tranca' },
  galdren: { pele: morena, cabelo: 0x4b3324, penteado: 'curto', barba: true, robustez: 1.3 }, heska: { pele: negra, cabelo: 0x201a17, penteado: 'tranca', robustez: 1.2 },
  edris: { pele: morena, cabelo: 0x97917a, penteado: 'longo', barba: true }, vorna: { pele: clara, cabelo: 0x704927, penteado: 'longo' },
  nalda: { pele: morena, cabelo: 0x462d21, penteado: 'tranca' }, odrin: { pele: negra, cabelo: 0xb3b0a4, penteado: 'careca', barba: true },
  kevara: { pele: morena, cabelo: 0x3b241b, penteado: 'longo' }, bromel: { pele: clara, cabelo: 0x754124, penteado: 'curto', barba: true },
  sirena: { pele: negra, cabelo: 0x28231d, penteado: 'tranca' }, uldar: { pele: morena, cabelo: 0x746d5b, penteado: 'curto', barba: true },
  aervan: { pele: clara, cabelo: 0xc5b99f, penteado: 'curto', robustez: 1.15 }, zelka: { pele: morena, cabelo: 0x332923, penteado: 'tranca', robustez: 1.1 },
  ilyss: { pele: clara, cabelo: 0xd3d2ca, penteado: 'longo' }, roven: { pele: morena, cabelo: 0x3b332e, penteado: 'curto', barba: true },
  saelis: { pele: negra, cabelo: 0x292723, penteado: 'longo' }, yunor: { pele: clara, cabelo: 0xcec9bc, penteado: 'careca', barba: true },
  thessa: { pele: morena, cabelo: 0x4b352a, penteado: 'tranca' }, kairon: { pele: clara, cabelo: 0x433227, penteado: 'curto' },
  velira: { pele: clara, cabelo: 0xe6e3da, penteado: 'tranca' }, ossian: { pele: morena, cabelo: 0x26282a, penteado: 'curto', barba: true },
  solvren: { pele: morena, cabelo: 0x5f442c, penteado: 'curto', barba: true, robustez: 1.25 }, elthia: { pele: negra, cabelo: 0x201f1d, penteado: 'tranca', robustez: 1.15 },
  aurelis: { pele: clara, cabelo: 0xd5b67a, penteado: 'longo' }, nimer: { pele: morena, cabelo: 0xbdb8a7, penteado: 'curto', barba: true },
  evelune: { pele: morena, cabelo: 0x3d2c22, penteado: 'longo' }, calion: { pele: negra, cabelo: 0xa8a495, penteado: 'careca', barba: true },
  seraphra: { pele: clara, cabelo: 0xc3a069, penteado: 'tranca' }, dovain: { pele: morena, cabelo: 0x35281f, penteado: 'curto', barba: true },
  lethira: { pele: negra, cabelo: 0x272422, penteado: 'tranca' }, ardel: { pele: clara, cabelo: 0xa4895a, penteado: 'longo' },
  varkesh: { pele: morena, cabelo: 0x201b23, penteado: 'curto', barba: true, robustez: 1.3 }, nysora: { pele: negra, cabelo: 0x171522, penteado: 'longo', robustez: 1.15 },
  morvyn: { pele: clara, cabelo: 0xb6b0bb, penteado: 'longo', barba: true }, eshara: { pele: morena, cabelo: 0x241929, penteado: 'longo' },
  velmira: { pele: clara, cabelo: 0x2b1c31, penteado: 'tranca' }, othren: { pele: negra, cabelo: 0xaaa3b3, penteado: 'careca', barba: true },
  zaryss: { pele: negra, cabelo: 0x20182a, penteado: 'tranca' }, dravenor: { pele: morena, cabelo: 0x2a2030, penteado: 'curto', barba: true },
  selkira: { pele: clara, cabelo: 0xd0c4d7, penteado: 'longo' }, rhaiven: { pele: morena, cabelo: 0x211d29, penteado: 'curto' },
};
const PALETAS = {
  fogo: [0x8c2520, 0x342b29, 0xe99732], agua: [0x216a7d, 0x294a62, 0x73d5df],
  terra: [0x40532d, 0x655a3e, 0xb2ca62], ar: [0x6b7b87, 0x4e535b, 0xc4e5f3],
  luz: [0xc1b896, 0x8c793e, 0xffdb82], escuridao: [0x35254d, 0x2c2c39, 0xb08ce7],
};

export function criarMiniatura(carta: CartaNova): THREE.Group {
  const nome = carta.id.split('-').slice(1).join('-'), a = APARENCIAS[nome];
  if (!a || carta.tipo !== 'personagem') throw new Error(`Miniatura não definida: ${carta.id}`);
  const [roupa, metal, brilho] = PALETAS[carta.elemento];
  const grupo = new THREE.Group(); grupo.name = carta.id; grupo.userData = { personagem: carta.id, funcao: carta.funcao, aparencia: { ...a } };
  const material = (cor: number, metalness = 0, emissive = 0) => new THREE.MeshStandardMaterial({ color: cor, roughness: metalness ? .38 : .8, metalness, emissive, emissiveIntensity: .55 });
  const pele = material(a.pele), cabelo = material(a.cabelo), tecido = material(roupa), armadura = material(metal, .65), dourado = material(0xc6a36b, .7), gema = material(brilho, .35, brilho), couro = material(0x302c29);
  const parte = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, escala?: [number, number, number]) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (escala) m.scale.set(...escala); grupo.add(m); return m;
  };
  const esfera = (mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) => parte(new THREE.SphereGeometry(1, 12, 8), mat, x, y, z, [sx, sy, sz]);
  const haste = (de: number[], para: number[], raio: number, mat: THREE.Material) => {
    const inicio = new THREE.Vector3(...de as [number, number, number]), fim = new THREE.Vector3(...para as [number, number, number]);
    const m = parte(new THREE.CylinderGeometry(raio, raio, inicio.distanceTo(fim), 8), mat, 0, 0, 0);
    m.position.copy(inicio).add(fim).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), fim.sub(inicio).normalize()); return m;
  };
  const robustez = a.robustez ?? 1, veste = carta.funcao === 'mago' || carta.funcao === 'suporte';
  parte(new THREE.CylinderGeometry(.63, .68, .12, 24), couro, 0, .06, 0);
  parte(new THREE.TorusGeometry(.61, .027, 6, 24), dourado, 0, .13, 0).rotation.x = Math.PI / 2;
  for (const x of [-.18, .18]) {
    parte(new THREE.BoxGeometry(.25, .14, .44), couro, x, .2, .07);
    haste([x, .26, 0], [x * 1.2, 1.1, 0], .105, veste ? tecido : armadura);
  }
  if (veste) parte(new THREE.CylinderGeometry(.26, .44, 1.03, 12), tecido, 0, .85, 0);
  esfera(veste ? tecido : armadura, 0, 1.42, 0, .36 * robustez, .49, .23);
  parte(new THREE.CylinderGeometry(.33 * robustez, .33 * robustez, .07, 12), dourado, 0, 1.15, 0);
  // A capa tem volume e pode ser vista de qualquer ângulo.
  const capa = parte(new THREE.ConeGeometry(.5, 1.25, 12, 1, true), tecido, 0, 1.14, -.2, [1, 1, .45]); capa.rotation.x = -.17;
  for (const sinal of [-1, 1]) {
    esfera(veste ? tecido : armadura, sinal * .39 * robustez, 1.67, 0, .2, .18, .21);
    haste([sinal * .42 * robustez, 1.58, 0], [sinal * .49, 1.25, .1], .105, veste ? tecido : armadura);
    haste([sinal * .49, 1.25, .1], [sinal * .56, 1.46, .28], .09, veste ? tecido : armadura);
    esfera(pele, sinal * .56, 1.46, .28, .095, .12, .1);
  }
  esfera(pele, 0, 2.08, 0, .23, .29, .22);
  esfera(pele, 0, 2.06, .225, .055, .08, .065);
  for (const x of [-.085, .085]) {
    esfera(material(0xe7e3d8), x, 2.12, .192, .043, .029, .025);
    esfera(couro, x, 2.12, .215, .019, .021, .011);
    esfera(pele, x < 0 ? -.225 : .225, 2.08, 0, .05, .08, .045);
  }
  if (a.penteado !== 'careca') {
    const topo = parte(new THREE.SphereGeometry(.245, 12, 8, 0, Math.PI * 2, 0, Math.PI / 1.9), cabelo, 0, 2.17, -.02); topo.scale.set(1, .8, 1);
    if (a.penteado === 'longo') esfera(cabelo, 0, 1.97, -.13, .26, .36, .17);
    if (a.penteado === 'tranca') for (let i = 0; i < 8; i++) esfera(cabelo, .16, 2.13 - i * .1, -.18, .055, .065, .065);
  }
  if (a.barba) esfera(cabelo, 0, 1.94, .12, .17, nome === 'vaelor' || nome === 'dhorun' ? .28 : .12, .145);
  // Armas distintas por função; detalhes por personagem mantêm peças identificáveis.
  if (carta.funcao === 'tank') {
    const escudo = parte(new THREE.CylinderGeometry(.44, .44, .11, nome === 'neruma' ? 16 : 6), armadura, -.57, 1.35, .36, [1, 1, 1.35]); escudo.rotation.x = Math.PI / 2;
    parte(new THREE.TorusGeometry(.36, .028, 6, 16), dourado, -.57, 1.35, .435);
    esfera(gema, -.57, 1.35, .45, .11, .13, .06);
    haste([.56, .65, .3], [.56, 1.85, .3], .05, couro);
    parte(new THREE.BoxGeometry(.37, .3, .3), armadura, .56, 1.8, .3);
  } else if (veste) {
    haste([.56, .15, .28], [.56, 2.62, .28], .044, dourado);
    parte(new THREE.OctahedronGeometry(.16), gema, .56, 2.65, .28);
    const aro = parte(new THREE.TorusGeometry(.25, .025, 6, 16), dourado, .56, 2.65, .28); aro.rotation.y = .3;
    esfera(gema, -.59, 1.6, .35, .13, .13, .13);
    if (carta.funcao === 'suporte') parte(new THREE.BoxGeometry(.23, .33, .18), dourado, .56, 2.22, .28);
  } else if (carta.funcao === 'arqueiro') {
    const arco = parte(new THREE.TorusGeometry(.65, .038, 6, 22, Math.PI), dourado, -.61, 1.46, .32); arco.rotation.z = -Math.PI / 2;
    haste([-.61, .81, .32], [-.61, 2.11, .32], .008, material(0xede9d2));
    haste([-.65, 1.45, .36], [.85, 1.45, .36], .016, couro);
    parte(new THREE.ConeGeometry(.05, .19, 6), armadura, .88, 1.45, .36).rotation.z = -Math.PI / 2;
    parte(new THREE.CylinderGeometry(.12, .12, .7, 8), couro, .2, 1.63, -.28);
    for (let i = 0; i < 3; i++) haste([.14 + i * .05, 1.6, -.28], [.14 + i * .05, 2.3, -.28], .013, dourado);
  } else {
    haste([.56, 1.25, .3], [.56, 1.65, .3], .045, couro);
    parte(new THREE.BoxGeometry(.35, .05, .12), dourado, .56, 1.63, .3);
    parte(new THREE.ConeGeometry(.13, .98, 4), nome === 'kael' ? gema : armadura, .56, 2.12, .3, [1, 1, .35]);
    if (nome === 'branna' || nome === 'zaryss') parte(new THREE.ConeGeometry(.1, .65, 4), gema, -.56, 1.85, .3, [1, 1, .35]);
    if (nome === 'varessa') haste([.56, .12, .3], [.56, 2.6, .3], .035, dourado);
  }
  if (a.pedra) {
    for (let i = 0; i < 7; i++) esfera(gema, Math.sin(i * 2.4) * .2, 1.3 + i * .09, .22, .025, .06, .018);
    for (let i = 0; i < 4; i++) parte(new THREE.DodecahedronGeometry(.16), armadura, (i % 2 ? 1 : -1) * .34, 1.45 + Math.floor(i / 2) * .22, .09);
  }
  // Juntar partes do mesmo material reduz as chamadas à GPU em partidas de 60 peças.
  const lotes = new Map<THREE.Material, THREE.BufferGeometry[]>();
  for (const obj of [...grupo.children]) if (obj instanceof THREE.Mesh) {
    obj.updateMatrix(); const geo = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone();
    geo.applyMatrix4(obj.matrix); obj.geometry.dispose(); grupo.remove(obj);
    const mat = obj.material as THREE.Material; lotes.set(mat, [...(lotes.get(mat) ?? []), geo]);
  }
  lotes.forEach((geometrias, mat) => {
    const combinada = mergeGeometries(geometrias);
    if (combinada) grupo.add(new THREE.Mesh(combinada, mat));
    geometrias.forEach(geo => geo.dispose());
  });
  return grupo;
}

export function liberarMiniatura(grupo: THREE.Group) {
  const materiais = new Set<THREE.Material>();
  grupo.traverse(obj => {
    if (obj instanceof THREE.Mesh) { obj.geometry.dispose(); (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => materiais.add(m)); }
  });
  materiais.forEach(m => m.dispose());
  grupo.clear();
}
