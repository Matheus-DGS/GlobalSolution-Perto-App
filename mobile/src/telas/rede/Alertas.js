/**
 * Tela "Avisos" - a jornada da rede de apoio.
 * Mostra so o que exige acao de quem esta vendo, com o endereco, o telefone e
 * as observacoes de acesso: a pessoa precisa decidir em segundos se consegue ir.
 *
 * MOTION DESIGN: cada aviso entra deslizando de cima. Como a lista muda sozinha
 * a cada 20 segundos, o movimento diz "isto chegou agora" sem precisar de texto.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Linking, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { usePerto } from '../../contexto/Perto';
import { Texto, Titulo, Cartao, Botao, Selo, Vazio, Carregando } from '../../componentes/Base';
import { BarraEstado, BannerAviso } from '../../componentes/Barras';
import { esp, ROTULOS } from '../../tema';
import { duracao, primeiroNome, soDigitos, tempoRelativo } from '../../utilitarios/formato';

function AoEntrar({ children, atraso = 0 }) {
  const { semMovimento } = usePerto();
  const v = useRef(new Animated.Value(semMovimento ? 1 : 0)).current;

  useEffect(() => {
    if (semMovimento) {
      v.setValue(1);
      return;
    }
    Animated.timing(v, { toValue: 1, duration: 320, delay: atraso, useNativeDriver: true }).start();
  }, [semMovimento, atraso, v]);

  return (
    <Animated.View
      style={{
        opacity: v,
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

export default function Alertas() {
  const { cores, t, usuario, estado, meusAlertas, minhasPessoas, carregando, atualizar, acoes, pronto, avisar, perguntar } =
    usePerto();
  const [ocupado, setOcupado] = useState(null);

  if (!pronto || !estado) return <Carregando />;

  const eu = { id: usuario.id, nome: usuario.nome, perfil: 'rede' };

  const pedidosDaMinhaGente = (estado.pedidos || []).filter(
    (p) => p.status === 'aberto' && (usuario.cuidaDe || []).includes(p.pessoaId)
  );

  const ligar = (telefone) => {
    const n = soDigitos(telefone);
    if (n) Linking.openURL(`tel:${n}`);
  };

  const assumir = async (alerta) => {
    setOcupado(alerta.id);
    const r = await acoes.assumirAlerta(alerta.id, eu, 'Vou verificar agora');
    setOcupado(null);
    avisar(
      'Combinado',
      r.offline
        ? 'Sem internet agora, mas guardamos aqui. Se puder, va ate la assim mesmo.'
        : `As outras pessoas da rede ja sabem que voce foi ver ${primeiroNome(alerta.pessoa?.nome || '')}. A equipe da UBS tambem.`,
      r.offline ? 'atencao' : 'ok'
    );
  };

  const encerrar = (alerta) => {
    perguntar({
      titulo: `Como esta ${primeiroNome(alerta.pessoa?.nome || 'a pessoa')}?`,
      texto: 'O que voce contar aqui fica no historico que a equipe da UBS le.',
      icone: 'clipboard-outline',
      opcoes: [
        {
          texto: 'Esta bem',
          aoTocar: async () => {
            setOcupado(alerta.id);
            await acoes.resolverAlerta(alerta.id, eu, 'esta_bem', 'Verificado pela rede de apoio: esta bem.');
            setOcupado(null);
          },
        },
        {
          texto: 'Precisou de ajuda',
          aoTocar: async () => {
            setOcupado(alerta.id);
            await acoes.resolverAlerta(alerta.id, eu, 'precisou_ajuda', 'A pessoa precisou de ajuda e foi atendida.');
            setOcupado(null);
          },
        },
        {
          texto: 'Nao encontrei',
          estilo: 'perigo',
          aoTocar: async () => {
            setOcupado(alerta.id);
            await acoes.resolverAlerta(
              alerta.id,
              eu,
              'nao_encontrada',
              'Fui ate a casa e nao encontrei ninguem. Equipe da UBS precisa ir.'
            );
            setOcupado(null);
            avisar(
              'Caso encaminhado',
              'A equipe da UBS foi avisada de que voce nao encontrou a pessoa.',
              'critico'
            );
          },
        },
        { texto: 'Cancelar', estilo: 'cancelar' },
      ],
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.areia }} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: esp(12) }}
        refreshControl={
          <RefreshControl refreshing={carregando} onRefresh={() => atualizar({ silencioso: false })} tintColor={cores.primaria} />
        }
      >
        <BarraEstado />
        <BannerAviso />

        <View style={{ padding: esp(5), gap: esp(4) }}>
          <View>
            <Titulo style={{ marginBottom: esp(1) }}>Avisos para voce</Titulo>
            <Texto cor={cores.tinta2}>
              Voce acompanha {minhasPessoas.length} pessoa(s) deste quarteirao.
            </Texto>
          </View>

          {meusAlertas.length === 0 ? (
            <Vazio
              titulo="Ninguem precisa de voce agora"
              texto="Todo mundo que voce acompanha ja confirmou que esta bem hoje. A gente avisa se algo mudar."
            />
          ) : (
            meusAlertas.map((a, i) => {
              const p = a.pessoa || {};
              const pessoaCompleta = (estado.pessoas || []).find((x) => x.id === a.pessoaId);
              const assumidoPorMim = a.assumidoPor?.id === usuario.id;
              const assumidoPorOutro = a.status === 'em_atendimento' && !assumidoPorMim;

              return (
                <AoEntrar key={a.id} atraso={i * 70}>
                  <Cartao destaque={a.nivel === 'critico' ? cores.critico : cores.atencao}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: esp(2), marginBottom: esp(3) }}>
                      <Selo
                        nivel={a.nivel}
                        icone={a.nivel === 'critico' ? 'alert-circle-outline' : 'time-outline'}
                        texto={ROTULOS.tipoAlerta[a.tipo] || a.tipo}
                      />
                      <Selo nivel="info" icone="hourglass-outline" texto={`Esperando ${duracao(a.esperandoMin)}`} />
                    </View>

                    <Texto tamanho="medio" peso="800">
                      {a.titulo}
                    </Texto>
                    <Texto cor={cores.tinta2} style={{ marginTop: esp(1) }}>
                      {a.texto}
                    </Texto>

                    <View style={{ marginTop: esp(3), gap: esp(1) }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp(2) }}>
                        <Ionicons name="location-outline" size={t(17)} color={cores.tinta3} />
                        <Texto tamanho="pequeno" cor={cores.tinta2} style={{ flex: 1 }}>
                          {p.endereco || 'Endereco nao informado'}
                        </Texto>
                      </View>
                      {pessoaCompleta?.observacoes ? (
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: esp(2) }}>
                          <Ionicons name="key-outline" size={t(17)} color={cores.tinta3} />
                          <Texto tamanho="pequeno" cor={cores.tinta2} style={{ flex: 1 }}>
                            {pessoaCompleta.observacoes}
                          </Texto>
                        </View>
                      ) : null}
                    </View>

                    {assumidoPorOutro ? (
                      <View style={{ marginTop: esp(3) }}>
                        <Selo
                          nivel="info"
                          icone="person-outline"
                          texto={`${primeiroNome(a.assumidoPor.nome)} ja foi ver ${tempoRelativo(a.assumidoEm)}`}
                        />
                        <Texto tamanho="mini" cor={cores.tinta3} style={{ marginTop: esp(2) }}>
                          Voce nao precisa ir. Se quiser ajudar assim mesmo, fale com {primeiroNome(a.assumidoPor.nome)}.
                        </Texto>
                      </View>
                    ) : null}

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: esp(2), marginTop: esp(4) }}>
                      {!assumidoPorOutro && a.status === 'aberto' ? (
                        <Botao
                          titulo="Vou verificar"
                          icone="walk-outline"
                          carregando={ocupado === a.id}
                          dica="Avisa as outras pessoas que voce esta indo ate la"
                          onPress={() => assumir(a)}
                          style={{ flexGrow: 1 }}
                        />
                      ) : null}
                      {p.telefone ? (
                        <Botao
                          titulo={`Ligar para ${primeiroNome(p.nome || '')}`}
                          variante="secundario"
                          icone="call-outline"
                          onPress={() => ligar(p.telefone)}
                          style={{ flexGrow: 1 }}
                        />
                      ) : null}
                      {assumidoPorMim ? (
                        <Botao
                          titulo="Ja verifiquei"
                          variante="secundario"
                          icone="checkmark-done-outline"
                          carregando={ocupado === a.id}
                          dica="Conta o que voce encontrou e encerra o caso"
                          onPress={() => encerrar(a)}
                          style={{ flexGrow: 1 }}
                        />
                      ) : null}
                    </View>
                  </Cartao>
                </AoEntrar>
              );
            })
          )}

          {pedidosDaMinhaGente.length ? (
            <View style={{ gap: esp(3), marginTop: esp(2) }}>
              <Texto tamanho="pequeno" peso="800" cor={cores.tinta3}>
                PEDIDOS DO DIA A DIA
              </Texto>
              {pedidosDaMinhaGente.map((pd) => (
                <Cartao key={pd.id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp(2), marginBottom: esp(2) }}>
                    <Ionicons name={ROTULOS.iconePedido[pd.tipo] || 'help-circle-outline'} size={t(20)} color={cores.primaria} />
                    <Texto peso="800">
                      {ROTULOS.tipoPedido[pd.tipo]} · {pd.pessoa?.apelido || pd.pessoa?.nome}
                    </Texto>
                  </View>
                  <Texto cor={cores.tinta2}>{pd.detalhe}</Texto>
                  <Botao
                    titulo="Eu resolvo isso"
                    variante="secundario"
                    icone="hand-left-outline"
                    style={{ marginTop: esp(3) }}
                    onPress={async () => {
                      await acoes.aceitarPedido(pd.id, { id: usuario.id, nome: usuario.nome });
                      avisar('Combinado', `${pd.pessoa?.apelido || 'A pessoa'} ja sabe que voce vai resolver.`, 'ok');
                    }}
                  />
                </Cartao>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
