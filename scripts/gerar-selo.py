# Gera o anel de texto do selo ("NEXO • SOCIAL • CULTURA • NOVIDADE") como
# contornos, em lib/selo.ts — assim o selo sai igual em qualquer lugar, sem
# depender de fonte instalada.
#
# Uso (precisa de fonttools: pip install fonttools):
#   npm pack @fontsource/montserrat@5 && tar xzf fontsource-montserrat-*.tgz
#   FONTE=package/files/montserrat-latin-900-normal.woff \
#     python3 scripts/gerar-selo.py 73.5 9.6 0.26
# Argumentos: raio da linha de base, altura das maiúsculas, espaçamento (em).
import math, json, os, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

FONTE = os.environ.get('FONTE', 'package/files/montserrat-latin-900-normal.woff')
f = TTFont(FONTE)
gs = f.getGlyphSet()
cmap = f.getBestCmap()
upm = f['head'].unitsPerEm
cap = f['OS/2'].sCapHeight

C = 100.0            # centro (viewBox 0 0 200 200)
R_BASE = float(sys.argv[1]) if len(sys.argv) > 1 else 72.5   # raio da linha de base
ALT_CAP = float(sys.argv[2]) if len(sys.argv) > 2 else 9.6   # altura das maiúsculas
TRACK = float(sys.argv[3]) if len(sys.argv) > 3 else 0.30    # espaçamento extra (em "em")
esc = ALT_CAP / cap
tam = esc * upm      # tamanho da fonte em unidades do viewBox

PALAVRAS = [('NEXO', 270), ('SOCIAL', 0), ('CULTURA', 90), ('NOVIDADE', 180)]
PONTOS = [315, 45, 135, 225]

def largura(txt):
    total = 0
    for i, ch in enumerate(txt):
        g = cmap[ord(ch)]
        total += gs[g].width * esc
        if i < len(txt) - 1:
            total += TRACK * tam
    return total

caminhos = []
limites = []
# SOCIAL centralizada no topo e NOVIDADE embaixo, como no selo original;
# NEXO e CULTURA no meio do espaço que sobra de cada lado.
arcos = [math.degrees(largura(t) / R_BASE) for t, _ in PALAVRAS]
fim_social = arcos[1] / 2
ini_novidade = 180 - arcos[3] / 2
fim_novidade = 180 + arcos[3] / 2
ini_social = 360 - arcos[1] / 2
meio_dir = (fim_social + ini_novidade) / 2
meio_esq = (fim_novidade + ini_social) / 2
inicios = [meio_esq - arcos[0] / 2, -arcos[1] / 2, meio_dir - arcos[2] / 2, ini_novidade]
for (txt, _), a0 in zip(PALAVRAS, inicios):
    L = largura(txt)
    # comprimento de arco -> ângulo (graus), medido na linha de base
    a = a0
    limites.append((a, a + math.degrees(L / R_BASE)))
    for i, ch in enumerate(txt):
        g = cmap[ord(ch)]
        w = gs[g].width * esc
        meio = a + math.degrees((w / 2) / R_BASE)
        t = math.radians(meio)
        px, py = C + R_BASE * math.sin(t), C - R_BASE * math.cos(t)
        # glifo: origem no meio da largura, linha de base em y=0, y para cima -> y para baixo
        cos, sin = math.cos(t), math.sin(t)
        # matriz: gira pelo ângulo (sentido horário) e inverte y da fonte
        # ponto local (x, y_fonte) -> (x*esc - w/2, -y*esc) -> girado -> transladado
        m = (cos * esc, sin * esc, sin * esc, -cos * esc, 0, 0)
        # x' = cos*xl - sin*yl ; y' = sin*xl + cos*yl, com xl = x*esc - w/2, yl = -y*esc
        xx = cos * esc; xy = sin * esc * 1  # dx'/dy_fonte = -sin*(-esc) = sin*esc
        yx = sin * esc; yy = -cos * esc     # dy'/dy_fonte = cos*(-esc)
        dx = px + cos * (-w / 2)
        dy = py + sin * (-w / 2)
        pen = SVGPathPen(gs)
        tp = TransformPen(pen, (xx, yx, xy, yy, dx, dy))
        gs[g].draw(tp)
        caminhos.append(pen.getCommands())
        a += math.degrees((w + TRACK * tam) / R_BASE)

anel = ' '.join(caminhos)
# arredonda para deixar o arquivo menor
import re
anel = re.sub(r'-?\d+\.\d+', lambda m: f'{float(m.group()):.2f}'.rstrip('0').rstrip('.'), anel)
R_PONTO = ALT_CAP * 0.26
pontos = []
# cada ponto fica no meio do vão entre o fim de uma palavra e o início da próxima
PONTOS = []
for i in range(len(limites)):
    fim = limites[i][1]
    ini = limites[(i + 1) % len(limites)][0]
    if ini < fim: ini += 360
    PONTOS.append(((fim + ini) / 2) % 360)
for ang in PONTOS:
    t = math.radians(ang)
    r = R_BASE + ALT_CAP / 2
    pontos.append((round(C + r * math.sin(t), 2), round(C - r * math.cos(t), 2)))
lista = ', '.join(f'[{x}, {y}]' for x, y in pontos)
destino = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib', 'selo.ts')
with open(destino, 'w') as saida:
    saida.write(f'''// Gerado por scripts/gerar-selo.py — não edite à mão.
// Anel do selo: "NEXO • SOCIAL • CULTURA • NOVIDADE" em contornos (Montserrat
// Black), no viewBox 0 0 200 200, para sair igual em qualquer lugar sem
// depender de fonte instalada.
export const SELO_ANEL =
  '{anel}';

export const SELO_PONTOS: [number, number][] = [{lista}];
export const SELO_R_PONTO = {round(R_PONTO, 2)};
''')
print('lib/selo.ts atualizado;', len(anel), 'caracteres no anel')
