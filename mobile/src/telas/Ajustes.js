/**
 * Ajustes - acessibilidade e conexao.
 * As preferencias ficam dentro do proprio app porque nem todo mundo sabe
 * mexer nas configuracoes do sistema, e porque elas precisam valer na hora.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { usePerto } from '../contexto/Perto';
import { Texto, Titulo, Cartao, Botao, Selo, Divisor } from '../componentes/Base';
import * as API from '../servicos/api';
import { esp, raios, ESCALAS, TOQUE_MINIMO } from '../tema';

function Linha({ titulo, descricao, children }) {
  const { cores } = usePerto();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp(4), paddingVertical: esp(3) }}>
      <View style={{ flex: 1 }}>
        <Texto peso="700">{titulo}</Texto>
        {descricao ? (
          <Texto tamanho="pequeno" cor={cores.tinta2}>
            {descricao}
          </Texto>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export default function Ajustes() {
  const { cores, t, prefs, salvarPrefs, usuario, sair, modo, origem, fila, atualizar, semMovimento, avisar, perguntar } =
    usePerto();
  const [url, setUrl] = useState(API.servico.base);
  const [testando, setTestando] = useState(false);

  const reconectar = async () => {
    setTestando(true);
    await API.definirBaseManual(url.trim());
    await atualizar({ silencioso: false });
    setTestando(false);
    avisar(
      API.servico.modo === 'api' ? 'Conectado' : 'Nao foi possivel conectar',
      API.servico.modo === 'api'
        ? `O app esta usando ${API.servico.base}. O que voce fizer aqui aparece no painel web.`
        : 'Nenhum servidor respondeu. O app segue funcionando com os dados guardados no celular.',
      API.servico.modo === 'api' ? 'ok' : 'atencao'
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.areia }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: esp(5), gap: esp(4), paddingBottom: esp(12) }}>
        <Titulo>Ajustes</Titulo>

        {/* ---------------- Acessibilidade ---------------- */}
        <Cartao>
          <Texto tamanho="pequeno" peso="800" cor={cores.tinta3}>
            LEITURA E MOVIMENTO
          </Texto>

          <View style={{ marginTop: esp(3) }}>
            <Texto peso="700" style={{ marginBottom: esp(2) }}>
              Tamanho do texto
            </Texto>
            <View
              style={{ flexDirection: 'row', gap: esp(2) }}
              accessibilityRole="radiogroup"
              accessibilityLabel="Tamanho do texto do aplicativo"
            >
              {ESCALAS.map((e) => {
                const ativo = prefs.escala === e.chave;
                return (
                  <Pressable
                    key={e.chave}
                    onPress={() => salvarPrefs({ escala: e.chave })}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: ativo }}
                    accessibilityLabel={`Texto ${e.rotulo}`}
                    style={{
                      flex: 1,
                      minHeight: TOQUE_MINIMO + 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: raios.medio,
                      borderWidth: ativo ? 3 : 1.5,
                      borderColor: ativo ? cores.primaria : cores.linha,
                      backgroundColor: ativo ? cores.primariaClara : cores.papel,
                      gap: esp(1),
                    }}
                  >
                    <Texto
                      peso="800"
                      cor={ativo ? cores.primariaEscura : cores.tinta2}
                      style={{ fontSize: Math.round(14 * e.fator) }}
                    >
                      Aa
                    </Texto>
                    <Texto tamanho="mini" cor={ativo ? cores.primariaEscura : cores.tinta2}>
                      {e.rotulo}
                    </Texto>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Divisor />

          <Linha
            titulo="Alto contraste"
            descricao="Preto no branco, bordas mais fortes e menos cinza."
          >
            <Switch
              value={prefs.altoContraste}
              onValueChange={(v) => salvarPrefs({ altoContraste: v })}
              accessibilityLabel="Alto contraste"
              trackColor={{ true: cores.primaria, false: cores.linhaForte }}
              thumbColor={cores.papel}
            />
          </Linha>

          <Linha
            titulo="Reduzir animacoes"
            descricao="Troca os movimentos por mudancas diretas de estado."
          >
            <Switch
              value={prefs.reduzirMovimento}
              onValueChange={(v) => salvarPrefs({ reduzirMovimento: v })}
              accessibilityLabel="Reduzir animacoes"
              trackColor={{ true: cores.primaria, false: cores.linhaForte }}
              thumbColor={cores.papel}
            />
          </Linha>

          {semMovimento && !prefs.reduzirMovimento ? (
            <Selo
              nivel="info"
              icone="information-circle-outline"
              texto="O seu celular ja pede menos animacoes e o app respeita isso"
            />
          ) : null}
        </Cartao>

        {/* ---------------- Conexao ---------------- */}
        <Cartao>
          <Texto tamanho="pequeno" peso="800" cor={cores.tinta3} style={{ marginBottom: esp(3) }}>
            CONEXAO COM O PAINEL DA UBS
          </Texto>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: esp(2), marginBottom: esp(3) }}>
            <Selo
              nivel={modo === 'api' ? 'ok' : 'atencao'}
              icone={modo === 'api' ? 'cloud-done-outline' : 'cloud-offline-outline'}
              texto={modo === 'api' ? 'Conectado ao servidor' : 'Sem servidor'}
            />
            {fila > 0 ? <Selo nivel="atencao" icone="cloud-upload-outline" texto={`${fila} na fila`} /> : null}
            {origem === 'cache' ? <Selo nivel="info" icone="save-outline" texto="Dados salvos no celular" /> : null}
          </View>

          <Texto tamanho="pequeno" cor={cores.tinta2} style={{ marginBottom: esp(2) }}>
            O app procura o servidor sozinho (inclusive o computador que esta rodando o Expo).
            Se precisar, informe o endereco manualmente.
          </Texto>

          <TextInput
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="http://192.168.0.10:3333"
            placeholderTextColor={cores.tinta3}
            accessibilityLabel="Endereco do servidor da API"
            style={{
              minHeight: TOQUE_MINIMO,
              backgroundColor: cores.papel,
              borderWidth: 1.5,
              borderColor: cores.linhaForte,
              borderRadius: raios.pequeno,
              paddingHorizontal: esp(3),
              fontSize: t(15),
              color: cores.tinta,
            }}
          />

          <Botao
            titulo="Conectar e atualizar"
            variante="secundario"
            icone="refresh"
            largo
            carregando={testando}
            style={{ marginTop: esp(3) }}
            onPress={reconectar}
          />
        </Cartao>

        {/* ---------------- Sessao ---------------- */}
        <Cartao>
          <Texto tamanho="pequeno" peso="800" cor={cores.tinta3} style={{ marginBottom: esp(2) }}>
            VOCE ESTA USANDO COMO
          </Texto>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp(3) }}>
            <Ionicons
              name={usuario?.perfil === 'idoso' ? 'home-outline' : 'people-outline'}
              size={t(24)}
              color={cores.primaria}
            />
            <View style={{ flex: 1 }}>
              <Texto peso="800">{usuario?.nome}</Texto>
              <Texto tamanho="pequeno" cor={cores.tinta2}>
                {usuario?.perfil === 'idoso' ? 'Pessoa acompanhada' : 'Rede de apoio'}
              </Texto>
            </View>
          </View>
          <Botao
            titulo="Trocar de pessoa"
            variante="fantasma"
            icone="swap-horizontal-outline"
            largo
            style={{ marginTop: esp(3) }}
            dica="Volta para a tela de escolha de perfil da demonstracao"
            onPress={() =>
              perguntar({
                titulo: 'Trocar de pessoa',
                texto: 'Voce vai voltar para a tela inicial da demonstracao.',
                icone: 'swap-horizontal-outline',
                opcoes: [
                  { texto: 'Trocar', aoTocar: sair },
                  { texto: 'Cancelar', estilo: 'cancelar' },
                ],
              })
            }
          />
        </Cartao>

        <Texto tamanho="mini" cor={cores.tinta3} style={{ textAlign: 'center' }}>
          Perto 1.0 · Global Solution CitizenTech · FIAP{'\n'}
          Projeto academico com dados ficticios.
        </Texto>
      </ScrollView>
    </SafeAreaView>
  );
}
