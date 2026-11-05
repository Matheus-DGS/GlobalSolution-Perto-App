/**
 * Persistencia simples em arquivo JSON.
 * Suficiente para o prototipo e sem nenhuma dependencia externa: o mesmo
 * servidor roda na maquina do avaliador com `npm start` e em qualquer host.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarSeed } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PASTA = process.env.PERTO_DATA_DIR || path.join(__dirname, '..', 'data');
const ARQUIVO = path.join(PASTA, 'db.json');

let db = null;
let timerGravacao = null;

function garantirPasta() {
  if (!fs.existsSync(PASTA)) fs.mkdirSync(PASTA, { recursive: true });
}

export function carregar() {
  if (db) return db;
  garantirPasta();
  try {
    if (fs.existsSync(ARQUIVO)) {
      db = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'));
      // Se o arquivo foi gerado por uma versao antiga do seed, recomeca.
      if (!db || !Array.isArray(db.pessoas) || db.versao !== 1) db = criarSeed();
    } else {
      db = criarSeed();
    }
  } catch (erro) {
    console.warn('[perto] banco invalido, recriando a partir do seed:', erro.message);
    db = criarSeed();
  }
  gravarAgora();
  return db;
}

export function gravar() {
  clearTimeout(timerGravacao);
  timerGravacao = setTimeout(gravarAgora, 120);
}

export function gravarAgora() {
  if (!db) return;
  garantirPasta();
  try {
    fs.writeFileSync(ARQUIVO, JSON.stringify(db, null, 2), 'utf8');
  } catch (erro) {
    // Em hosts com disco somente leitura o prototipo segue funcionando em memoria.
    console.warn('[perto] nao foi possivel gravar o banco:', erro.message);
  }
}

export function resetar() {
  db = criarSeed();
  gravarAgora();
  return db;
}

export function obter() {
  return carregar();
}
