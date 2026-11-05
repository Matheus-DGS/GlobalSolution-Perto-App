/**
 * Navegacao do app.
 * As abas mudam conforme o perfil: a pessoa acompanhada ve tres destinos
 * simples; a rede de apoio ve a fila de avisos e quem ela acompanha.
 *
 * MOTION DESIGN: as transicoes de tela usam o deslizamento padrao da
 * plataforma, que diz "entrei num nivel mais fundo" e "voltei" - orientacao,
 * nao enfeite. Quem pede menos movimento recebe fade curto.
 */
import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { usePerto } from '../contexto/Perto';
import Entrar from '../telas/Entrar';
import Hoje from '../telas/idoso/Hoje';
import Ajuda from '../telas/idoso/Ajuda';
import Alertas from '../telas/rede/Alertas';
import Acompanho from '../telas/rede/Acompanho';
import PessoaDetalhe from '../telas/rede/PessoaDetalhe';
import Ajustes from '../telas/Ajustes';

const Pilha = createNativeStackNavigator();
const Abas = createBottomTabNavigator();

function opcoesDeAba(cores, t) {
  return {
    headerShown: false,
    tabBarActiveTintColor: cores.primariaEscura,
    tabBarInactiveTintColor: cores.tinta3,
    tabBarStyle: {
      backgroundColor: cores.papel,
      borderTopColor: cores.linha,
      borderTopWidth: 1,
      height: 62 + Math.max(0, t(16) - 16) * 2,
      paddingBottom: 8,
      paddingTop: 6,
    },
    tabBarLabelStyle: { fontSize: t(12), fontWeight: '800' },
    tabBarItemStyle: { minHeight: 48 },
  };
}

function AbasIdoso() {
  const { cores, t } = usePerto();
  return (
    <Abas.Navigator screenOptions={opcoesDeAba(cores, t)}>
      <Abas.Screen
        name="Hoje"
        component={Hoje}
        options={{
          tabBarAccessibilityLabel: 'Hoje. Fazer o check-in e pedir ajuda em emergencia',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'sunny' : 'sunny-outline'} size={t(24)} color={color} />
          ),
        }}
      />
      <Abas.Screen
        name="Ajuda"
        component={Ajuda}
        options={{
          title: 'Pedir ajuda',
          tabBarAccessibilityLabel: 'Pedir ajuda com remedio, mercado, companhia ou transporte',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'hand-left' : 'hand-left-outline'} size={t(24)} color={color} />
          ),
        }}
      />
      <Abas.Screen
        name="Ajustes"
        component={Ajustes}
        options={{
          tabBarAccessibilityLabel: 'Ajustes de texto, contraste e conexao',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={t(24)} color={color} />
          ),
        }}
      />
    </Abas.Navigator>
  );
}

function AbasRede() {
  const { cores, t, meusAlertas } = usePerto();
  const pendentes = meusAlertas.filter((a) => a.status === 'aberto').length;

  return (
    <Abas.Navigator screenOptions={opcoesDeAba(cores, t)}>
      <Abas.Screen
        name="Avisos"
        component={Alertas}
        options={{
          tabBarBadge: pendentes || undefined,
          tabBarBadgeStyle: { backgroundColor: cores.critico, color: cores.branco, fontWeight: '800' },
          tabBarAccessibilityLabel:
            pendentes > 0
              ? `Avisos. ${pendentes} pessoa(s) precisando de alguem agora`
              : 'Avisos. Nenhum caso aberto',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={t(24)} color={color} />
          ),
        }}
      />
      <Abas.Screen
        name="Acompanho"
        component={Acompanho}
        options={{
          tabBarAccessibilityLabel: 'Quem eu acompanho neste quarteirao',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={t(24)} color={color} />
          ),
        }}
      />
      <Abas.Screen
        name="Ajustes"
        component={Ajustes}
        options={{
          tabBarAccessibilityLabel: 'Ajustes de texto, contraste e conexao',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={t(24)} color={color} />
          ),
        }}
      />
    </Abas.Navigator>
  );
}

export default function Navegacao() {
  const { usuario, cores, t, semMovimento } = usePerto();

  const tema = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: cores.primaria,
      background: cores.areia,
      card: cores.papel,
      text: cores.tinta,
      border: cores.linha,
    },
  };

  return (
    <NavigationContainer theme={tema}>
      <Pilha.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: cores.papel },
          headerTintColor: cores.primariaEscura,
          headerTitleStyle: { fontWeight: '800', fontSize: t(18), color: cores.tinta },
          headerShadowVisible: false,
          animation: semMovimento ? 'fade' : 'slide_from_right',
        }}
      >
        {!usuario ? (
          <Pilha.Screen name="Entrar" component={Entrar} options={{ headerShown: false }} />
        ) : usuario.perfil === 'idoso' ? (
          <Pilha.Screen name="PrincipalIdoso" component={AbasIdoso} options={{ headerShown: false }} />
        ) : (
          <>
            <Pilha.Screen name="PrincipalRede" component={AbasRede} options={{ headerShown: false }} />
            <Pilha.Screen
              name="PessoaDetalhe"
              component={PessoaDetalhe}
              options={{ title: 'Detalhes', headerBackTitle: 'Voltar' }}
            />
          </>
        )}
      </Pilha.Navigator>
    </NavigationContainer>
  );
}
