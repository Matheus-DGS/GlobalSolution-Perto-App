/**
 * Tela "Acompanho" - quem esta sob o olhar desta pessoa da rede de apoio.
 * Serve para a checagem tranquila do dia, fora de qualquer alerta.
 */
import React from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { usePerto } from '../../contexto/Perto';
import { Texto, Titulo, Cartao, Selo, Vazio, Carregando } from '../../componentes/Base';
import { BarraEstado } from '../../componentes/Barras';
import { esp, raios, ROTULOS, TOQUE_MINIMO } from '../../tema';
import { primeiroNome, tempoRelativo } from '../../utilitarios/formato';

const SELO_STATUS = {
  ok: { nivel: 'ok', icone: 'checkmark-circle-outline' },
  na_janela: { nivel: 'info', icone: 'time-outline' },
  aguardando: { nivel: 'info', icone: 'time-outline' },
  sem_checkin: { nivel: 'critico', icone: 'alert-circle-outline' },
};

export default function Acompanho({ navigation }) {
  const { cores, t, minhasPessoas, carregando, atualizar, pronto, estado } = usePerto();

  if (!pronto || !estado) return <Carregando />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.areia }} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: esp(12) }}
        refreshControl={
          <RefreshControl refreshing={carregando} onRefresh={() => atualizar({ silencioso: false })} tintColor={cores.primaria} />
        }
      >
        <BarraEstado />

        <View style={{ padding: esp(5), gap: esp(4) }}>
          <View>
            <Titulo style={{ marginBottom: esp(1) }}>Quem eu acompanho</Titulo>
            <Texto cor={cores.tinta2}>
              Toque em uma pessoa para ver o historico, o endereco e como avisar.
            </Texto>
          </View>

          {minhasPessoas.length === 0 ? (
            <Vazio
              nivel="info"
              icone="people-outline"
              titulo="Voce ainda nao acompanha ninguem"
              texto="A equipe da UBS cadastra a rede de apoio no painel web durante a visita domiciliar."
            />
          ) : (
            minhasPessoas.map((p) => {
              const st = SELO_STATUS[p.status?.codigo] || SELO_STATUS.aguardando;
              const temAlerta = (p.alertasAbertos || []).length > 0;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => navigation.navigate('PessoaDetalhe', { pessoaId: p.id })}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.nome}, ${p.idade} anos. ${p.status?.rotulo}. ${ROTULOS.risco[p.risco?.nivel] || ''}`}
                  accessibilityHint="Abre os detalhes desta pessoa"
                  style={({ pressed }) => ({
                    minHeight: TOQUE_MINIMO + 36,
                    backgroundColor: cores.papel,
                    borderRadius: raios.grande,
                    borderWidth: 1.5,
                    borderColor: pressed ? cores.primaria : cores.linha,
                    borderLeftWidth: 6,
                    borderLeftColor: temAlerta ? cores.critico : cores.linha,
                    padding: esp(4),
                    gap: esp(2),
                  })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp(3) }}>
                    <View
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: raios.medio,
                        backgroundColor: cores.primariaClara,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Texto tamanho="medio" peso="800" cor={cores.primariaEscura}>
                        {primeiroNome(p.nome).charAt(0)}
                      </Texto>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Texto tamanho="medio" peso="800">
                        {p.apelido || p.nome}
                      </Texto>
                      <Texto tamanho="pequeno" cor={cores.tinta2}>
                        {p.idade} anos · {p.endereco}
                      </Texto>
                    </View>
                    <Ionicons name="chevron-forward" size={t(20)} color={cores.tinta3} />
                  </View>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: esp(2) }}>
                    <Selo nivel={st.nivel} icone={st.icone} texto={p.status?.rotulo || 'Sem informacao'} />
                    <Selo
                      nivel={p.risco?.nivel}
                      icone={p.risco?.nivel === 'alto' ? 'alert-circle-outline' : 'shield-checkmark-outline'}
                      texto={ROTULOS.risco[p.risco?.nivel] || ''}
                    />
                  </View>

                  <Texto tamanho="mini" cor={cores.tinta3}>
                    {p.ultimoCheckin ? `Ultimo contato ${tempoRelativo(p.ultimoCheckin.em)}` : 'Sem registro de contato'}
                  </Texto>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
