/**
 * Perto - integracao do app com a API.
 * ---------------------------------------------------------------------------
 * E a MESMA API REST que a plataforma web consome (server/src/server.js).
 * Por isso um check-in feito aqui aparece na hora na fila de triagem da UBS,
 * e um cadastro ou aviso feito no painel chega neste app.
 *
 * Tres cuidados pensados para o uso real na rua:
 *  1. descoberta automatica do endereco da API (inclusive o IP do PC que esta
 *     rodando o Expo, para funcionar no celular sem configurar nada);
 *  2. cache do ultimo estado, para o app abrir com conteudo mesmo sem sinal;
 *  3. fila offline: o que a pessoa fez sem internet sobe sozinho depois.
 */
import Constants from 'expo-constants';
import { ler, gravar, CHAVES } from './armazenamento';
import retratoDemo from '../../assets/demo.json';

export const servico = {
  modo: 'desconhecido', // 'api' | 'demo'
  base: '',
};

const TEMPO_LIMITE = 4000;

// ---------------------------------------------------------------------------
// Descoberta do endereco da API
// ---------------------------------------------------------------------------

/**
 * Quando o app roda no Expo Go, o Metro informa o IP do computador na rede
 * local (ex.: 192.168.0.12:8081). O servidor Perto roda nesse mesmo
 * computador, na porta 3333 - entao da para achar sem ninguem digitar nada.
 */
function baseDoExpo() {
  const host =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    '';
  const ip = String(host).split(':')[0];
  if (!ip || ip === 'localhost') return null;
  return `http://${ip}:3333`;
}

async function candidatos() {
  const lista = [];
  const salvo = await ler(CHAVES.apiUrl);
  if (salvo) lista.push(salvo);

  const configurado = Constants.expoConfig?.extra?.apiUrl;
  if (configurado) lista.push(configurado);

  const doExpo = baseDoExpo();
  if (doExpo) lista.push(doExpo);

  lista.push('http://localhost:3333', 'http://10.0.2.2:3333'); // 10.0.2.2 = PC visto pelo emulador Android
  return [...new Set(lista.map((u) => String(u).replace(/\/+$/, '')))];
}

async function responde(base) {
  try {
    const controle = new AbortController();
    const t = setTimeout(() => controle.abort(), TEMPO_LIMITE);
    const r = await fetch(`${base}/api/health`, { signal: controle.signal });
    clearTimeout(t);
    if (!r.ok) return false;
    const dados = await r.json();
    return dados?.ok === true;
  } catch {
    return false;
  }
}

/** Procura uma API viva. Sem nenhuma, o app entra em modo demonstracao. */
export async function conectar() {
  for (const base of await candidatos()) {
    if (await responde(base)) {
      servico.modo = 'api';
      servico.base = base;
      return servico;
    }
  }
  servico.modo = 'demo';
  servico.base = '';
  return servico;
}

export async function definirBaseManual(url) {
  await gravar(CHAVES.apiUrl, url || '');
  return conectar();
}

// ---------------------------------------------------------------------------
// Chamadas
// ---------------------------------------------------------------------------

async function chamar(caminho, opcoes = {}) {
  const controle = new AbortController();
  const t = setTimeout(() => controle.abort(), TEMPO_LIMITE + 3000);
  try {
    const r = await fetch(`${servico.base}${caminho}`, {
      ...opcoes,
      signal: controle.signal,
      headers: { 'Content-Type': 'application/json', ...(opcoes.headers || {}) },
    });
    const texto = await r.text();
    const dados = texto ? JSON.parse(texto) : null;
    if (!r.ok) throw new Error(dados?.erro || `Falha ${r.status}`);
    return dados;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Busca o retrato do territorio.
 * Sem conexao, devolve o ultimo estado guardado (ou o retrato de exemplo),
 * sempre informando de onde o dado veio para a tela poder avisar a pessoa.
 */
export async function buscarEstado() {
  if (servico.modo === 'api') {
    try {
      const estado = await chamar('/api/estado');
      await gravar(CHAVES.estado, estado);
      return { estado, origem: 'api' };
    } catch {
      const cache = await ler(CHAVES.estado);
      return { estado: cache || retratoDemo, origem: cache ? 'cache' : 'demo' };
    }
  }
  const cache = await ler(CHAVES.estado);
  return { estado: cache || retratoDemo, origem: cache ? 'cache' : 'demo' };
}

// ---------------------------------------------------------------------------
// Fila offline
// ---------------------------------------------------------------------------

async function enfileirar(item) {
  const fila = await ler(CHAVES.fila, []);
  fila.push({ ...item, id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, criadoEm: new Date().toISOString() });
  await gravar(CHAVES.fila, fila);
  return fila.length;
}

export async function tamanhoDaFila() {
  return (await ler(CHAVES.fila, [])).length;
}

/**
 * Envia uma acao. Se a internet falhar, a acao e guardada na fila e a tela
 * segue adiante: para quem esta na rua, o importante e que o toque "valeu".
 */
export async function enviar(caminho, metodo, corpo) {
  if (servico.modo !== 'api') {
    await enfileirar({ caminho, metodo, corpo });
    return { ok: false, offline: true, resultado: null };
  }
  try {
    const resultado = await chamar(caminho, { method: metodo, body: JSON.stringify(corpo || {}) });
    return { ok: true, offline: false, resultado };
  } catch (erro) {
    await enfileirar({ caminho, metodo, corpo });
    return { ok: false, offline: true, erro: erro.message, resultado: null };
  }
}

/** Sobe tudo que ficou pendente. Chamado quando a conexao volta. */
export async function sincronizarFila() {
  const fila = await ler(CHAVES.fila, []);
  if (!fila.length) return { enviados: 0, restantes: 0 };
  if (servico.modo !== 'api') {
    const estado = await conectar();
    if (estado.modo !== 'api') return { enviados: 0, restantes: fila.length };
  }

  const restantes = [];
  let enviados = 0;
  for (const item of fila) {
    try {
      await chamar(item.caminho, {
        method: item.metodo,
        body: JSON.stringify({ ...item.corpo, offlineSincronizado: true }),
      });
      enviados++;
    } catch {
      restantes.push(item);
    }
  }
  await gravar(CHAVES.fila, restantes);
  return { enviados, restantes: restantes.length };
}

// ---------------------------------------------------------------------------
// Acoes da jornada
// ---------------------------------------------------------------------------

export const fazerCheckin = (pessoaId, humor = 'bem') =>
  enviar('/api/checkins', 'POST', { pessoaId, humor, origem: 'app', em: new Date().toISOString() });

export const acionarSos = (pessoaId, texto) =>
  enviar('/api/alertas', 'POST', {
    pessoaId,
    tipo: 'sos',
    nivel: 'critico',
    texto: texto || 'Botao de emergencia acionado no app.',
  });

export const criarPedido = (pessoaId, tipo, detalhe) =>
  enviar('/api/pedidos', 'POST', { pessoaId, tipo, detalhe });

export const acaoAlerta = (alertaId, dados) => enviar(`/api/alertas/${alertaId}`, 'PATCH', dados);

export const acaoPedido = (pedidoId, dados) => enviar(`/api/pedidos/${pedidoId}`, 'PATCH', dados);
