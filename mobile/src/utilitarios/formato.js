/** Formatacao em portugues, igual a da plataforma web (web/js/ui.js). */

const FUSO = 'America/Sao_Paulo';

export function hora(iso) {
  if (!iso) return '--:--';
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { timeZone: FUSO, hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
}

export function dataCurta(iso) {
  if (!iso) return '--';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit' });
  } catch {
    return '--';
  }
}

export function dataHora(iso) {
  return `${dataCurta(iso)} as ${hora(iso)}`;
}

export function diaDaSemana(iso) {
  try {
    return new Date(iso)
      .toLocaleDateString('pt-BR', { timeZone: FUSO, weekday: 'long' })
      .replace('-feira', '');
  } catch {
    return '';
  }
}

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

/** Saudacao conforme a hora, usada no cabecalho da tela "Hoje". */
export function saudacao() {
  const h = Number(new Date().toLocaleTimeString('pt-BR', { timeZone: FUSO, hour: '2-digit', hour12: false }));
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function soDigitos(texto = '') {
  return String(texto).replace(/\D/g, '');
}
