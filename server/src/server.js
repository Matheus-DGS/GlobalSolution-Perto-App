/**
 * Perto - servidor de integracao
 * ---------------------------------------------------------------------------
 * Um unico processo Node, sem dependencias, que faz tres coisas:
 *   1. expoe a API REST consumida pelo app mobile e pelo painel web;
 *   2. publica um fluxo SSE (/api/eventos) para o painel web reagir em tempo real;
 *   3. serve a propria plataforma web estatica (../web), para que um unico deploy
 *      entregue painel + API na mesma origem (sem CORS, sem configuracao).
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { obter, gravar, resetar } from './store.js';
import {
  montarPessoa,
  indicadores,
  filaTriagem,
  varrer,
  novoId,
  dataLocal,
  minutosEntre,
  MINUTOS_PARA_ESCALAR,
} from './dominio.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PASTA_WEB = path.resolve(__dirname, '..', '..', 'web');
const PORTA = Number(process.env.PORT || 3333);

// ---------------------------------------------------------------------------
// Utilidades HTTP
// ---------------------------------------------------------------------------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function enviarJson(res, dados, status = 200) {
  const corpo = JSON.stringify(dados);
  cors(res);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(corpo),
    'Cache-Control': 'no-store',
  });
  res.end(corpo);
}

function erro(res, status, mensagem) {
  enviarJson(res, { erro: mensagem }, status);
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let bruto = '';
    req.on('data', (c) => {
      bruto += c;
      if (bruto.length > 1e6) reject(new Error('corpo muito grande'));
    });
    req.on('end', () => {
      if (!bruto) return resolve({});
      try {
        resolve(JSON.parse(bruto));
      } catch {
        reject(new Error('JSON invalido'));
      }
    });
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Eventos em tempo real (SSE)
// ---------------------------------------------------------------------------

const ouvintes = new Set();

function transmitir(tipo, dados = {}) {
  const pacote = `event: ${tipo}\ndata: ${JSON.stringify({ tipo, ...dados, em: new Date().toISOString() })}\n\n`;
  for (const res of ouvintes) {
    try {
      res.write(pacote);
    } catch {
      ouvintes.delete(res);
    }
  }
}

function abrirFluxo(req, res) {
  cors(res);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`event: conectado\ndata: ${JSON.stringify({ tipo: 'conectado' })}\n\n`);
  ouvintes.add(res);

  const batida = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(batida);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(batida);
    ouvintes.delete(res);
  });
}

// ---------------------------------------------------------------------------
// Estado completo (bootstrap das duas plataformas)
// ---------------------------------------------------------------------------

function estadoCompleto() {
  const db = obter();
  const agora = new Date().toISOString();
  return {
    agora,
    territorio: db.territorio,
    indicadores: indicadores(db, agora),
    pessoas: db.pessoas.filter((p) => p.ativo !== false).map((p) => montarPessoa(p, db, agora)),
    fila: filaTriagem(db, agora),
    alertas: db.alertas,
    checkins: db.checkins,
    pedidos: db.pedidos.map((p) => ({
      ...p,
      pessoa: resumoPessoa(db, p.pessoaId),
    })),
    visitas: db.visitas.map((v) => ({ ...v, pessoa: resumoPessoa(db, v.pessoaId) })),
    avisos: db.avisos,
    usuarios: db.usuarios,
    config: { minutosParaEscalar: MINUTOS_PARA_ESCALAR },
  };
}

function resumoPessoa(db, pessoaId) {
  const p = db.pessoas.find((x) => x.id === pessoaId);
  if (!p) return null;
  return {
    id: p.id,
    nome: p.nome,
    apelido: p.apelido,
    endereco: p.endereco,
    telefone: p.telefone,
    idade: p.idade,
    lat: p.lat,
    lng: p.lng,
  };
}

function notificarMudanca(motivo, extra = {}) {
  const db = obter();
  const agora = new Date().toISOString();
  transmitir('estado', {
    motivo,
    ...extra,
    indicadores: indicadores(db, agora),
    fila: filaTriagem(db, agora),
  });
}

// ---------------------------------------------------------------------------
// Rotas da API
// ---------------------------------------------------------------------------

async function rotearApi(req, res, url) {
  const db = obter();
  const rota = url.pathname.replace(/\/+$/, '') || '/api';
  const metodo = req.method;
  const partes = rota.split('/').filter(Boolean); // ['api', 'pessoas', 'p1']
  const recurso = partes[1];
  const id = partes[2];
  const corpo = ['POST', 'PATCH', 'PUT'].includes(metodo) ? await lerCorpo(req) : {};
  const agora = new Date().toISOString();

  // --- saude e bootstrap -----------------------------------------------------
  if (recurso === 'health') {
    return enviarJson(res, {
      ok: true,
      servico: 'perto-api',
      versao: '1.0.0',
      agora,
      pessoas: db.pessoas.length,
      ouvintes: ouvintes.size,
    });
  }

  if (recurso === 'estado' && metodo === 'GET') {
    return enviarJson(res, estadoCompleto());
  }

  if (recurso === 'eventos' && metodo === 'GET') {
    return abrirFluxo(req, res);
  }

  if (recurso === 'indicadores' && metodo === 'GET') {
    return enviarJson(res, indicadores(db, agora));
  }

  // --- pessoas monitoradas ---------------------------------------------------
  if (recurso === 'pessoas') {
    if (metodo === 'GET' && !id) {
      return enviarJson(
        res,
        db.pessoas.filter((p) => p.ativo !== false).map((p) => montarPessoa(p, db, agora))
      );
    }
    if (metodo === 'GET' && id) {
      const p = db.pessoas.find((x) => x.id === id);
      if (!p) return erro(res, 404, 'Pessoa nao encontrada');
      return enviarJson(res, montarPessoa(p, db, agora));
    }
    if (metodo === 'POST') {
      if (!corpo.nome || !corpo.idade) return erro(res, 400, 'Informe ao menos nome e idade');
      const pessoa = {
        id: novoId('p'),
        nome: String(corpo.nome).trim(),
        apelido: corpo.apelido || String(corpo.nome).trim().split(' ')[0],
        idade: Number(corpo.idade),
        telefone: corpo.telefone || '',
        endereco: corpo.endereco || '',
        bairro: corpo.bairro || db.territorio.nome,
        lat: Number(corpo.lat) || db.territorio.centro.lat + (Math.random() - 0.5) * 0.008,
        lng: Number(corpo.lng) || db.territorio.centro.lng + (Math.random() - 0.5) * 0.008,
        moraSozinha: corpo.moraSozinha !== false,
        condicoes: Array.isArray(corpo.condicoes) ? corpo.condicoes : [],
        mobilidade: corpo.mobilidade || 'boa',
        observacoes: corpo.observacoes || '',
        janelaCheckin: corpo.janelaCheckin || { inicio: '07:00', fim: '11:00' },
        acsId: corpo.acsId || 'u_cleo',
        ativo: true,
        criadoEm: agora,
        redeApoio: (Array.isArray(corpo.redeApoio) ? corpo.redeApoio : []).map((r) => ({
          id: novoId('r'),
          nome: r.nome || '',
          relacao: r.relacao || 'Vizinho',
          telefone: r.telefone || '',
          distancia: r.distancia || '',
        })),
      };
      db.pessoas.push(pessoa);
      gravar();
      notificarMudanca('pessoa_cadastrada', { pessoaId: pessoa.id });
      return enviarJson(res, montarPessoa(pessoa, db, agora), 201);
    }
    if (metodo === 'PATCH' && id) {
      const p = db.pessoas.find((x) => x.id === id);
      if (!p) return erro(res, 404, 'Pessoa nao encontrada');
      const permitido = [
        'nome', 'apelido', 'idade', 'telefone', 'endereco', 'bairro', 'lat', 'lng',
        'moraSozinha', 'condicoes', 'mobilidade', 'observacoes', 'janelaCheckin',
        'redeApoio', 'ativo',
      ];
      for (const chave of permitido) {
        if (corpo[chave] !== undefined) p[chave] = corpo[chave];
      }
      gravar();
      notificarMudanca('pessoa_atualizada', { pessoaId: p.id });
      return enviarJson(res, montarPessoa(p, db, agora));
    }
  }

  // --- check-ins -------------------------------------------------------------
  if (recurso === 'checkins') {
    if (metodo === 'GET') {
      const filtro = url.searchParams.get('pessoaId');
      const lista = filtro ? db.checkins.filter((c) => c.pessoaId === filtro) : db.checkins;
      return enviarJson(res, [...lista].sort((a, b) => (a.em < b.em ? 1 : -1)));
    }
    if (metodo === 'POST') {
      const pessoa = db.pessoas.find((p) => p.id === corpo.pessoaId);
      if (!pessoa) return erro(res, 404, 'Pessoa nao encontrada');
      const em = corpo.em || agora;
      const checkin = {
        id: novoId('c'),
        pessoaId: pessoa.id,
        em,
        origem: corpo.origem || 'app',
        humor: ['bem', 'mais_ou_menos', 'preciso_de_ajuda'].includes(corpo.humor) ? corpo.humor : 'bem',
        offlineSincronizado: Boolean(corpo.offlineSincronizado),
      };
      db.checkins.push(checkin);

      // Um check-in fecha automaticamente os alertas de ausencia do dia.
      const resolvidos = [];
      for (const al of db.alertas) {
        if (
          al.pessoaId === pessoa.id &&
          al.tipo === 'sem_checkin' &&
          al.status !== 'resolvido' &&
          dataLocal(al.criadoEm) === dataLocal(em)
        ) {
          al.status = 'resolvido';
          al.resolvidoEm = em;
          al.desfecho = {
            porQuem: 'proprio',
            quem: pessoa.apelido || pessoa.nome,
            resultado: 'esta_bem',
            nota: 'A propria pessoa fez o check-in no app.',
          };
          al.historico.push({ em, quem: pessoa.apelido || pessoa.nome, acao: 'resolvido', nota: 'Check-in feito no app' });
          resolvidos.push(al.id);
        }
      }

      // Check-in pedindo ajuda cria um alerta para a rede de apoio.
      let alertaCriado = null;
      if (checkin.humor === 'preciso_de_ajuda') {
        alertaCriado = {
          id: novoId('al'),
          pessoaId: pessoa.id,
          tipo: 'pedido_ajuda',
          nivel: 'atencao',
          titulo: `${pessoa.apelido || pessoa.nome} marcou "preciso de ajuda" no check-in`,
          texto: 'A pessoa confirmou que esta em casa, mas pediu ajuda hoje.',
          criadoEm: em,
          status: 'aberto',
          destino: 'rede',
          assumidoPor: null,
          assumidoEm: null,
          resolvidoEm: null,
          desfecho: null,
          historico: [{ em, quem: pessoa.apelido || pessoa.nome, acao: 'criado', nota: 'Check-in com pedido de ajuda' }],
        };
        db.alertas.push(alertaCriado);
      }

      gravar();
      notificarMudanca('checkin', { pessoaId: pessoa.id, checkin, resolvidos, alerta: alertaCriado });
      return enviarJson(res, { checkin, alertasResolvidos: resolvidos, alertaCriado }, 201);
    }
  }

  // --- alertas ---------------------------------------------------------------
  if (recurso === 'alertas') {
    if (metodo === 'GET') {
      const status = url.searchParams.get('status');
      const pessoaId = url.searchParams.get('pessoaId');
      let lista = filaTriagem(db, agora);
      if (status === 'resolvido') {
        lista = db.alertas
          .filter((a) => a.status === 'resolvido')
          .map((a) => ({ ...a, pessoa: resumoPessoa(db, a.pessoaId) }));
      }
      if (pessoaId) lista = lista.filter((a) => a.pessoaId === pessoaId);
      return enviarJson(res, lista);
    }
    if (metodo === 'POST') {
      const pessoa = db.pessoas.find((p) => p.id === corpo.pessoaId);
      if (!pessoa) return erro(res, 404, 'Pessoa nao encontrada');
      const tipo = corpo.tipo || 'sos';
      const nivel = corpo.nivel || (tipo === 'sos' ? 'critico' : 'atencao');
      const alerta = {
        id: novoId('al'),
        pessoaId: pessoa.id,
        tipo,
        nivel,
        titulo:
          corpo.titulo ||
          (tipo === 'sos'
            ? `${pessoa.apelido || pessoa.nome} acionou o SOS`
            : `Novo alerta para ${pessoa.apelido || pessoa.nome}`),
        texto: corpo.texto || 'Botao de emergencia acionado no app.',
        criadoEm: agora,
        status: 'aberto',
        destino: corpo.destino || (nivel === 'critico' ? 'ubs' : 'rede'),
        assumidoPor: null,
        assumidoEm: null,
        resolvidoEm: null,
        desfecho: null,
        local: corpo.local || null,
        historico: [
          { em: agora, quem: corpo.quem || pessoa.apelido || pessoa.nome, acao: 'criado', nota: corpo.texto || 'Alerta aberto no app' },
        ],
      };
      db.alertas.push(alerta);
      gravar();
      notificarMudanca('alerta_criado', { pessoaId: pessoa.id, alerta });
      return enviarJson(res, alerta, 201);
    }
    if (metodo === 'PATCH' && id) {
      const al = db.alertas.find((a) => a.id === id);
      if (!al) return erro(res, 404, 'Alerta nao encontrado');
      const acao = corpo.acao;
      const quem = corpo.quem || { nome: 'Equipe', perfil: 'acs' };

      if (acao === 'assumir') {
        al.status = 'em_atendimento';
        al.assumidoPor = quem;
        al.assumidoEm = agora;
        al.historico.push({ em: agora, quem: quem.nome, acao: 'assumido', nota: corpo.nota || 'Vou verificar agora' });
      } else if (acao === 'resolver') {
        al.status = 'resolvido';
        al.resolvidoEm = agora;
        if (!al.assumidoPor) {
          al.assumidoPor = quem;
          al.assumidoEm = agora;
        }
        al.desfecho = {
          porQuem: quem.perfil || 'rede',
          quem: quem.nome,
          resultado: corpo.resultado || 'esta_bem',
          nota: corpo.nota || '',
        };
        al.historico.push({ em: agora, quem: quem.nome, acao: 'resolvido', nota: corpo.nota || 'Caso encerrado' });
      } else if (acao === 'escalar') {
        al.nivel = 'critico';
        al.destino = 'ubs';
        al.status = 'aberto';
        al.historico.push({ em: agora, quem: quem.nome, acao: 'escalado', nota: corpo.nota || 'Encaminhado para a UBS' });
      } else if (acao === 'reabrir') {
        al.status = 'aberto';
        al.resolvidoEm = null;
        al.desfecho = null;
        al.historico.push({ em: agora, quem: quem.nome, acao: 'reaberto', nota: corpo.nota || '' });
      } else {
        return erro(res, 400, 'Acao invalida. Use assumir, resolver, escalar ou reabrir.');
      }

      gravar();
      notificarMudanca('alerta_atualizado', { pessoaId: al.pessoaId, alerta: al, acao });
      return enviarJson(res, al);
    }
  }

  // --- pedidos de ajuda cotidiana -------------------------------------------
  if (recurso === 'pedidos') {
    if (metodo === 'GET') {
      return enviarJson(res, db.pedidos.map((p) => ({ ...p, pessoa: resumoPessoa(db, p.pessoaId) })));
    }
    if (metodo === 'POST') {
      const pessoa = db.pessoas.find((p) => p.id === corpo.pessoaId);
      if (!pessoa) return erro(res, 404, 'Pessoa nao encontrada');
      const pedido = {
        id: novoId('pd'),
        pessoaId: pessoa.id,
        tipo: corpo.tipo || 'conversa',
        detalhe: corpo.detalhe || '',
        criadoEm: agora,
        status: 'aberto',
        voluntario: null,
        concluidoEm: null,
      };
      db.pedidos.push(pedido);
      gravar();
      notificarMudanca('pedido_criado', { pessoaId: pessoa.id, pedido });
      return enviarJson(res, pedido, 201);
    }
    if (metodo === 'PATCH' && id) {
      const pd = db.pedidos.find((p) => p.id === id);
      if (!pd) return erro(res, 404, 'Pedido nao encontrado');
      if (corpo.acao === 'aceitar') {
        pd.status = 'aceito';
        pd.voluntario = corpo.quem || { nome: 'Voluntario' };
      } else if (corpo.acao === 'concluir') {
        pd.status = 'concluido';
        pd.concluidoEm = agora;
        if (corpo.quem) pd.voluntario = corpo.quem;
      } else if (corpo.acao === 'reabrir') {
        pd.status = 'aberto';
        pd.voluntario = null;
        pd.concluidoEm = null;
      } else {
        return erro(res, 400, 'Acao invalida. Use aceitar, concluir ou reabrir.');
      }
      gravar();
      notificarMudanca('pedido_atualizado', { pessoaId: pd.pessoaId, pedido: pd });
      return enviarJson(res, pd);
    }
  }

  // --- visitas ---------------------------------------------------------------
  if (recurso === 'visitas') {
    if (metodo === 'GET') {
      return enviarJson(res, db.visitas.map((v) => ({ ...v, pessoa: resumoPessoa(db, v.pessoaId) })));
    }
    if (metodo === 'POST') {
      const pessoa = db.pessoas.find((p) => p.id === corpo.pessoaId);
      if (!pessoa) return erro(res, 404, 'Pessoa nao encontrada');
      const visita = {
        id: novoId('v'),
        pessoaId: pessoa.id,
        quando: corpo.quando || agora,
        responsavel: corpo.responsavel || 'Cleo Martins (ACS)',
        tipo: corpo.tipo || 'acs',
        status: 'agendada',
        notas: corpo.notas || '',
      };
      db.visitas.push(visita);
      gravar();
      notificarMudanca('visita_agendada', { pessoaId: pessoa.id, visita });
      return enviarJson(res, visita, 201);
    }
    if (metodo === 'PATCH' && id) {
      const v = db.visitas.find((x) => x.id === id);
      if (!v) return erro(res, 404, 'Visita nao encontrada');
      if (corpo.status) v.status = corpo.status;
      if (corpo.quando) v.quando = corpo.quando;
      if (corpo.notas !== undefined) v.notas = corpo.notas;
      gravar();
      notificarMudanca('visita_atualizada', { pessoaId: v.pessoaId, visita: v });
      return enviarJson(res, v);
    }
  }

  // --- avisos do territorio (broadcast web -> app) --------------------------
  if (recurso === 'avisos') {
    if (metodo === 'GET') return enviarJson(res, db.avisos);
    if (metodo === 'POST') {
      if (!corpo.titulo || !corpo.texto) return erro(res, 400, 'Informe titulo e texto');
      const aviso = {
        id: novoId('av'),
        titulo: String(corpo.titulo).trim(),
        texto: String(corpo.texto).trim(),
        nivel: ['info', 'atencao', 'critico'].includes(corpo.nivel) ? corpo.nivel : 'info',
        bairro: corpo.bairro || db.territorio.nome,
        criadoEm: agora,
        validoAte: corpo.validoAte || new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        autor: corpo.autor || 'UBS Sacoma',
      };
      db.avisos.unshift(aviso);
      gravar();
      notificarMudanca('aviso_publicado', { aviso });
      return enviarJson(res, aviso, 201);
    }
    if (metodo === 'DELETE' && id) {
      const i = db.avisos.findIndex((a) => a.id === id);
      if (i < 0) return erro(res, 404, 'Aviso nao encontrado');
      const [removido] = db.avisos.splice(i, 1);
      gravar();
      notificarMudanca('aviso_removido', { aviso: removido });
      return enviarJson(res, { ok: true });
    }
  }

  // --- motor de escalada e utilidades de demonstracao -----------------------
  if (recurso === 'varredura' && metodo === 'POST') {
    const eventos = varrer(db, agora);
    if (eventos.length) {
      gravar();
      notificarMudanca('varredura', { eventos });
    }
    return enviarJson(res, { eventos });
  }

  if (recurso === 'demo') {
    const acao = partes[2];
    if (acao === 'reset' && metodo === 'POST') {
      resetar();
      notificarMudanca('reset');
      return enviarJson(res, { ok: true, mensagem: 'Dados de demonstracao recriados' });
    }
    if (acao === 'alerta' && metodo === 'POST') {
      // Atalho usado na gravacao do video: cria na hora o alerta de ausencia.
      const pessoa = db.pessoas.find((p) => p.id === corpo.pessoaId) || db.pessoas[0];
      const alerta = {
        id: novoId('al'),
        pessoaId: pessoa.id,
        tipo: corpo.tipo || 'sem_checkin',
        nivel: corpo.nivel || 'atencao',
        titulo: `${pessoa.apelido || pessoa.nome} nao fez o check-in de hoje`,
        texto: `Passou das ${pessoa.janelaCheckin.fim} e ninguem confirmou que esta bem.`,
        criadoEm: agora,
        status: 'aberto',
        destino: 'rede',
        assumidoPor: null,
        assumidoEm: null,
        resolvidoEm: null,
        desfecho: null,
        historico: [{ em: agora, quem: 'sistema', acao: 'criado', nota: 'Simulacao de demonstracao' }],
      };
      db.alertas.push(alerta);
      gravar();
      notificarMudanca('alerta_criado', { pessoaId: pessoa.id, alerta });
      return enviarJson(res, alerta, 201);
    }
  }

  return erro(res, 404, `Rota nao encontrada: ${metodo} ${rota}`);
}

// ---------------------------------------------------------------------------
// Arquivos estaticos da plataforma web
// ---------------------------------------------------------------------------

function servirEstatico(req, res, url) {
  let relativo = decodeURIComponent(url.pathname);
  if (relativo === '/' || relativo === '') relativo = '/index.html';

  let destino = path.join(PASTA_WEB, path.normalize(relativo).replace(/^([/\\])+/, ''));
  if (!destino.startsWith(PASTA_WEB)) return erro(res, 403, 'Caminho invalido');

  // URLs limpas: /painel -> painel.html
  if (!path.extname(destino) && fs.existsSync(`${destino}.html`)) destino = `${destino}.html`;

  if (!fs.existsSync(destino) || fs.statSync(destino).isDirectory()) {
    const indice = path.join(destino, 'index.html');
    if (fs.existsSync(indice)) destino = indice;
    else {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(
        '<!doctype html><meta charset="utf-8"><title>Pagina nao encontrada</title>' +
          '<p style="font:16px/1.6 system-ui;padding:2rem">Pagina nao encontrada. ' +
          '<a href="/">Voltar ao inicio</a></p>'
      );
    }
  }

  const tipo = MIME[path.extname(destino).toLowerCase()] || 'application/octet-stream';
  const conteudo = fs.readFileSync(destino);
  res.writeHead(200, {
    'Content-Type': tipo,
    'Content-Length': conteudo.length,
    'Cache-Control': destino.endsWith('.html') ? 'no-cache' : 'public, max-age=300',
  });
  res.end(conteudo);
}

// ---------------------------------------------------------------------------
// Servidor
// ---------------------------------------------------------------------------

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    cors(res);
    res.writeHead(204);
    return res.end();
  }

  try {
    if (url.pathname.startsWith('/api')) return await rotearApi(req, res, url);
    return servirEstatico(req, res, url);
  } catch (e) {
    console.error('[perto] erro:', e);
    if (!res.headersSent) erro(res, 500, e.message || 'Erro interno');
  }
});

// Motor de escalada: roda a cada minuto, como rodaria em producao.
setInterval(() => {
  const db = obter();
  const eventos = varrer(db);
  if (eventos.length) {
    gravar();
    notificarMudanca('varredura', { eventos });
    console.log(`[perto] varredura aplicou ${eventos.length} evento(s)`);
  }
}, 60_000).unref?.();

servidor.listen(PORTA, () => {
  obter();
  console.log('');
  console.log('  Perto - rede de cuidado de bairro');
  console.log('  ---------------------------------');
  console.log(`  Painel web:  http://localhost:${PORTA}/`);
  console.log(`  API:         http://localhost:${PORTA}/api/estado`);
  console.log(`  Saude:       http://localhost:${PORTA}/api/health`);
  console.log(`  Escalada:    alerta sem resposta vira critico em ${MINUTOS_PARA_ESCALAR} min`);
  console.log('');
});
