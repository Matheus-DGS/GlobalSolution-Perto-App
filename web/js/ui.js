/**
 * Perto - utilidades de interface compartilhadas pelas paginas web.
 * Icones, controles de acessibilidade, avisos flutuantes, animacoes e formatacao.
 */

// ---------------------------------------------------------------------------
// Icones: um unico sprite SVG injetado em todas as paginas.
// Todo icone usado em botao sem texto recebe aria-label no HTML que o chama.
// ---------------------------------------------------------------------------
const SPRITE = `
<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true" focusable="false">
  <symbol id="i-perto" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 20s-6.5-4.3-8.4-8A4.8 4.8 0 0 1 12 6.6 4.8 4.8 0 0 1 20.4 12c-1.9 3.7-8.4 8-8.4 8Z"/>
    <path d="M8.5 12h2l1-2 1.6 3.2 1.1-1.2h1.8"/>
  </symbol>
  <symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6.5"/></symbol>
  <symbol id="i-check-circulo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.3 11 15.3 16.2 9"/></symbol>
  <symbol id="i-alerta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.6 2.6 20h18.8L12 3.6Z"/><path d="M12 9.5v4.4"/><circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none"/></symbol>
  <symbol id="i-sos" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5"/><circle cx="12" cy="16.2" r="1" fill="currentColor" stroke="none"/></symbol>
  <symbol id="i-relogio" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3.2 2"/></symbol>
  <symbol id="i-pessoas" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.3"/><path d="M2.8 20c.6-3.4 3.1-5.3 6.2-5.3s5.6 1.9 6.2 5.3"/><path d="M16.4 5.2a3.3 3.3 0 0 1 0 6.3"/><path d="M18.2 14.9c1.6.7 2.7 2.3 3 5.1"/></symbol>
  <symbol id="i-pessoa" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c.7-3.7 3.4-5.8 7-5.8s6.3 2.1 7 5.8"/></symbol>
  <symbol id="i-casa" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.8 12 4l8 6.8V20H4v-9.2Z"/><path d="M9.6 20v-5.4h4.8V20"/></symbol>
  <symbol id="i-telefone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.3 3.5h3l1.4 3.6-2 1.4a11 11 0 0 0 4.8 4.8l1.4-2 3.6 1.4v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.3 5.7a2 2 0 0 1 2-2.2Z"/></symbol>
  <symbol id="i-mapa" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z"/><path d="M9 4v14M15 6v14"/></symbol>
  <symbol id="i-pino" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-5.6-6-10a6 6 0 0 1 12 0c0 4.4-6 10-6 10Z"/><circle cx="12" cy="10.6" r="2.3"/></symbol>
  <symbol id="i-sino" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 16V10.5a5.5 5.5 0 0 1 11 0V16l1.6 2.4H4.9L6.5 16Z"/><path d="M10 20.4a2.2 2.2 0 0 0 4 0"/></symbol>
  <symbol id="i-calendario" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5.5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8.5 3.5v4M15.5 3.5v4"/></symbol>
  <symbol id="i-mais" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5.5v13M5.5 12h13"/></symbol>
  <symbol id="i-menos" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5.5 12h13"/></symbol>
  <symbol id="i-contraste" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none"/></symbol>
  <symbol id="i-movimento" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2.5-6 4 12 2.5-6h5"/></symbol>
  <symbol id="i-busca" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M15.8 15.8 20.5 20.5"/></symbol>
  <symbol id="i-fechar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></symbol>
  <symbol id="i-seta-direita" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M12.5 5.5 19 12l-6.5 6.5"/></symbol>
  <symbol id="i-seta-baixo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v13M5.5 11.5 12 18l6.5-6.5"/></symbol>
  <symbol id="i-sol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></symbol>
  <symbol id="i-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="8" r="1" fill="currentColor" stroke="none"/></symbol>
  <symbol id="i-raio" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 2.5 5 13.5h5l-1.5 8L19 10.5h-5l-.5-8Z"/></symbol>
  <symbol id="i-sem-sinal" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4l18 16"/><path d="M5 12.5a10 10 0 0 1 4-2.4M2.5 9A14 14 0 0 1 8 5.6M12 19.3h.01"/><path d="M15.5 10.4a10 10 0 0 1 3.5 2.1"/></symbol>
  <symbol id="i-baixar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 19.5h15"/></symbol>
  <symbol id="i-lapis" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 3.8 20.2 7.5 8.4 19.3l-4.6.9.9-4.6L16.5 3.8Z"/></symbol>
  <symbol id="i-coracao" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20S4 15 4 9.8A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8 2.8C20 15 12 20 12 20Z"/></symbol>
  <symbol id="i-escudo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 5.6v6c0 4.3 3 7.6 7 9.4 4-1.8 7-5.1 7-9.4v-6L12 3Z"/><path d="M9.2 12.2 11.3 14.3 15 10.3"/></symbol>
  <symbol id="i-remedio" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.3" y="8.4" width="17.4" height="7.2" rx="3.6"/><path d="M12 8.4v7.2"/></symbol>
  <symbol id="i-sacola" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 8h13l-1 12h-11l-1-12Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></symbol>
  <symbol id="i-conversa" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12.4c0 3.8-3.6 6.8-8 6.8a9.6 9.6 0 0 1-2.6-.4L5 20.5l1.2-3.3A6.5 6.5 0 0 1 4 12.4C4 8.6 7.6 5.6 12 5.6s8 3 8 6.8Z"/></symbol>
  <symbol id="i-grafico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V4M4 20h16"/><path d="M8 20v-6M12.5 20V8.5M17 20v-9"/></symbol>
</svg>`;

export function injetarSprite() {
  if (document.getElementById('perto-sprite')) return;
  const div = document.createElement('div');
  div.id = 'perto-sprite';
  div.innerHTML = SPRITE;
  document.body.prepend(div.firstElementChild);
}

/** Icone decorativo (o significado vem sempre do texto ao lado). */
export function icone(nome, classe = '') {
  return `<svg class="icone ${classe}" aria-hidden="true" focusable="false"><use href="#i-${nome}"></use></svg>`;
}

// ---------------------------------------------------------------------------
// Preferencias de acessibilidade: tamanho do texto, contraste e movimento.
// Ficam guardadas no navegador e valem para todas as paginas.
// ---------------------------------------------------------------------------
const ESCALAS = ['normal', 'grande', 'maior'];
const CHAVE = 'perto:preferencias';

function lerPrefs() {
  try {
    return { escala: 'normal', contraste: 'normal', movimento: 'on', ...JSON.parse(localStorage.getItem(CHAVE) || '{}') };
  } catch {
    return { escala: 'normal', contraste: 'normal', movimento: 'on' };
  }
}

function gravarPrefs(p) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(p));
  } catch { /* navegacao privada: segue sem persistir */ }
}

function aplicarPrefs(p) {
  const html = document.documentElement;
  html.dataset.escala = p.escala;
  html.dataset.contraste = p.contraste;
  html.dataset.movimento = p.movimento;
}

export function iniciarAcessibilidade() {
  const prefs = lerPrefs();
  aplicarPrefs(prefs);

  const anunciar = (texto) => avisarLeitor(texto);

  document.querySelectorAll('[data-a11y]').forEach((botao) => {
    const acao = botao.dataset.a11y;

    const sincronizar = () => {
      if (acao === 'contraste') botao.setAttribute('aria-pressed', String(prefs.contraste === 'alto'));
      if (acao === 'movimento') botao.setAttribute('aria-pressed', String(prefs.movimento === 'off'));
      if (acao === 'aumentar') botao.disabled = prefs.escala === 'maior';
      if (acao === 'diminuir') botao.disabled = prefs.escala === 'normal';
    };
    sincronizar();

    botao.addEventListener('click', () => {
      const i = ESCALAS.indexOf(prefs.escala);
      if (acao === 'aumentar') {
        prefs.escala = ESCALAS[Math.min(i + 1, ESCALAS.length - 1)];
        anunciar(`Texto ${prefs.escala === 'normal' ? 'normal' : prefs.escala}`);
      }
      if (acao === 'diminuir') {
        prefs.escala = ESCALAS[Math.max(i - 1, 0)];
        anunciar(`Texto ${prefs.escala === 'normal' ? 'normal' : prefs.escala}`);
      }
      if (acao === 'contraste') {
        prefs.contraste = prefs.contraste === 'alto' ? 'normal' : 'alto';
        anunciar(prefs.contraste === 'alto' ? 'Alto contraste ligado' : 'Alto contraste desligado');
      }
      if (acao === 'movimento') {
        prefs.movimento = prefs.movimento === 'off' ? 'on' : 'off';
        anunciar(prefs.movimento === 'off' ? 'Animacoes desligadas' : 'Animacoes ligadas');
      }
      aplicarPrefs(prefs);
      gravarPrefs(prefs);
      document.querySelectorAll('[data-a11y]').forEach((b) => {
        const a = b.dataset.a11y;
        if (a === 'contraste') b.setAttribute('aria-pressed', String(prefs.contraste === 'alto'));
        if (a === 'movimento') b.setAttribute('aria-pressed', String(prefs.movimento === 'off'));
        if (a === 'aumentar') b.disabled = prefs.escala === 'maior';
        if (a === 'diminuir') b.disabled = prefs.escala === 'normal';
      });
    });
  });
}

export function semMovimento() {
  return (
    document.documentElement.dataset.movimento === 'off' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// ---------------------------------------------------------------------------
// Regiao viva para leitores de tela
// ---------------------------------------------------------------------------
let regiaoViva = null;

export function avisarLeitor(texto, assertivo = false) {
  if (!regiaoViva) {
    regiaoViva = document.createElement('p');
    regiaoViva.className = 'so-leitor';
    regiaoViva.setAttribute('role', 'status');
    regiaoViva.setAttribute('aria-live', 'polite');
    document.body.appendChild(regiaoViva);
  }
  regiaoViva.setAttribute('aria-live', assertivo ? 'assertive' : 'polite');
  regiaoViva.textContent = '';
  setTimeout(() => {
    regiaoViva.textContent = texto;
  }, 60);
}

// ---------------------------------------------------------------------------
// Avisos flutuantes
// ---------------------------------------------------------------------------
export function torrada(mensagem, tipo = 'ok') {
  let caixa = document.querySelector('.torradeira');
  if (!caixa) {
    caixa = document.createElement('div');
    caixa.className = 'torradeira';
    document.body.appendChild(caixa);
  }
  const el = document.createElement('output');
  el.className = `torrada torrada--${tipo}`;
  el.innerHTML = `${icone(tipo === 'erro' ? 'alerta' : 'check-circulo')}<span></span>`;
  el.querySelector('span').textContent = mensagem;
  caixa.appendChild(el);
  avisarLeitor(mensagem, tipo === 'erro');

  setTimeout(() => {
    el.classList.add('torrada--saindo');
    setTimeout(() => el.remove(), 250);
  }, tipo === 'erro' ? 6000 : 3800);
}

// ---------------------------------------------------------------------------
// Animacoes de apoio
// ---------------------------------------------------------------------------

/** Revela blocos conforme entram na tela. Puro apoio a leitura: sem movimento, aparece direto. */
export function iniciarRevelacao(raiz = document) {
  const alvos = raiz.querySelectorAll('[data-revelar]:not(.revelado)');
  if (semMovimento() || !('IntersectionObserver' in window)) {
    alvos.forEach((el) => el.classList.add('revelado'));
    return;
  }
  const obs = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((e, i) => {
        if (!e.isIntersecting) return;
        e.target.style.setProperty('--atraso', `${Math.min(i * 70, 420)}ms`);
        e.target.classList.add('revelado');
        obs.unobserve(e.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  alvos.forEach((el) => obs.observe(el));
}

/** Numero que sobe ate o valor: mostra que o indicador mudou, sem piscar. */
export function contarAte(el, valor, sufixo = '') {
  const destino = Number(valor) || 0;
  if (semMovimento()) {
    el.textContent = destino + sufixo;
    return;
  }
  const inicio = Number(String(el.textContent).replace(/\D/g, '')) || 0;
  if (inicio === destino) {
    el.textContent = destino + sufixo;
    return;
  }
  const dur = 620;
  const t0 = performance.now();
  function passo(t) {
    const p = Math.min((t - t0) / dur, 1);
    const suave = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(inicio + (destino - inicio) * suave) + sufixo;
    if (p < 1) requestAnimationFrame(passo);
  }
  requestAnimationFrame(passo);
}

// ---------------------------------------------------------------------------
// Formatacao em portugues
// ---------------------------------------------------------------------------
const FUSO = 'America/Sao_Paulo';

export function hora(iso) {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' });
}

export function dataCurta(iso) {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit' });
}

export function dataHora(iso) {
  if (!iso) return '--';
  return `${dataCurta(iso)} as ${hora(iso)}`;
}

export function diaSemana(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: FUSO, weekday: 'short' }).replace('.', '');
}

/** "ha 12 minutos", "ha 3 horas", "ontem", "em 2 dias" */
export function tempoRelativo(iso) {
  if (!iso) return '';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  const abs = Math.abs(min);
  const futuro = min < 0;
  const frase = (n, u) => (futuro ? `em ${n} ${u}` : `ha ${n} ${u}`);
  if (abs < 1) return 'agora mesmo';
  if (abs < 60) return frase(abs, abs === 1 ? 'minuto' : 'minutos');
  if (abs < 60 * 24) {
    const h = Math.round(abs / 60);
    return frase(h, h === 1 ? 'hora' : 'horas');
  }
  const d = Math.round(abs / (60 * 24));
  if (d === 1) return futuro ? 'amanha' : 'ontem';
  return frase(d, 'dias');
}

export function duracao(min) {
  if (min == null) return '--';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

export function primeiroNome(nome = '') {
  return String(nome).trim().split(' ')[0];
}

/** Escapa texto que vem de dados antes de entrar no HTML. */
export function esc(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function atrasar(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** Rotulos legiveis para os codigos do dominio. */
export const ROTULOS = {
  risco: { alto: 'Risco alto', medio: 'Risco medio', baixo: 'Risco baixo' },
  nivel: { critico: 'Critico', atencao: 'Atencao', info: 'Informativo' },
  humor: { bem: 'Estou bem', mais_ou_menos: 'Mais ou menos', preciso_de_ajuda: 'Preciso de ajuda' },
  statusAlerta: { aberto: 'Aguardando', em_atendimento: 'Em atendimento', resolvido: 'Resolvido' },
  tipoAlerta: {
    sem_checkin: 'Sem check-in',
    sos: 'SOS',
    pedido_ajuda: 'Pedido de ajuda',
    clima: 'Clima',
  },
  tipoPedido: { remedio: 'Remedio', mercado: 'Mercado', conversa: 'Conversa', transporte: 'Transporte' },
  iconePedido: { remedio: 'remedio', mercado: 'sacola', conversa: 'conversa', transporte: 'mapa' },
  statusDia: {
    ok: { selo: 'ok', icone: 'check-circulo' },
    na_janela: { selo: 'info', icone: 'relogio' },
    aguardando: { selo: 'neutro', icone: 'relogio' },
    sem_checkin: { selo: 'critico', icone: 'alerta' },
  },
  seloNivel: { critico: 'critico', atencao: 'atencao', info: 'info' },
  seloRisco: { alto: 'critico', medio: 'atencao', baixo: 'ok' },
};
