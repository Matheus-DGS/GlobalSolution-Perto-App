/**
 * Botao de emergencia.
 * ---------------------------------------------------------------------------
 * Precisa ser dificil de acionar por engano e facil de acionar de verdade.
 *
 * MOTION DESIGN com funcao: a barra que preenche em 2 segundos mostra que a
 * acao esta a caminho e que da tempo de soltar o dedo para desistir. Sem o
 * movimento, a pessoa nao saberia que precisa segurar nem que pode cancelar.
 *
 * ACESSIBILIDADE: quem usa leitor de tela nao consegue "segurar" com precisao,
 * entao um toque de acessibilidade abre uma confirmacao em texto.
 */
import React, { useRef, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { usePerto } from '../contexto/Perto';
import { Texto } from './Base';
import { esp, raios, TOQUE_MINIMO } from '../tema';

const SEGURAR_MS = 2000;

export default function BotaoSOS({ onAcionar, enviando }) {
  const { cores, t, semMovimento, perguntar } = usePerto();
  const progresso = useRef(new Animated.Value(0)).current;
  const [segurando, setSegurando] = useState(false);
  const animacao = useRef(null);

  const disparar = async () => {
    setSegurando(false);
    progresso.setValue(0);
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      /* sem vibracao */
    }
    onAcionar();
  };

  const comecar = () => {
    if (enviando) return;
    setSegurando(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      /* sem vibracao */
    }
    progresso.setValue(0);
    animacao.current = Animated.timing(progresso, {
      toValue: 1,
      duration: semMovimento ? 700 : SEGURAR_MS,
      easing: Easing.linear,
      useNativeDriver: false, // a largura da barra nao e animavel pelo driver nativo
    });
    animacao.current.start(({ finished }) => {
      if (finished) disparar();
    });
  };

  const cancelar = () => {
    animacao.current?.stop();
    setSegurando(false);
    Animated.timing(progresso, { toValue: 0, duration: 180, useNativeDriver: false }).start();
  };

  const confirmarPorTexto = () => {
    perguntar({
      titulo: 'Pedir ajuda agora?',
      texto: 'A sua rede de apoio e a equipe da UBS serao avisadas imediatamente.',
      nivel: 'critico',
      opcoes: [
        { texto: 'Pedir ajuda', estilo: 'perigo', aoTocar: disparar },
        { texto: 'Cancelar', estilo: 'cancelar' },
      ],
    });
  };

  return (
    <View style={{ gap: esp(2) }}>
      <Pressable
        onPressIn={comecar}
        onPressOut={cancelar}
        onAccessibilityTap={confirmarPorTexto}
        accessibilityRole="button"
        accessibilityLabel="Pedir ajuda agora. Emergencia"
        accessibilityHint="Mantenha o dedo no botao por 2 segundos. Com leitor de tela, toque uma vez para confirmar por texto."
        accessibilityState={{ busy: Boolean(enviando) }}
        style={{
          minHeight: TOQUE_MINIMO + 24,
          borderRadius: raios.grande,
          borderWidth: 2.5,
          borderColor: cores.critico,
          backgroundColor: cores.criticoFundo,
          overflow: 'hidden',
          justifyContent: 'center',
        }}
      >
        {/* Preenchimento que avanca enquanto o dedo fica no botao */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            backgroundColor: cores.critico,
            opacity: 0.22,
            width: progresso.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp(3), padding: esp(4) }}>
          <Ionicons name="alert-circle" size={t(30)} color={cores.critico} />
          <View style={{ flex: 1 }}>
            <Texto tamanho="medio" peso="800" cor={cores.critico}>
              {segurando ? 'Continue segurando...' : 'Preciso de ajuda agora'}
            </Texto>
            <Texto tamanho="pequeno" cor={cores.tinta2}>
              {segurando
                ? 'Solte o dedo para cancelar'
                : 'Segure por 2 segundos para avisar todo mundo'}
            </Texto>
          </View>
        </View>
      </Pressable>
    </View>
  );
}
