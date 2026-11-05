/**
 * Tela "Pedir ajuda" - as necessidades do dia a dia, que nao sao emergencia.
 * Pedir remedio, mercado ou companhia e o que mantem a rede viva entre os
 * alertas: a pessoa se acostuma a usar o app em dias bons, e nao so em crise.
 */
import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { usePerto } from '../../contexto/Perto';
import { Texto, Titulo, Cartao, Botao, Selo, Vazio, Carregando } from '../../componentes/Base';
import { BarraEstado } from '../../componentes/Barras';
import { esp, raios, ROTULOS, TOQUE_MINIMO } from '../../tema';
import { tempoRelativo } from '../../utilitarios/formato';

const TIPOS = [
  { chave: 'remedio', rotulo: 'Remedio', icone: 'medical-outline', exemplo: 'Buscar receita ou remedio na UBS' },
  { chave: 'mercado', rotulo: 'Mercado', icone: 'basket-outline', exemplo: 'Comprar pao, leite, feira' },
  { chave: 'conversa', rotulo: 'Companhia', icone: 'chatbubble-ellipses-outline', exemplo: 'Alguem para conversar ou caminhar' },
  { chave: 'transporte', rotulo: 'Transporte', icone: 'car-outline', exemplo: 'Ir ate a consulta ou ao banco' },
];

export default function Ajuda() {
  const { cores, t, minhaPessoa, estado, carregando, atualizar, acoes, pronto, avisar } = usePerto();
  const [tipo, setTipo] = useState(null);
  const [detalhe, setDetalhe] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (!pronto || !estado) return <Carregando />;

  const meusPedidos = (estado.pedidos || [])
    .filter((p) => p.pessoaId === minhaPessoa?.id)
    .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));

  const enviar = async () => {
    if (!tipo) {
      avisar('Escolha do que voce precisa', 'Toque em uma das quatro opcoes acima.', 'atencao');
      return;
    }
    setEnviando(true);
    const r = await acoes.pedir(minhaPessoa.id, tipo, detalhe.trim() || TIPOS.find((x) => x.chave === tipo).exemplo);
    setEnviando(false);
    setTipo(null);
    setDetalhe('');
    avisar(
      r.offline ? 'Guardado no celular' : 'Pedido enviado',
      r.offline
        ? 'Sem internet agora. O pedido sobe sozinho quando a conexao voltar.'
        : 'A sua rede de apoio e a equipe da UBS ja podem ver este pedido.',
      r.offline ? 'atencao' : 'ok'
    );
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

        <View style={{ padding: esp(5), gap: esp(4) }}>
          <View>
            <Titulo style={{ marginBottom: esp(1) }}>Pedir ajuda</Titulo>
            <Texto cor={cores.tinta2}>
              Para o dia a dia, sem pressa. Para emergencia, use o botao vermelho na tela Hoje.
            </Texto>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: esp(3) }}>
            {TIPOS.map((op) => {
              const ativo = tipo === op.chave;
              return (
                <Pressable
                  key={op.chave}
                  onPress={() => setTipo(ativo ? null : op.chave)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: ativo }}
                  accessibilityLabel={op.rotulo}
                  accessibilityHint={op.exemplo}
                  style={{
                    flexGrow: 1,
                    flexBasis: '45%',
                    minHeight: TOQUE_MINIMO + 56,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: esp(2),
                    padding: esp(4),
                    borderRadius: raios.grande,
                    borderWidth: ativo ? 3 : 1.5,
                    borderColor: ativo ? cores.primaria : cores.linha,
                    backgroundColor: ativo ? cores.primariaClara : cores.papel,
                  }}
                >
                  <Ionicons name={op.icone} size={t(30)} color={ativo ? cores.primariaEscura : cores.primaria} />
                  <Texto tamanho="medio" peso="800" cor={ativo ? cores.primariaEscura : cores.tinta}>
                    {op.rotulo}
                  </Texto>
                  <Texto tamanho="mini" cor={cores.tinta2} style={{ textAlign: 'center' }}>
                    {op.exemplo}
                  </Texto>
                  {ativo ? <Ionicons name="checkmark-circle" size={t(20)} color={cores.primaria} /> : null}
                </Pressable>
              );
            })}
          </View>

          <View>
            <Texto peso="800" style={{ marginBottom: esp(2) }} nativeID="rotulo-detalhe">
              Quer explicar melhor? (opcional)
            </Texto>
            <TextInput
              value={detalhe}
              onChangeText={setDetalhe}
              multiline
              placeholder="Ex.: preciso buscar a receita da pressao na UBS"
              placeholderTextColor={cores.tinta3}
              accessibilityLabelledBy="rotulo-detalhe"
              accessibilityLabel="Detalhe do pedido, opcional"
              style={{
                minHeight: 110,
                textAlignVertical: 'top',
                backgroundColor: cores.papel,
                borderWidth: 1.5,
                borderColor: cores.linhaForte,
                borderRadius: raios.medio,
                padding: esp(3),
                fontSize: t(16),
                color: cores.tinta,
              }}
            />
          </View>

          <Botao
            titulo="Enviar pedido"
            icone="paper-plane-outline"
            largo
            carregando={enviando}
            desabilitado={!tipo}
            dica="Avisa a rede de apoio e a equipe da UBS sobre o seu pedido"
            onPress={enviar}
          />

          <View style={{ gap: esp(3), marginTop: esp(3) }}>
            <Texto tamanho="pequeno" peso="800" cor={cores.tinta3}>
              MEUS PEDIDOS
            </Texto>

            {meusPedidos.length === 0 ? (
              <Vazio
                icone="file-tray-outline"
                nivel="info"
                titulo="Nenhum pedido ainda"
                texto="Quando voce pedir algo, o andamento aparece aqui."
              />
            ) : (
              meusPedidos.map((p) => (
                <Cartao
                  key={p.id}
                  destaque={p.status === 'concluido' ? cores.ok : p.status === 'aceito' ? cores.info : cores.atencao}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp(2), marginBottom: esp(2) }}>
                    <Ionicons name={ROTULOS.iconePedido[p.tipo] || 'help-circle-outline'} size={t(20)} color={cores.primaria} />
                    <Texto peso="800">{ROTULOS.tipoPedido[p.tipo] || p.tipo}</Texto>
                  </View>
                  <Texto cor={cores.tinta2}>{p.detalhe}</Texto>
                  <View style={{ marginTop: esp(3), gap: esp(2) }}>
                    <Selo
                      nivel={p.status === 'concluido' ? 'ok' : p.status === 'aceito' ? 'info' : 'atencao'}
                      icone={p.status === 'concluido' ? 'checkmark-circle-outline' : p.status === 'aceito' ? 'person-outline' : 'time-outline'}
                      texto={
                        p.status === 'concluido'
                          ? 'Feito'
                          : p.status === 'aceito'
                          ? `${p.voluntario?.nome || 'Alguem'} vai resolver`
                          : 'Aguardando alguem'
                      }
                    />
                    <Texto tamanho="mini" cor={cores.tinta3}>
                      Pedido {tempoRelativo(p.criadoEm)}
                    </Texto>
                  </View>
                </Cartao>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
