/**
 * Perto - rede de cuidado de bairro.
 * Global Solution CitizenTech / FIAP.
 *
 * App mobile da pessoa acompanhada e da sua rede de apoio.
 * Conversa com a mesma API do painel web (ver src/servicos/api.js).
 */
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PertoProvider } from './src/contexto/Perto';
import Navegacao from './src/navegacao';

export default function App() {
  return (
    <SafeAreaProvider>
      <PertoProvider>
        <StatusBar style="dark" />
        <Navegacao />
      </PertoProvider>
    </SafeAreaProvider>
  );
}
