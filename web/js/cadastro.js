/**
 * Cadastro em quatro etapas, feito pela equipe da UBS durante a visita.
 * O que e salvo aqui passa a existir no app da pessoa e da rede de apoio.
 */
import { injetarSprite, iniciarAcessibilidade, torrada, avisarLeitor, icone, esc } from './ui.js';
import { conectar, criarPessoa, api } from './api.js';

injetarSprite();
iniciarAcessibilidade();

const TOTAL = 4;
let atual = 1;
let proximoApoiador = 0;

const form = document.getElementById('form-cadastro');
const etapas = [...document.querySelectorAll('.etapa')];

// ---------------------------------------------------------------------------
// Navegacao entre etapas
// ---------------------------------------------------------------------------
function mostrarEtapa(n, direcao = 'frente', focar = true) {
  atual = Math.min(Math.max(n, 1), TOTAL);

  etapas.forEach((sec) => {
    const ativa = Number(sec.dataset.etapa) === atual;
    sec.hidden = !ativa;
    if (ativa) sec.dataset.direcao = direcao;
  });

  document.getElementById('passos-preenche').style.width = `${(atual / TOTAL) * 100}%`;

  const itens = [...document.querySelectorAll('#passos-lista .passo')];
  itens.forEach((li, i) => {
    const numero = i + 1;
    li.classList.toggle('passo--feito', numero < atual);
    if (numero === atual) li.setAttribute('aria-current', 'step');
    else li.removeAttribute('aria-current');
    const num = li.querySelector('.passo__num');
    num.textContent = numero < atual ? '✓' : String(numero);
  });

  document.getElementById('btn-voltar').hidden = atual === 1;
  document.getElementById('btn-avancar').hidden = atual === TOTAL;
  document.getElementById('btn-salvar').hidden = atual !== TOTAL;

  if (atual === TOTAL) montarRevisao();

  const titulo = etapas.find((s) => Number(s.dataset.etapa) === atual).querySelector('h2');
  if (focar) titulo.focus();
  document.getElementById('anuncio-passo').textContent =
    `Etapa ${atual} de ${TOTAL}: ${titulo.textContent}.`;
}

// ---------------------------------------------------------------------------
// Validacao por etapa
// ---------------------------------------------------------------------------
function marcarErro(id, mensagem) {
  const campo = document.getElementById(id);
  const caixa = document.getElementById(`${id}-erro`);
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

function validarEtapa(n) {
  const erros = [];

  if (n === 1) {
    const nome = document.getElementById('c-nome');
    const idade = document.getElementById('c-idade');
    const endereco = document.getElementById('c-endereco');

    marcarErro('c-nome', '');
    marcarErro('c-idade', '');
    marcarErro('c-endereco', '');

    if (nome.value.trim().length < 3) {
      marcarErro('c-nome', 'Escreva o nome completo da pessoa.');
      erros.push('c-nome');
    }
    const i = Number(idade.value);
    if (!i || i < 18 || i > 120) {
      marcarErro('c-idade', 'Informe uma idade entre 18 e 120 anos.');
      erros.push('c-idade');
    }
    if (endereco.value.trim().length < 5) {
      marcarErro('c-endereco', 'Informe rua e numero, ou uma referencia clara.');
      erros.push('c-endereco');
    }
  }

  if (n === 2) {
    marcarErro('c-fim', '');
    const inicio = document.getElementById('c-inicio').value;
    const fim = document.getElementById('c-fim').value;
    if (!inicio || !fim || fim <= inicio) {
      marcarErro('c-fim', 'O horario final precisa ser depois do inicial.');
      erros.push('c-fim');
    }
  }

  if (erros.length) {
    avisarLeitor(`${erros.length} campo(s) precisam de correcao nesta etapa.`, true);
    document.getElementById(erros[0]).focus();
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Rede de apoio
// ---------------------------------------------------------------------------
function pintarRedeVazia() {
  const caixa = document.getElementById('rede');
  if (caixa.querySelector('.apoiador')) {
    caixa.querySelector('.rede-vazia')?.remove();
    return;
  }
  if (!caixa.querySelector('.rede-vazia')) {
    const p = document.createElement('p');
    p.className = 'rede-vazia';
    p.innerHTML =
      '<strong>Nenhuma pessoa na rede ainda.</strong><br>' +
      'Da para salvar assim, mas os alertas dessa pessoa vao direto para a fila da UBS.';
    caixa.prepend(p);
  }
}

function adicionarApoiador(dados = {}) {
  const n = ++proximoApoiador;
  const caixa = document.getElementById('rede');
  const bloco = document.createElement('fieldset');
  bloco.className = 'apoiador';
  bloco.dataset.apoiador = String(n);
  bloco.innerHTML = `
    <div class="apoiador__topo">
      <h3>Pessoa ${n} da rede</h3>
      <button class="apoiador__remover" type="button" data-remover="${n}"
              aria-label="Remover pessoa ${n} da rede de apoio">Remover</button>
    </div>
    <div class="grade grade--2">
      <p class="campo">
        <label class="campo__rotulo" for="r-nome-${n}">Nome</label>
        <input id="r-nome-${n}" name="redeNome" type="text" value="${esc(dados.nome || '')}" autocomplete="off">
      </p>
      <p class="campo">
        <label class="campo__rotulo" for="r-rel-${n}">Relacao</label>
        <select id="r-rel-${n}" name="redeRelacao">
          <option>Vizinho</option><option>Vizinha</option><option>Filho</option><option>Filha</option>
          <option>Neto ou neta</option><option>Sobrinho ou sobrinha</option>
          <option>Amigo ou amiga</option><option>Voluntario da associacao</option>
        </select>
      </p>
    </div>
    <div class="grade grade--2">
      <p class="campo" style="margin-bottom:0">
        <label class="campo__rotulo" for="r-tel-${n}">Telefone</label>
        <input id="r-tel-${n}" name="redeTelefone" type="tel" placeholder="(11) 90000-0000">
      </p>
      <p class="campo" style="margin-bottom:0">
        <label class="campo__rotulo" for="r-dist-${n}">Mora a</label>
        <span class="campo__dica" id="r-dist-dica-${n}">Ex.: 80 m, mesmo predio, 2 km.</span>
        <input id="r-dist-${n}" name="redeDistancia" type="text" aria-describedby="r-dist-dica-${n}">
      </p>
    </div>`;
  caixa.appendChild(bloco);
  pintarRedeVazia();
  bloco.querySelector('input').focus();
  avisarLeitor(`Pessoa ${n} adicionada a rede de apoio.`);
}

function lerRede() {
  return [...document.querySelectorAll('#rede .apoiador')]
    .map((bloco) => {
      const v = (nome) => bloco.querySelector(`[name="${nome}"]`)?.value.trim() || '';
      return {
        nome: v('redeNome'),
        relacao: v('redeRelacao'),
        telefone: v('redeTelefone'),
        distancia: v('redeDistancia'),
      };
    })
    .filter((r) => r.nome);
}

// ---------------------------------------------------------------------------
// Revisao
// ---------------------------------------------------------------------------
function lerFormulario() {
  const d = Object.fromEntries(new FormData(form).entries());
  const condicoes = [...form.querySelectorAll('input[name="condicoes"]:checked')].map((c) => c.value);
  return {
    nome: (d.nome || '').trim(),
    apelido: (d.apelido || '').trim() || (d.nome || '').trim().split(' ')[0],
    idade: Number(d.idade),
    telefone: (d.telefone || '').trim(),
    endereco: (d.endereco || '').trim(),
    moraSozinha: form.querySelector('[name="moraSozinha"]').checked,
    condicoes,
    mobilidade: d.mobilidade || 'boa',
    observacoes: (d.observacoes || '').trim(),
    janelaCheckin: { inicio: d.janelaInicio, fim: d.janelaFim },
    redeApoio: lerRede(),
  };
}

function montarRevisao() {
  const p = lerFormulario();
  const linha = (rotulo, valor) =>
    `<dt>${esc(rotulo)}</dt><dd>${valor ? esc(valor) : '<span class="apoio">nao informado</span>'}</dd>`;

  document.getElementById('revisao').innerHTML = `
    <div class="revisao-bloco">
      <h3>${icone('pessoa')} Quem e a pessoa
        <button type="button" data-ir="1">Editar</button></h3>
      <dl class="dados">
        ${linha('Nome', p.nome)}
        ${linha('Chamar de', p.apelido)}
        ${linha('Idade', `${p.idade} anos`)}
        ${linha('Telefone', p.telefone)}
        ${linha('Endereco', p.endereco)}
        ${linha('Mora sozinha', p.moraSozinha ? 'Sim' : 'Nao')}
      </dl>
    </div>

    <div class="revisao-bloco">
      <h3>${icone('coracao')} Saude e rotina
        <button type="button" data-ir="2">Editar</button></h3>
      <dl class="dados">
        ${linha('Condicoes', p.condicoes.join(', '))}
        ${linha('Mobilidade', p.mobilidade === 'reduzida' ? 'Mobilidade reduzida' : 'Anda sem ajuda')}
        ${linha('Janela do check-in', `das ${p.janelaCheckin.inicio} as ${p.janelaCheckin.fim}`)}
        ${linha('Observacoes', p.observacoes)}
      </dl>
    </div>

    <div class="revisao-bloco">
      <h3>${icone('pessoas')} Rede de apoio
        <button type="button" data-ir="3">Editar</button></h3>
      ${p.redeApoio.length
        ? `<ul style="margin:0;padding-left:1.2rem">${p.redeApoio
            .map(
              (r) =>
                `<li><strong>${esc(r.nome)}</strong> &middot; ${esc(r.relacao)}${
                  r.telefone ? ` &middot; ${esc(r.telefone)}` : ''
                }${r.distancia ? ` &middot; mora a ${esc(r.distancia)}` : ''}</li>`
            )
            .join('')}</ul>`
        : `<div class="nota nota--atencao">${icone('alerta')}
            <p><strong>Sem rede de apoio</strong>
            Os alertas desta pessoa vao direto para a fila da UBS, sem passar pelo quarteirao.</p></div>`}
    </div>

    <div class="nota nota--info">
      ${icone('info')}
      <p>
        <strong>O que acontece ao salvar</strong>
        A pessoa passa a aparecer no painel e no app. A partir de amanha, se o check-in nao
        for feito ate as ${esc(p.janelaCheckin.fim)}, a rede de apoio e avisada automaticamente.
      </p>
    </div>`;
}

// ---------------------------------------------------------------------------
// Envio
// ---------------------------------------------------------------------------
async function salvar(ev) {
  ev.preventDefault();
  if (!validarEtapa(1) || !validarEtapa(2)) return;

  const botao = document.getElementById('btn-salvar');
  botao.disabled = true;
  botao.innerHTML = `${icone('relogio')} Salvando...`;

  try {
    const pessoa = await criarPessoa(lerFormulario());
    form.hidden = true;
    document.querySelector('.passos').hidden = true;

    const final = document.getElementById('final');
    final.hidden = false;
    final.innerHTML = `
      <div class="cartao cartao--sobreposto sucesso" role="status">
        <span class="sucesso__anel" aria-hidden="true">${icone('check')}</span>
        <h2 style="margin:0">${esc(pessoa.nome)} entrou na rede</h2>
        <p style="margin:0;max-width:48ch">
          Nivel de atencao inicial: <strong>${esc(pessoa.risco?.nivel || 'a avaliar')}</strong>.
          ${(pessoa.redeApoio || []).length
            ? `${pessoa.redeApoio.length} pessoa(s) da rede vao receber o convite no app.`
            : 'Nenhuma rede de apoio cadastrada: os alertas virao direto para a equipe.'}
        </p>
        <div class="linha" style="justify-content:center">
          <a class="botao" href="painel.html">Ver no painel</a>
          <button class="botao botao--secundario" type="button" id="btn-outro">Cadastrar outra pessoa</button>
        </div>
      </div>`;
    document.getElementById('btn-outro').addEventListener('click', () => location.reload());
    torrada('Cadastro salvo e disponivel no app.');
    avisarLeitor(`${pessoa.nome} foi cadastrada com sucesso.`);
    final.querySelector('h2').scrollIntoView({ block: 'center' });
  } catch (erro) {
    console.error(erro);
    botao.disabled = false;
    botao.innerHTML = `${icone('check')} Salvar cadastro`;
    torrada(erro.message || 'Nao foi possivel salvar o cadastro.', 'erro');
  }
}

// ---------------------------------------------------------------------------
// Ligacoes
// ---------------------------------------------------------------------------
document.getElementById('btn-avancar').addEventListener('click', () => {
  if (validarEtapa(atual)) mostrarEtapa(atual + 1);
});
document.getElementById('btn-voltar').addEventListener('click', () => mostrarEtapa(atual - 1, 'tras'));
document.getElementById('btn-add-rede').addEventListener('click', () => adicionarApoiador());
form.addEventListener('submit', salvar);

document.addEventListener('click', (ev) => {
  const remover = ev.target.closest('[data-remover]');
  if (remover) {
    remover.closest('.apoiador').remove();
    pintarRedeVazia();
    avisarLeitor('Pessoa removida da rede de apoio.');
    document.getElementById('btn-add-rede').focus();
  }
  const ir = ev.target.closest('[data-ir]');
  if (ir) mostrarEtapa(Number(ir.dataset.ir), 'tras');
});

// Enter nos campos avanca a etapa em vez de enviar o formulario inteiro
form.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter' && ev.target.tagName === 'INPUT' && atual < TOTAL) {
    ev.preventDefault();
    if (validarEtapa(atual)) mostrarEtapa(atual + 1);
  }
});

(async function iniciar() {
  pintarRedeVazia();
  mostrarEtapa(1, 'frente', false);
  await conectar();
  if (api.modo === 'demo') {
    torrada('Modo demonstracao: o cadastro fica so neste navegador.', 'erro');
  }
})();
