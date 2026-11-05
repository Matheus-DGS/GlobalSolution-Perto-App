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
  // Vazio de proposito: no deploy do Render e no `npm start` local a API vive
  // na mesma origem da pagina, entao nao ha nada para configurar.
  apiBaseUrl: '',

  // Tentadas em ordem se a mesma origem nao responder. Cobre o caso de a pasta
  // web/ ser publicada separadamente (GitHub Pages, Vercel, Netlify).
  alternativas: ['http://localhost:3333', 'https://globalsolution-perto-app.onrender.com'],

  nomeTerritorio: 'UBS Sacoma - microarea 3',
};
