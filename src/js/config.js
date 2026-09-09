/* Constantes de marca e de balanceamento do jogo.
   Tudo que se ajusta "no olho" durante o refino mora aqui. */

export const BRAND = {
  paper: '#ffffff',
  ink: '#100d0b',
  blue: '#003998',
  blueDeep: '#002a70',
  far: '#eef2f9',   // silhuetas distantes
  mid: '#ccd8ea',   // silhuetas intermediarias
  sun: '#f4f7fc',
  cloud: '#e9eff8', // manchas do pattern usadas como nuvens
  ground: '#12452B',     // faixa do chao: pasto
  grass: '#1E6E44',      // folhas de capim na linha do horizonte
  // Queijo Divino: cores tiradas da propria embalagem
  queijoCreme: '#F6E7C6',
  queijoMancha: '#E2C793',
  queijoDourado: '#A18441',
};

export const LAYOUT = {
  groundRatio: 0.775,       // linha do chao
  /* Posicao da vaca na largura. Na tela estreita ela corre mais a esquerda:
     como a velocidade e proporcional ao tamanho dela, so assim o tempo de
     reacao no celular fica perto do tempo do desktop. */
  cowXRatio: 0.22,
  cowXRatioNarrow: 0.15,
  cowWidthFactor: 0.175,    // altura da vaca como fracao da largura do canvas
  cowMin: 58,
  cowMax: 126,
  /* Trava para telas baixas em paisagem. No apice a vaca ocupa
     apexInCows + 1 alturas dela (3.6u); isso tem que caber no ceu, que e
     groundRatio da altura. 0.775 / 3.6 = 0.215. */
  cowMaxOfHeight: 0.21,
  maxDpr: 2,
};

export const PHYSICS = {
  airtime: 0.98,            // segundos do pulo completo
  apexInCows: 2.6,          // altura do apice em "alturas de vaca"
  // O pulo e sempre cheio. Altura variavel penalizava o clique curto, que e
  // exatamente como a maioria das pessoas joga.
  coyote: 0.09,             // tolerancia apos sair do chao
  buffer: 0.12,             // pulo bufferizado antes de aterrissar
  maxStep: 1 / 30,          // trava do dt para nao atravessar obstaculo
};

export const RUN = {
  /* Velocidade e placar medidos em ALTURAS DE VACA, nao em pixels de tela.
     Antes eram proporcionais a largura do canvas, mas o tamanho da vaca tem
     teto: no desktop ela andava 3,8 corpos por segundo e no celular so 2,1, e
     no celular parecia arrastada. Agora o ritmo visual e a pontuacao sao
     iguais em qualquer aparelho. */
  speedInCows: 4.2,         // alturas de vaca por segundo
  speedMax: 1.25,           // multiplicador maximo de velocidade
  speedPerMeter: 0.00020,   // ganho de velocidade por metro
  pixelsPerMeter: 0.333,    // fracao da altura da vaca que vale um metro
  milkPerItem: 25,          // litros por produto coletado
  queijoValor: 100,         // o Queijo Divino vale quatro leites
  queijoChance: 0.16,       // ... e por isso aparece pouco
};

export const SPAWN = {
  obstacleGapStart: [1.95, 3.30], // segundos entre obstaculos, no inicio
  obstacleGapEnd: [1.35, 2.15],   // ... no auge da dificuldade
  gapTightenOverMeters: 1500,
  pairChanceMax: 0.18,            // chance de obstaculo duplo no fim da rampa
  itemGap: [1.6, 3.0],            // segundos entre grupos de coletaveis
  /* Folga entre produto e obstaculo, em segundos de percurso. E assimetrica de
     proposito: obstaculo ANTES do produto e tranquilo, porque ela ja esta no
     chao correndo. O perigo e o obstaculo DEPOIS, quando ela ainda esta caindo
     do pulo que pegou o leite. O pulo dura PHYSICS.airtime, entao ela aterrissa
     meio pulo depois do produto e ainda precisa de tempo para pular de novo. */
  itemClearanceBefore: 0.55,
  itemClearanceAfter: 1.50,
  arcChance: 0.42,                // chance do grupo ser um arco de 3
};

/* Percurso continuo: fazenda -> campo/estrada -> cidade -> casa.
   Um ciclo completo tem CYCLE metros e depois recomeca (endless). */
export const JOURNEY = {
  cycle: 900,
  scenes: ['fazenda', 'campo', 'cidade', 'casa'],
  blend: 0.16,   // fracao de cada trecho usada para cruzar com o proximo
};

export const MILESTONES = [
  {
    at: 300,
    top: { text: 'Novo site Palma', face: 'ms-label' },
    bottom: { text: 'Em breve.', face: 'ms-display' },
    hold: 2200,
  },
  {
    at: 700,
    top: { text: 'Da nossa fazenda', face: 'ms-display' },
    bottom: { text: 'para sua casa.', face: 'ms-display' },
    hold: 2800,
  },
];

/* ————— COLETAVEIS —————
   PLACEHOLDER: nao existe imagem de embalagem Palma na pasta do projeto.
   O item e desenhado com formas da marca (azul + branco + icone oficial),
   sem nome de produto inventado.
   Para trocar pelo produto real: adicione os PNG/WEBP recortados em
   assets/produtos/ e liste os caminhos em `images`. O jogo passa a
   desenhar as imagens no lugar do desenho vetorial automaticamente. */
export const PRODUCTS = {
  images: [],
  placeholderShapes: ['garrafa', 'caixa'],
};

export const STORAGE_KEY = 'palma.teaser.v1';
