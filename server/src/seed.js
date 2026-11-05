/**
 * Dados simulados do territorio (microarea 3 - Sacoma, Sao Paulo/SP).
 *
 * Sao dados ficticios, criados SEMPRE em relacao ao momento atual, para que a
 * demonstracao tenha vida: alguem que ja fez o check-in, alguem atrasado,
 * um caso que a rede de apoio resolveu e um que escalou para a UBS.
 */

const hAtras = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString();
const minAtras = (m) => new Date(Date.now() - m * 60 * 1000).toISOString();
const emHoras = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();

const fmtHoraSP = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** "HH:MM" no fuso de Sao Paulo, N minutos atras (nunca passa de meia-noite). */
function horaLocalMenos(minutos) {
  const agora = fmtHoraSP.format(new Date()).split(':').map(Number);
  const total = agora[0] * 60 + agora[1] - minutos;
  if (total < 0) return '00:00';
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Janela de check-in que ja fechou ha N minutos.
 * Garante que, a qualquer hora em que a demonstracao for aberta, as pessoas com
 * alerta de ausencia realmente estejam fora da janela combinada.
 */
function janelaFechadaHa(minutos, duracaoHoras = 4) {
  const fim = horaLocalMenos(minutos);
  const calculado = horaLocalMenos(minutos + duracaoHoras * 60);
  // Ninguem combina um check-in de madrugada: a abertura nunca vem antes das 5h.
  const inicio = calculado < '05:00' ? '05:00' : calculado;
  return { inicio, fim: fim < inicio ? inicio : fim };
}

export function criarSeed() {
  // Quem aparece com alerta de ausencia tem a janela ja encerrada.
  const janelaBenedito = janelaFechadaHa(75);
  const janelaMariaDoCarmo = janelaFechadaHa(20);
  const janelaNeuza = janelaFechadaHa(42);

  const pessoas = [
    {
      id: 'p1',
      nome: 'Ivone Aparecida Ribeiro',
      apelido: 'Dona Ivone',
      idade: 78,
      telefone: '(11) 98812-4477',
      endereco: 'Rua Tabor, 240 - Sacoma',
      bairro: 'Sacoma',
      lat: -23.6041,
      lng: -46.6012,
      moraSozinha: true,
      condicoes: ['Hipertensao', 'Diabetes tipo 2'],
      mobilidade: 'reduzida',
      observacoes: 'Usa bengala. Escada na entrada. Filha mora em Guarulhos.',
      janelaCheckin: { inicio: '07:00', fim: '11:00' },
      acsId: 'u_cleo',
      ativo: true,
      criadoEm: hAtras(24 * 180),
      redeApoio: [
        { id: 'r1', nome: 'Marlene Ribeiro', relacao: 'Filha', telefone: '(11) 97733-1020', distancia: 'Guarulhos' },
        { id: 'r2', nome: 'Jorge Antunes', relacao: 'Vizinho', telefone: '(11) 96655-8890', distancia: '80 m' },
      ],
    },
    {
      id: 'p2',
      nome: 'Benedito Souza Lima',
      apelido: 'Seu Benedito',
      idade: 84,
      telefone: '(11) 98123-7756',
      endereco: 'Rua Silva Bueno, 1180 - Sacoma',
      bairro: 'Sacoma',
      lat: -23.6008,
      lng: -46.6059,
      moraSozinha: true,
      condicoes: ['Insuficiencia cardiaca', 'Baixa visao', 'Hipertensao'],
      mobilidade: 'reduzida',
      observacoes: 'Nao tem familiar na cidade. Campainha com defeito, bater na janela.',
      janelaCheckin: janelaBenedito,
      acsId: 'u_cleo',
      ativo: true,
      criadoEm: hAtras(24 * 95),
      redeApoio: [],
    },
    {
      id: 'p3',
      nome: 'Terezinha Gomes da Silva',
      apelido: 'Dona Terezinha',
      idade: 71,
      telefone: '(11) 99201-3345',
      endereco: 'Rua Padre Marchetti, 55 - Sacoma',
      bairro: 'Sacoma',
      lat: -23.6075,
      lng: -46.5988,
      moraSozinha: true,
      condicoes: ['Artrose'],
      mobilidade: 'boa',
      observacoes: 'Participa do grupo de caminhada da UBS.',
      janelaCheckin: { inicio: '06:30', fim: '11:00' },
      acsId: 'u_cleo',
      ativo: true,
      criadoEm: hAtras(24 * 210),
      redeApoio: [
        { id: 'r3', nome: 'Jorge Antunes', relacao: 'Vizinho', telefone: '(11) 96655-8890', distancia: '300 m' },
        { id: 'r4', nome: 'Sueli Prado', relacao: 'Vizinha', telefone: '(11) 95544-2211', distancia: '40 m' },
      ],
    },
    {
      id: 'p4',
      nome: 'Antonio Carlos Ferreira',
      apelido: 'Seu Antonio',
      idade: 69,
      telefone: '(11) 98477-9012',
      endereco: 'Rua Bom Pastor, 902 - Ipiranga',
      bairro: 'Ipiranga',
      lat: -23.5983,
      lng: -46.6098,
      moraSozinha: true,
      condicoes: ['DPOC'],
      mobilidade: 'boa',
      observacoes: 'Usa oxigenio a noite. Fica no bar da esquina de manha.',
      janelaCheckin: { inicio: '07:00', fim: '12:00' },
      acsId: 'u_cleo',
      ativo: true,
      criadoEm: hAtras(24 * 60),
      redeApoio: [
        { id: 'r5', nome: 'Wilson Tavares', relacao: 'Sobrinho', telefone: '(11) 94433-7788', distancia: '1,2 km' },
      ],
    },
    {
      id: 'p5',
      nome: 'Maria do Carmo Nascimento',
      apelido: 'Dona Maria do Carmo',
      idade: 88,
      telefone: '(11) 97122-6654',
      endereco: 'Travessa Sao Joaquim, 18 - Sacoma',
      bairro: 'Sacoma',
      lat: -23.6056,
      lng: -46.6041,
      moraSozinha: true,
      condicoes: ['Alzheimer inicial', 'Hipertensao'],
      mobilidade: 'reduzida',
      observacoes: 'Esquece de atender o telefone. Chave na vizinha do 20.',
      janelaCheckin: janelaMariaDoCarmo,
      acsId: 'u_cleo',
      ativo: true,
      criadoEm: hAtras(24 * 150),
      redeApoio: [
        { id: 'r6', nome: 'Sueli Prado', relacao: 'Vizinha', telefone: '(11) 95544-2211', distancia: '15 m' },
      ],
    },
    {
      id: 'p6',
      nome: 'Joana Batista dos Santos',
      apelido: 'Dona Joana',
      idade: 75,
      telefone: '(11) 98990-1123',
      endereco: 'Rua dos Patriotas, 430 - Sacoma',
      bairro: 'Sacoma',
      lat: -23.6022,
      lng: -46.5971,
      moraSozinha: true,
      condicoes: ['Depressao', 'Osteoporose'],
      mobilidade: 'boa',
      observacoes: 'Gosta de conversar. Pediu ajuda para buscar receita na UBS.',
      janelaCheckin: { inicio: '07:30', fim: '11:30' },
      acsId: 'u_cleo',
      ativo: true,
      criadoEm: hAtras(24 * 40),
      redeApoio: [
        { id: 'r7', nome: 'Rafael Nunes', relacao: 'Voluntario da associacao', telefone: '(11) 93322-4455', distancia: '600 m' },
      ],
    },
    {
      id: 'p7',
      nome: 'Sebastiao Rodrigues',
      apelido: 'Seu Sebastiao',
      idade: 73,
      telefone: '(11) 98001-5566',
      endereco: 'Rua Vergueiro, 7440 - Sacoma',
      bairro: 'Sacoma',
      lat: -23.6097,
      lng: -46.6029,
      moraSozinha: true,
      condicoes: ['Hipertensao'],
      mobilidade: 'boa',
      observacoes: 'Trabalha como caseiro durante o dia.',
      janelaCheckin: { inicio: '06:00', fim: '12:00' },
      acsId: 'u_cleo',
      ativo: true,
      criadoEm: hAtras(24 * 30),
      redeApoio: [
        { id: 'r8', nome: 'Jorge Antunes', relacao: 'Vizinho', telefone: '(11) 96655-8890', distancia: '500 m' },
      ],
    },
    {
      id: 'p8',
      nome: 'Neuza Lopes de Oliveira',
      apelido: 'Dona Neuza',
      idade: 80,
      telefone: '(11) 97455-8833',
      endereco: 'Rua Eduardo Bolonha, 77 - Sacoma',
      bairro: 'Sacoma',
      lat: -23.5996,
      lng: -46.6006,
      moraSozinha: true,
      condicoes: ['Labirintite', 'Hipertensao'],
      mobilidade: 'reduzida',
      observacoes: 'Ja caiu duas vezes no banheiro este ano.',
      janelaCheckin: janelaNeuza,
      acsId: 'u_cleo',
      ativo: true,
      criadoEm: hAtras(24 * 20),
      redeApoio: [
        { id: 'r9', nome: 'Marcia Figueira', relacao: 'Nora', telefone: '(11) 96688-1199', distancia: '2 km' },
      ],
    },
  ];

  const checkins = [
    { id: 'c1', pessoaId: 'p1', em: hAtras(2), origem: 'app', humor: 'bem' },
    { id: 'c2', pessoaId: 'p3', em: hAtras(3), origem: 'app', humor: 'bem' },
    { id: 'c3', pessoaId: 'p4', em: hAtras(4), origem: 'app', humor: 'bem' },
    { id: 'c4', pessoaId: 'p6', em: hAtras(3.5), origem: 'app', humor: 'mais_ou_menos' },
    { id: 'c5', pessoaId: 'p1', em: hAtras(26), origem: 'app', humor: 'bem' },
    { id: 'c6', pessoaId: 'p3', em: hAtras(27), origem: 'app', humor: 'bem' },
    { id: 'c7', pessoaId: 'p7', em: hAtras(28), origem: 'app', humor: 'bem' },
    { id: 'c8', pessoaId: 'p5', em: hAtras(50), origem: 'rede', humor: 'bem' },
    { id: 'c9', pessoaId: 'p2', em: hAtras(53), origem: 'acs', humor: 'mais_ou_menos' },
    { id: 'c10', pessoaId: 'p8', em: hAtras(74), origem: 'app', humor: 'bem' },
    { id: 'c11', pessoaId: 'p4', em: hAtras(29), origem: 'app', humor: 'bem' },
    { id: 'c12', pessoaId: 'p6', em: hAtras(31), origem: 'app', humor: 'bem' },
  ];

  const alertas = [
    {
      id: 'al1',
      pessoaId: 'p2',
      tipo: 'sem_checkin',
      nivel: 'critico',
      titulo: 'Benedito nao fez o check-in de hoje',
      texto: 'Sem resposta da rede de apoio ha 72 minutos. Caso encaminhado para a equipe da UBS.',
      criadoEm: minAtras(72),
      status: 'aberto',
      destino: 'ubs',
      assumidoPor: null,
      assumidoEm: null,
      resolvidoEm: null,
      desfecho: null,
      historico: [
        { em: minAtras(72), quem: 'sistema', acao: 'criado', nota: `Passou das ${janelaBenedito.fim} sem check-in` },
        { em: minAtras(27), quem: 'sistema', acao: 'escalado', nota: 'Pessoa sem rede de apoio cadastrada' },
      ],
    },
    {
      id: 'al2',
      pessoaId: 'p5',
      tipo: 'sem_checkin',
      nivel: 'atencao',
      titulo: 'Maria do Carmo nao fez o check-in de hoje',
      texto: `Passou das ${janelaMariaDoCarmo.fim} e ninguem confirmou que esta bem.`,
      criadoEm: minAtras(18),
      status: 'aberto',
      destino: 'rede',
      assumidoPor: null,
      assumidoEm: null,
      resolvidoEm: null,
      desfecho: null,
      historico: [{ em: minAtras(18), quem: 'sistema', acao: 'criado', nota: `Passou das ${janelaMariaDoCarmo.fim} sem check-in` }],
    },
    {
      id: 'al3',
      pessoaId: 'p8',
      tipo: 'sem_checkin',
      nivel: 'atencao',
      titulo: 'Neuza nao fez o check-in de hoje',
      texto: 'Terceiro dia seguido sem confirmacao.',
      criadoEm: minAtras(40),
      status: 'em_atendimento',
      destino: 'rede',
      assumidoPor: { id: 'r9', nome: 'Marcia Figueira', perfil: 'rede' },
      assumidoEm: minAtras(31),
      resolvidoEm: null,
      desfecho: null,
      historico: [
        { em: minAtras(40), quem: 'sistema', acao: 'criado', nota: `Passou das ${janelaNeuza.fim} sem check-in` },
        { em: minAtras(31), quem: 'Marcia Figueira', acao: 'assumido', nota: 'Vou passar la depois do almoco' },
      ],
    },
    {
      id: 'al4',
      pessoaId: 'p3',
      tipo: 'sos',
      nivel: 'critico',
      titulo: 'Terezinha acionou o SOS',
      texto: 'Botao de emergencia acionado dentro de casa.',
      criadoEm: hAtras(49),
      status: 'resolvido',
      destino: 'rede',
      assumidoPor: { id: 'r4', nome: 'Sueli Prado', perfil: 'rede' },
      assumidoEm: hAtras(48.9),
      resolvidoEm: hAtras(48.4),
      desfecho: {
        porQuem: 'rede',
        quem: 'Sueli Prado',
        resultado: 'esta_bem',
        nota: 'Tontura ao levantar. Pressao medida, 150/90. Avisei a UBS e fiquei meia hora com ela.',
      },
      historico: [
        { em: hAtras(49), quem: 'Terezinha', acao: 'criado', nota: 'SOS acionado no app' },
        { em: hAtras(48.9), quem: 'Sueli Prado', acao: 'assumido', nota: 'Estou a 40 metros, vou agora' },
        { em: hAtras(48.4), quem: 'Sueli Prado', acao: 'resolvido', nota: 'Tontura ao levantar. Pressao 150/90.' },
      ],
    },
    {
      id: 'al5',
      pessoaId: 'p1',
      tipo: 'sem_checkin',
      nivel: 'atencao',
      titulo: 'Ivone nao fez o check-in de ontem',
      texto: 'Resolvido pela rede de apoio.',
      criadoEm: hAtras(28),
      status: 'resolvido',
      destino: 'rede',
      assumidoPor: { id: 'r2', nome: 'Jorge Antunes', perfil: 'rede' },
      assumidoEm: hAtras(27.7),
      resolvidoEm: hAtras(27.2),
      desfecho: {
        porQuem: 'rede',
        quem: 'Jorge Antunes',
        resultado: 'esta_bem',
        nota: 'Celular estava sem bateria. Ajudei a configurar o carregador na tomada da sala.',
      },
      historico: [
        { em: hAtras(28), quem: 'sistema', acao: 'criado', nota: 'Passou das 11:00 sem check-in' },
        { em: hAtras(27.7), quem: 'Jorge Antunes', acao: 'assumido', nota: 'Moro no mesmo quarteirao, vou ver' },
        { em: hAtras(27.2), quem: 'Jorge Antunes', acao: 'resolvido', nota: 'Celular sem bateria. Esta bem.' },
      ],
    },
  ];

  const pedidos = [
    {
      id: 'pd1',
      pessoaId: 'p6',
      tipo: 'remedio',
      detalhe: 'Preciso buscar a receita da fluoxetina na UBS Sacoma.',
      criadoEm: hAtras(3.4),
      status: 'aberto',
      voluntario: null,
      concluidoEm: null,
    },
    {
      id: 'pd2',
      pessoaId: 'p1',
      tipo: 'mercado',
      detalhe: 'Pao, leite e um pacote de arroz.',
      criadoEm: hAtras(20),
      status: 'aceito',
      voluntario: { id: 'r2', nome: 'Jorge Antunes' },
      concluidoEm: null,
    },
    {
      id: 'pd3',
      pessoaId: 'p5',
      tipo: 'conversa',
      detalhe: 'Queria companhia na quinta a tarde.',
      criadoEm: hAtras(70),
      status: 'concluido',
      voluntario: { id: 'r6', nome: 'Sueli Prado' },
      concluidoEm: hAtras(45),
    },
  ];

  const visitas = [
    {
      id: 'v1',
      pessoaId: 'p1',
      quando: emHoras(26),
      responsavel: 'Cleo Martins (ACS)',
      tipo: 'acs',
      status: 'agendada',
      notas: 'Aferir pressao e revisar a caixa de remedios.',
    },
    {
      id: 'v2',
      pessoaId: 'p2',
      quando: emHoras(4),
      responsavel: 'Cleo Martins (ACS)',
      tipo: 'acs',
      status: 'agendada',
      notas: 'Visita prioritaria: sem rede de apoio e alerta critico aberto.',
    },
    {
      id: 'v3',
      pessoaId: 'p5',
      quando: hAtras(30),
      responsavel: 'Cleo Martins (ACS)',
      tipo: 'acs',
      status: 'feita',
      notas: 'Orientei a vizinha Sueli a cadastrar o telefone no app.',
    },
  ];

  const avisos = [
    {
      id: 'av1',
      titulo: 'Onda de calor ate sexta',
      texto:
        'Temperatura acima de 34 graus. Beba agua mesmo sem sede, evite sair entre 11h e 16h e mantenha as janelas abertas pela manha.',
      nivel: 'atencao',
      bairro: 'Sacoma',
      criadoEm: hAtras(6),
      validoAte: emHoras(60),
      autor: 'UBS Sacoma',
    },
    {
      id: 'av2',
      titulo: 'Vacina da gripe na UBS Sacoma',
      texto: 'Sem agendamento, de segunda a sexta, das 8h as 16h. Leve o cartao do SUS.',
      nivel: 'info',
      bairro: 'Sacoma',
      criadoEm: hAtras(52),
      validoAte: emHoras(200),
      autor: 'UBS Sacoma',
    },
  ];

  const usuarios = [
    { id: 'u_ivone', nome: 'Ivone Aparecida Ribeiro', apelido: 'Dona Ivone', perfil: 'idoso', pessoaId: 'p1' },
    { id: 'u_benedito', nome: 'Benedito Souza Lima', apelido: 'Seu Benedito', perfil: 'idoso', pessoaId: 'p2' },
    {
      id: 'u_jorge',
      nome: 'Jorge Antunes',
      apelido: 'Jorge',
      perfil: 'rede',
      cuidaDe: ['p1', 'p3', 'p7'],
      telefone: '(11) 96655-8890',
    },
    {
      id: 'u_sueli',
      nome: 'Sueli Prado',
      apelido: 'Sueli',
      perfil: 'rede',
      cuidaDe: ['p3', 'p5'],
      telefone: '(11) 95544-2211',
    },
    {
      id: 'u_cleo',
      nome: 'Cleo Martins',
      apelido: 'Cleo',
      perfil: 'acs',
      unidade: 'UBS Sacoma - microarea 3',
      telefone: '(11) 3333-1200',
    },
  ];

  return {
    versao: 1,
    territorio: {
      nome: 'Microarea 3 - Sacoma',
      cidade: 'Sao Paulo',
      uf: 'SP',
      unidade: 'UBS Sacoma',
      centro: { lat: -23.6035, lng: -46.602 },
    },
    pessoas,
    checkins,
    alertas,
    pedidos,
    visitas,
    avisos,
    usuarios,
    criadoEm: new Date().toISOString(),
  };
}
