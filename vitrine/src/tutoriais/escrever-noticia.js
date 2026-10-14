/** Formulário de notícia nova. */
export default {
  id: 'escrever-noticia',
  versao: 1,
  titulo: 'Como escrever uma notícia',
  area: 'painel',
  rota: '/admin/noticias/nova',
  oferecerEm: ['/admin/noticias'],
  passos: [
    {
      id: 'oi',
      texto: 'Vamos escrever uma notícia? Vou te mostrar as partes do formulário.',
      mascote: 'ajuda',
    },
    {
      id: 'folha',
      alvo: '[data-tour="noticia-folha"]',
      posicao: 'bottom',
      texto:
        'Esta é a folha da notícia: chapéu, título, linha fina e texto. Use a barra do editor para pôr intertítulos, imagens e vídeos.',
      mascote: 'falando',
    },
    {
      id: 'galeria',
      alvo: '[data-tour="noticia-galeria"]',
      posicao: 'top',
      texto: 'Se quiser, monte aqui uma galeria de fotos.',
      mascote: 'falando',
    },
    {
      id: 'capa',
      alvo: '[data-tour="noticia-capa"]',
      posicao: 'left',
      texto: 'A imagem de capa aparece na lista de notícias e quando alguém compartilha o link.',
      mascote: 'falando',
    },
    {
      id: 'salvar',
      alvo: '[data-tour="noticia-salvar"]',
      posicao: 'bottom',
      texto: 'Salve para criar o rascunho.',
      mascote: 'falando',
    },
    {
      id: 'fim',
      texto:
        'Ótimo! Com a notícia salva, aparecem as opções de enviar para revisão e de traduzir para inglês e espanhol.',
      mascote: 'sucesso',
    },
  ],
}
