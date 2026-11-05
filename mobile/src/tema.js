/**
 * Perto - tema do app.
 * Os mesmos tokens de cor, raio e espacamento usados na plataforma web
 * (web/css/base.css), para que as duas partes pareçam o mesmo produto.
 *
 * Acessibilidade embutida:
 *  - paleta de alto contraste alternativa;
 *  - escala tipografica controlada pela pessoa (3 tamanhos);
 *  - area de toque minima de 48 pontos em qualquer botao.
 */

export const coresPadrao = {
  areia: '#FBF7F2',
  papel: '#FFFFFF',
  papel2: '#F4EFE8',
  linha: '#E2D9CE',
  linhaForte: '#C9BCAD',

  tinta: '#152327',
  tinta2: '#45585E',
  tinta3: '#65787E',

  primaria: '#0F6B63',
  primariaEscura: '#0A4A44',
  primariaClara: '#E3F1EF',
  acento: '#C2560F',
  acentoClaro: '#FDEEE2',

  ok: '#156C41',
  okFundo: '#E6F3EA',
  atencao: '#8A5100',
  atencaoFundo: '#FDF0DA',
  critico: '#A81E16',
  criticoFundo: '#FDE9E7',
  info: '#1B4F8A',
  infoFundo: '#E7F0FA',

  foco: '#0B55D6',
  branco: '#FFFFFF',
};

export const coresAltoContraste = {
  ...coresPadrao,
  areia: '#FFFFFF',
  papel: '#FFFFFF',
  papel2: '#F2F2F2',
  linha: '#5C5C5C',
  linhaForte: '#1A1A1A',
  tinta: '#000000',
  tinta2: '#1A1A1A',
  tinta3: '#333333',
  primaria: '#04433D',
  primariaEscura: '#04302C',
  primariaClara: '#FFFFFF',
  acento: '#8A3C08',
  ok: '#0A4F2F',
  okFundo: '#FFFFFF',
  atencao: '#5E3700',
  atencaoFundo: '#FFFFFF',
  critico: '#8A1009',
  criticoFundo: '#FFFFFF',
  info: '#0E3461',
  infoFundo: '#FFFFFF',
};

export const raios = { pequeno: 10, medio: 16, grande: 22, enorme: 28, pilula: 999 };

/** Espacamento em multiplos de 4, como na web. */
export const esp = (n) => n * 4;

/** Tamanhos base. A escala escolhida pela pessoa multiplica todos eles. */
export const tipos = {
  mini: 12,
  pequeno: 14,
  corpo: 16,
  medio: 18,
  grande: 22,
  titulo: 26,
  gigante: 34,
};

export const ESCALAS = [
  { chave: 'normal', fator: 1, rotulo: 'Normal' },
  { chave: 'grande', fator: 1.15, rotulo: 'Grande' },
  { chave: 'maior', fator: 1.32, rotulo: 'Maior' },
];

/** Area de toque minima recomendada. Nenhum botao do app fica abaixo disso. */
export const TOQUE_MINIMO = 48;

export const sombra = {
  shadowColor: '#152327',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

export const sombraForte = {
  shadowColor: '#152327',
  shadowOpacity: 0.16,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
};

/** Rotulos legiveis, iguais aos da web. */
export const ROTULOS = {
  risco: { alto: 'Atencao alta', medio: 'Atencao media', baixo: 'Atencao baixa' },
  nivel: { critico: 'Critico', atencao: 'Atencao', info: 'Aviso' },
  humor: { bem: 'Estou bem', mais_ou_menos: 'Mais ou menos', preciso_de_ajuda: 'Preciso de ajuda' },
  tipoAlerta: {
    sem_checkin: 'Sem check-in',
    sos: 'Emergencia',
    pedido_ajuda: 'Pedido de ajuda',
    clima: 'Clima',
  },
  tipoPedido: { remedio: 'Remedio', mercado: 'Mercado', conversa: 'Companhia', transporte: 'Transporte' },
  iconePedido: {
    remedio: 'medical-outline',
    mercado: 'basket-outline',
    conversa: 'chatbubble-ellipses-outline',
    transporte: 'car-outline',
  },
  statusAlerta: { aberto: 'Aguardando alguem', em_atendimento: 'Alguem foi ver', resolvido: 'Resolvido' },
};

export function corDoNivel(cores, nivel) {
  if (nivel === 'critico' || nivel === 'alto') return { texto: cores.critico, fundo: cores.criticoFundo };
  if (nivel === 'atencao' || nivel === 'medio') return { texto: cores.atencao, fundo: cores.atencaoFundo };
  if (nivel === 'ok' || nivel === 'baixo') return { texto: cores.ok, fundo: cores.okFundo };
  return { texto: cores.info, fundo: cores.infoFundo };
}
