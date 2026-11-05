/**
 * Detalhe de uma pessoa acompanhada, visto por quem e da rede de apoio.
 * Traz o que a pessoa precisa saber ANTES de bater na porta e o historico
 * dos ultimos dias em barras, com a mesma leitura do painel web.
 */
import React, { useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { usePerto } from '../../contexto/Perto';
import { Texto, Titulo, Cartao, Botao, Selo, Carregando, Divisor } from '../../componentes/Base';
import { esp, raios, ROTULOS } from '../../tema';
import { dataHora, hora, primeiroNome, soDigitos, tempoRelativo } from '../../utilitarios/formato';

const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

export default function PessoaDetalhe({ route, navigation }) {
  const { cores, t, estado, usuario, acoes, pronto, avisar } = usePerto();
  const [ocupado, setOcupado] = useState(false);

  if (!pronto || !estado) return <Carregando />;

  const pessoa = (estado.pessoas || []).find((p) => p.id === route.params?.pessoaId);
  if (!pessoa) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: cores.areia }}>
        <View style={{ padding: esp(5) }}>
          <Texto>Pessoa nao encontrada.</Texto>
          <Botao titulo="Voltar" variante="secundario" style={{ marginTop: esp(4) }} onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  // Historico dos ultimos 7 dias, montado a partir dos check-ins compartilhados
  const dias = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const chave = d.toISOString().slice(0, 10);
    const achado = (estado.checkins || []).find(
      (c) => c.pessoaId === pessoa.id && new Date(c.em).toISOString().slice(0, 10) === chave
    );
    dias.push({ data: d, checkin: achado || null });
  }

  const ligar = (telefone) => {
    const n = soDigitos(telefone);
    if (n) Linking.openURL(`tel:${n}`);
  };

  const registrarContato = async () => {
    setOcupado(true);
    const r = await acoes.checkin(pessoa.id, 'bem');
    setOcupado(false);
    avisar(
      r.offline ? 'Guardado no celular' : 'Contato registrado',
      r.offline
        ? 'Sem internet agora. O registro sobe quando a conexao voltar.'
        : `A equipe da UBS ja sabe que ${primeiroNome(pessoa.nome)} esta bem hoje. O alerta do dia foi encerrado.`,
      r.offline ? 'atencao' : 'ok'
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.areia }} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: esp(5), gap: esp(4), paddingBottom: esp(12) }}>
        <View>
          <Titulo style={{ marginBottom: esp(1) }}>{pessoa.nome}</Titulo>
          <Texto cor={cores.tinta2}>
            {pessoa.idade} anos · {pessoa.endereco}
          </Texto>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: esp(2) }}>
          <Selo
            nivel={pessoa.status?.codigo === 'ok' ? 'ok' : pessoa.status?.codigo === 'sem_checkin' ? 'critico' : 'info'}
            icone={pessoa.status?.codigo === 'ok' ? 'checkmark-circle-outline' : 'time-outline'}
            texto={pessoa.status?.rotulo || ''}
          />
          <Selo
            nivel={pessoa.risco?.nivel}
            icone={pessoa.risco?.nivel === 'alto' ? 'alert-circle-outline' : 'shield-checkmark-outline'}
            texto={ROTULOS.risco[pessoa.risco?.nivel] || ''}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: esp(3) }}>
          {pessoa.telefone ? (
            <Botao
              titulo="Ligar"
              icone="call-outline"
              style={{ flex: 1 }}
              dica={`Liga para ${pessoa.nome}`}
              onPress={() => ligar(pessoa.telefone)}
            />
          ) : null}
          <Botao
            titulo="Estive com ela"
            variante="secundario"
            icone="checkmark-done-outline"
            style={{ flex: 1 }}
            carregando={ocupado}
            dica="Registra que voce viu a pessoa hoje e encerra o alerta do dia"
            onPress={registrarContato}
          />
        </View>

        {/* Historico de 7 dias */}
        <Cartao>
          <Texto tamanho="pequeno" peso="800" cor={cores.tinta3} style={{ marginBottom: esp(3) }}>
            ULTIMOS 7 DIAS
          </Texto>
          <View
            style={{ flexDirection: 'row', alignItems: 'flex-end', gap: esp(2), height: 92 }}
            accessible
            accessibilityLabel={dias
              .map((d) => `${DIAS_CURTOS[d.data.getDay()]}: ${d.checkin ? ROTULOS.humor[d.checkin.humor] : 'sem check-in'}`)
              .join('. ')}
          >
            {dias.map((d, i) => {
              const tem = Boolean(d.checkin);
              const bem = d.checkin?.humor === 'bem';
              const altura = tem ? (bem ? 62 : 42) : 14;
              return (
                <View key={i} style={{ flex: 1, alignItems: 'center', gap: esp(1.5) }}>
                  <View
                    style={{
                      width: '100%',
                      height: altura,
                      borderRadius: 6,
                      backgroundColor: tem ? (bem ? cores.ok : cores.atencao) : cores.papel2,
                      borderWidth: tem ? 0 : 1.5,
                      borderStyle: tem ? 'solid' : 'dashed',
                      borderColor: cores.linhaForte,
                    }}
                  />
                  <Texto tamanho="mini" peso="800" cor={cores.tinta3}>
                    {DIAS_CURTOS[d.data.getDay()]}
                  </Texto>
                </View>
              );
            })}
          </View>
          <Texto tamanho="mini" cor={cores.tinta2} style={{ marginTop: esp(3) }}>
            Barra cheia: confirmou que estava bem. Barra media: respondeu "mais ou menos".
            Barra tracejada: nao houve check-in.
          </Texto>
        </Cartao>

        {/* Por que o nivel de atencao */}
        <Cartao>
          <Texto tamanho="pequeno" peso="800" cor={cores.tinta3} style={{ marginBottom: esp(2) }}>
            POR QUE O NIVEL DE ATENCAO
          </Texto>
          {(pessoa.risco?.motivos || ['Sem fatores de risco registrados']).map((m, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: esp(2), alignItems: 'flex-start', paddingVertical: esp(1) }}>
              <Ionicons name="ellipse" size={t(7)} color={cores.tinta3} style={{ marginTop: t(7) }} />
              <Texto tamanho="pequeno" cor={cores.tinta2} style={{ flex: 1 }}>
                {m}
              </Texto>
            </View>
          ))}
        </Cartao>

        {/* Como chegar bem */}
        <Cartao destaque={cores.acento}>
          <Texto tamanho="pequeno" peso="800" cor={cores.tinta3} style={{ marginBottom: esp(2) }}>
            ANTES DE BATER NA PORTA
          </Texto>
          <Texto cor={cores.tinta}>{pessoa.observacoes || 'Sem observacoes registradas.'}</Texto>
          {pessoa.condicoes?.length ? (
            <>
              <Divisor />
              <Texto tamanho="pequeno" peso="800" cor={cores.tinta3} style={{ marginBottom: esp(1) }}>
                CONDICOES DE SAUDE
              </Texto>
              <Texto tamanho="pequeno" cor={cores.tinta2}>
                {pessoa.condicoes.join(' · ')}
              </Texto>
            </>
          ) : null}
          <Divisor />
          <Texto tamanho="pequeno" cor={cores.tinta2}>
            Janela combinada: {pessoa.janelaCheckin?.inicio} as {pessoa.janelaCheckin?.fim}
            {pessoa.ultimoCheckin ? ` · ultimo contato ${tempoRelativo(pessoa.ultimoCheckin.em)}` : ''}
          </Texto>
        </Cartao>

        {/* Outras pessoas da rede */}
        <Cartao>
          <Texto tamanho="pequeno" peso="800" cor={cores.tinta3} style={{ marginBottom: esp(2) }}>
            QUEM MAIS ACOMPANHA
          </Texto>
          {(pessoa.redeApoio || []).filter((r) => r.nome !== usuario?.nome).length ? (
            (pessoa.redeApoio || [])
              .filter((r) => r.nome !== usuario?.nome)
              .map((r) => (
                <View
                  key={r.id || r.nome}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: esp(3), paddingVertical: esp(2) }}
                >
                  <View style={{ flex: 1 }}>
                    <Texto peso="700">{r.nome}</Texto>
                    <Texto tamanho="pequeno" cor={cores.tinta2}>
                      {r.relacao}
                      {r.distancia ? ` · ${r.distancia}` : ''}
                    </Texto>
                  </View>
                  {r.telefone ? (
                    <Botao titulo="Ligar" variante="fantasma" icone="call-outline" onPress={() => ligar(r.telefone)} />
                  ) : null}
                </View>
              ))
          ) : (
            <Texto cor={cores.tinta2}>Voce e a unica pessoa da rede desta casa.</Texto>
          )}
        </Cartao>

        {pessoa.proximaVisita ? (
          <Cartao destaque={cores.info}>
            <Texto tamanho="pequeno" peso="800" cor={cores.info} style={{ marginBottom: esp(1) }}>
              PROXIMA VISITA DA UBS
            </Texto>
            <Texto peso="700">{dataHora(pessoa.proximaVisita.quando)}</Texto>
            <Texto tamanho="pequeno" cor={cores.tinta2}>
              {pessoa.proximaVisita.responsavel}
            </Texto>
          </Cartao>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
