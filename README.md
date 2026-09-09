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
| `assets/audio/vaca-mugindo.mp3` | arquivo enviado por você | mugido no hover do MUUUUITO |

O personagem **não** é uma vaca desenhada do zero: a cabeça é o path do ícone
oficial, e as manchas do corpo saem do pattern oficial. O corpo, as patas e o
rabo são formas simples construídas em volta desses dois elementos reais.

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

### 2.2 Fontes: **a manuscrita está em pausa**

A `Authentic Signature.otf` é uma manuscrita de assinatura. A pedido, ela está
**fora de uso** neste momento: nenhuma regra CSS aponta para ela, então o
arquivo nem chega a ser baixado. O token `--font-script` continua definido em
`src/css/tokens.css` para religar quando quiser.

O lettering do wordmark "Palma" é uma sans arredondada encorpada que **não veio
na pasta**. Títulos, frases e HUD usam hoje uma pilha de fontes de sistema
arredondadas (`ui-rounded` → `SF Pro Rounded` → `Segoe UI Variable Display` →
`Roboto`), que chega perto mas muda de máquina para máquina.

Se você mandar o arquivo da fonte do wordmark, a troca é de uma linha:
`--font-display` em `src/css/tokens.css`.

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
  arrastada. Agora são 3,3 corpos por segundo e 9,9 m/s em qualquer aparelho.
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
  em simulação, varrendo todos os instantes possíveis de pulo: balde 0,61 s,
  caixa 0,58 s, latão 0,53 s, fardo 0,50 s, cerca 0,48 s, trator 0,46 s, balde
  duplo 0,45 s. Se mexer em velocidade, altura do pulo ou tamanho de obstáculo,
  refaça essa conta: a largura do obstáculo e o alcance horizontal do pulo
  andam juntos, e baixar a velocidade encolhe o alcance.
- **`prefers-reduced-motion`** desliga as animações de interface; a mecânica
  do jogo continua igual.
- **Áudio nunca em autoplay**, e tem botão de liga/desliga que grava a preferência.
- **A instrução aparece nas duas telas**, em corpo grande: na abertura e sobre o
  pasto durante a partida, sumindo no primeiro pulo ou em 7 segundos.
- **Passar o mouse no MUUUUITO faz a Palmira mugir.** O som é o arquivo real em
  `assets/audio/vaca-mugindo.mp3` (18 KB, 2,05 s), decodificado uma vez e tocado
  com rampa de entrada e saída, em volume baixo de propósito. O nível fica em
  `MUGIDO_GANHO`, no `src/js/audio.js`.
- **O primeiro hover de cada carregamento sai mudo.** Não é bug: a política de
  autoplay do navegador só libera áudio depois de um gesto de verdade, e passar
  o mouse não conta. Depois de qualquer clique na página, todo hover muge. O
  hover também tenta destravar, o que já resolve em navegadores mais permissivos.
- **Cuidado com debounce medido em `performance.now()`.** Ele conta desde o load,
  então inicializar o marcador em `0` engolia o mugido nos primeiros segundos da
  página, justamente quando alguém passa o mouse pela primeira vez. Use
  `-Infinity`.
- **Medidas por `ResizeObserver`, não por `window.resize`.** Em alguns contextos
  o primeiro quadro reporta largura zero; o observer resolve isso e ainda cobre
  o giro do aparelho.
- **`?debug=1`** expõe a instância do jogo em `window.palma` para ajuste fino
  no console.
