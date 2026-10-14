/** Busca e filtros da página Explorar. */
export default {
  id: 'explorar',
  versao: 1,
  titulo: 'Como buscar iniciativas',
  area: 'publico',
  rota: '/buscar',
  passos: [
    {
      id: 'oi',
      texto: 'Vou te mostrar como encontrar iniciativas na vitrine.',
      mascote: 'ajuda',
    },
    {
      id: 'busca',
      alvo: '[data-tour="busca"]',
      posicao: 'bottom',
      texto:
        'Digite o que procura: um nome, um tema ou uma área. A lista se atualiza enquanto você escreve.',
      mascote: 'falando',
    },
    {
      id: 'filtros',
      alvo: '[data-tour="filtros"]',
      posicao: 'right-start',
      texto:
        'Use os filtros para ver só uma categoria, área ou tema. Dá para marcar vários ao mesmo tempo.',
      mascote: 'falando',
    },
    {
      id: 'ordenacao',
      alvo: '[data-tour="ordenacao"]',
      posicao: 'bottom',
      texto: 'Aqui você escolhe a ordem dos resultados, como os mais recentes ou por nome.',
      mascote: 'falando',
    },
    {
      id: 'resultados',
      // O primeiro cartão, e não a grade inteira: um alvo mais alto que a
      // tela deixaria o balão sem lugar para aparecer.
      alvo: '[data-tour="resultados"] > :first-child',
      posicao: 'top',
      texto: 'Cada cartão é uma iniciativa. Clique nele para abrir a página completa.',
      mascote: 'falando',
      opcional: true,
    },
    {
      id: 'fim',
      texto:
        'Mandou bem! Sua busca fica no endereço da página, então dá para copiar o link e compartilhar.',
      mascote: 'sucesso',
    },
  ],
}
