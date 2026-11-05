/**
 * Guarda local do app (AsyncStorage).
 * Serve para tres coisas essenciais fora de casa:
 *  - lembrar quem esta usando o celular;
 *  - abrir o app com os ultimos dados mesmo sem internet;
 *  - manter a fila do que foi feito offline ate a conexao voltar.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const P = 'perto:';

export async function ler(chave, padrao = null) {
  try {
    const bruto = await AsyncStorage.getItem(P + chave);
    return bruto ? JSON.parse(bruto) : padrao;
  } catch {
    return padrao;
  }
}

export async function gravar(chave, valor) {
  try {
    await AsyncStorage.setItem(P + chave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

export async function apagar(chave) {
  try {
    await AsyncStorage.removeItem(P + chave);
  } catch {
    /* silencioso: o app continua funcionando sem persistencia */
  }
}

export const CHAVES = {
  usuario: 'usuario',
  preferencias: 'preferencias',
  estado: 'estado-cache',
  fila: 'fila-offline',
  apiUrl: 'api-url',
};
