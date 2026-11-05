/**
 * Estado global do app Perto.
 * Mantem quem esta usando o celular, o retrato do territorio, as preferencias
 * de acessibilidade e a fila do que foi feito sem internet.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';

import * as API from '../servicos/api';
import { ler, gravar, apagar, CHAVES } from '../servicos/armazenamento';
import { coresPadrao, coresAltoContraste, ESCALAS } from '../tema';
import Dialogo from '../componentes/Dialogo';

const Contexto = createContext(null);
export const usePerto = () => useContext(Contexto);

const PREFS_PADRAO = { escala: 'normal', altoContraste: false, reduzirMovimento: false };
const INTERVALO_ATUALIZACAO = 20000;

export function PertoProvider({ children }) {
  const [pronto, setPronto] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [estado, setEstado] = useState(null);
  const [origem, setOrigem] = useState('demo'); // api | cache | demo
  const [modo, setModo] = useState('desconhecido');
  const [carregando, setCarregando] = useState(false);
  const [fila, setFila] = useState(0);
  const [prefs, setPrefs] = useState(PREFS_PADRAO);
  const [movimentoDoSistema, setMovimentoDoSistema] = useState(false);
  const [dialogo, setDialogo] = useState(null);

  const temporizador = useRef(null);

  // -------------------------------------------------------------------------
  // Carga inicial
  // -------------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      const [u, p] = await Promise.all([ler(CHAVES.usuario), ler(CHAVES.preferencias, PREFS_PADRAO)]);
      setUsuario(u);
      setPrefs({ ...PREFS_PADRAO, ...(p || {}) });

      try {
        const reduzir = await AccessibilityInfo.isReduceMotionEnabled();
        setMovimentoDoSistema(Boolean(reduzir));
      } catch {
        /* nem toda plataforma responde: assume movimento normal */
      }

      await API.conectar();
      setModo(API.servico.modo);
      const r = await API.buscarEstado();
      setEstado(r.estado);
      setOrigem(r.origem);
      setFila(await API.tamanhoDaFila());
      setPronto(true);
    })();

    const assinatura = AccessibilityInfo.addEventListener('reduceMotionChanged', (valor) =>
      setMovimentoDoSistema(Boolean(valor))
    );
    return () => assinatura?.remove?.();
  }, []);

  // -------------------------------------------------------------------------
  // Atualizacao
  // -------------------------------------------------------------------------
  const atualizar = useCallback(async ({ silencioso = true } = {}) => {
    if (!silencioso) setCarregando(true);
    try {
      if (API.servico.modo !== 'api') {
        await API.conectar();
        setModo(API.servico.modo);
      }
      const pendentes = await API.tamanhoDaFila();
      if (pendentes > 0 && API.servico.modo === 'api') {
        await API.sincronizarFila();
      }
      const r = await API.buscarEstado();
      setEstado(r.estado);
      setOrigem(r.origem);
      setFila(await API.tamanhoDaFila());
    } finally {
      if (!silencioso) setCarregando(false);
    }
  }, []);

  // Atualiza enquanto o app esta na frente; para quando vai para segundo plano
  // (bateria e dados moveis sao recursos escassos para quem usa o app na rua).
  useEffect(() => {
    if (!pronto) return undefined;

    const ligar = () => {
      clearInterval(temporizador.current);
      temporizador.current = setInterval(() => atualizar(), INTERVALO_ATUALIZACAO);
    };
    const desligar = () => clearInterval(temporizador.current);

    ligar();
    const assinatura = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        atualizar();
        ligar();
      } else {
        desligar();
      }
    });
    return () => {
      desligar();
      assinatura.remove();
    };
  }, [pronto, atualizar]);

  // -------------------------------------------------------------------------
  // Sessao
  // -------------------------------------------------------------------------
  const entrar = useCallback(async (u) => {
    setUsuario(u);
    await gravar(CHAVES.usuario, u);
  }, []);

  const sair = useCallback(async () => {
    setUsuario(null);
    await apagar(CHAVES.usuario);
  }, []);

  const salvarPrefs = useCallback(async (parcial) => {
    setPrefs((atuais) => {
      const novas = { ...atuais, ...parcial };
      gravar(CHAVES.preferencias, novas);
      return novas;
    });
  }, []);

  // -------------------------------------------------------------------------
  // Acoes (otimistas: a tela responde na hora, a rede sobe depois)
  // -------------------------------------------------------------------------
  const comAtualizacao = useCallback(
    async (promessa) => {
      const r = await promessa;
      setFila(await API.tamanhoDaFila());
      if (r.ok) await atualizar();
      return r;
    },
    [atualizar]
  );

  const acoes = useMemo(
    () => ({
      checkin: (pessoaId, humor) => comAtualizacao(API.fazerCheckin(pessoaId, humor)),
      sos: (pessoaId, texto) => comAtualizacao(API.acionarSos(pessoaId, texto)),
      pedir: (pessoaId, tipo, detalhe) => comAtualizacao(API.criarPedido(pessoaId, tipo, detalhe)),
      assumirAlerta: (id, quem, nota) =>
        comAtualizacao(API.acaoAlerta(id, { acao: 'assumir', quem, nota })),
      resolverAlerta: (id, quem, resultado, nota) =>
        comAtualizacao(API.acaoAlerta(id, { acao: 'resolver', quem, resultado, nota })),
      aceitarPedido: (id, quem) => comAtualizacao(API.acaoPedido(id, { acao: 'aceitar', quem })),
      concluirPedido: (id, quem) => comAtualizacao(API.acaoPedido(id, { acao: 'concluir', quem })),
    }),
    [comAtualizacao]
  );

  // -------------------------------------------------------------------------
  // Derivados
  // -------------------------------------------------------------------------
  const cores = prefs.altoContraste ? coresAltoContraste : coresPadrao;
  const fator = (ESCALAS.find((e) => e.chave === prefs.escala) || ESCALAS[0]).fator;
  const semMovimento = prefs.reduzirMovimento || movimentoDoSistema;

  /** A pessoa acompanhada ligada a este usuario (perfil "idoso"). */
  const minhaPessoa = useMemo(() => {
    if (!estado || usuario?.perfil !== 'idoso') return null;
    return (estado.pessoas || []).find((p) => p.id === usuario.pessoaId) || null;
  }, [estado, usuario]);

  /** As pessoas que este usuario acompanha (perfil "rede"). */
  const minhasPessoas = useMemo(() => {
    if (!estado || usuario?.perfil !== 'rede') return [];
    const ids = usuario.cuidaDe || [];
    return (estado.pessoas || []).filter((p) => ids.includes(p.id));
  }, [estado, usuario]);

  /** Alertas que interessam a este usuario da rede de apoio. */
  const meusAlertas = useMemo(() => {
    if (!estado || usuario?.perfil !== 'rede') return [];
    const ids = usuario.cuidaDe || [];
    return (estado.fila || []).filter((a) => ids.includes(a.pessoaId));
  }, [estado, usuario]);

  const avisoAtivo = useMemo(() => {
    const avisos = estado?.avisos || [];
    const agora = Date.now();
    return (
      avisos.find((a) => !a.validoAte || new Date(a.validoAte).getTime() > agora) || null
    );
  }, [estado]);

  const valor = {
    pronto, usuario, estado, origem, modo, carregando, fila,
    prefs, cores, fator, semMovimento,
    minhaPessoa, minhasPessoas, meusAlertas, avisoAtivo,
    entrar, sair, salvarPrefs, atualizar, acoes,
    /** Mensagem simples, com um unico botao de fechar. */
    avisar: (titulo, texto, nivel = 'info') => setDialogo({ titulo, texto, nivel }),
    /** Pergunta com varias opcoes. Substitui o Alert do sistema. */
    perguntar: (config) => setDialogo(config),
    /** Fonte dimensionada pela preferencia da pessoa. */
    t: (tamanho) => Math.round(tamanho * fator),
  };

  return (
    <Contexto.Provider value={valor}>
      {children}
      <Dialogo
        aberto={Boolean(dialogo)}
        dados={dialogo}
        cores={cores}
        t={valor.t}
        semMovimento={semMovimento}
        aoFechar={() => setDialogo(null)}
      />
    </Contexto.Provider>
  );
}
