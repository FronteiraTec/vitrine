/**
 * Leitura da página de uma iniciativa.
 *
 * Quase tudo aqui é opcional: uma iniciativa recém-cadastrada pode não ter
 * descrição longa, contatos ou parecidas, e o tour pula o que a página não
 * mostra em vez de apontar para o vazio.
 */
export default {
  id: 'iniciativa',
  versao: 1,
  titulo: 'A página de uma iniciativa',
  area: 'publico',
  rota: '/iniciativa/:slug',
  passos: [
    {
      id: 'oi',
      texto: 'Esta é a página de uma iniciativa. Vou te mostrar onde fica cada informação.',
      mascote: 'ajuda',
    },
    {
      id: 'cabecalho',
      alvo: '[data-tour="iniciativa-cabecalho"]',
      posicao: 'bottom',
      texto: 'No topo estão o nome, a categoria e um resumo do que a iniciativa faz.',
      mascote: 'falando',
    },
    {
      id: 'sobre',
      alvo: '[data-tour="iniciativa-sobre"]',
      posicao: 'top',
      texto: 'Logo abaixo vêm a descrição completa, as áreas de atuação e a equipe.',
      mascote: 'falando',
      opcional: true,
    },
    {
      id: 'contato',
      alvo: '[data-tour="iniciativa-contato"]',
      posicao: 'left',
      texto:
        'Nesta coluna ficam os contatos, os links e o endereço. É por aqui que você fala com a equipe.',
      mascote: 'falando',
      opcional: true,
    },
    {
      id: 'relacionadas',
      alvo: '[data-tour="iniciativa-relacionadas"]',
      posicao: 'top',
      texto: 'No fim da página há outras iniciativas parecidas com esta.',
      mascote: 'falando',
      opcional: true,
    },
    {
      id: 'fim',
      texto: 'Muito bem! Agora você sabe ler a página de qualquer iniciativa.',
      mascote: 'sucesso',
    },
  ],
}
