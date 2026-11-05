/**
 * Tela "Hoje" - a casa da pessoa acompanhada.
 * Uma unica acao principal, enorme e no centro. Tudo o mais e apoio.
 */
import React, { useState } from 'react';
import { Linking, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { usePerto } from '../../contexto/Perto';
import { Texto, Titulo, Cartao, Botao, Selo, Carregando } from '../../componentes/Base';
import { BarraEstado, BannerAviso } from '../../componentes/Barras';
import BotaoCheckin from '../../componentes/BotaoCheckin';
import BotaoSOS from '../../componentes/BotaoSOS';
import { esp, raios } from '../../tema';
import { hora, dataHora, saudacao, primeiroNome, soDigitos, diaDaSemana } from '../../utilitarios/formato';

export default function Hoje() {
  const { cores, t, usuario, minhaPessoa, estado, carregando, atualizar, acoes, pronto, avisar } = usePerto();
  const [enviando, setEnviando] = useState(false);

  if (!pronto || !estado) return <Carregando />;

  const pessoa = minhaPessoa;
  const feito = pessoa?.status?.codigo === 'ok';
  const janela = pessoa?.janelaCheckin || { inicio: '07:00', fim: '11:00' };
  const visita = pessoa?.proximaVisita;
  const rede = pessoa?.redeApoio || [];

  const registrar = async (humor = 'bem') => {
    if (!pessoa) return;
    setEnviando(true);
    const r = await acoes.checkin(pessoa.id, humor);
    setEnviando(false);
    if (r.offline) {
      avisar(
        'Guardamos aqui no celular',
        'Voce esta sem internet agora. Assim que a conexao voltar, o aviso sobe sozinho para a sua rede.',
        'atencao'
      );
    }
  };

  const pedirAjuda = async () => {
    if (!pessoa) return;
    setEnviando(true);
    const r = await acoes.sos(pessoa.id, 'Botao de emergencia acionado no app.');
    setEnviando(false);
    avisar(
      r.offline ? 'Sem internet agora' : 'Pedido enviado',
      r.offline
        ? 'Nao conseguimos avisar agora. Se puder, ligue para alguem da sua rede. O pedido sobe assim que a conexao voltar.'
        : `${rede.length ? `${rede.length} pessoa(s) da sua rede` : 'A equipe da UBS'} acabou de ser avisada. Alguem vai entrar em contato.`,
      r.offline ? 'atencao' : 'ok'
    );
  };

  const ligar = (telefone) => {
    const numero = soDigitos(telefone);
    if (numero) Linking.openURL(`tel:${numero}`);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.areia }} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: esp(12) }}
        refreshControl={
          <RefreshControl
            refreshing={carregando}
            onRefresh={() => atualizar({ silencioso: false })}
            colors={[cores.primaria]}
            tintColor={cores.primaria}
          />
        }
      >
        <BarraEstado />
        <BannerAviso />

        <View style={{ paddingHorizontal: esp(5), paddingTop: esp(5) }}>
          <Texto tamanho="pequeno" peso="800" cor={cores.tinta3}>
            {diaDaSemana(new Date().toISOString()).toUpperCase()}
          </Texto>
          <Titulo style={{ marginBottom: esp(1) }}>
            {saudacao()}, {usuario?.apelido || primeiroNome(usuario?.nome || '')}
          </Titulo>
          <Texto cor={cores.tinta2}>
            {feito
              ? 'Hoje ja esta resolvido. Bom dia tranquilo.'
              : `Voce combinou avisar entre ${janela.inicio} e ${janela.fim}.`}
          </Texto>
        </View>

        <View style={{ paddingVertical: esp(7) }}>
          <BotaoCheckin
            feito={feito}
            horaFeito={pessoa?.status?.em ? hora(pessoa.status.em) : null}
            enviando={enviando}
            onCheckin={() => registrar('bem')}
          />
        </View>

        {!feito ? (
          <View style={{ paddingHorizontal: esp(5), gap: esp(3) }}>
            <Texto tamanho="pequeno" cor={cores.tinta2} style={{ textAlign: 'center' }}>
              Se hoje nao esta um bom dia, avise assim mesmo:
            </Texto>
            <View style={{ flexDirection: 'row', gap: esp(3) }}>
              <Botao
                titulo="Mais ou menos"
                variante="secundario"
                icone="remove-circle-outline"
                style={{ flex: 1 }}
                dica="Avisa que voce esta em casa, mas nao esta se sentindo bem"
                onPress={() => registrar('mais_ou_menos')}
              />
              <Botao
                titulo="Preciso de ajuda"
                variante="secundario"
                icone="hand-right-outline"
                style={{ flex: 1 }}
                dica="Avisa a sua rede de apoio que voce precisa de ajuda hoje"
                onPress={() => registrar('preciso_de_ajuda')}
              />
            </View>
          </View>
        ) : null}

        <View style={{ padding: esp(5), gap: esp(4) }}>
          {visita ? (
            <Cartao destaque={cores.info}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp(2), marginBottom: esp(2) }}>
                <Ionicons name="calendar-outline" size={t(20)} color={cores.info} />
                <Texto tamanho="pequeno" peso="800" cor={cores.info}>
                  PROXIMA VISITA
                </Texto>
              </View>
              <Texto tamanho="medio" peso="800">
                {dataHora(visita.quando)}
              </Texto>
              <Texto cor={cores.tinta2}>{visita.responsavel}</Texto>
              {visita.notas ? (
                <Texto tamanho="pequeno" cor={cores.tinta2} style={{ marginTop: esp(1) }}>
                  {visita.notas}
                </Texto>
              ) : null}
              <Texto tamanho="mini" cor={cores.tinta3} style={{ marginTop: esp(2) }}>
                Agendada pela equipe no painel da UBS.
              </Texto>
            </Cartao>
          ) : null}

          <Cartao>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp(2), marginBottom: esp(3) }}>
              <Ionicons name="people-outline" size={t(20)} color={cores.primaria} />
              <Texto tamanho="pequeno" peso="800" cor={cores.tinta3}>
                QUEM ESTA DE OLHO EM VOCE
              </Texto>
            </View>

            {rede.length ? (
              rede.map((r) => (
                <View
                  key={r.id || r.nome}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: esp(3),
                    paddingVertical: esp(2),
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Texto peso="700">{r.nome}</Texto>
                    <Texto tamanho="pequeno" cor={cores.tinta2}>
                      {r.relacao}
                      {r.distancia ? ` · ${r.distancia}` : ''}
                    </Texto>
                  </View>
                  {r.telefone ? (
                    <Botao
                      titulo="Ligar"
                      variante="secundario"
                      icone="call-outline"
                      dica={`Liga para ${r.nome}`}
                      onPress={() => ligar(r.telefone)}
                    />
                  ) : null}
                </View>
              ))
            ) : (
              <Texto cor={cores.tinta2}>
                Ainda nao ha ninguem cadastrado. Fale com a agente de saude na proxima visita.
              </Texto>
            )}
          </Cartao>

          <View style={{ gap: esp(2) }}>
            <Texto tamanho="pequeno" peso="800" cor={cores.tinta3}>
              EMERGENCIA
            </Texto>
            <BotaoSOS onAcionar={pedirAjuda} enviando={enviando} />
          </View>

          <Cartao>
            <Selo nivel="info" icone="time-outline" texto={`Janela combinada: ${janela.inicio} as ${janela.fim}`} />
            <Texto tamanho="pequeno" cor={cores.tinta2} style={{ marginTop: esp(2) }}>
              Se o check-in nao for feito ate as {janela.fim}, a sua rede de apoio e avisada.
              Se ninguem puder ir em 45 minutos, a equipe da UBS entra no caso.
            </Texto>
          </Cartao>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
