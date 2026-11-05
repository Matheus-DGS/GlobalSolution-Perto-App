/**
 * Configuracao da plataforma web.
 *
 * - Quando a web e servida pelo proprio servidor Node (`npm start` na pasta
 *   server/), deixe `apiBaseUrl` vazio: a API vive na mesma origem.
 * - Em deploy estatico (GitHub Pages, Vercel, Netlify), coloque aqui a URL
 *   publica da API, por exemplo: 'https://perto-api.onrender.com'.
 * - Se nenhuma URL responder, o painel entra em MODO DEMONSTRACAO com os dados
 *   de exemplo de web/dados/demo.json, avisando o usuario na tela.
 */
window.PERTO_CONFIG = {
  apiBaseUrl: '',
  alternativas: ['http://localhost:3333'],
  nomeTerritorio: 'UBS Sacoma - microarea 3',
};
