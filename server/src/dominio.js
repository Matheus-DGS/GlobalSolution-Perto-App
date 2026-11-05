/**
 * Perto - Regras de dominio
 * ---------------------------------------------------------------------------
 * Toda a inteligencia da rede de cuidado vive aqui, longe do transporte HTTP:
 *  - como o risco de cada pessoa e calculado (e explicado em texto);
 *  - como a ausencia de check-in vira alerta para a rede de apoio;
 *  - como um alerta sem resposta escala para a UBS.
 *
 * O painel web e o app mobile consomem o resultado dessas regras pela API,
 * entao as duas plataformas sempre mostram a mesma verdade.
 */

export const FUSO = 'America/Sao_Paulo';

/** Minutos que a rede de apoio tem para assumir um alerta antes de escalar para a UBS. */
export const MINUTOS_PARA_ESCALAR = 45;

const fmtData = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const fmtHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Data local (America/Sao_Paulo) no formato YYYY-MM-DD. */
export function dataLocal(iso = new Date().toISOString()) {
  return fmtData.format(new Date(iso));
}

/** Minutos desde a meia-noite local. */
export function minutosDoDia(iso = new Date().toISOString()) {
  const [h, m] = fmtHora.format(new Date(iso)).split(':').map(Number);
  return h * 60 + m;
}

/** "08:30" -> 510 */
export function horaParaMinutos(hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutosEntre(isoA, isoB) {
  return Math.round((new Date(isoB) - new Date(isoA)) / 60000);
}

export function diasEntre(isoA, isoB) {
  const a = new Date(dataLocal(isoA) + 'T00:00:00');
  const b = new Date(dataLocal(isoB) + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

export function novoId(prefixo) {
  return `${prefixo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------------
// Risco
// ---------------------------------------------------------------------------

/**
 * Calcula o risco de uma pessoa monitorada.
 * Devolve nivel, pontos e os MOTIVOS em linguagem simples: o painel e o app
 * nunca mostram apenas uma cor, sempre mostram o porque.
 */
export function calcularRisco(pessoa, checkins, alertas, agoraIso = new Date().toISOString()) {
  const motivos = [];
  let pontos = 0;

  if (pessoa.idade >= 80) {
    pontos += 2;
    motivos.push(`${pessoa.idade} anos`);
  } else if (pessoa.idade >= 70) {
    pontos += 1;
    motivos.push(`${pessoa.idade} anos`);
  }

  if (pessoa.moraSozinha) {
    pontos += 1;
    motivos.push('Mora sozinha');
  }

  const condicoes = pessoa.condicoes || [];
  if (condicoes.length >= 2) {
    pontos += 1;
    motivos.push(`${condicoes.length} condicoes de saude`);
  }

  if (pessoa.mobilidade === 'reduzida') {
    pontos += 1;
    motivos.push('Mobilidade reduzida');
  }

  const meus = checkins
    .filter((c) => c.pessoaId === pessoa.id)
    .sort((a, b) => (a.em < b.em ? 1 : -1));
  const ultimo = meus[0];

  if (!ultimo) {
    pontos += 3;
    motivos.push('Nunca fez check-in');
  } else {
    const dias = diasEntre(ultimo.em, agoraIso);
    if (dias >= 2) {
      pontos += 3;
      motivos.push(`${dias} dias sem check-in`);
    } else if (dias === 1) {
      pontos += 1;
      motivos.push('Sem check-in desde ontem');
    }
    if (ultimo.humor === 'preciso_de_ajuda') {
      pontos += 2;
      motivos.push('Ultimo check-in pediu ajuda');
    }
  }

  const criticosRecentes = alertas.filter(
    (a) => a.pessoaId === pessoa.id && a.nivel === 'critico' && diasEntre(a.criadoEm, agoraIso) <= 30
  ).length;
  if (criticosRecentes > 0) {
    pontos += 2;
    motivos.push(`${criticosRecentes} alerta(s) critico(s) no ultimo mes`);
  }

  const rede = pessoa.redeApoio || [];
  if (rede.length === 0) {
    pontos += 2;
    motivos.push('Sem rede de apoio cadastrada');
  } else if (rede.length === 1) {
    pontos += 1;
    motivos.push('Apenas 1 pessoa na rede de apoio');
  }

  const nivel = pontos >= 6 ? 'alto' : pontos >= 3 ? 'medio' : 'baixo';
  return { nivel, pontos, motivos };
}

/** Status operacional do dia: ja fez check-in? esta na janela? atrasou? */
export function statusDoDia(pessoa, checkins, agoraIso = new Date().toISOString()) {
  const hoje = dataLocal(agoraIso);
  const checkinHoje = checkins.find((c) => c.pessoaId === pessoa.id && dataLocal(c.em) === hoje);
  const janela = pessoa.janelaCheckin || { inicio: '07:00', fim: '11:00' };
  const agoraMin = minutosDoDia(agoraIso);
  const fimMin = horaParaMinutos(janela.fim);
  const inicioMin = horaParaMinutos(janela.inicio);

  if (checkinHoje) {
    return {
      codigo: 'ok',
      rotulo: 'Check-in feito',
      descricao: `Avisou que esta bem as ${fmtHora.format(new Date(checkinHoje.em))}`,
      humor: checkinHoje.humor,
      em: checkinHoje.em,
    };
  }
  if (agoraMin < inicioMin) {
    return {
      codigo: 'aguardando',
      rotulo: 'Aguardando',
      descricao: `A janela de check-in abre as ${janela.inicio}`,
    };
  }
  if (agoraMin <= fimMin) {
    return {
      codigo: 'na_janela',
      rotulo: 'Dentro do horario',
      descricao: `Pode fazer o check-in ate as ${janela.fim}`,
    };
  }
  return {
    codigo: 'sem_checkin',
    rotulo: 'Sem check-in',
    descricao: `Passou das ${janela.fim} e ninguem confirmou que esta bem`,
  };
}

/** Junta pessoa + risco + status + ultimo contato. E o formato que as telas usam. */
export function montarPessoa(pessoa, db, agoraIso = new Date().toISOString()) {
  const risco = calcularRisco(pessoa, db.checkins, db.alertas, agoraIso);
  const status = statusDoDia(pessoa, db.checkins, agoraIso);
  const alertasAbertos = db.alertas.filter(
    (a) => a.pessoaId === pessoa.id && a.status !== 'resolvido'
  );
  const meus = db.checkins
    .filter((c) => c.pessoaId === pessoa.id)
    .sort((a, b) => (a.em < b.em ? 1 : -1));
  const proximaVisita = db.visitas
    .filter((v) => v.pessoaId === pessoa.id && v.status === 'agendada')
    .sort((a, b) => (a.quando > b.quando ? 1 : -1))[0] || null;

  return {
    ...pessoa,
    risco,
    status,
    ultimoCheckin: meus[0] || null,
    totalCheckins: meus.length,
    alertasAbertos,
    proximaVisita,
    pedidosAbertos: db.pedidos.filter((p) => p.pessoaId === pessoa.id && p.status !== 'concluido'),
  };
}

// ---------------------------------------------------------------------------
// Motor de escalada
// ---------------------------------------------------------------------------

/**
 * Varredura: o coracao da solucao.
 *  1) passou da janela e nao houve check-in  -> alerta de ATENCAO para a rede de apoio;
 *  2) alerta de atencao sem ninguem assumir   -> escala para CRITICO na fila da UBS.
 * Devolve a lista de eventos aplicados para que o servidor possa notificar as telas.
 */
export function varrer(db, agoraIso = new Date().toISOString()) {
  const eventos = [];
  const hoje = dataLocal(agoraIso);

  for (const pessoa of db.pessoas.filter((p) => p.ativo !== false)) {
    const status = statusDoDia(pessoa, db.checkins, agoraIso);
    if (status.codigo !== 'sem_checkin') continue;

    const jaExiste = db.alertas.find(
      (a) =>
        a.pessoaId === pessoa.id &&
        a.tipo === 'sem_checkin' &&
        dataLocal(a.criadoEm) === hoje &&
        a.status !== 'resolvido'
    );

    if (!jaExiste) {
      const alerta = {
        id: novoId('al'),
        pessoaId: pessoa.id,
        tipo: 'sem_checkin',
        nivel: 'atencao',
        titulo: `${pessoa.nome.split(' ')[0]} nao fez o check-in de hoje`,
        texto: status.descricao,
        criadoEm: agoraIso,
        status: 'aberto',
        destino: 'rede',
        assumidoPor: null,
        assumidoEm: null,
        resolvidoEm: null,
        desfecho: null,
        historico: [{ em: agoraIso, quem: 'sistema', acao: 'criado', nota: status.descricao }],
      };
      db.alertas.push(alerta);
      eventos.push({ tipo: 'alerta_criado', alerta });
      continue;
    }

    const esperando = minutosEntre(jaExiste.criadoEm, agoraIso);
    if (jaExiste.status === 'aberto' && jaExiste.nivel === 'atencao' && esperando >= MINUTOS_PARA_ESCALAR) {
      jaExiste.nivel = 'critico';
      jaExiste.destino = 'ubs';
      jaExiste.texto = `Sem resposta da rede de apoio ha ${esperando} minutos. Caso encaminhado para a equipe da UBS.`;
      jaExiste.historico.push({
        em: agoraIso,
        quem: 'sistema',
        acao: 'escalado',
        nota: `Ninguem assumiu em ${MINUTOS_PARA_ESCALAR} minutos`,
      });
      eventos.push({ tipo: 'alerta_escalado', alerta: jaExiste });
    }
  }

  return eventos;
}

// ---------------------------------------------------------------------------
// Indicadores (pagina publica de transparencia + cabecalho do painel)
// ---------------------------------------------------------------------------

export function indicadores(db, agoraIso = new Date().toISOString()) {
  const ativas = db.pessoas.filter((p) => p.ativo !== false);
  const montadas = ativas.map((p) => montarPessoa(p, db, agoraIso));

  const comCheckinHoje = montadas.filter((p) => p.status.codigo === 'ok').length;
  const semCheckin = montadas.filter((p) => p.status.codigo === 'sem_checkin').length;
  const abertos = db.alertas.filter((a) => a.status !== 'resolvido');
  const resolvidos = db.alertas.filter((a) => a.status === 'resolvido');

  const temposResposta = resolvidos
    .filter((a) => a.assumidoEm)
    .map((a) => minutosEntre(a.criadoEm, a.assumidoEm))
    .filter((n) => n >= 0);
  const tempoMedio = temposResposta.length
    ? Math.round(temposResposta.reduce((s, n) => s + n, 0) / temposResposta.length)
    : null;

  const resolvidosPelaRede = resolvidos.filter(
    (a) => a.desfecho && a.desfecho.porQuem === 'rede'
  ).length;

  return {
    pessoasMonitoradas: ativas.length,
    voluntarios: new Set(
      ativas.flatMap((p) => (p.redeApoio || []).map((r) => r.telefone || r.nome))
    ).size,
    comCheckinHoje,
    semCheckin,
    coberturaHoje: ativas.length ? Math.round((comCheckinHoje / ativas.length) * 100) : 0,
    alertasAbertos: abertos.length,
    alertasCriticos: abertos.filter((a) => a.nivel === 'critico').length,
    alertasResolvidos: resolvidos.length,
    tempoMedioRespostaMin: tempoMedio,
    percentualResolvidoPelaRede: resolvidos.length
      ? Math.round((resolvidosPelaRede / resolvidos.length) * 100)
      : 0,
    porRisco: {
      alto: montadas.filter((p) => p.risco.nivel === 'alto').length,
      medio: montadas.filter((p) => p.risco.nivel === 'medio').length,
      baixo: montadas.filter((p) => p.risco.nivel === 'baixo').length,
    },
    pedidosAbertos: db.pedidos.filter((p) => p.status !== 'concluido').length,
    visitasAgendadas: db.visitas.filter((v) => v.status === 'agendada').length,
    atualizadoEm: agoraIso,
  };
}

/** Fila de triagem da UBS: quem precisa de atencao primeiro, e por que. */
export function filaTriagem(db, agoraIso = new Date().toISOString()) {
  const peso = { critico: 0, atencao: 1, info: 2 };
  return db.alertas
    .filter((a) => a.status !== 'resolvido')
    .map((a) => {
      const pessoa = db.pessoas.find((p) => p.id === a.pessoaId) || null;
      return {
        ...a,
        esperandoMin: minutosEntre(a.criadoEm, agoraIso),
        pessoa: pessoa
          ? {
              id: pessoa.id,
              nome: pessoa.nome,
              idade: pessoa.idade,
              endereco: pessoa.endereco,
              telefone: pessoa.telefone,
              lat: pessoa.lat,
              lng: pessoa.lng,
              risco: calcularRisco(pessoa, db.checkins, db.alertas, agoraIso),
              redeApoio: pessoa.redeApoio || [],
            }
          : null,
      };
    })
    .sort((a, b) => {
      const p = (peso[a.nivel] ?? 3) - (peso[b.nivel] ?? 3);
      if (p !== 0) return p;
      return b.esperandoMin - a.esperandoMin;
    });
}
