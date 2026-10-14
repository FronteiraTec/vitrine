/** Recursos da página de uma notícia, em qualquer um dos três idiomas. */
export default {
  id: 'ler-noticia',
  versao: 1,
  titulo: 'Recursos de uma notícia',
  area: 'publico',
  rota: ['/noticia/:slug', '/en/news/:slug', '/es/noticia/:slug'],
  passos: [
    {
      id: 'oi',
      texto: 'Vou te mostrar o que dá para fazer em uma notícia.',
      mascote: 'ajuda',
    },
    {
      id: 'idiomas',
      alvo: '[data-tour="noticia-idiomas"]',
      posicao: 'bottom',
      texto:
        'Esta notícia também existe em outros idiomas. Os links para as outras versões ficam aqui.',
      mascote: 'falando',
      opcional: true,
    },
    {
      id: 'ouvir',
      // Opcional porque nem todo navegador tem leitura em voz alta.
      alvo: '[data-tour="noticia-ouvir"]',
      posicao: 'bottom',
      texto: 'Prefere ouvir? Este botão lê a notícia em voz alta, e você escolhe a velocidade.',
      mascote: 'falando',
      opcional: true,
    },
    {
      id: 'compartilhar',
      alvo: '[data-tour="noticia-compartilhar"]',
      posicao: 'bottom',
      texto: 'Para mandar a notícia para alguém, use estes botões.',
      mascote: 'falando',
    },
    {
      id: 'relacionadas',
      alvo: '[data-tour="noticia-relacionadas"]',
      posicao: 'top',
      texto: 'No fim da página há outras notícias sobre o mesmo assunto.',
      mascote: 'falando',
      opcional: true,
    },
    {
      id: 'fim',
      texto: 'Prontinho! Boa leitura.',
      mascote: 'sucesso',
    },
  ],
}
