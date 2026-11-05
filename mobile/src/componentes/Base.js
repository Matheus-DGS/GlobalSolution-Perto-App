/**
 * Pecas basicas da interface do app.
 * Todas leem o tema e a escala de texto escolhida pela pessoa, e todas
 * carregam rotulos de acessibilidade.
 */
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { usePerto } from '../contexto/Perto';
import { raios, esp, tipos, sombra, TOQUE_MINIMO, corDoNivel } from '../tema';

// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------
export function Texto({ children, tamanho = 'corpo', cor, peso = '400', style, ...resto }) {
  const { cores, t } = usePerto();
  return (
    <Text
      style={[
        { fontSize: t(tipos[tamanho] ?? tamanho), color: cor || cores.tinta, fontWeight: peso, lineHeight: t((tipos[tamanho] ?? tamanho) * 1.45) },
        style,
      ]}
      {...resto}
    >
      {children}
    </Text>
  );
}

export function Titulo({ children, nivel = 1, style, cor, ...resto }) {
  const tamanho = nivel === 1 ? 'titulo' : nivel === 2 ? 'grande' : 'medio';
  return (
    <Texto
      tamanho={tamanho}
      peso="800"
      cor={cor}
      accessibilityRole="header"
      style={[{ marginBottom: esp(2) }, style]}
      {...resto}
    >
      {children}
    </Texto>
  );
}

// ---------------------------------------------------------------------------
// Cartao
// ---------------------------------------------------------------------------
export function Cartao({ children, style, destaque, ...resto }) {
  const { cores } = usePerto();
  return (
    <View
      style={[
        {
          backgroundColor: cores.papel,
          borderRadius: raios.grande,
          borderWidth: 1,
          borderColor: cores.linha,
          padding: esp(4),
          ...sombra,
        },
        destaque && { borderLeftWidth: 6, borderLeftColor: destaque },
        style,
      ]}
      {...resto}
    >
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Selo de estado: cor + icone + texto (nunca so cor)
// ---------------------------------------------------------------------------
export function Selo({ nivel = 'info', texto, icone, style }) {
  const { cores, t } = usePerto();
  const c = corDoNivel(cores, nivel);
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: esp(1.5),
          alignSelf: 'flex-start',
          backgroundColor: c.fundo,
          borderColor: c.texto,
          borderWidth: 1.5,
          borderRadius: raios.pilula,
          paddingVertical: esp(1),
          paddingHorizontal: esp(2.5),
        },
        style,
      ]}
      accessible
      accessibilityLabel={texto}
    >
      {icone ? <Ionicons name={icone} size={t(14)} color={c.texto} /> : null}
      <Texto tamanho="pequeno" peso="800" cor={c.texto}>
        {texto}
      </Texto>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Botao
// ---------------------------------------------------------------------------
export function Botao({
  titulo,
  onPress,
  variante = 'primario',
  icone,
  largo,
  carregando,
  desabilitado,
  dica,
  style,
}) {
  const { cores, t, semMovimento } = usePerto();
  const escala = useRef(new Animated.Value(1)).current;

  const paletas = {
    primario: { fundo: cores.primaria, texto: cores.branco, borda: cores.primaria },
    secundario: { fundo: cores.papel, texto: cores.primariaEscura, borda: cores.primaria },
    fantasma: { fundo: 'transparent', texto: cores.tinta2, borda: cores.linhaForte },
    perigo: { fundo: cores.critico, texto: cores.branco, borda: cores.critico },
  };
  const p = paletas[variante] || paletas.primario;

  const animar = (para) => {
    if (semMovimento) return;
    Animated.spring(escala, { toValue: para, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: escala }] }, largo && { alignSelf: 'stretch' }, style]}>
      <Pressable
        onPress={desabilitado || carregando ? undefined : onPress}
        onPressIn={() => animar(0.96)}
        onPressOut={() => animar(1)}
        accessibilityRole="button"
        accessibilityLabel={titulo}
        accessibilityHint={dica}
        accessibilityState={{ disabled: Boolean(desabilitado || carregando), busy: Boolean(carregando) }}
        style={{
          minHeight: TOQUE_MINIMO,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: esp(2),
          paddingVertical: esp(3),
          paddingHorizontal: esp(4),
          borderRadius: raios.pilula,
          backgroundColor: p.fundo,
          borderWidth: 2,
          borderColor: p.borda,
          opacity: desabilitado ? 0.5 : 1,
        }}
      >
        {carregando ? (
          <ActivityIndicator color={p.texto} />
        ) : icone ? (
          <Ionicons name={icone} size={t(19)} color={p.texto} />
        ) : null}
        <Texto tamanho="corpo" peso="800" cor={p.texto} style={{ textAlign: 'center' }}>
          {titulo}
        </Texto>
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Estados auxiliares
// ---------------------------------------------------------------------------
export function Vazio({ icone = 'checkmark-circle-outline', titulo, texto, nivel = 'ok' }) {
  const { cores, t } = usePerto();
  const c = corDoNivel(cores, nivel);
  return (
    <View
      style={{
        alignItems: 'center',
        gap: esp(2),
        padding: esp(6),
        backgroundColor: c.fundo,
        borderRadius: raios.grande,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: c.texto,
      }}
      accessible
      accessibilityLabel={`${titulo}. ${texto || ''}`}
    >
      <Ionicons name={icone} size={t(38)} color={c.texto} />
      <Texto tamanho="medio" peso="800" cor={c.texto} style={{ textAlign: 'center' }}>
        {titulo}
      </Texto>
      {texto ? (
        <Texto tamanho="pequeno" cor={cores.tinta2} style={{ textAlign: 'center' }}>
          {texto}
        </Texto>
      ) : null}
    </View>
  );
}

export function Carregando({ texto = 'Carregando...' }) {
  const { cores } = usePerto();
  return (
    <View style={{ padding: esp(8), alignItems: 'center', gap: esp(3) }} accessible accessibilityLabel={texto}>
      <ActivityIndicator size="large" color={cores.primaria} />
      <Texto cor={cores.tinta2}>{texto}</Texto>
    </View>
  );
}

export function Divisor() {
  const { cores } = usePerto();
  return <View style={{ height: 1, backgroundColor: cores.linha, marginVertical: esp(3) }} />;
}

export const base = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { padding: esp(4), gap: esp(4), paddingBottom: esp(10) },
  linha: { flexDirection: 'row', alignItems: 'center', gap: esp(2), flexWrap: 'wrap' },
});
