/**
 * Perto - camada de integracao da plataforma web.
 * ---------------------------------------------------------------------------
 * A mesma API REST e consumida pelo app mobile (mobile/src/servicos/api.js),
 * por isso uma acao feita no celular aparece aqui e vice-versa.
 *
 * Dois modos:
 *   'api'  -> conectado ao servidor Node: dados compartilhados e eventos em
 *             tempo real via SSE (/api/eventos).
 *   'demo' -> nenhuma API respondeu. O painel carrega o retrato de
 *             web/dados/demo.json e as acoes ficam apenas neste navegador.
 *             O estado e sempre anunciado na tela, nunca escondido.
 */

const CFG = window.PERTO_CONFIG || {};
const CHAVE_OVERRIDE = 'perto:api';
const CHAVE_DEMO = 'perto:demo';

export const api = {
  modo: 'desconhecido',
  base: '',
  config: { minutosParaEscalar: 45 },
};

const ouvintesModo = new Set();
export function aoMudarModo(fn) {
  ouvintesModo.add(fn);
  if (api.modo !== 'desconhecido') fn(api.modo, api.base);
  return () => ouvintesModo.delete(fn);
}
function definirModo(modo, base = '') {
  api.modo = modo;
  api.base = base;
  ouvintesModo.forEach((fn) => fn(modo, base));
}

// ---------------------------------------------------------------------------
// Descoberta da API
// ---------------------------------------------------------------------------

function candidatos() {
  const lista = [];
  try {
    const salvo = localStorage.getItem(CHAVE_OVERRIDE);
    if (salvo) lista.push(salvo);
  } catch { /* ignora */ }
  const daUrl = new URLSearchParams(location.search).get('api');
  if (daUrl) lista.push(daUrl);
  if (CFG.apiBaseUrl) lista.push(CFG.apiBaseUrl);
  if (location.protocol.startsWith('http')) lista.push(location.origin);
  (CFG.alternativas || []).forEach((u) => lista.push(u));
  return [...new Set(lista.map((u) => String(u).replace(/\/+$/, '')))];
}

// 7s: a API publica roda no plano gratuito do Render, que hiberna sem uso e
// pode levar alguns segundos para responder a primeira chamada.
async function tentar(base, ms = 7000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(`${base}/api/health`, { signal: ctrl.signal, cache: 'no-store' });
    if (!r.ok) return false;
    const dados = await r.json();
    return dados && dados.ok === true;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

let promessaConexao = null;

export function conectar() {
  if (promessaConexao) return promessaConexao;
  promessaConexao = (async () => {
    for (const base of candidatos()) {
      if (await tentar(base)) {
        definirModo('api', base);
        return api;
      }
    }
    definirModo('demo', '');
    await demo.carregar();
    return api;
  })();
  return promessaConexao;
}

/** Permite apontar o painel para outra API sem editar codigo (tela de ajuda). */
export function definirApiManual(url) {
  try {
    if (url) localStorage.setItem(CHAVE_OVERRIDE, url);
    else localStorage.removeItem(CHAVE_OVERRIDE);
  } catch { /* ignora */ }
  location.reload();
}

// ---------------------------------------------------------------------------
// Chamadas
// ---------------------------------------------------------------------------

async function pedir(caminho, opcoes = {}) {
  const r = await fetch(`${api.base}${caminho}`, {
    ...opcoes,
    headers: { 'Content-Type': 'application/json', ...(opcoes.headers || {}) },
    cache: 'no-store',
  });
  const texto = await r.text();
  const dados = texto ? JSON.parse(texto) : null;
  if (!r.ok) throw new Error((dados && dados.erro) || `Falha ${r.status}`);
  return dados;
}

const POST = (c, corpo) => pedir(c, { method: 'POST', body: JSON.stringify(corpo || {}) });
const PATCH = (c, corpo) => pedir(c, { method: 'PATCH', body: JSON.stringify(corpo || {}) });

// ---------------------------------------------------------------------------
// Modo demonstracao (retrato local, sem servidor)
// ---------------------------------------------------------------------------

const demo = {
  estado: null,

  async carregar() {
    try {
      const salvo = localStorage.getItem(CHAVE_DEMO);
      if (salvo) {
        demo.estado = JSON.parse(salvo);
        return demo.estado;
      }
    } catch { /* ignora */ }
    const r = await fetch('dados/demo.json', { cache: 'no-store' });
    demo.estado = await r.json();
    demo.salvar();
    return demo.estado;
  },

  salvar() {
    try {
      localStorage.setItem(CHAVE_DEMO, JSON.stringify(demo.estado));
    } catch { /* ignora */ }
  },

  limpar() {
    try {
      localStorage.removeItem(CHAVE_DEMO);
    } catch { /* ignora */ }
  },

  id(p) {
    return `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  },

  /** Recalcula os numeros do cabecalho depois de cada acao local. */
  recalcular() {
    const e = demo.estado;
    const pessoas = e.pessoas || [];
    const abertos = (e.alertas || []).filter((a) => a.status !== 'resolvido');
    const resolvidos = (e.alertas || []).filter((a) => a.status === 'resolvido');
    const comCheckin = pessoas.filter((p) => p.status?.codigo === 'ok').length;
    e.indicadores = {
      ...e.indicadores,
      pessoasMonitoradas: pessoas.length,
      comCheckinHoje: comCheckin,
      semCheckin: pessoas.filter((p) => p.status?.codigo === 'sem_checkin').length,
      coberturaHoje: pessoas.length ? Math.round((comCheckin / pessoas.length) * 100) : 0,
      alertasAbertos: abertos.length,
      alertasCriticos: abertos.filter((a) => a.nivel === 'critico').length,
      alertasResolvidos: resolvidos.length,
      porRisco: {
        alto: pessoas.filter((p) => p.risco?.nivel === 'alto').length,
        medio: pessoas.filter((p) => p.risco?.nivel === 'medio').length,
        baixo: pessoas.filter((p) => p.risco?.nivel === 'baixo').length,
      },
      pedidosAbertos: (e.pedidos || []).filter((p) => p.status !== 'concluido').length,
      visitasAgendadas: (e.visitas || []).filter((v) => v.status === 'agendada').length,
      atualizadoEm: new Date().toISOString(),
    };
    const peso = { critico: 0, atencao: 1, info: 2 };
    e.fila = abertos
      .map((a) => {
        const p = pessoas.find((x) => x.id === a.pessoaId);
        return {
          ...a,
          esperandoMin: Math.round((Date.now() - new Date(a.criadoEm)) / 60000),
          pessoa: p
            ? {
                id: p.id, nome: p.nome, idade: p.idade, endereco: p.endereco,
                telefone: p.telefone, lat: p.lat, lng: p.lng, risco: p.risco,
                redeApoio: p.redeApoio || [],
              }
            : null,
        };
      })
      .sort((a, b) => (peso[a.nivel] - peso[b.nivel]) || b.esperandoMin - a.esperandoMin);
    e.agora = new Date().toISOString();
    demo.salvar();
    return e;
  },
};

// ---------------------------------------------------------------------------
// Interface publica: as telas chamam sempre estes metodos
// ---------------------------------------------------------------------------

export async function estado() {
  if (api.modo === 'api') {
    const e = await pedir('/api/estado');
    api.config = e.config || api.config;
    return e;
  }
  if (!demo.estado) await demo.carregar();
  return demo.recalcular();
}

export async function checkin({ pessoaId, humor = 'bem', origem = 'web' }) {
  if (api.modo === 'api') return POST('/api/checkins', { pessoaId, humor, origem });

  const e = demo.estado;
  const pessoa = e.pessoas.find((p) => p.id === pessoaId);
  const agora = new Date().toISOString();
  if (pessoa) {
    pessoa.status = {
      codigo: 'ok',
      rotulo: 'Check-in feito',
      descricao: 'Avisou que esta bem agora',
      humor,
      em: agora,
    };
    pessoa.ultimoCheckin = { id: demo.id('c'), pessoaId, em: agora, origem, humor };
  }
  e.alertas.forEach((a) => {
    if (a.pessoaId === pessoaId && a.tipo === 'sem_checkin' && a.status !== 'resolvido') {
      a.status = 'resolvido';
      a.resolvidoEm = agora;
      a.desfecho = { porQuem: 'proprio', quem: pessoa?.apelido || 'A pessoa', resultado: 'esta_bem', nota: 'Check-in registrado.' };
    }
  });
  demo.recalcular();
  return { checkin: pessoa?.ultimoCheckin };
}

export async function acaoAlerta(id, dados) {
  if (api.modo === 'api') return PATCH(`/api/alertas/${id}`, dados);

  const e = demo.estado;
  const al = e.alertas.find((a) => a.id === id);
  if (!al) throw new Error('Alerta nao encontrado');
  const agora = new Date().toISOString();
  const quem = dados.quem || { nome: 'Equipe', perfil: 'acs' };
  if (dados.acao === 'assumir') {
    al.status = 'em_atendimento';
    al.assumidoPor = quem;
    al.assumidoEm = agora;
  } else if (dados.acao === 'resolver') {
    al.status = 'resolvido';
    al.resolvidoEm = agora;
    al.desfecho = { porQuem: quem.perfil || 'acs', quem: quem.nome, resultado: dados.resultado || 'esta_bem', nota: dados.nota || '' };
  } else if (dados.acao === 'escalar') {
    al.nivel = 'critico';
    al.destino = 'ubs';
  }
  (al.historico = al.historico || []).push({ em: agora, quem: quem.nome, acao: dados.acao, nota: dados.nota || '' });
  demo.recalcular();
  return al;
}

export async function criarAlerta(dados) {
  if (api.modo === 'api') return POST('/api/alertas', dados);
  const e = demo.estado;
  const pessoa = e.pessoas.find((p) => p.id === dados.pessoaId);
  const al = {
    id: demo.id('al'),
    pessoaId: dados.pessoaId,
    tipo: dados.tipo || 'sos',
    nivel: dados.nivel || 'critico',
    titulo: dados.titulo || `${pessoa?.apelido || 'Pessoa'} acionou o SOS`,
    texto: dados.texto || '',
    criadoEm: new Date().toISOString(),
    status: 'aberto',
    destino: 'ubs',
    historico: [],
  };
  e.alertas.push(al);
  demo.recalcular();
  return al;
}

export async function criarPessoa(dados) {
  if (api.modo === 'api') return POST('/api/pessoas', dados);
  const e = demo.estado;
  const pessoa = {
    ...dados,
    id: demo.id('p'),
    apelido: dados.apelido || String(dados.nome).split(' ')[0],
    ativo: true,
    criadoEm: new Date().toISOString(),
    redeApoio: (dados.redeApoio || []).map((r) => ({ ...r, id: demo.id('r') })),
    risco: { nivel: (dados.redeApoio || []).length ? 'medio' : 'alto', pontos: 4, motivos: ['Cadastro novo, sem historico de check-in'] },
    status: { codigo: 'aguardando', rotulo: 'Aguardando primeiro check-in', descricao: 'Cadastro criado agora' },
    alertasAbertos: [],
    pedidosAbertos: [],
    totalCheckins: 0,
  };
  e.pessoas.push(pessoa);
  demo.recalcular();
  return pessoa;
}

export async function atualizarPessoa(id, dados) {
  if (api.modo === 'api') return PATCH(`/api/pessoas/${id}`, dados);
  const p = demo.estado.pessoas.find((x) => x.id === id);
  Object.assign(p, dados);
  demo.recalcular();
  return p;
}

export async function criarVisita(dados) {
  if (api.modo === 'api') return POST('/api/visitas', dados);
  const e = demo.estado;
  const pessoa = e.pessoas.find((p) => p.id === dados.pessoaId);
  const v = {
    ...dados,
    id: demo.id('v'),
    status: 'agendada',
    pessoa: pessoa ? { id: pessoa.id, nome: pessoa.nome, apelido: pessoa.apelido, endereco: pessoa.endereco } : null,
  };
  e.visitas.push(v);
  if (pessoa) pessoa.proximaVisita = v;
  demo.recalcular();
  return v;
}

export async function atualizarVisita(id, dados) {
  if (api.modo === 'api') return PATCH(`/api/visitas/${id}`, dados);
  const v = demo.estado.visitas.find((x) => x.id === id);
  Object.assign(v, dados);
  demo.recalcular();
  return v;
}

export async function acaoPedido(id, dados) {
  if (api.modo === 'api') return PATCH(`/api/pedidos/${id}`, dados);
  const pd = demo.estado.pedidos.find((p) => p.id === id);
  if (dados.acao === 'aceitar') {
    pd.status = 'aceito';
    pd.voluntario = dados.quem || { nome: 'Voluntario' };
  } else if (dados.acao === 'concluir') {
    pd.status = 'concluido';
    pd.concluidoEm = new Date().toISOString();
  }
  demo.recalcular();
  return pd;
}

export async function publicarAviso(dados) {
  if (api.modo === 'api') return POST('/api/avisos', dados);
  const av = {
    ...dados,
    id: demo.id('av'),
    criadoEm: new Date().toISOString(),
    autor: dados.autor || 'UBS Sacoma',
  };
  demo.estado.avisos.unshift(av);
  demo.recalcular();
  return av;
}

export async function removerAviso(id) {
  if (api.modo === 'api') return pedir(`/api/avisos/${id}`, { method: 'DELETE' });
  demo.estado.avisos = demo.estado.avisos.filter((a) => a.id !== id);
  demo.recalcular();
  return { ok: true };
}

export async function varredura() {
  if (api.modo === 'api') return POST('/api/varredura', {});
  return { eventos: [] };
}

export async function reiniciarDemonstracao() {
  if (api.modo === 'api') return POST('/api/demo/reset', {});
  demo.limpar();
  demo.estado = null;
  await demo.carregar();
  return { ok: true };
}

export async function simularAlerta(pessoaId) {
  if (api.modo === 'api') return POST('/api/demo/alerta', { pessoaId });
  return criarAlerta({ pessoaId, tipo: 'sem_checkin', nivel: 'atencao', titulo: 'Sem check-in hoje' });
}

// ---------------------------------------------------------------------------
// Tempo real
// ---------------------------------------------------------------------------

/**
 * Assina as mudancas do territorio.
 * Em modo 'api' usa SSE; se o fluxo cair, volta a consultar a API a cada 15s
 * (o painel continua correto mesmo com conexao instavel).
 */
export function assinar(aoReceber) {
  if (api.modo !== 'api' || !('EventSource' in window)) {
    return () => {};
  }
  let fonte = null;
  let timerFallback = null;
  let vivo = true;

  const abrir = () => {
    fonte = new EventSource(`${api.base}/api/eventos`);
    fonte.addEventListener('estado', (ev) => {
      clearInterval(timerFallback);
      timerFallback = null;
      try {
        aoReceber(JSON.parse(ev.data));
      } catch { aoReceber({ tipo: 'estado' }); }
    });
    fonte.addEventListener('error', () => {
      if (!vivo) return;
      fonte.close();
      // Conexao instavel: cai para consulta periodica e tenta o fluxo de novo.
      if (!timerFallback) timerFallback = setInterval(() => aoReceber({ tipo: 'pesquisa' }), 15000);
      setTimeout(() => vivo && abrir(), 8000);
    });
  };
  abrir();

  return () => {
    vivo = false;
    clearInterval(timerFallback);
    if (fonte) fonte.close();
  };
}
