/**
 * Painel do territorio - plataforma web da equipe de saude.
 * Le o mesmo estado que o app mobile e reage em tempo real aos eventos da API.
 */
import {
  injetarSprite, iniciarAcessibilidade, torrada, avisarLeitor, contarAte, icone, esc,
  hora, dataCurta, dataHora, tempoRelativo, duracao, diaSemana, primeiroNome, atrasar, ROTULOS,
} from './ui.js';
import {
  conectar, estado, assinar, aoMudarModo, api, acaoAlerta, acaoPedido, criarVisita,
  publicarAviso, removerAviso, checkin, reiniciarDemonstracao, simularAlerta,
} from './api.js';

injetarSprite();
iniciarAcessibilidade();

/** Quem esta usando o painel. Num sistema real viria da autenticacao da UBS. */
const EU = { id: 'u_cleo', nome: 'Cleo Martins', perfil: 'acs' };

let E = null;                 // ultimo retrato do territorio
const casosVistos = new Set(); // para destacar apenas o que chegou agora
let primeiraCarga = true;

// ===========================================================================
// Conexao
// ===========================================================================
aoMudarModo((modo) => {
  const chip = document.getElementById('estado-conexao');
  chip.dataset.estado = modo;
  document.getElementById('estado-conexao-texto').textContent =
    modo === 'api' ? 'Ao vivo' : 'Modo demonstracao';
  chip.title = modo === 'api' ? `Conectado a ${api.base || 'mesma origem'}` : 'Sem servidor conectado';
  document.getElementById('faixa-demo').hidden = modo !== 'demo';
});

// ===========================================================================
// Abas (padrao ARIA: setas, Home/End, so a aba ativa no tab order)
// ===========================================================================
function ligarAbas() {
  const abas = [...document.querySelectorAll('[role="tab"]')];

  function selecionar(aba, focar = true) {
    abas.forEach((a) => {
      const ativa = a === aba;
      a.setAttribute('aria-selected', String(ativa));
      a.tabIndex = ativa ? 0 : -1;
      document.getElementById(a.getAttribute('aria-controls')).hidden = !ativa;
    });
    if (focar) aba.focus();
    if (aba.id === 'aba-agora') setTimeout(ajustarMapa, 80);
  }

  abas.forEach((aba) => {
    aba.addEventListener('click', () => selecionar(aba, false));
    aba.addEventListener('keydown', (ev) => {
      const i = abas.indexOf(aba);
      const mapa = {
        ArrowRight: abas[(i + 1) % abas.length],
        ArrowLeft: abas[(i - 1 + abas.length) % abas.length],
        Home: abas[0],
        End: abas[abas.length - 1],
      };
      if (mapa[ev.key]) {
        ev.preventDefault();
        selecionar(mapa[ev.key]);
      }
    });
  });
}

// ===========================================================================
// Caixa de dialogo reaproveitavel
// ===========================================================================
function perguntar({ titulo, corpo, confirmar = 'Confirmar', perigo = false }) {
  const janela = document.getElementById('janela');
  const form = document.getElementById('janela-form');
  document.getElementById('janela-titulo').textContent = titulo;
  document.getElementById('janela-corpo').innerHTML = corpo;
  const botao = document.getElementById('janela-confirmar');
  botao.textContent = confirmar;
  botao.classList.toggle('botao--perigo', perigo);

  return new Promise((resolve) => {
    janela.addEventListener(
      'close',
      () => {
        if (janela.returnValue !== 'confirmar') return resolve(null);
        resolve(Object.fromEntries(new FormData(form).entries()));
      },
      { once: true }
    );
    janela.showModal();
    setTimeout(() => janela.querySelector('input,textarea,select')?.focus(), 60);
  });
}

// ===========================================================================
// Indicadores
// ===========================================================================
function pintarKpis() {
  const ind = E.indicadores || {};
  document.querySelectorAll('[data-kpi]').forEach((el) => {
    el.classList.remove('esqueleto');
    contarAte(el, ind[el.dataset.kpi] ?? 0, el.dataset.sufixo || '');
  });
  document.getElementById('kpi-checkin-nota').textContent =
    `${ind.comCheckinHoje ?? 0} de ${ind.pessoasMonitoradas ?? 0} pessoas`;

  const contagem = document.getElementById('contagem-fila');
  const abertos = (E.fila || []).length;
  contagem.hidden = abertos === 0;
  contagem.textContent = String(abertos);
  contagem.setAttribute('aria-label', `${abertos} caso(s) na fila`);

  if (E.territorio) {
    document.getElementById('painel-local').textContent =
      `${E.territorio.nome} · ${E.territorio.cidade}, ${E.territorio.uf}`;
  }
}

// ===========================================================================
// Fila de triagem
// ===========================================================================
function cartaoCaso(c) {
  const p = c.pessoa || {};
  const novo = !casosVistos.has(c.id) && !primeiraCarga;
  const rede = (p.redeApoio || []);

  return `
  <li class="caso caso--${esc(c.nivel)} caso--${esc(c.status)} ${novo ? 'caso--novo' : ''}" data-caso="${esc(c.id)}">
    <p class="caso__topo">
      <span class="selo selo--${esc(ROTULOS.seloNivel[c.nivel] || 'neutro')}">
        ${icone(c.nivel === 'critico' ? 'alerta' : 'relogio')}${esc(ROTULOS.nivel[c.nivel] || '')}
      </span>
      <span class="selo selo--neutro">${esc(ROTULOS.tipoAlerta[c.tipo] || c.tipo)}</span>
      ${c.status === 'em_atendimento'
        ? `<span class="selo selo--info">${icone('pessoa')}${esc(primeiroNome(c.assumidoPor?.nome || ''))} assumiu</span>`
        : ''}
      <span class="caso__espera">${icone('relogio')} espera ${esc(duracao(c.esperandoMin))}</span>
    </p>

    <h3>${esc(c.titulo)}</h3>
    <p class="caso__pessoa">
      ${esc(p.nome || 'Pessoa')}, ${esc(p.idade ?? '--')} anos &middot; ${esc(p.endereco || 'endereco nao informado')}
    </p>
    <p class="caso__texto">${esc(c.texto)}</p>

    ${p.risco?.motivos?.length
      ? `<ul class="motivos">${p.risco.motivos.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>`
      : ''}

    <p class="caso__rede">
      ${rede.length
        ? `<strong>Rede de apoio:</strong> ${rede
            .map((r) => `${esc(r.nome)} (${esc(r.relacao)}${r.distancia ? `, ${esc(r.distancia)}` : ''})`)
            .join(' &middot; ')}`
        : `<strong>Sem rede de apoio cadastrada.</strong> Por isso este caso vem direto para a equipe.`}
    </p>

    <div class="caso__acoes">
      ${c.status === 'aberto'
        ? `<button class="botao botao--pequeno" type="button" data-acao="assumir" data-id="${esc(c.id)}">
             ${icone('escudo')} Assumir caso
           </button>`
        : ''}
      ${p.telefone
        ? `<a class="botao botao--secundario botao--pequeno" href="tel:${esc(String(p.telefone).replace(/\D/g, ''))}">
             ${icone('telefone')} Ligar para ${esc(primeiroNome(p.nome))}
           </a>`
        : ''}
      <button class="botao botao--secundario botao--pequeno" type="button" data-acao="visita" data-id="${esc(c.id)}" data-pessoa="${esc(p.id || '')}">
        ${icone('calendario')} Agendar visita
      </button>
      <button class="botao botao--secundario botao--pequeno" type="button" data-acao="checkin" data-pessoa="${esc(p.id || '')}">
        ${icone('check')} Registrar contato
      </button>
      <button class="botao botao--fantasma botao--pequeno" type="button" data-acao="resolver" data-id="${esc(c.id)}">
        Encerrar caso
      </button>
    </div>

    ${c.historico?.length
      ? `<details>
          <summary>Historico do caso (${c.historico.length})</summary>
          <ul class="historico">
            ${c.historico
              .map((h) => `<li><time datetime="${esc(h.em)}">${esc(hora(h.em))}</time>
                 <span><strong>${esc(h.quem)}</strong> ${esc(h.acao)}${h.nota ? ` &mdash; ${esc(h.nota)}` : ''}</span></li>`)
              .join('')}
          </ul>
        </details>`
      : ''}
  </li>`;
}

function pintarFila() {
  const lista = document.getElementById('fila');
  const fila = E.fila || [];

  if (!fila.length) {
    lista.innerHTML = `
      <li class="vazio">
        ${icone('check-circulo')}
        <p>Nenhum caso aberto agora.</p>
        <p class="apoio" style="font-weight:600">Todo mundo confirmou que esta bem ou ja foi atendido.</p>
      </li>`;
  } else {
    lista.innerHTML = fila.map(cartaoCaso).join('');
  }

  const novos = fila.filter((c) => !casosVistos.has(c.id));
  if (novos.length && !primeiraCarga) {
    const n = novos[0];
    avisarLeitor(
      `Novo caso na fila: ${n.titulo}. Nivel ${ROTULOS.nivel[n.nivel] || n.nivel}.`,
      n.nivel === 'critico'
    );
  }
  fila.forEach((c) => casosVistos.add(c.id));
}

async function tratarAcaoCaso(ev) {
  const botao = ev.target.closest('[data-acao]');
  if (!botao) return;
  const { acao, id, pessoa } = botao.dataset;

  try {
    if (acao === 'assumir') {
      await acaoAlerta(id, { acao: 'assumir', quem: EU, nota: 'Equipe da UBS assumiu pelo painel' });
      torrada('Caso assumido. A rede de apoio ja ve que voce esta cuidando.');
    }

    if (acao === 'resolver') {
      const r = await perguntar({
        titulo: 'Encerrar caso',
        confirmar: 'Encerrar caso',
        corpo: `
          <fieldset style="margin-bottom:1rem">
            <legend>O que foi encontrado</legend>
            <label class="marcar"><input type="radio" name="resultado" value="esta_bem" checked><span>A pessoa esta bem</span></label>
            <label class="marcar" style="margin-top:.4rem"><input type="radio" name="resultado" value="precisou_ajuda"><span>Precisou de ajuda e foi atendida</span></label>
            <label class="marcar" style="margin-top:.4rem"><input type="radio" name="resultado" value="encaminhado"><span>Encaminhada para servico de saude</span></label>
            <label class="marcar" style="margin-top:.4rem"><input type="radio" name="resultado" value="nao_encontrada"><span>Nao foi encontrada</span></label>
          </fieldset>
          <p class="campo" style="margin:0">
            <label class="campo__rotulo" for="nota-caso">Relato (fica no historico)</label>
            <textarea id="nota-caso" name="nota" placeholder="Ex.: celular sem bateria, esta bem"></textarea>
          </p>`,
      });
      if (!r) return;
      await acaoAlerta(id, { acao: 'resolver', quem: EU, resultado: r.resultado, nota: r.nota });
      torrada('Caso encerrado e registrado no historico.');
    }

    if (acao === 'visita') {
      const quando = new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 16);
      const r = await perguntar({
        titulo: 'Agendar visita',
        confirmar: 'Agendar',
        corpo: `
          <p class="campo">
            <label class="campo__rotulo" for="v-quando">Data e hora</label>
            <input id="v-quando" name="quando" type="datetime-local" value="${quando}" required>
          </p>
          <p class="campo" style="margin:0">
            <label class="campo__rotulo" for="v-notas">O que verificar na visita</label>
            <textarea id="v-notas" name="notas" placeholder="Ex.: aferir pressao e revisar a caixa de remedios"></textarea>
          </p>
          <p class="apoio" style="margin:.8rem 0 0">A visita aparece no app da pessoa, no card de hoje.</p>`,
      });
      if (!r) return;
      await criarVisita({
        pessoaId: pessoa,
        quando: new Date(r.quando).toISOString(),
        responsavel: `${EU.nome} (ACS)`,
        tipo: 'acs',
        notas: r.notas,
      });
      torrada('Visita agendada. Ja aparece no app da pessoa.');
    }

    if (acao === 'checkin') {
      await checkin({ pessoaId: pessoa, humor: 'bem', origem: 'acs' });
      torrada('Contato registrado pela equipe. O alerta do dia foi encerrado.');
    }

    if (acao === 'aceitar-pedido') {
      await acaoPedido(id, { acao: 'aceitar', quem: { id: EU.id, nome: EU.nome } });
      torrada('Pedido assumido pela equipe.');
    }
    if (acao === 'concluir-pedido') {
      await acaoPedido(id, { acao: 'concluir', quem: { id: EU.id, nome: EU.nome } });
      torrada('Pedido concluido.');
    }
    if (acao === 'remover-aviso') {
      await removerAviso(id);
      torrada('Aviso removido do territorio.');
    }

    await recarregar();
  } catch (erro) {
    console.error(erro);
    torrada(erro.message || 'Nao foi possivel concluir a acao.', 'erro');
  }
}

// ===========================================================================
// Pedidos de ajuda e visitas
// ===========================================================================
function pintarPedidos() {
  const lista = document.getElementById('pedidos');
  const pedidos = (E.pedidos || []).filter((p) => p.status !== 'concluido');
  if (!pedidos.length) {
    lista.innerHTML = '<li class="apoio">Nenhum pedido aberto.</li>';
    return;
  }
  lista.innerHTML = pedidos
    .map(
      (pd) => `
      <li class="pedido">
        <span class="pedido__icone" aria-hidden="true">${icone(ROTULOS.iconePedido[pd.tipo] || 'conversa')}</span>
        <div>
          <strong>${esc(ROTULOS.tipoPedido[pd.tipo] || pd.tipo)} &middot; ${esc(pd.pessoa?.apelido || pd.pessoa?.nome || '')}</strong>
          <p>${esc(pd.detalhe)}</p>
          <div class="linha">
            <span class="selo selo--${pd.status === 'aceito' ? 'info' : 'atencao'}">
              ${icone(pd.status === 'aceito' ? 'pessoa' : 'relogio')}
              ${pd.status === 'aceito' ? `Com ${esc(primeiroNome(pd.voluntario?.nome || 'voluntario'))}` : 'Aguardando'}
            </span>
            <span class="apoio">${esc(tempoRelativo(pd.criadoEm))}</span>
            ${pd.status === 'aberto'
              ? `<button class="botao botao--secundario botao--pequeno" type="button" data-acao="aceitar-pedido" data-id="${esc(pd.id)}">Assumir</button>`
              : `<button class="botao botao--fantasma botao--pequeno" type="button" data-acao="concluir-pedido" data-id="${esc(pd.id)}">Marcar como feito</button>`}
          </div>
        </div>
      </li>`
    )
    .join('');
}

function pintarVisitas() {
  const lista = document.getElementById('visitas');
  const visitas = (E.visitas || [])
    .filter((v) => v.status === 'agendada')
    .sort((a, b) => (a.quando > b.quando ? 1 : -1));
  if (!visitas.length) {
    lista.innerHTML = '<li class="apoio">Nenhuma visita agendada.</li>';
    return;
  }
  lista.innerHTML = visitas
    .map(
      (v) => `
      <li class="aviso aviso--info">
        <p class="aviso__topo">
          <span class="aviso__titulo">${esc(v.pessoa?.apelido || v.pessoa?.nome || 'Pessoa')}</span>
          <span class="aviso__quando">${esc(dataHora(v.quando))}</span>
        </p>
        <p>${esc(v.notas || 'Visita de acompanhamento')} &middot; ${esc(v.responsavel)}</p>
      </li>`
    )
    .join('');
}

// ===========================================================================
// Mapa
// ===========================================================================
let mapa = null;
let camadaPinos = null;

function iniciarMapa() {
  if (mapa || !window.L || !E?.territorio) return;
  const centro = E.territorio.centro;
  mapa = L.map('mapa', { scrollWheelZoom: false, attributionControl: true }).setView([centro.lat, centro.lng], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; colaboradores do OpenStreetMap',
  }).addTo(mapa);
  camadaPinos = L.layerGroup().addTo(mapa);
}

function pintarMapa() {
  iniciarMapa();
  if (!mapa || !camadaPinos) {
    const caixa = document.getElementById('mapa');
    if (caixa && !caixa.dataset.aviso) {
      caixa.dataset.aviso = '1';
      caixa.innerHTML =
        '<p style="padding:1rem;margin:0;color:var(--tinta-2)">O mapa nao pode ser carregado agora. ' +
        'A mesma informacao esta na aba <strong>Pessoas</strong>.</p>';
    }
    return;
  }
  camadaPinos.clearLayers();

  (E.pessoas || []).forEach((p) => {
    const nivel = p.risco?.nivel || 'baixo';
    const alerta = (p.alertasAbertos || []).length > 0;
    const marcador = L.marker([p.lat, p.lng], {
      title: `${p.nome} - ${ROTULOS.risco[nivel]}`,
      alt: `${p.nome}, ${ROTULOS.risco[nivel]}`,
      keyboard: true,
      icon: L.divIcon({
        className: '',
        html: `<span class="pino-mapa pino-mapa--${nivel} ${alerta ? 'pino-mapa--alerta' : ''}" aria-hidden="true">${esc(
          primeiroNome(p.nome).charAt(0)
        )}</span>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      }),
    });
    marcador.bindPopup(`
      <strong>${esc(p.nome)}</strong><br>
      ${esc(p.idade)} anos &middot; ${esc(ROTULOS.risco[nivel])}<br>
      ${esc(p.status?.rotulo || '')}<br>
      <a href="#" data-abrir-pessoa="${esc(p.id)}">Ver detalhe</a>`);
    camadaPinos.addLayer(marcador);
  });
}

function ajustarMapa() {
  if (mapa) mapa.invalidateSize();
}

// ===========================================================================
// Pessoas
// ===========================================================================
const filtros = { busca: '', risco: '', status: '' };

function pessoasFiltradas() {
  const termo = filtros.busca.trim().toLowerCase();
  return (E.pessoas || []).filter((p) => {
    if (filtros.risco && p.risco?.nivel !== filtros.risco) return false;
    if (filtros.status && p.status?.codigo !== filtros.status) return false;
    if (termo && !`${p.nome} ${p.endereco}`.toLowerCase().includes(termo)) return false;
    return true;
  });
}

function pintarPessoas() {
  const lista = document.getElementById('pessoas');
  const pessoas = pessoasFiltradas();
  const resumo = document.getElementById('resumo-pessoas');
  resumo.textContent = `${pessoas.length} de ${(E.pessoas || []).length} pessoas`;

  if (!pessoas.length) {
    lista.innerHTML = '<li class="apoio">Nenhuma pessoa encontrada com esses filtros.</li>';
    return;
  }

  lista.innerHTML = pessoas
    .map((p) => {
      const sd = ROTULOS.statusDia[p.status?.codigo] || ROTULOS.statusDia.aguardando;
      return `
      <li>
        <button class="ficha" type="button" data-abrir-pessoa="${esc(p.id)}"
                aria-label="Abrir detalhe de ${esc(p.nome)}, ${esc(ROTULOS.risco[p.risco?.nivel] || '')}, ${esc(p.status?.rotulo || '')}">
          <span class="ficha__topo">
            <span class="ficha__inicial" aria-hidden="true">${esc(primeiroNome(p.nome).charAt(0))}</span>
            <span>
              <h3>${esc(p.apelido || p.nome)}</h3>
              <p class="ficha__sub">${esc(p.idade)} anos</p>
            </span>
          </span>
          <span class="ficha__selos">
            <span class="selo selo--${esc(ROTULOS.seloRisco[p.risco?.nivel] || 'neutro')}">
              ${icone(p.risco?.nivel === 'alto' ? 'alerta' : 'escudo')}${esc(ROTULOS.risco[p.risco?.nivel] || '')}
            </span>
            <span class="selo selo--${esc(sd.selo)}">${icone(sd.icone)}${esc(p.status?.rotulo || '')}</span>
          </span>
          <span class="ficha__linha">${icone('casa')} ${esc(p.endereco)}</span>
          <span class="ficha__linha">${icone('pessoas')} ${
            (p.redeApoio || []).length
              ? `${p.redeApoio.length} na rede de apoio`
              : 'Sem rede de apoio'
          }</span>
          <span class="ficha__linha">${icone('relogio')} Janela ${esc(p.janelaCheckin?.inicio || '--')} as ${esc(
        p.janelaCheckin?.fim || '--'
      )}</span>
        </button>
      </li>`;
    })
    .join('');
}

/** Mini historico de 7 dias de uma pessoa, em barras com rotulo de texto. */
function semanaDe(pessoaId) {
  const checkins = (E.checkins || []).filter((c) => c.pessoaId === pessoaId);
  const dias = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const chave = d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const achado = checkins.find(
      (c) => new Date(c.em).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) === chave
    );
    dias.push({ data: d, chave, checkin: achado || null });
  }
  return dias;
}

function abrirPessoa(id) {
  const p = (E.pessoas || []).find((x) => x.id === id);
  if (!p) return;
  const gaveta = document.getElementById('gaveta');
  document.getElementById('gaveta-titulo').textContent = p.nome;
  document.getElementById('gaveta-sub').textContent = `${p.idade} anos · ${p.endereco}`;

  const dias = semanaDe(p.id);
  const sd = ROTULOS.statusDia[p.status?.codigo] || ROTULOS.statusDia.aguardando;

  document.getElementById('gaveta-corpo').innerHTML = `
    <div class="linha">
      <span class="selo selo--${esc(ROTULOS.seloRisco[p.risco?.nivel] || 'neutro')}">
        ${icone(p.risco?.nivel === 'alto' ? 'alerta' : 'escudo')}${esc(ROTULOS.risco[p.risco?.nivel] || '')}
      </span>
      <span class="selo selo--${esc(sd.selo)}">${icone(sd.icone)}${esc(p.status?.rotulo || '')}</span>
    </div>

    <div class="cartao">
      <p class="cartao__rotulo">Por que este nivel de atencao</p>
      <ul class="motivos" style="margin:0">
        ${(p.risco?.motivos || ['Sem fatores de risco registrados']).map((m) => `<li>${esc(m)}</li>`).join('')}
      </ul>
      <p class="apoio" style="margin:.7rem 0 0">
        O nivel e calculado pelo sistema e serve para ordenar a fila, nunca para substituir
        a avaliacao da equipe.
      </p>
    </div>

    <div class="cartao">
      <p class="cartao__rotulo">Ultimos 7 dias</p>
      <div class="semana" role="img" aria-label="${esc(
        dias.map((d) => `${diaSemana(d.data.toISOString())}: ${d.checkin ? ROTULOS.humor[d.checkin.humor] : 'sem check-in'}`).join('. ')
      )}">
        ${dias
          .map((d) => {
            const tem = Boolean(d.checkin);
            const ajuda = d.checkin?.humor !== 'bem';
            const altura = tem ? (ajuda ? 40 : 58) : 14;
            return `<span class="semana__dia">
              <span class="semana__barra ${tem ? (ajuda ? 'semana__barra--ajuda' : '') : 'semana__barra--vazio'}"
                    style="height:${altura}px"></span>
              <span class="semana__rotulo">${esc(diaSemana(d.data.toISOString()))}</span>
            </span>`;
          })
          .join('')}
      </div>
      <p class="apoio" style="margin:.6rem 0 0">
        Barra cheia: confirmou que estava bem. Barra media: respondeu "mais ou menos".
        Barra tracejada: nao houve check-in.
      </p>
    </div>

    <div class="cartao">
      <p class="cartao__rotulo">Dados do cadastro</p>
      <dl class="dados">
        <dt>Telefone</dt><dd>${p.telefone ? `<a href="tel:${esc(String(p.telefone).replace(/\D/g, ''))}">${esc(p.telefone)}</a>` : 'nao informado'}</dd>
        <dt>Janela</dt><dd>${esc(p.janelaCheckin?.inicio || '--')} as ${esc(p.janelaCheckin?.fim || '--')}</dd>
        <dt>Condicoes</dt><dd>${esc((p.condicoes || []).join(', ') || 'nenhuma registrada')}</dd>
        <dt>Mobilidade</dt><dd>${p.mobilidade === 'reduzida' ? 'Reduzida' : 'Boa'}</dd>
        <dt>Ultimo contato</dt><dd>${p.ultimoCheckin ? `${esc(dataHora(p.ultimoCheckin.em))} (${esc(tempoRelativo(p.ultimoCheckin.em))})` : 'sem registro'}</dd>
        <dt>Observacoes</dt><dd>${esc(p.observacoes || 'nenhuma')}</dd>
      </dl>
    </div>

    <div class="cartao">
      <p class="cartao__rotulo">Rede de apoio</p>
      ${(p.redeApoio || []).length
        ? `<ul class="avisos">${p.redeApoio
            .map(
              (r) => `<li class="aviso">
                <p class="aviso__topo"><span class="aviso__titulo">${esc(r.nome)}</span>
                <span class="aviso__quando">${esc(r.relacao)}${r.distancia ? ` &middot; ${esc(r.distancia)}` : ''}</span></p>
                ${r.telefone ? `<p><a href="tel:${esc(String(r.telefone).replace(/\D/g, ''))}">${esc(r.telefone)}</a></p>` : ''}
              </li>`
            )
            .join('')}</ul>`
        : `<div class="nota nota--critico">${icone('alerta')}
             <p><strong>Ninguem cadastrado</strong>
             Sem rede de apoio, todo alerta desta pessoa vai direto para a equipe da UBS.</p></div>`}
    </div>

    <div class="linha">
      <button class="botao botao--pequeno" type="button" data-acao="checkin" data-pessoa="${esc(p.id)}">
        ${icone('check')} Registrar contato de hoje
      </button>
      <button class="botao botao--secundario botao--pequeno" type="button" data-acao="visita" data-pessoa="${esc(p.id)}">
        ${icone('calendario')} Agendar visita
      </button>
    </div>`;

  if (!gaveta.open) gaveta.showModal();
}

// ===========================================================================
// Avisos
// ===========================================================================
function pintarAvisos() {
  const lista = document.getElementById('lista-avisos');
  const avisos = E.avisos || [];
  if (!avisos.length) {
    lista.innerHTML = '<li class="apoio">Nenhum aviso publicado.</li>';
    return;
  }
  lista.innerHTML = avisos
    .map(
      (a) => `
      <li class="aviso aviso--${esc(a.nivel)}">
        <p class="aviso__topo">
          <span class="selo selo--${esc(ROTULOS.seloNivel[a.nivel] || 'neutro')}">
            ${icone(a.nivel === 'info' ? 'info' : 'alerta')}${esc(ROTULOS.nivel[a.nivel] || '')}
          </span>
          <span class="aviso__titulo">${esc(a.titulo)}</span>
          <span class="aviso__quando">${esc(tempoRelativo(a.criadoEm))}</span>
        </p>
        <p>${esc(a.texto)}</p>
        <p style="margin-top:.5rem">
          <button class="botao botao--fantasma botao--pequeno" type="button" data-acao="remover-aviso" data-id="${esc(a.id)}">
            Remover aviso
          </button>
        </p>
      </li>`
    )
    .join('');
}

function ligarFormAviso() {
  const form = document.getElementById('form-aviso');
  const titulo = document.getElementById('av-titulo');
  const texto = document.getElementById('av-texto');

  // Previa viva: a equipe ve o aviso como a pessoa vera no celular.
  const atualizarPrevia = () => {
    const nivel = form.querySelector('input[name="nivel"]:checked')?.value || 'info';
    const caixa = document.getElementById('previa-aviso');
    caixa.className = `aviso aviso--${nivel}`;
    document.getElementById('previa-titulo').textContent = titulo.value || 'Titulo do aviso';
    document.getElementById('previa-texto').textContent =
      texto.value || 'A mensagem aparece aqui, do jeito que a pessoa vai ler no app.';
  };
  form.addEventListener('input', atualizarPrevia);
  form.addEventListener('change', atualizarPrevia);

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    let falhou = false;
    [['av-titulo', titulo, 'Escreva um titulo curto.'], ['av-texto', texto, 'Escreva a mensagem do aviso.']].forEach(
      ([id, campo, msg]) => {
        const caixa = document.getElementById(`${id}-erro`);
        if (!campo.value.trim()) {
          campo.setAttribute('aria-invalid', 'true');
          caixa.hidden = false;
          caixa.innerHTML = `${icone('alerta')}<span>${msg}</span>`;
          if (!falhou) campo.focus();
          falhou = true;
        } else {
          campo.removeAttribute('aria-invalid');
          caixa.hidden = true;
        }
      }
    );
    if (falhou) return;

    try {
      await publicarAviso({
        titulo: titulo.value.trim(),
        texto: texto.value.trim(),
        nivel: form.querySelector('input[name="nivel"]:checked').value,
        autor: `${EU.nome} (UBS Sacoma)`,
      });
      form.reset();
      atualizarPrevia();
      torrada('Aviso publicado. Ja aparece no app de todo mundo do territorio.');
      await recarregar();
    } catch (erro) {
      torrada(erro.message || 'Nao foi possivel publicar.', 'erro');
    }
  });
}

// ===========================================================================
// Relatorio
// ===========================================================================
function pintarRelatorio() {
  const ind = E.indicadores || {};

  // Grafico de 7 dias
  const dias = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const chave = d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const total = (E.checkins || []).filter(
      (c) => new Date(c.em).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) === chave
    ).length;
    dias.push({ d, total, hoje: i === 0 });
  }
  const maximo = Math.max(1, ...dias.map((x) => x.total));
  const svg = document.getElementById('grafico-semana');
  const largura = 440;
  const altura = 210;
  const base = 170;
  const passo = largura / dias.length;

  svg.innerHTML =
    '<title id="t-grafico">Grafico de barras com os check-ins dos ultimos sete dias</title>' +
    `<line class="eixo" x1="8" y1="${base}" x2="${largura - 8}" y2="${base}"></line>` +
    dias
      .map((x, i) => {
        const h = Math.round((x.total / maximo) * 130);
        const cx = i * passo + passo / 2;
        const w = Math.min(38, passo - 14);
        return `
        <rect class="barra-dia ${x.hoje ? 'barra-dia--hoje' : ''}" x="${cx - w / 2}" y="${base - h}"
              width="${w}" height="${h}" rx="5"></rect>
        <text x="${cx}" y="${base - h - 7}" text-anchor="middle">${x.total}</text>
        <text x="${cx}" y="${base + 18}" text-anchor="middle">${diaSemana(x.d.toISOString())}</text>
        <text x="${cx}" y="${base + 33}" text-anchor="middle" opacity=".65">${dataCurta(x.d.toISOString())}</text>`;
      })
      .join('');

  document.getElementById('grafico-texto').textContent =
    'Check-ins por dia: ' + dias.map((x) => `${diaSemana(x.d.toISOString())} ${x.total}`).join(', ') + '.';

  // Dados de resposta
  document.getElementById('dados-relatorio').innerHTML = `
    <dt>Cobertura de hoje</dt><dd>${ind.coberturaHoje ?? 0}% (${ind.comCheckinHoje ?? 0} de ${ind.pessoasMonitoradas ?? 0})</dd>
    <dt>Alertas abertos</dt><dd>${ind.alertasAbertos ?? 0}, sendo ${ind.alertasCriticos ?? 0} criticos</dd>
    <dt>Alertas resolvidos</dt><dd>${ind.alertasResolvidos ?? 0}</dd>
    <dt>Tempo medio de resposta</dt><dd>${ind.tempoMedioRespostaMin != null ? duracao(ind.tempoMedioRespostaMin) : 'sem dados'}</dd>
    <dt>Resolvidos pela rede</dt><dd>${ind.percentualResolvidoPelaRede ?? 0}% dos casos</dd>
    <dt>Pessoas na rede de apoio</dt><dd>${ind.voluntarios ?? 0}</dd>
    <dt>Visitas agendadas</dt><dd>${ind.visitasAgendadas ?? 0}</dd>
    <dt>Atualizado em</dt><dd>${esc(dataHora(ind.atualizadoEm))}</dd>`;

  // Tabela
  const corpo = document.querySelector('#tabela-pessoas tbody');
  corpo.innerHTML = (E.pessoas || [])
    .map(
      (p) => `
      <tr>
        <th scope="row">${esc(p.nome)}</th>
        <td data-numero>${esc(p.idade)}</td>
        <td>${esc(ROTULOS.risco[p.risco?.nivel] || '')}</td>
        <td>${esc(p.status?.rotulo || '')}</td>
        <td data-numero>${(p.redeApoio || []).length}</td>
        <td>${p.ultimoCheckin ? esc(tempoRelativo(p.ultimoCheckin.em)) : 'sem registro'}</td>
      </tr>`
    )
    .join('');
}

function baixarCsv() {
  const linhas = [
    ['Nome', 'Idade', 'Endereco', 'Nivel de atencao', 'Check-in de hoje', 'Rede de apoio', 'Ultimo contato'],
    ...(E.pessoas || []).map((p) => [
      p.nome,
      p.idade,
      p.endereco,
      ROTULOS.risco[p.risco?.nivel] || '',
      p.status?.rotulo || '',
      (p.redeApoio || []).length,
      p.ultimoCheckin ? dataHora(p.ultimoCheckin.em) : 'sem registro',
    ]),
  ];
  const csv = linhas.map((l) => l.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `perto-territorio-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  torrada('Relatorio exportado em CSV.');
}

// ===========================================================================
// Ciclo de atualizacao
// ===========================================================================
async function recarregar() {
  E = await estado();
  pintarKpis();
  pintarFila();
  pintarPedidos();
  pintarVisitas();
  pintarMapa();
  pintarPessoas();
  pintarAvisos();
  pintarRelatorio();
  primeiraCarga = false;
}

// ===========================================================================
// Ligacoes de eventos
// ===========================================================================
function ligarTudo() {
  ligarAbas();
  ligarFormAviso();

  document.addEventListener('click', (ev) => {
    const abrir = ev.target.closest('[data-abrir-pessoa]');
    if (abrir) {
      ev.preventDefault();
      abrirPessoa(abrir.dataset.abrirPessoa);
      return;
    }
    tratarAcaoCaso(ev);
  });

  document.getElementById('gaveta-fechar').addEventListener('click', () => {
    document.getElementById('gaveta').close();
  });

  const buscar = atrasar((valor) => {
    filtros.busca = valor;
    pintarPessoas();
  }, 220);
  document.getElementById('busca').addEventListener('input', (ev) => buscar(ev.target.value));
  document.getElementById('filtro-risco').addEventListener('change', (ev) => {
    filtros.risco = ev.target.value;
    pintarPessoas();
  });
  document.getElementById('filtro-status').addEventListener('change', (ev) => {
    filtros.status = ev.target.value;
    pintarPessoas();
  });

  document.getElementById('btn-csv').addEventListener('click', baixarCsv);
  document.getElementById('btn-imprimir').addEventListener('click', () => window.print());

  document.getElementById('btn-simular').addEventListener('click', async () => {
    const semAlerta = (E.pessoas || []).find(
      (p) => !(E.fila || []).some((c) => c.pessoaId === p.id)
    );
    if (!semAlerta) return torrada('Todas as pessoas ja tem um caso aberto.', 'erro');
    await simularAlerta(semAlerta.id);
    torrada(`Alerta simulado para ${primeiroNome(semAlerta.nome)}.`);
    await recarregar();
  });

  document.getElementById('btn-reset').addEventListener('click', async () => {
    const r = await perguntar({
      titulo: 'Recomecar dados de exemplo',
      confirmar: 'Recomecar',
      perigo: true,
      corpo: '<p style="margin:0">Todos os check-ins, alertas e cadastros criados na demonstracao serao substituidos pelos dados iniciais.</p>',
    });
    if (!r) return;
    await reiniciarDemonstracao();
    casosVistos.clear();
    primeiraCarga = true;
    await recarregar();
    torrada('Dados de exemplo recriados.');
  });

  window.addEventListener('resize', atrasar(ajustarMapa, 200));
}

// ===========================================================================
// Inicio
// ===========================================================================
(async function iniciar() {
  ligarTudo();
  await conectar();
  try {
    await recarregar();
  } catch (erro) {
    console.error(erro);
    torrada('Nao foi possivel carregar o territorio.', 'erro');
  }
  // Tempo real: o painel muda sozinho quando alguem usa o app.
  assinar(() => recarregar());
})();
