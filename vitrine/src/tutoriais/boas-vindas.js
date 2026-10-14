/** Tour de boas-vindas da vitrine pública. Abre sozinho na primeira visita à home. */
export default {
  id: 'boas-vindas',
  versao: 1,
  titulo: 'Conheça a vitrine',
  area: 'publico',
  rota: '/',
  oferecerEm: ['/*'],
  abrirSozinhoEm: ['/'],
  passos: [
    {
      id: 'oi',
      texto: 'Oi! Eu sou o brotinho da Vitrine. Posso te mostrar rapidinho como tudo funciona?',
      mascote: 'ajuda',
    },
    {
      id: 'busca',
      alvo: '[data-tour="busca-home"]',
      posicao: 'bottom',
      texto:
        'Comece por aqui: digite um assunto, um curso ou uma tecnologia. Eu te levo direto aos resultados.',
      mascote: 'falando',
    },
    {
      id: 'categorias',
      alvo: '[data-tour="categorias-home"]',
      posicao: 'top',
      texto: 'As iniciativas também estão separadas por categoria. Deslize para o lado para ver todas.',
      mascote: 'falando',
    },
    {
      id: 'destaques',
      alvo: '[data-tour="destaques-home"]',
      posicao: 'top',
      texto: 'Estes são alguns projetos em destaque. Clique em um cartão para ver os detalhes.',
      mascote: 'falando',
    },
    {
      id: 'noticias',
      alvo: '[data-tour="noticias-home"]',
      posicao: 'top',
      texto: 'Aqui ficam as notícias mais recentes das iniciativas.',
      mascote: 'falando',
      opcional: true,
    },
    {
      id: 'menu',
      alvo: '[data-tour="menu-principal"]',
      posicao: 'bottom',
      texto: 'Pelo menu você chega a Explorar, Categorias, Notícias e Sobre.',
      mascote: 'falando',
    },
    {
      id: 'acessibilidade',
      alvo: '[data-tour="acessibilidade"]',
      posicao: 'top',
      texto: 'Neste botão você aumenta o texto, liga o alto contraste e ativa o VLibras.',
      mascote: 'falando',
    },
    {
      id: 'fim',
      alvo: '[data-tour="ajuda"]',
      posicao: 'top',
      texto:
        'Pronto, agora é com você! Quando quiser rever um tutorial, é só clicar em mim aqui no canto.',
      mascote: 'sucesso',
    },
  ],
}
