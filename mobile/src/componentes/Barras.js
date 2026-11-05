/**
 * Faixas de contexto que aparecem no topo das telas.
 *
 * BarraEstado  - avisa quando o app esta sem servidor ou com acoes na fila.
 *                O movimento (descer e subir) existe para a mudanca de estado
 *                nao passar despercebida sem precisar de um alerta modal.
 * BannerAviso  - mostra o aviso que a UBS publicou no painel web. E o caminho
 *                da integracao web -> app visivel para a pessoa.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { usePerto } from '../contexto/Perto';
import { Texto } from './Base';
import { esp, raios, corDoNivel } from '../tema';

export function BarraEstado() {
  const { cores, t, modo, origem, fila, semMovimento, atualizar } = usePerto();
  const aparecer = useRef(new Animated.Value(0)).current;

  const semServidor = modo !== 'api';
  const pendentes = fila > 0;
  const visivel = semServidor || pendentes || origem === 'cache';

  useEffect(() => {
    if (semMovimento) {
      aparecer.setValue(visivel ? 1 : 0);
      return;
    }
    Animated.spring(aparecer, {
      toValue: visivel ? 1 : 0,
      useNativeDriver: true,
      speed: 14,
      bounciness: 8,
    }).start();
  }, [visivel, semMovimento, aparecer]);

  if (!visivel) return null;

  const texto = pendentes
    ? `${fila} acao(oes) esperando a internet voltar`
    : semServidor
    ? 'Sem conexao com o servidor'
    : 'Mostrando os ultimos dados salvos no celular';

  const detalhe = pendentes
    ? 'Esta tudo guardado no celular e sobe sozinho quando a conexao voltar.'
    : 'Voce pode continuar usando: o que fizer agora fica guardado.';

  return (
    <Animated.View
      style={{
        opacity: aparecer,
        transform: [{ translateY: aparecer.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) }],
        marginHorizontal: esp(4),
        marginTop: esp(3),
      }}
    >
      <Pressable
        onPress={() => atualizar({ silencioso: false })}
        accessibilityRole="button"
        accessibilityLabel={`${texto}. ${detalhe}`}
        accessibilityHint="Toque para tentar conectar de novo"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: esp(3),
          backgroundColor: cores.atencaoFundo,
          borderColor: cores.atencao,
          borderWidth: 1.5,
          borderRadius: raios.medio,
          padding: esp(3),
        }}
      >
        <Ionicons name={pendentes ? 'cloud-upload-outline' : 'cloud-offline-outline'} size={t(22)} color={cores.atencao} />
        <View style={{ flex: 1 }}>
          <Texto tamanho="pequeno" peso="800" cor={cores.atencao}>
            {texto}
          </Texto>
          <Texto tamanho="mini" cor={cores.tinta2}>
            {detalhe}
          </Texto>
        </View>
        <Ionicons name="refresh" size={t(18)} color={cores.atencao} />
      </Pressable>
    </Animated.View>
  );
}

export function BannerAviso() {
  const { cores, t, avisoAtivo, semMovimento } = usePerto();
  const [aberto, setAberto] = useState(false);
  const altura = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(altura, {
      toValue: aberto ? 1 : 0,
      duration: semMovimento ? 1 : 220,
      useNativeDriver: false,
    }).start();
  }, [aberto, semMovimento, altura]);

  if (!avisoAtivo) return null;
  const c = corDoNivel(cores, avisoAtivo.nivel);

  return (
    <View style={{ marginHorizontal: esp(4), marginTop: esp(3) }}>
      <Pressable
        onPress={() => setAberto((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: aberto }}
        accessibilityLabel={`Aviso do bairro: ${avisoAtivo.titulo}`}
        accessibilityHint={aberto ? 'Toque para fechar o aviso' : 'Toque para ler o aviso completo'}
        style={{
          backgroundColor: c.fundo,
          borderColor: c.texto,
          borderWidth: 1.5,
          borderLeftWidth: 5,
          borderRadius: raios.medio,
          padding: esp(3),
          gap: esp(1),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp(2) }}>
          <Ionicons name={avisoAtivo.nivel === 'info' ? 'information-circle' : 'warning'} size={t(20)} color={c.texto} />
          <Texto tamanho="pequeno" peso="800" cor={c.texto} style={{ flex: 1 }}>
            {avisoAtivo.titulo}
          </Texto>
          <Ionicons name={aberto ? 'chevron-up' : 'chevron-down'} size={t(18)} color={c.texto} />
        </View>

        <Animated.View
          style={{
            opacity: altura,
            maxHeight: altura.interpolate({ inputRange: [0, 1], outputRange: [0, 400] }),
            overflow: 'hidden',
          }}
        >
          <Texto tamanho="pequeno" cor={cores.tinta} style={{ marginTop: esp(1) }}>
            {avisoAtivo.texto}
          </Texto>
          <Texto tamanho="mini" cor={cores.tinta3} style={{ marginTop: esp(1) }}>
            Publicado por {avisoAtivo.autor}
          </Texto>
        </Animated.View>
      </Pressable>
    </View>
  );
}
