/**
 * O botao "Estou bem".
 * ---------------------------------------------------------------------------
 * E a acao mais importante do app e por isso ocupa quase a tela inteira:
 * area de toque enorme, um unico alvo, sem risco de errar.
 *
 * MOTION DESIGN com funcao:
 *  - ao tocar, o circulo encolhe um pouco (resposta imediata ao dedo);
 *  - um anel sai de dentro dele e se abre (o toque "saiu" daqui, foi registrado);
 *  - o check cresce e o botao muda de cor e de texto (estado novo, legivel sem ler);
 *  - quem prefere menos movimento ve apenas a troca de estado, sem animacao.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { usePerto } from '../contexto/Perto';
import { Texto } from './Base';
import { esp, raios, sombraForte } from '../tema';

export default function BotaoCheckin({ feito, horaFeito, enviando, onCheckin }) {
  const { cores, t, semMovimento } = usePerto();

  const escala = useRef(new Animated.Value(1)).current;
  const anel = useRef(new Animated.Value(0)).current;
  const marca = useRef(new Animated.Value(feito ? 1 : 0)).current;
  const [acabouDeFazer, setAcabouDeFazer] = useState(false);

  useEffect(() => {
    if (!feito) {
      marca.setValue(0);
      return;
    }
    if (semMovimento) {
      marca.setValue(1);
      return;
    }
    Animated.spring(marca, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 10 }).start();
  }, [feito, semMovimento, marca]);

  const tocar = async () => {
    if (feito || enviando) return;

    if (!semMovimento) {
      anel.setValue(0);
      Animated.parallel([
        Animated.sequence([
          Animated.timing(escala, { toValue: 0.94, duration: 90, useNativeDriver: true }),
          Animated.spring(escala, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 12 }),
        ]),
        Animated.timing(anel, {
          toValue: 1,
          duration: 620,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      /* aparelho sem vibracao */
    }

    setAcabouDeFazer(true);
    await onCheckin();
  };

  const lado = Math.round(216 * Math.min(t(16) / 16, 1.2));
  const fundo = feito ? cores.okFundo : cores.primaria;
  const borda = feito ? cores.ok : cores.primariaEscura;
  const corTexto = feito ? cores.ok : cores.branco;

  return (
    <View style={{ alignItems: 'center', gap: esp(3) }}>
      <View style={{ width: lado, height: lado, alignItems: 'center', justifyContent: 'center' }}>
        {/* Anel que se abre: confirma que o toque virou um aviso para a rede */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: lado,
            height: lado,
            borderRadius: lado / 2,
            borderWidth: 4,
            borderColor: cores.primaria,
            opacity: anel.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.6, 0] }),
            transform: [{ scale: anel.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }],
          }}
        />

        <Animated.View style={{ transform: [{ scale: escala }] }}>
          <Pressable
            onPress={tocar}
            disabled={feito || enviando}
            accessibilityRole="button"
            accessibilityLabel={feito ? 'Check-in de hoje ja feito' : 'Estou bem. Fazer o check-in de hoje'}
            accessibilityHint={
              feito
                ? `Voce avisou que esta bem as ${horaFeito || 'hoje'}. Nao precisa tocar de novo.`
                : 'Avisa a sua rede de apoio e a equipe da UBS que esta tudo bem hoje'
            }
            accessibilityState={{ disabled: Boolean(feito || enviando), busy: Boolean(enviando) }}
            style={({ pressed }) => ({
              width: lado,
              height: lado,
              borderRadius: lado / 2,
              backgroundColor: fundo,
              borderWidth: 4,
              borderColor: borda,
              alignItems: 'center',
              justifyContent: 'center',
              gap: esp(2),
              opacity: pressed && !semMovimento ? 0.94 : 1,
              ...sombraForte,
            })}
          >
            <Animated.View
              style={{
                transform: [{ scale: feito ? marca : 1 }],
                opacity: feito ? marca : 1,
              }}
            >
              <Ionicons
                name={feito ? 'checkmark-circle' : 'hand-left-outline'}
                size={t(feito ? 64 : 52)}
                color={corTexto}
              />
            </Animated.View>

            <Texto tamanho="grande" peso="800" cor={corTexto} style={{ textAlign: 'center' }}>
              {feito ? 'Tudo certo' : 'Estou bem'}
            </Texto>
            {!feito ? (
              <Texto tamanho="pequeno" peso="700" cor={corTexto} style={{ textAlign: 'center', opacity: 0.9 }}>
                toque uma vez
              </Texto>
            ) : null}
          </Pressable>
        </Animated.View>
      </View>

      <Texto
        tamanho="medio"
        peso="700"
        cor={feito ? cores.ok : cores.tinta2}
        style={{ textAlign: 'center', paddingHorizontal: esp(4) }}
      >
        {feito
          ? acabouDeFazer
            ? 'Pronto. Sua rede de apoio ja sabe que voce esta bem.'
            : `Voce avisou que esta bem as ${horaFeito || 'hoje'}.`
          : 'Toque no botao para avisar que esta tudo bem hoje.'}
      </Texto>
    </View>
  );
}
