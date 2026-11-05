# Perto — rede de cuidado de bairro

> **Ninguém deveria passar dias sem que alguém perceba.**
> Um toque por dia diz que está tudo bem. A falta desse toque chama quem está mais perto.

Solução integrada **app mobile + plataforma web** para a Global Solution **CitizenTech** (FIAP).

---

## Integrantes

| Nome completo | RM |
| --- | --- |
| Matheus Dias Gomes Silva | RM563021 |

> Trabalho desenvolvido individualmente.

**Repositório:** <https://github.com/Matheus-DGS/GlobalSolution-Perto-App>

---

## O problema e a cidadã beneficiada

No Brasil, **mais de 5,6 milhões de pessoas com 60 anos ou mais moram sozinhas**, número que
cresce a cada censo. Entre uma visita domiciliar e outra do agente comunitário de saúde podem
passar **30 dias**. Nesse intervalo, uma queda, uma crise de pressão ou simplesmente a falta de
remédio viram emergências descobertas tarde demais.

**Cidadã beneficiada: Dona Ivone, 78 anos.** Mora sozinha num sobrado no Sacomã, zona sul de
São Paulo. Hipertensa, diabética, usa bengala. Tem um celular Android simples, com a letra
aumentada e internet instável. A filha mora em Guarulhos. Os vizinhos a conhecem, mas ninguém
"fica de olho" de forma organizada.

Já existem botões de emergência, mas todos dependem da pessoa **conseguir pedir ajuda**.
O Perto inverte a lógica: **a ausência de um sinal simples já é o pedido de ajuda**, e quem
responde primeiro é quem mora a 80 metros — não um serviço distante.

### Outros atores da solução

| Quem | Papel | Plataforma |
| --- | --- | --- |
| **Dona Ivone**, 78 — pessoa acompanhada | Faz o check-in diário, pede ajuda do dia a dia, aciona emergência | App |
| **Jorge**, 34 — vizinho de quarteirão (rede de apoio) | Recebe o alerta, assume, verifica e relata | App |
| **Cléo** — agente comunitária de saúde (UBS) | Cadastra, triagem, agenda visitas, publica avisos, presta contas | Web |
| **Qualquer cidadão do bairro** | Indica alguém que mora sozinho e acompanha os indicadores abertos | Web |

---

## Como funciona: três camadas que se acionam sozinhas

1. **Um toque por dia, dentro da janela combinada.** No app, a pessoa aperta um botão que ocupa
   quase a tela inteira: *Estou bem*. A janela (ex.: 7h às 11h) é combinada na visita do agente
   de saúde, porque a rotina de cada pessoa é diferente. Também é possível responder
   *mais ou menos* ou *preciso de ajuda*.
2. **Sem o toque, a rede do quarteirão é chamada.** Passada a janela, o sistema cria um alerta e
   avisa a rede de apoio cadastrada. Quem puder ir toca em **Vou verificar**, e as outras pessoas
   param de ser cobradas — ninguém duplica esforço.
3. **Se ninguém assume em 45 minutos, vira caso da UBS.** O alerta sobe de nível automaticamente
   e entra na fila de triagem da equipe de saúde, com o motivo da escalada registrado.

---

## Integração entre mobile e web

As duas plataformas consomem a **mesma API REST em Node.js** (`server/`), sem framework e sem
dependências externas. O painel web ainda escuta um fluxo de eventos
**SSE (`/api/eventos`)**, por isso a fila de triagem muda sozinha na tela quando alguém usa o
celular. O app consulta a API e mantém uma **fila local** para funcionar sem internet.

### O que atravessa as plataformas

**Do app para a web**

| Ação no app | Efeito imediato na web |
| --- | --- |
| Check-in feito | O status da pessoa muda no painel e o alerta do dia é encerrado automaticamente |
| SOS acionado | Entra no topo da fila de triagem como caso crítico |
| "Vou verificar" | O painel mostra quem assumiu e desde quando |
| Check-in com "preciso de ajuda" | Gera alerta de atenção para a rede e aparece na fila |
| Pedido de ajuda (remédio, mercado, companhia) | Aparece na lista de pedidos abertos do território |

**Da web para o app**

| Ação na web | Efeito imediato no app |
| --- | --- |
| Cadastro de pessoa e rede de apoio | A pessoa passa a existir no app e a receber alertas |
| Janela de check-in alterada | Muda o horário cobrado no app |
| Visita agendada | Aparece no card "próxima visita" da tela Hoje |
| Aviso do bairro publicado | Banner no topo do app de todas as pessoas do território |
| Equipe registra contato ou encerra caso | O alerta some da lista da rede de apoio |

### Desenho técnico

```
                 ┌──────────────────────────┐
   App mobile    │   server/  (Node puro)   │   Plataforma web
   React Native  │                          │   HTML + CSS + JS
  ───────────►   │  REST  /api/*            │  ◄───────────
   fetch + fila  │  SSE   /api/eventos      │   fetch + EventSource
   offline       │  JSON  server/data/      │
                 │  + serve a pasta web/    │
                 └──────────────────────────┘
```

O mesmo processo Node serve a API **e** os arquivos estáticos da plataforma web, então um único
deploy entrega painel + API na mesma origem, sem CORS e sem configuração.

---

## Motion design (onde e por quê)

O movimento nunca é enfeite: cada animação responde a uma pergunta do usuário.

**No app**

| Onde | Função |
| --- | --- |
| Botão *Estou bem*: encolhe, solta um anel e desenha o check | "Meu toque foi registrado e saiu daqui" — sem precisar ler |
| Botão SOS: barra que preenche em 2 segundos | Mostra que a ação está a caminho e que **dá tempo de soltar e desistir** |
| Avisos entram deslizando do topo | A lista muda sozinha a cada 20s: o movimento diz "isto chegou agora" |
| Faixa de estado desce com a contagem da fila offline | Estado do sistema sempre visível, sem alerta modal |
| Transição de telas (slide / fade) | Senso de profundidade: entrei num nível, voltei |

**Na web**

| Onde | Função |
| --- | --- |
| Novo caso entra na fila com slide + realce que apaga | Percepção de mudança ocorrida fora da tela |
| Pulso apenas nos casos críticos | O movimento é reservado para o que é urgente |
| Indicadores que sobem (count-up) | Mostram que o número foi recalculado agora |
| Barra de progresso do cadastro em etapas | Orientação: onde estou e quanto falta |
| Diagrama da escalada com traçado que anda | Conta a história na ordem em que ela acontece |
| Gaveta de detalhe deslizando | Contexto preservado: não saí da lista |

Tudo é desligado por `prefers-reduced-motion` **e** por um botão explícito no cabeçalho da web
e nos Ajustes do app.

---

## Acessibilidade

- **Contraste** acima de 4,5:1 em todas as combinações, com **tema de alto contraste** a um clique
  (web e app).
- **Três tamanhos de texto** controlados pelo usuário. O layout é em `rem` (web) e com fator de
  escala (app), então nada quebra quando o texto cresce.
- **Nenhuma informação depende só de cor**: todo estado tem ícone + texto.
- **HTML semântico**, navegação completa por teclado, `skip link`, foco sempre visível, abas com
  padrão ARIA (setas, Home/End), diálogos nativos `<dialog>` com foco preso e Esc.
- **Rótulos descritivos** em todos os ícones, campos e botões; regiões `aria-live` anunciam
  novos casos na fila.
- **No app**: área de toque mínima de 48 pontos, espaçamento generoso, `accessibilityLabel`,
  `accessibilityHint` e `accessibilityRole` em cada controle. O botão SOS, que exige segurar,
  oferece confirmação por texto para quem usa leitor de tela.
- **Linguagem simples e direta**, sem jargão clínico nas telas da pessoa acompanhada.
- O mapa do painel é apoio visual: **toda informação dele também está em lista**, navegável por
  teclado.

---

## ODS relacionados

| ODS | Relação |
| --- | --- |
| **ODS 3 — Saúde e bem-estar** | Metas 3.4 e 3.8: detecção precoce de intercorrências e acompanhamento contínuo de pessoas com doenças crônicas dentro da atenção básica |
| **ODS 11 — Cidades e comunidades sustentáveis** | Metas 11.3 e 11.7: comunidade participando da gestão do próprio território, com atenção a pessoas idosas e com deficiência |
| **ODS 10 — Redução das desigualdades** | Meta 10.2: roda em celular simples, com texto grande, funciona sem internet estável e não exige nenhum equipamento pago |

---

## Estrutura do repositório

```
.
├── server/              API REST + SSE em Node puro (sem dependências)
│   ├── src/server.js      rotas, eventos em tempo real, arquivos estáticos
│   ├── src/dominio.js     regras: risco, janela de check-in, escalada
│   ├── src/seed.js        dados fictícios do território
│   └── src/store.js       persistência em JSON
├── web/                 Plataforma web (HTML + CSS + JS, sem build)
│   ├── index.html         página pública: transparência e indicação de cidadão
│   ├── como-funciona.html jornadas, papéis de cada plataforma, decisões
│   ├── painel.html        painel do território (ACS/UBS)
│   ├── cadastro.html      cadastro em 4 etapas
│   ├── css/               design system compartilhado com o app
│   ├── js/                api.js (integração), ui.js, painel.js, cadastro.js
│   └── dados/demo.json    retrato usado no modo demonstração
└── mobile/              App Expo / React Native
    ├── App.js
    └── src/
        ├── tema.js           mesmos tokens visuais da web
        ├── servicos/api.js   integração + fila offline
        ├── contexto/Perto.js estado global e preferências
        ├── componentes/      botão de check-in, SOS, faixas, base
        ├── telas/idoso/      Hoje, Pedir ajuda
        ├── telas/rede/       Avisos, Acompanho, Detalhe da pessoa
        └── navegacao/        abas por perfil
```

---

## Como executar

### 1. Servidor + plataforma web

Requer **Node.js 18 ou superior**. Não há nada para instalar: o servidor não usa dependências.

```bash
cd server
npm start
```

Abra **<http://localhost:3333>**. O mesmo processo serve:

| Endereço | O que é |
| --- | --- |
| `http://localhost:3333/` | Página pública |
| `http://localhost:3333/painel` | Painel do território |
| `http://localhost:3333/cadastro` | Cadastro em etapas |
| `http://localhost:3333/api/estado` | Retrato completo em JSON |
| `http://localhost:3333/api/health` | Teste de conexão |

> Se a web for publicada separadamente (GitHub Pages, Vercel, Netlify), informe a URL da API em
> `web/js/config.js`. Sem nenhuma API disponível, a web entra em **modo demonstração** com os
> dados de `web/dados/demo.json` e avisa isso na tela.

### 2. App mobile

```bash
cd mobile
npm install
npx expo start
```

Leia o QR Code com o aplicativo **Expo Go** (Android ou iOS).

O app **descobre o servidor sozinho**: ele usa o IP do computador que está rodando o Expo e
tenta a porta 3333. Basta que o celular esteja na mesma rede Wi-Fi. Se precisar, dá para
informar o endereço manualmente na aba **Ajustes**.

Sem servidor nenhum, o app abre em modo demonstração com os dados de `mobile/assets/demo.json`.

### 3. Percorrendo a jornada completa (roteiro de 2 minutos)

1. Abra o **painel** no computador e o **app** no celular.
2. No app, entre como **Dona Ivone** e toque em *Estou bem*.
   → No painel, o status dela muda e o caso do dia é encerrado, ao vivo.
3. No painel, aba **Relatório**, clique em *Simular alerta de ausência*.
   → O caso entra na fila deslizando e com realce.
4. No app, entre como **Jorge** (rede de apoio) e toque em *Vou verificar*.
   → O painel mostra quem assumiu e desde quando.
5. Ainda no app, toque em *Já verifiquei* e conte o que encontrou.
   → O caso sai da fila e o relato entra no histórico do painel.
6. No painel, aba **Avisos do bairro**, publique um aviso.
   → O aviso aparece como banner no topo do app.
7. No painel, **Agendar visita** para Dona Ivone.
   → A visita aparece no card da tela Hoje dela.

---

## Deploy

- **Plataforma web publicada em:** <https://globalsolution-perto-app.onrender.com>
- **Vídeo-pitch:** `https://<preencher-apos-a-gravacao>`

| Endereço público | O que é |
| --- | --- |
| <https://globalsolution-perto-app.onrender.com> | Página pública do bairro |
| <https://globalsolution-perto-app.onrender.com/painel.html> | Painel do território (UBS) |
| <https://globalsolution-perto-app.onrender.com/cadastro.html> | Cadastro em etapas |
| <https://globalsolution-perto-app.onrender.com/api/estado> | API consumida pelo app |

O app mobile já aponta para essa mesma API (`extra.apiUrl` em `mobile/app.json`), então
**celular e navegador compartilham os dados pela internet**, sem precisar estar na mesma rede.

### Configuração usada no Render

Como o servidor Node também entrega a pasta `web/`, um único Web Service publica painel e API
na mesma origem:

| Campo | Valor |
| --- | --- |
| Repositório | público, sem conectar conta do GitHub |
| Root Directory | `server` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instância | Free (US$ 0/mês) |
| Porta | lida de `process.env.PORT` |

> **Atenção na apresentação:** o plano gratuito hiberna após um tempo sem uso, e a primeira
> requisição pode levar até ~50 segundos. Abra o painel web alguns minutos antes de começar a
> demonstração para "acordar" o serviço.

Para um deploy estático (GitHub Pages, Vercel, Netlify), publique a pasta `web/`: ela já tem a
URL da API em `alternativas`, dentro de `web/js/config.js`.

---

## Observações

Projeto acadêmico. **Todos os dados são fictícios**, incluindo nomes, endereços, telefones e
condições de saúde. A autenticação foi deliberadamente substituída por uma seleção de perfil
para que a banca possa percorrer as três jornadas sem criar contas.
