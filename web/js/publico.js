/**
 * Pagina publica: transparencia do territorio em tempo real + indicacao de cidadao.
 */
import {
  injetarSprite, iniciarAcessibilidade, iniciarRevelacao, torrada, avisarLeitor,
  contarAte, icone, esc, tempoRelativo, duracao, ROTULOS,
} from './ui.js';
import { conectar, estado, assinar, criarPessoa, api, aoMudarModo } from './api.js';

injetarSprite();
iniciarAcessibilidade();
iniciarRevelacao();

// ---------------------------------------------------------------------------
// Estado da conexao: o usuario sempre sabe se os dados sao ao vivo
// ---------------------------------------------------------------------------
const chip = document.getElementById('estado-conexao');
const chipTexto = document.getElementById('estado-conexao-texto');

aoMudarModo((modo) => {
  if (!chip) return;
  chip.dataset.estado = modo;
  chipTexto.textContent =
    modo === 'api' ? 'Dados ao vivo do territorio' : 'Modo demonstracao (sem servidor)';
  chip.title =
    modo === 'api'
      ? `Conectado a ${api.base || 'mesma origem'}`
      : 'Nenhuma API respondeu. Mostrando o retrato de exemplo guardado no navegador.';
});

// ---------------------------------------------------------------------------
// Numeros abertos
// ---------------------------------------------------------------------------
function pintarIndicadores(e) {
  const ind = e.indicadores || {};

  document.querySelectorAll('[data-numero]').forEach((el) => {
    el.classList.remove('esqueleto');
    contarAte(el, ind[el.dataset.numero] ?? 0, el.dataset.sufixo || '');
  });

  const textos = {
    checkinsHoje: `${ind.comCheckinHoje ?? 0} de ${ind.pessoasMonitoradas ?? 0} pessoas`,
    tempoMedio: ind.tempoMedioRespostaMin != null ? duracao(ind.tempoMedioRespostaMin) : 'sem dados',
  };
  document.querySelectorAll('[data-texto]').forEach((el) => {
    if (textos[el.dataset.texto] === undefined) return;
    el.classList.remove('esqueleto');
    el.textContent = textos[el.dataset.texto];
  });
}

function pintarAvisos(e) {
  const lista = document.getElementById('avisos-publicos');
  if (!lista) return;
  const avisos = (e.avisos || []).slice(0, 3);
  if (!avisos.length) {
    lista.innerHTML = '<li class="apoio">Nenhum aviso publicado agora.</li>';
    return;
  }
  lista.innerHTML = avisos
    .map(
      (a) => `
      <li class="aviso aviso--${esc(a.nivel)}">
        <p class="aviso__topo">
          <span class="selo selo--${esc(ROTULOS.seloNivel[a.nivel] || 'neutro')}">
            ${icone(a.nivel === 'info' ? 'info' : 'alerta')}${esc(ROTULOS.nivel[a.nivel] || 'Aviso')}
          </span>
          <span class="aviso__titulo">${esc(a.titulo)}</span>
          <span class="aviso__quando">${esc(tempoRelativo(a.criadoEm))}</span>
        </p>
        <p>${esc(a.texto)}</p>
      </li>`
    )
    .join('');
}

function pintarBarras(e) {
  const lista = document.getElementById('barras-risco');
  if (!lista) return;
  const por = e.indicadores?.porRisco || { alto: 0, medio: 0, baixo: 0 };
  const total = Math.max(1, por.alto + por.medio + por.baixo);
  const linhas = [
    ['alto', 'Atencao alta', por.alto, 'Visita prioritaria ou alerta aberto'],
    ['medio', 'Atencao media', por.medio, 'Acompanhamento semanal'],
    ['baixo', 'Atencao baixa', por.baixo, 'Rotina em dia'],
  ];
  lista.innerHTML = linhas
    .map(
      ([chave, rotulo, valor, nota]) => `
      <li class="barra barra--${chave}">
        <p class="barra__topo"><span>${rotulo}</span><span>${valor} pessoa${valor === 1 ? '' : 's'}</span></p>
        <div class="barra__pista" role="img" aria-label="${rotulo}: ${valor} de ${total} pessoas">
          <div class="barra__preenche" data-largura="${Math.round((valor / total) * 100)}"></div>
        </div>
        <p class="numero__nota">${nota}</p>
      </li>`
    )
    .join('');

  // A barra cresce depois de entrar no DOM: mostra proporcao, nao decora.
  requestAnimationFrame(() => {
    lista.querySelectorAll('.barra__preenche').forEach((el) => {
      el.style.width = `${el.dataset.largura}%`;
    });
  });
}

async function atualizar() {
  try {
    const e = await estado();
    pintarIndicadores(e);
    pintarAvisos(e);
    pintarBarras(e);
    iniciarRevelacao();
  } catch (erro) {
    console.error(erro);
    torrada('Nao foi possivel carregar os dados do territorio.', 'erro');
  }
}

// ---------------------------------------------------------------------------
// Formulario de indicacao
// ---------------------------------------------------------------------------
function erroCampo(id, mensagem) {
  const campo = document.getElementById(id);
  const caixa = document.getElementById(`${id}-erro`);
  if (!campo) return;
  if (mensagem) {
    campo.setAttribute('aria-invalid', 'true');
    if (caixa) {
      caixa.hidden = false;
      caixa.innerHTML = `${icone('alerta')}<span>${esc(mensagem)}</span>`;
    }
  } else {
    campo.removeAttribute('aria-invalid');
    if (caixa) {
      caixa.hidden = true;
      caixa.textContent = '';
    }
  }
}

function ligarFormulario() {
  const form = document.getElementById('form-indicacao');
  if (!form) return;

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const d = Object.fromEntries(new FormData(form).entries());

    const problemas = [];
    erroCampo('i-nome', '');
    erroCampo('i-idade', '');
    erroCampo('i-seu-nome', '');
    erroCampo('i-consentimento', '');

    if (!d.nome || d.nome.trim().length < 3) {
      erroCampo('i-nome', 'Escreva o nome da pessoa.');
      problemas.push('i-nome');
    }
    const idade = Number(d.idade);
    if (!idade || idade < 50 || idade > 120) {
      erroCampo('i-idade', 'Informe uma idade entre 50 e 120 anos.');
      problemas.push('i-idade');
    }
    if (!d.seuNome || d.seuNome.trim().length < 3) {
      erroCampo('i-seu-nome', 'Escreva o seu nome para a equipe poder confirmar.');
      problemas.push('i-seu-nome');
    }
    if (!d.consentimento) {
      const caixa = document.getElementById('i-consentimento-erro');
      caixa.hidden = false;
      caixa.innerHTML = `${icone('alerta')}<span>Confirme que a pessoa sabe da indicacao.</span>`;
      problemas.push('i-consentimento');
    }

    if (problemas.length) {
      avisarLeitor(`${problemas.length} campo(s) precisam de atencao.`, true);
      document.getElementById(problemas[0]).focus();
      return;
    }

    const botao = document.getElementById('btn-indicacao');
    botao.disabled = true;
    botao.innerHTML = `${icone('relogio')}Enviando...`;

    try {
      const pessoa = await criarPessoa({
        nome: d.nome.trim(),
        idade,
        endereco: d.endereco?.trim() || 'Endereco a confirmar na visita',
        observacoes: `Indicacao do bairro recebida pela plataforma web. Indicado por ${d.seuNome.trim()} (${d.relacao})${
          d.seuTelefone ? `, telefone ${d.seuTelefone}` : ''
        }. Aguardando visita de confirmacao da equipe.`,
        mobilidade: 'boa',
        moraSozinha: true,
        condicoes: [],
        redeApoio: d.seuTelefone
          ? [{ nome: d.seuNome.trim(), relacao: d.relacao, telefone: d.seuTelefone, distancia: 'a confirmar' }]
          : [],
      });

      form.innerHTML = `
        <div class="sucesso" role="status">
          <span class="sucesso__anel" aria-hidden="true">${icone('check')}</span>
          <h3 style="margin:0">Indicacao enviada</h3>
          <p style="margin:0;max-width:46ch">
            ${esc(pessoa.nome)} entrou no painel da UBS Sacoma com nivel de atencao
            <strong>${esc(ROTULOS.risco[pessoa.risco?.nivel] || 'a avaliar')}</strong>.
            A equipe vai confirmar numa visita antes de ativar os alertas.
          </p>
          <a class="botao botao--secundario" href="painel.html">Ver no painel do territorio</a>
        </div>`;
      torrada('Indicacao enviada para a equipe da UBS.');
      atualizar();
    } catch (erro) {
      console.error(erro);
      botao.disabled = false;
      botao.innerHTML = `${icone('seta-direita')}Enviar indicacao para a UBS`;
      torrada('Nao foi possivel enviar agora. Tente novamente.', 'erro');
    }
  });
}

// ---------------------------------------------------------------------------
// Inicio
// ---------------------------------------------------------------------------
(async function iniciar() {
  ligarFormulario();
  await conectar();
  await atualizar();
  assinar(() => atualizar());
})();
