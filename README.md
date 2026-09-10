# Palma: teaser interativo

Landing page temporária de "em breve" da Agropecuária Palma, com um endless
runner autoral. A Palmira, a vaca, sai da fazenda e atravessa campo, cidade e casa.
Sem framework, sem build, sem dependências em runtime.

```bash
node dev-server.mjs
```

Abre em `http://localhost:5173`. Em produção basta servir a pasta como estática
(os módulos ES precisam de `http://`, não funcionam com `file://`).

O servidor de desenvolvimento responde com `cache-control: no-store`, então o
navegador nunca serve JS velho durante o refino. O console imprime a build no ar
(`Palma teaser · build ...`): serve para confirmar qual versão está carregada.

---

## 1. Auditoria dos assets da pasta

O que existia na raiz do projeto quando este teaser foi construído:

| Arquivo original | O que é | Uso |
| --- | --- | --- |
| `Logos Palma.zip` → `PDF - IMPRESSOS/` | 11 PDFs vetoriais: logo vertical, ícone, versões branca, preta, P&B, fundo azul e a prancheta de referência de cores | **logo e ícone oficiais** |
| `Logos Palma.zip` → `PNG - TELA/` | as mesmas peças em PNG (~2000 px) | não usado: o vetor dos PDFs é melhor para tela |
| `Pattern Palma.pdf` | ladrilho vetorial de manchas de vaca, 480×480, 33 formas | **manchas dos cantos, nuvens, chão e manchas do personagem** |
| `Authentic Signature.otf` | fonte manuscrita de assinatura, 185 glifos, acentuação PT-BR completa | convertida para WOFF2, hoje em pausa |

**Cor oficial**, lida da própria prancheta de referência dentro do zip
(`LOGO_PALMA_2025 IMPRESSAO REFERENCIA CORES.pdf`):
PANTONE 286 C · R0 G57 B152 · `#003998` · C100 M63 Y0 K40.

### Assets gerados a partir dos originais

Nada foi redesenhado. Os PDFs oficiais foram convertidos para vetor com
`pdftocairo -svg` e normalizados:

| Gerado | Origem | Onde é usado |
| --- | --- | --- |
| `assets/brand/palma-logo.svg` | `01 LOGO_FAZ_PALMA_2025_VERSAO1.pdf` | logo no topo da tela |
| `assets/brand/palma-logo-branco.svg` | `LOGO_FAZ_PALMA_2025_VERSAO_BRANCA.pdf` | disponível, ainda sem uso |
| `assets/brand/palma-icone.svg` | `01 ICONE_FAZ_PALMA_2025_VERSAO1.pdf` | favicon e marca d'água do fim de jogo |
| `assets/brand/palma-icone.json` | o mesmo path, para `Path2D` | **cabeça do personagem** e selo nos produtos |
| `assets/brand/palma-manchas.json` | 14 formas isoladas do `Pattern Palma.pdf` | manchas da composição, nuvens, faixa do chão, manchas do corpo da vaca |
| `assets/brand/palma-pattern.svg` | ladrilho inteiro, recolorível | disponível, ainda sem uso |
| `assets/fonts/AuthenticSignature.woff2` | o `.otf` da pasta | pronto, mas em pausa (ver 2.2) |
| `assets/audio/vaca-mugindo.mp3` | arquivo enviado por você | mugido automático, de tempos em tempos |
| `assets/fonts/nunito/` | Nunito variável (SIL OFL) | títulos e UI, até chegar a fonte do wordmark |

O personagem **não** é uma vaca desenhada do zero: a cabeça é a arte do ícone
oficial, sem nenhuma alteração no traço, e as manchas do corpo saem do pattern
oficial. Corpo, patas, úbere e rabo são formas simples construídas em volta
desses dois elementos reais.

A cabeça é montada **uma vez** como sprite, em `buildHeadSprite`. Não dá para
pintar o rosto de branco só trocando a regra de preenchimento: os contornos
internos do path vêm com sentido invertido, então `nonzero` e `evenodd`
produzem exatamente o mesmo resultado e os vazados continuam vazados. O sprite
desenha a arte, descobre o exterior por inundação a partir das bordas e pinta
de branco tudo que sobrou por dentro. De quebra, desenhar a cabeça virou um
`drawImage` por quadro em vez de preencher um path.

---

## 2. O que ainda falta você mandar

### 2.1 Embalagens dos produtos: **placeholder em uso**

Não há nenhuma imagem de produto ou embalagem na pasta. Os coletáveis são hoje
uma **forma abstrata da marca** (azul + branco + o ícone oficial da vaca),
propositalmente sem nome de produto, para não inventar nada.

Para trocar pelo produto real:

1. coloque os recortes em `assets/produtos/` (PNG ou WEBP com fundo
   transparente, altura por volta de 400 px, um arquivo por embalagem);
2. liste os caminhos em `PRODUCTS.images`, em `src/js/config.js`.

O jogo passa a desenhar as imagens no lugar do vetor sem nenhuma outra mudança.

### 2.2 Fontes

A `Authentic Signature.otf` é uma manuscrita de assinatura. A pedido, está
**fora de uso**: nenhuma regra CSS aponta para ela, então o arquivo nem chega a
ser baixado. O token `--font-script` continua definido para religar quando quiser.

O lettering do wordmark "Palma" é uma sans arredondada encorpada que **não veio
na pasta**. Até ela chegar, títulos e UI usam a **Nunito variável**, auto-hospedada
em `assets/fonts/nunito/` (39 KB, subset latin, licença SIL Open Font).

Antes disso a tipografia era uma pilha de fontes de sistema, e isso rendia uma
página diferente em cada máquina: `SF Pro Rounded` no Mac, `Segoe UI Variable
Display` no Windows. Métricas diferentes mudam a altura de linha, e por isso o
respiro entre as frases aparecia menor numa máquina do que na outra. Fonte
embutida resolve porque todo mundo baixa o mesmo desenho.

Quando a fonte do wordmark chegar, a troca é de uma linha: `--font-display` em
`src/css/tokens.css`.

---

## 3. Estrutura

```
index.html          uma tela só: abertura, HUD, marcos e fim de jogo
dev-server.mjs      servidor estático de desenvolvimento, sem dependências
src/css/
  tokens.css        cor, tipografia, ritmo, easing
  base.css          palco, manchas, barra da marca, botões
  intro.css         abertura e a animação MUITO → MUUUUITO
  game.css          HUD, marcos da marca, tela de fim
src/js/
  config.js         TODO o balanceamento do jogo mora aqui
  util.js           matemática, formatação pt-BR, colisão AABB
  assets.js         carrega a geometria oficial e desenha Path2D encaixado
  storage.js        recorde local, resiliente a localStorage bloqueado
  audio.js          efeitos sintetizados, nenhum arquivo, nunca em autoplay
  decor.js          manchas de vaca como composição
  intro.js          cascata dos "U"
  main.js           liga tudo e cuida das trocas de estado
  game/
    index.js        máquina de estados, laço e câmera
    world.js        percurso contínuo fazenda → campo → cidade → casa
    art.js          vocabulário gráfico: vaca, obstáculos, produtos, cenário
    player.js       física do pulo
    obstacles.js    geração e colisão
    collectibles.js produtos e a animação de coleta
    hud.js          números, sem tocar no DOM à toa
    input.js        teclado, mouse e toque numa entrada só
```

## 4. Onde mexer no refino

Quase tudo o que se ajusta "no olho" está em `src/js/config.js`:

- `LAYOUT.cowWidthFactor`: tamanho do personagem em relação à tela
- `PHYSICS.airtime` e `apexInCows`: sensação do pulo
- `RUN.speedInCows` e `speedPerMeter`: velocidade e rampa de dificuldade
- `SPAWN.*`: espaçamento de obstáculos e de coletáveis
- `SPAWN.itemDrySpell` e `itemWindow`: de quanto em quanto tempo a pista abre
  espaço para um produto quando a dificuldade já fechou os vãos
- `JOURNEY.cycle`: quantos metros dura o percurso fazenda → casa
- `MILESTONES`: em que distância cada mensagem da marca aparece

A escala do desenho é em `cu` (*cow units*): 100 cu = altura da vaca. Obstáculo,
cenário e personagem crescem juntos em qualquer tela.

## 5. Decisões que valem registrar

- **A abertura é puramente tipográfica.** O canvas fica escondido e o laço nem
  simula: zero trabalho antes do clique. O botão JOGAR tira o texto de cena e
  revela o jogo por cima do mesmo palco.
- **Composição centralizada** com manchas de vaca sangrando pelos quatro cantos,
  conforme o layout definido.
- **Velocidade e placar medidos em alturas de vaca, não em pixels de tela.**
  Estavam presos à largura do canvas, mas o tamanho da vaca tem teto: no desktop
  ela andava 3,8 corpos por segundo e no celular só 2,1, e no celular parecia
  arrastada. Agora são 4,2 corpos por segundo e 12,6 m/s em qualquer aparelho.
  Na tela estreita a vaca corre mais à esquerda (15% da largura, contra 22% no
  desktop): como a velocidade acompanha o tamanho dela, é assim que o tempo de
  reação no celular fica perto do desktop, 1,15 s contra 2,15 s.
- **O chão é pasto.** Faixa verde lisa com franja de capim na linha do horizonte.
  O capim rareia na cidade e volta na casa, contando o percurso.
- **Progressão sem troca de fase.** Cada camada sorteia o próximo elemento com o
  peso do trecho atual, então celeiro vira poste vira prédio vira casa aos poucos.
- **Mobile primeiro.** `100dvh`, `env(safe-area-inset-*)`, `touch-action: none` na
  superfície de jogo, sem zoom acidental, HUD compacto, toque em qualquer lugar.
- **O desenho da vaca usa o mesmo y da física.** Parece óbvio, mas foi um bug
  real e difícil de ver: a física subia, a colisão subia, e só o desenho ficava
  colado no chão. Como as patas trocavam para a pose de voo, parecia um pulo
  fraco em vez de um erro de render. Se mexer em `Game.draw`, mantenha o
  `v.groundY - this.player.y`.
- **O pulo é sempre cheio.** A altura variável (soltar cedo = pulo menor)
  parecia boa ideia mas punia o clique curto, que é como quase todo mundo joga:
  um clique de 70 ms cortava o pulo para 52% e nenhum obstáculo médio passava.
- **Todo obstáculo é comprovadamente transponível.** A janela de acerto medida
  em simulação, varrendo todos os instantes possíveis de pulo: balde 0,65 s,
  caixa 0,60 s, latão 0,56 s, fardo 0,55 s, cerca e trator 0,51 s, balde duplo
  0,50 s. Se mexer em velocidade, altura do pulo ou tamanho de obstáculo,
  refaça essa conta: a largura do obstáculo e o alcance horizontal do pulo
  andam juntos, e baixar a velocidade encolhe o alcance.
- **`prefers-reduced-motion`** desliga as animações de interface; a mecânica
  do jogo continua igual.
- **Nada soa antes do primeiro gesto**, e o botão SOM grava a preferência.
- **A instrução aparece nas duas telas**, em corpo grande: na abertura e sobre o
  pasto durante a partida, sumindo no primeiro pulo ou em 7 segundos.
- **A Palmira muge sozinha de tempos em tempos**, em qualquer tela, a pedido do
  cliente. Antes ela mugia no hover do MUUUUITO. O primeiro mugido vem 1,5 s
  depois do primeiro gesto da página, e os seguintes a cada 20 a 32 s, em
  intervalo sorteado. Pula a vez com a aba escondida e durante a batida, sem
  acumular para depois. Na abertura, o MUUUUITO balança junto com o som. Os
  tempos ficam em `MUGIDO_PRIMEIRO` e `MUGIDO_INTERVALO`, no `src/js/main.js`;
  o volume em `MUGIDO_GANHO`, no `src/js/audio.js`. O som é o arquivo real em
  `assets/audio/vaca-mugindo.mp3` (18 KB, 2,05 s), com rampa de entrada e saída.
- **Antes do primeiro clique, toque ou tecla, o site é mudo, e isso não tem
  contorno.** A política de autoplay dos navegadores bloqueia áudio até um gesto
  de verdade; mouse passando e rolagem não contam. Por isso o relógio do mugido
  só começa nesse primeiro gesto.
- **Medidas por `ResizeObserver`, não por `window.resize`.** Em alguns contextos
  o primeiro quadro reporta largura zero; o observer resolve isso e ainda cobre
  o giro do aparelho.
- **O foco só vai para o botão quando a pessoa está no teclado.** Focar o JOGAR
  NOVAMENTE ao fim da partida ajuda quem joga no teclado, mas para quem usa
  mouse ou toque o navegador desenhava o anel de foco azul em volta do botão
  preto, sem servir para nada. O `Input` guarda qual foi o último comando e o
  fim de jogo decide a partir disso.
- **A copa da árvore vinha rachada.** As três elipses estavam encadeadas num
  caminho só, e o canvas liga uma arc/ellipse à seguinte com uma reta. Essas
  retas cruzavam a forma e, sob a regra `nonzero`, cancelavam o sentido do
  contorno e abriam buracos. Agora cada lobo é um `beginPath()` próprio. A
  moita tinha exatamente o mesmo defeito. Auditado por inundação a partir da
  borda: zero pixel de fundo preso dentro da copa, no tamanho de cena e
  ampliado.
- **Os coletáveis sumiam depois de ~1300 m.** Um produto exige
  `itemClearanceBefore + itemClearanceAfter` = 2,05 s de pista limpa, porque
  produto e obstáculo nunca disputam o mesmo pulo. Só que o intervalo entre
  obstáculos aperta até 1,35–2,15 s lá pelos 1500 m: nenhum vão cabia mais e o
  `#slot()` passava a devolver `null` para sempre. Medido no motor real: 14 →
  8 → 5,7 → **0,5** itens a cada 400 m, e nada depois disso. A correção não
  afrouxa a regra de segurança; quem procura lugar agora **reserva** espaço:
  depois de `SPAWN.itemDrySpell` segundos sem conseguir encaixar nada, o
  spawner de produtos chama `obstacles.pedirVao(SPAWN.itemWindow)` e o próximo
  intervalo nasce maior (e sem obstáculo em par, que ocuparia a pista). A
  densidade passa a se sustentar em 8–11 itens por 400 m até os 3200 m.
  Auditados 1315 produtos: a folga para o obstáculo seguinte nunca caiu abaixo
  dos 1,50 s exigidos. A rampa continua de pé, com vãos apertados subindo de
  7% no começo para 37% no fim.
- **O rosto da vaca não pintava, e inundar a partir da borda não bastava.** O
  ícone oficial é um desenho de linha ABERTO: existe uma fresta entre a orelha
  e a cabeça por onde o exterior escorre para dentro do rosto. A primeira
  tentativa inundava o exterior e pintava o resto de branco, o que dava zero
  pixel branco, medido no sprite publicado. Agora o exterior passa por um
  fechamento morfológico: a tinta é engrossada em `r`, o exterior é inundado
  sobre essa barreira grossa e depois devolvido ao tamanho original. A fresta
  fica selada e a silhueta volta ao lugar. O engorda serve só para calcular a
  máscara; a arte desenhada por cima continua sendo a original, sem nenhum
  traço alterado. Conferido sobre fundo verde: rosto e miolo das orelhas
  brancos, zero vazamento, do tamanho de jogo ao ampliado.
- **O sprite da cabeça é montado a 384 px, não 512.** Ele aparece na tela com
  no máximo ~166 px de largura em tela de alta densidade, então 384 já é mais
  do que o dobro do necessário. A fração branca da máscara é a mesma nas duas
  resoluções (0,410 contra 0,414) e o custo cai de 56 ms para 26 ms, pago uma
  vez só no carregamento.
- **O trator era um borrão.** A roda traseira tinha raio 30 num corpo de 74 de
  altura e cobria a própria cabine, e todas as peças eram da mesma tinta sem
  separação nenhuma. O resultado era uma mancha preta com dois pontos brancos.
  Redesenhado com as peças sem se comerem e com anel claro em volta das rodas,
  recortado na linha do chão para o anel não pingar no pasto. As medidas de
  `OBSTACLES.trator` não mudaram, então o pulo continua com a mesma folga já
  verificada.
- **As frases dos marcos ocupavam a tela inteira.** `.ms-display` estava em
  `clamp(40px, 8.6vw, 108px)`, o que dava 74% da largura no desktop e passava
  de 100% no celular. Agora é `clamp(28px, 4.4vw, 54px)`: 37% no desktop e 74%
  em 375 px, com presença de marca e sem atropelar o jogo.
- **O painel de preview suspende `requestAnimationFrame` quando está oculto.**
  Isso congela o laço do jogo e faz a captura de tela devolver quadro velho. Na
  dúvida, medir por pixel em vez de confiar na imagem. O servidor de
  desenvolvimento aceita `POST /__shot` com um dataURL e grava
  `.preview/shot.png`, que é o caminho confiável para conferir desenho de
  canvas. Nada disso existe no site publicado, que é estático.
- **`?debug=1`** expõe a instância do jogo em `window.palma` para ajuste fino
  no console.
