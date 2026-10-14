/**
 * Fila de revisão. Os passos sobre os cartões só aparecem quando há algo na
 * fila; com ela vazia, o passo `vazia` explica o que vai aparecer ali.
 */
export default {
  id: 'revisar-conteudo',
  versao: 1,
  titulo: 'Como revisar conteúdos',
  area: 'painel',
  permissao: 'review',
  rota: '/admin/revisao',
  passos: [
    {
      id: 'oi',
      texto:
        'Aqui chegam as iniciativas e notícias enviadas para revisão. Vou te mostrar como decidir sobre cada uma.',
      mascote: 'ajuda',
    },
    {
      id: 'item',
      alvo: '[data-tour="revisao-item"]',
      posicao: 'bottom',
      texto: 'Cada cartão é um conteúdo esperando a sua análise.',
      mascote: 'falando',
      opcional: true,
    },
    {
      id: 'abrir',
      alvo: '[data-tour="revisao-abrir"]',
      posicao: 'bottom',
      texto: 'Use Revisar conteúdo para ler tudo antes de decidir.',
      mascote: 'falando',
      opcional: true,
    },
    {
      id: 'acoes',
      alvo: '[data-tour="revisao-acoes"]',
      posicao: 'bottom',
      texto:
        'Aqui você publica ou, no menu ao lado, rejeita. Ao rejeitar, escreva o que precisa mudar: a observação vai para quem enviou.',
      mascote: 'falando',
      opcional: true,
    },
    {
      id: 'vazia',
      alvo: '[data-tour="revisao-vazia"]',
      posicao: 'top',
      texto: 'A fila está vazia agora. Quando alguém enviar algo, aparece aqui.',
      mascote: 'falando',
      opcional: true,
    },
    {
      id: 'fim',
      texto: 'Pronto! Cada decisão fica registrada no histórico do conteúdo.',
      mascote: 'sucesso',
    },
  ],
}
