/**
 * Entrada no app.
 * Prototipo academico: em vez de senha, a pessoa escolhe quem e.
 * As duas jornadas do app ficam explicitas logo na abertura.
 */
import React from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { usePerto } from '../contexto/Perto';
import { Texto, Titulo, Cartao, Carregando } from '../componentes/Base';
import { esp, raios, sombra, TOQUE_MINIMO } from '../tema';
import { primeiroNome } from '../utilitarios/formato';

function Opcao({ usuario, aoEscolher }) {
  const { cores, t } = usePerto();
  const ehIdoso = usuario.perfil === 'idoso';
  const cor = ehIdoso ? cores.primaria : cores.acento;
  const fundo = ehIdoso ? cores.primariaClara : cores.acentoClaro;

  const descricao = ehIdoso
    ? 'Fazer o check-in diario, pedir ajuda e ver quem esta de olho'
    : `Receber os avisos de ${(usuario.cuidaDe || []).length} vizinho(s) e confirmar visitas`;

  return (
    <Pressable
      onPress={() => aoEscolher(usuario)}
      accessibilityRole="button"
      accessibilityLabel={`Entrar como ${usuario.nome}, ${ehIdoso ? 'pessoa acompanhada' : 'rede de apoio'}`}
      accessibilityHint={descricao}
      style={({ pressed }) => ({
        minHeight: TOQUE_MINIMO + 28,
        flexDirection: 'row',
        alignItems: 'center',
        gap: esp(3),
        backgroundColor: cores.papel,
        borderRadius: raios.grande,
        borderWidth: 1.5,
        borderColor: pressed ? cor : cores.linha,
        padding: esp(4),
        ...sombra,
      })}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: raios.medio,
          backgroundColor: fundo,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={ehIdoso ? 'home-outline' : 'people-outline'} size={t(26)} color={cor} />
      </View>
      <View style={{ flex: 1 }}>
        <Texto tamanho="medio" peso="800">
          {usuario.apelido || primeiroNome(usuario.nome)}
        </Texto>
        <Texto tamanho="pequeno" cor={cores.tinta2}>
          {descricao}
        </Texto>
      </View>
      <Ionicons name="chevron-forward" size={t(22)} color={cores.tinta3} />
    </Pressable>
  );
}

export default function Entrar() {
  const { cores, estado, pronto, entrar, modo } = usePerto();

  if (!pronto) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: cores.areia }}>
        <Carregando texto="Preparando o app..." />
      </SafeAreaView>
    );
  }

  const usuarios = (estado?.usuarios || []).filter((u) => u.perfil !== 'acs');
  const idosos = usuarios.filter((u) => u.perfil === 'idoso');
  const rede = usuarios.filter((u) => u.perfil === 'rede');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.areia }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: esp(5), gap: esp(5), paddingBottom: esp(12) }}>
        <View style={{ alignItems: 'center', gap: esp(2), marginTop: esp(4) }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: raios.grande,
              backgroundColor: cores.primaria,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="heart-circle-outline" size={38} color={cores.branco} />
          </View>
          <Titulo style={{ marginBottom: 0 }}>Perto</Titulo>
          <Texto tamanho="medio" cor={cores.tinta2} style={{ textAlign: 'center' }}>
            A rede de cuidado do seu bairro
          </Texto>
        </View>

        <Cartao>
          <Texto tamanho="pequeno" cor={cores.tinta2}>
            Este e um prototipo academico. Em vez de criar conta, escolha abaixo quem voce e
            para percorrer a jornada daquela pessoa. Os dados sao ficticios e compartilhados
            com o painel web da UBS.
          </Texto>
        </Cartao>

        <View style={{ gap: esp(3) }}>
          <Texto tamanho="pequeno" peso="800" cor={cores.tinta3}>
            SOU ACOMPANHADA PELA REDE
          </Texto>
          {idosos.map((u) => (
            <Opcao key={u.id} usuario={u} aoEscolher={entrar} />
          ))}
        </View>

        <View style={{ gap: esp(3) }}>
          <Texto tamanho="pequeno" peso="800" cor={cores.tinta3}>
            SOU DA REDE DE APOIO
          </Texto>
          {rede.map((u) => (
            <Opcao key={u.id} usuario={u} aoEscolher={entrar} />
          ))}
        </View>

        <Texto tamanho="mini" cor={cores.tinta3} style={{ textAlign: 'center' }}>
          {modo === 'api'
            ? 'Conectado ao servidor: o que voce fizer aqui aparece no painel web.'
            : 'Sem servidor conectado: o app abre com dados de exemplo.'}
        </Texto>
      </ScrollView>
    </SafeAreaView>
  );
}
