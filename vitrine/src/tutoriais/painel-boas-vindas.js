/**
 * Boas-vindas ao painel. Abre sozinho no primeiro acesso de cada pessoa da
 * equipe, em qualquer tela do painel — e leva até o dashboard se for preciso.
 */
export default {
  id: 'painel-boas-vindas',
  versao: 1,
  titulo: 'Conhecendo o painel',
  area: 'painel',
  rota: '/admin',
  oferecerEm: ['/admin/*'],
  abrirSozinhoEm: ['/admin/*'],
  passos: [
    {
      id: 'oi',
      texto: 'Boas-vindas ao painel! Vou te mostrar onde fica cada coisa.',
      mascote: 'ajuda',
    },
    {
      id: 'menu',
      alvo: '[data-tour="admin-menu"]',
      posicao: 'right',
      texto:
        'Pelo menu você chega às iniciativas, às notícias e às outras áreas. Algumas só aparecem para revisores e administradores.',
      mascote: 'falando',
    },
    {
      id: 'metricas',
      alvo: '[data-tour="admin-metricas"]',
      posicao: 'bottom',
      texto:
        'Estes números resumem o catálogo: quantas iniciativas existem e em que etapa cada uma está.',
      mascote: 'falando',
    },
    {
      id: 'pendencias',
      alvo: '[data-tour="admin-pendencias"]',
      posicao: 'top',
      texto: 'Aqui aparece o que está esperando aprovação.',
      mascote: 'falando',
    },
    {
      id: 'nova-iniciativa',
      alvo: '[data-tour="nova-iniciativa"]',
      posicao: 'bottom',
      texto: 'Para cadastrar uma iniciativa nova, comece por este botão.',
      mascote: 'falando',
    },
    {
      id: 'perfil',
      alvo: '[data-tour="admin-perfil"]',
      posicao: 'bottom',
      texto: 'Clicando no seu nome você abre o perfil ou sai da conta.',
      mascote: 'falando',
    },
    {
      id: 'fim',
      alvo: '[data-tour="ajuda"]',
      posicao: 'top',
      texto: 'Tudo pronto! Se tiver dúvida em alguma tela, é só clicar em mim aqui no canto.',
      mascote: 'sucesso',
    },
  ],
}
