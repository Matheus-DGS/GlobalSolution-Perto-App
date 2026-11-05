/**
 * Caixa de dialogo do Perto.
 * Substitui o Alert do sistema por dois motivos:
 *  - identidade visual: o alerta nativo nao segue a paleta, os raios nem a
 *    escala de texto escolhida pela pessoa;
 *  - acessibilidade: aqui os botoes respeitam a area de toque minima de 48
 *    pontos e recebem rotulo e dica proprios.
 *
 * MOTION DESIGN: o cartao cresce a partir do centro com uma mola curta. O
 * movimento mostra de onde a decisao veio e separa o conteudo da tela de
 * fundo sem precisar de uma transicao completa.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Texto } from './Base';
import { esp, raios, sombraForte, TOQUE_MINIMO, corDoNivel } from '../tema';

export default function Dialogo({ aberto, dados, cores, t, semMovimento, aoFechar }) {
  const entrada = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!aberto) {
      entrada.setValue(0);
      return;
    }
    if (semMovimento) {
      entrada.setValue(1);
      return;
    }
    Animated.spring(entrada, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 7 }).start();
  }, [aberto, semMovimento, entrada]);

  if (!aberto || !dados) return null;

  const { titulo, texto, opcoes = [], nivel = 'info', icone } = dados;
  const c = corDoNivel(cores, nivel);
  const lista = opcoes.length ? opcoes : [{ texto: 'Entendi' }];

  return (
    <Modal
      visible={aberto}
      transparent
      animationType={semMovimento ? 'none' : 'fade'}
      onRequestClose={aoFechar}
      accessibilityViewIsModal
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(21,35,39,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: esp(5),
        }}
      >
        <Animated.View
          style={{
            width: '100%',
            maxWidth: 420,
            opacity: entrada,
            transform: [{ scale: entrada.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
          }}
        >
          <View
            accessible
            accessibilityRole="alert"
            accessibilityLabel={`${titulo}. ${texto || ''}`}
            style={{
              backgroundColor: cores.papel,
              borderRadius: raios.grande,
              padding: esp(5),
              gap: esp(3),
              ...sombraForte,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: esp(3) }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: raios.medio,
                  backgroundColor: c.fundo,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name={icone || (nivel === 'critico' ? 'alert-circle' : nivel === 'ok' ? 'checkmark-circle' : 'information-circle')}
                  size={t(24)}
                  color={c.texto}
                />
              </View>
              <Texto tamanho="medio" peso="800" style={{ flex: 1 }}>
                {titulo}
              </Texto>
            </View>

            {texto ? <Texto cor={cores.tinta2}>{texto}</Texto> : null}

            <View style={{ gap: esp(2), marginTop: esp(1) }}>
              {lista.map((op, i) => {
                const perigo = op.estilo === 'perigo';
                const cancelar = op.estilo === 'cancelar';
                const principal = i === 0 && !cancelar;
                return (
                  <Pressable
                    key={op.texto}
                    onPress={() => {
                      aoFechar();
                      setTimeout(() => op.aoTocar?.(), 60);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={op.texto}
                    style={({ pressed }) => ({
                      minHeight: TOQUE_MINIMO,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: raios.pilula,
                      borderWidth: 2,
                      paddingHorizontal: esp(4),
                      backgroundColor: perigo
                        ? cores.critico
                        : principal
                        ? cores.primaria
                        : pressed
                        ? cores.papel2
                        : 'transparent',
                      borderColor: perigo ? cores.critico : principal ? cores.primaria : cores.linhaForte,
                    })}
                  >
                    <Texto peso="800" cor={perigo || principal ? cores.branco : cores.tinta2}>
                      {op.texto}
                    </Texto>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
